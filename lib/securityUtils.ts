export const MAX_ID_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

export type AadhaarSecureQrData = {
  rawPayload: string;
  name: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  maskedAadhaar: string;
  photoBase64?: string;
  address?: string;
  signature: string;
  signedData: string;
  uidToken?: string;
};

export type FileValidationResult = {
  valid: boolean;
  error?: string;
};

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }

  return signature.every((value, index) => bytes[index] === value);
}

function normalizeBase64(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = normalizeBase64(value);
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  return bytesToArrayBuffer(base64ToBytes(clean));
}

function resolveGender(value?: string): AadhaarSecureQrData["gender"] {
  const normalized = (value || "").trim().toUpperCase();

  if (normalized === "M" || normalized === "MALE") {
    return "MALE";
  }
  if (normalized === "F" || normalized === "FEMALE") {
    return "FEMALE";
  }

  return "PREFER_NOT_TO_SAY";
}

function normalizeDob(value?: string): string {
  if (!value) {
    return "";
  }

  const raw = value.trim();
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ddmmyyyy = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month}-${day}`;
  }

  if (/^\d{4}$/.test(raw)) {
    return `${raw}-01-01`;
  }

  return "";
}

function toMaskedAadhaar(value?: string): string {
  const digits = (value || "").replace(/\D+/g, "");
  if (digits.length < 4) {
    return "";
  }

  const last4 = digits.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

function extractField(root: Element, keys: string[]): string {
  for (const key of keys) {
    const direct = root.getAttribute(key);
    if (direct) {
      return direct.trim();
    }

    const lowerMatch = Array.from(root.attributes).find(
      (attribute) => attribute.name.toLowerCase() === key.toLowerCase(),
    );
    if (lowerMatch?.value) {
      return lowerMatch.value.trim();
    }
  }

  return "";
}

export function parseAadhaarSecureQrPayload(rawPayload: string): AadhaarSecureQrData | null {
  const payload = rawPayload.trim();
  if (!payload || !payload.startsWith("<")) {
    return null;
  }

  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(payload, "application/xml");
    const root = xml.documentElement;

    if (!root || root.nodeName.toLowerCase() === "parsererror") {
      return null;
    }

    const name = extractField(root, ["name", "n", "fullName"]);
    const dateOfBirth = normalizeDob(extractField(root, ["dob", "dateOfBirth", "yob"]));
    const gender = resolveGender(extractField(root, ["gender", "g"]));
    const maskedAadhaar = toMaskedAadhaar(extractField(root, ["uid", "uidno", "aadhaar", "maskedUid"]));
    const photoBase64 = extractField(root, ["photo", "pht"]);
    const address = extractField(root, ["address", "co", "loc"]);
    const signature = extractField(root, ["signature", "sig", "s"]);
    const signedData = extractField(root, ["signedData", "data", "d"]);
    const uidToken = extractField(root, ["uidToken", "referenceId", "ref"]);

    if (!name || !dateOfBirth || !maskedAadhaar || !signature || !signedData) {
      return null;
    }

    return {
      rawPayload: payload,
      name,
      dateOfBirth,
      gender,
      maskedAadhaar,
      photoBase64: photoBase64 || undefined,
      address: address || undefined,
      signature,
      signedData,
      uidToken: uidToken || undefined,
    };
  } catch {
    return null;
  }
}

export async function verifyUidaiDigitalSignature(
  secureQrData: AadhaarSecureQrData,
  publicKeyPem?: string,
): Promise<boolean> {
  if (!publicKeyPem || !secureQrData.signature || !secureQrData.signedData) {
    return false;
  }

  try {
    const importedKey = await crypto.subtle.importKey(
      "spki",
      pemToArrayBuffer(publicKeyPem),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["verify"],
    );

    const payloadBytes = bytesToArrayBuffer(new TextEncoder().encode(secureQrData.signedData));
    const signatureBytes = bytesToArrayBuffer(base64ToBytes(secureQrData.signature));

    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", importedKey, signatureBytes, payloadBytes);
  } catch {
    return false;
  }
}

export async function generateUidReferenceId(seed: string): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
    const bytes = Array.from(new Uint8Array(digest));
    const hex = bytes.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
    return `UIDREF-${hex.slice(0, 20)}`;
  } catch {
    const randomPart = Math.random().toString(36).slice(2, 14).toUpperCase();
    return `UIDREF-${randomPart}`;
  }
}

export async function validateIdDocumentFile(file: File): Promise<FileValidationResult> {
  if (file.size > MAX_ID_DOCUMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: "File size exceeds 5MB. Please upload a smaller file.",
    };
  }

  const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isPdf = startsWith(headerBytes, PDF_SIGNATURE);
  const isPng = startsWith(headerBytes, PNG_SIGNATURE);
  const isJpeg = startsWith(headerBytes, JPEG_SIGNATURE);

  if (!isPdf && !isPng && !isJpeg) {
    return {
      valid: false,
      error: "Unsupported file type. Only PDF, JPEG, and PNG are allowed.",
    };
  }

  const mimeType = file.type.toLowerCase();
  const mimeAllowed =
    mimeType === "application/pdf"
    || mimeType === "image/png"
    || mimeType === "image/jpeg";

  if (mimeType && !mimeAllowed) {
    return {
      valid: false,
      error: "The file MIME type does not match an allowed format.",
    };
  }

  return { valid: true };
}

export async function stripImageMetadata(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to decode image."));
      nextImage.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0);

    const sanitizedBlob = await new Promise<Blob | null>((resolve) => {
      const targetType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob((blob) => resolve(blob), targetType, 0.95);
    });

    if (!sanitizedBlob) {
      return file;
    }

    return new File([sanitizedBlob], file.name, {
      type: sanitizedBlob.type || file.type,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function maskSensitiveValue(value: string, visibleTrailing = 4): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.length <= visibleTrailing) {
    return "*".repeat(trimmed.length);
  }

  const visible = trimmed.slice(-visibleTrailing);
  return `${"*".repeat(trimmed.length - visibleTrailing)}${visible}`;
}
