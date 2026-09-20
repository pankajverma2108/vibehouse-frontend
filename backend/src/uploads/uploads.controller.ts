import {
  Controller,
  Get,
  Put,
  Delete,
  Req,
  Res,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('uploads')
export class UploadsController {
  private readonly uploadsDir: string;

  constructor() {
    let dir = path.resolve(process.cwd(), 'uploads');
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      dir = path.resolve('/tmp', 'uploads');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.uploadsDir = dir;
  }

  private resolveSafePath(req: Request): { safeKey: string; targetFile: string } {
    const paramMatch = (req.params as any)[0] || (req.params as any)['*'] || '';
    const rawKey = decodeURIComponent(paramMatch || req.path.replace(/^\/uploads\/?/, ''));
    const safeKey = rawKey.replace(/\.\./g, '').replace(/^\/+/, '');
    if (!safeKey) {
      throw new ForbiddenException('Invalid file path');
    }
    const targetFile = path.resolve(this.uploadsDir, safeKey);
    if (!targetFile.startsWith(this.uploadsDir)) {
      throw new ForbiddenException('Access denied');
    }
    return { safeKey, targetFile };
  }

  /**
   * PUT /uploads/*
   * Emulates S3 presigned PUT URL behavior.
   * Saves uploaded binary or streamed file to disk.
   */
  @Put('*')
  async uploadFile(@Req() req: Request, @Res() res: Response) {
    const { safeKey, targetFile } = this.resolveSafePath(req);
    await fs.promises.mkdir(path.dirname(targetFile), { recursive: true });

    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      await fs.promises.writeFile(targetFile, req.body);
      return res.status(200).json({ ok: true, key: safeKey });
    }

    // Stream upload fallback
    const writeStream = fs.createWriteStream(targetFile);
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.status(200).json({ ok: true, key: safeKey });
    });

    writeStream.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
  }

  /**
   * GET /uploads/*
   * Serves uploaded file from local storage.
   */
  @Get('*')
  serveFile(@Req() req: Request, @Res() res: Response) {
    const { targetFile } = this.resolveSafePath(req);
    if (!fs.existsSync(targetFile)) {
      throw new NotFoundException('File not found');
    }
    return res.sendFile(targetFile);
  }

  /**
   * DELETE /uploads/*
   * Deletes uploaded file.
   */
  @Delete('*')
  async deleteFile(@Req() req: Request, @Res() res: Response) {
    const { targetFile } = this.resolveSafePath(req);
    if (fs.existsSync(targetFile)) {
      await fs.promises.unlink(targetFile);
    }
    return res.status(200).json({ ok: true });
  }
}
