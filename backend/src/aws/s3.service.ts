import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly uploadsDir: string;
  private readonly isLocal: boolean;
  private readonly baseUrl: string;

  constructor() {
    this.region = process.env.AWS_REGION ?? 'ap-south-1';
    this.bucket = process.env.AWS_S3_KYC_BUCKET ?? 'vibehouse-kyc-documents';
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
    this.uploadsDir = path.resolve(process.cwd(), 'uploads');

    // Use local storage if explicitly configured, running in development, or no AWS credentials provided
    this.isLocal =
      process.env.USE_LOCAL_STORAGE === 'true' ||
      process.env.NODE_ENV === 'development' ||
      !process.env.AWS_ACCESS_KEY_ID;

    this.s3 = new S3Client({ region: this.region });
  }

  async onModuleInit() {
    if (this.isLocal) {
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
      this.logger.log(`Local file storage initialized at: ${this.uploadsDir}`);
      return;
    }
    await this.ensureCorsConfig();
  }

  /**
   * Ensure the S3 bucket has CORS configured for browser uploads.
   */
  private async ensureCorsConfig() {
    try {
      const existing = await this.s3.send(
        new GetBucketCorsCommand({ Bucket: this.bucket }),
      );
      if (existing.CORSRules && existing.CORSRules.length > 0) {
        this.logger.log('S3 CORS already configured');
        return;
      }
    } catch (err: any) {
      if (err.name !== 'NoSuchCORSConfiguration') {
        this.logger.warn(`Could not check S3 CORS: ${err.message}`);
        return;
      }
    }

    try {
      await this.s3.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
      this.logger.log('S3 CORS configured successfully');
    } catch (err: any) {
      this.logger.warn(`Failed to set S3 CORS (set it manually): ${err.message}`);
    }
  }

  /**
   * Generate a presigned PUT URL for direct browser upload.
   * The frontend uploads the file to this URL via HTTP PUT.
   */
  async getPresignedUploadUrl(
    ezeeReservationId: string,
    fileName: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; fileKey: string; expiresInSeconds: number }> {
    const ext = fileName.split('.').pop() ?? 'jpg';
    const nameBase = path.parse(fileName).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = uuidv4().slice(0, 8);
    const fileKey = nameBase
      ? `kyc/${ezeeReservationId}/${uniqueId}-${nameBase}.${ext}`
      : `kyc/${ezeeReservationId}/${uniqueId}.${ext}`;
    const expiresIn = 900;

    if (this.isLocal) {
      const uploadUrl = `${this.baseUrl}/uploads/${fileKey}`;
      this.logger.log(`Local upload URL generated for key: ${fileKey}`);
      return {
        uploadUrl,
        fileKey,
        expiresInSeconds: expiresIn,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });
    this.logger.log(`Presigned URL generated for key: ${fileKey}`);

    return {
      uploadUrl,
      fileKey,
      expiresInSeconds: expiresIn,
    };
  }

  /**
   * Generate a presigned PUT URL for a custom path prefix.
   * Used for event posters, etc.
   */
  async getPresignedUploadUrlForPath(
    pathPrefix: string,
    fileName: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; fileKey: string; fileUrl: string; expiresInSeconds: number }> {
    const ext = fileName.split('.').pop() ?? 'jpg';
    const nameBase = path.parse(fileName).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = uuidv4().slice(0, 8);
    const fileKey = nameBase
      ? `${pathPrefix}/${uniqueId}-${nameBase}.${ext}`
      : `${pathPrefix}/${uniqueId}.${ext}`;
    const expiresIn = 900;

    if (this.isLocal) {
      const fileUrl = `${this.baseUrl}/uploads/${fileKey}`;
      this.logger.log(`Local upload URL generated for key: ${fileKey}`);
      return {
        uploadUrl: fileUrl,
        fileKey,
        fileUrl,
        expiresInSeconds: expiresIn,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });
    this.logger.log(`Presigned URL generated for key: ${fileKey}`);

    return {
      uploadUrl,
      fileKey,
      fileUrl: this.buildFileUrl(fileKey),
      expiresInSeconds: expiresIn,
    };
  }

  /**
   * Upload a file buffer (server-side, no CORS needed).
   */
  async uploadFile(
    pathPrefix: string,
    fileName: string,
    contentType: string,
    buffer: Buffer,
  ): Promise<{ fileKey: string; fileUrl: string }> {
    const ext = fileName.split('.').pop() ?? 'jpg';
    const uniqueId = uuidv4().slice(0, 8);
    const fileKey = `${pathPrefix}/${uniqueId}.${ext}`;

    if (this.isLocal) {
      const filePath = path.resolve(this.uploadsDir, fileKey);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, buffer);
      this.logger.log(`Local file uploaded: ${fileKey}`);
      return { fileKey, fileUrl: this.buildFileUrl(fileKey) };
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        ContentType: contentType,
        Body: buffer,
      }),
    );

    this.logger.log(`File uploaded: ${fileKey}`);
    return { fileKey, fileUrl: this.buildFileUrl(fileKey) };
  }

  /**
   * Stream an object by key (for proxying images to the browser).
   */
  async getObjectStream(
    key: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    const cleanKey = this.extractKey(key);

    if (this.isLocal) {
      const filePath = path.resolve(this.uploadsDir, cleanKey);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(`File not found: ${cleanKey}`);
      }
      const stream = fs.createReadStream(filePath);
      const ext = cleanKey.split('.').pop()?.toLowerCase() ?? '';
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        pdf: 'application/pdf',
        webp: 'image/webp',
        gif: 'image/gif',
      };
      return {
        stream,
        contentType: mimeTypes[ext] ?? 'application/octet-stream',
      };
    }

    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: cleanKey }),
    );
    return {
      stream: response.Body as Readable,
      contentType: response.ContentType ?? 'application/octet-stream',
    };
  }

  /**
   * Generate a presigned GET URL for viewing/downloading a file.
   * Default TTL 15 minutes.
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn = 900,
  ): Promise<string> {
    const cleanKey = this.extractKey(key);
    if (this.isLocal) {
      return `${this.baseUrl}/uploads/${cleanKey}`;
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: cleanKey });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * Delete an object by key.
   */
  async deleteObject(key: string): Promise<void> {
    const cleanKey = this.extractKey(key);
    if (this.isLocal) {
      const filePath = path.resolve(this.uploadsDir, cleanKey);
      if (filePath.startsWith(this.uploadsDir) && fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath).catch(() => {});
        this.logger.log(`Local file deleted: ${cleanKey}`);
      }
      return;
    }

    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: cleanKey }));
    this.logger.log(`S3 object deleted: ${cleanKey}`);
  }

  /**
   * Extract the relative key from an S3 URL, local URL, or bare key.
   * e.g. "http://localhost:8000/uploads/kyc/ERI/uuid.jpg" → "kyc/ERI/uuid.jpg"
   * e.g. "https://bucket.s3.region.amazonaws.com/kyc/ERI/uuid.jpg" → "kyc/ERI/uuid.jpg"
   */
  extractKey(urlOrKey: string): string {
    if (!urlOrKey) return '';
    if (urlOrKey.startsWith('http')) {
      try {
        const url = new URL(urlOrKey);
        return url.pathname.replace(/^\/uploads\//, '').replace(/^\//, '');
      } catch {
        return urlOrKey;
      }
    }
    return urlOrKey.replace(/^\/uploads\//, '').replace(/^\//, '');
  }

  /**
   * Build the full URL for a given file key.
   */
  buildFileUrl(fileKey: string): string {
    const cleanKey = this.extractKey(fileKey);
    if (this.isLocal) {
      return `${this.baseUrl}/uploads/${cleanKey}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${cleanKey}`;
  }
}
