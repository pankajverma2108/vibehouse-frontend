export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type IndianPhoneNormalizationStatus =
  | "empty"
  | "valid"
  | "country_code_trimmed"
  | "leading_zero_trimmed"
  | "invalid";

export type IndianPhoneNormalizationResult = {
  normalized: string;
  status: IndianPhoneNormalizationStatus;
  originalDigits: string;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

export function normalizeIndianPhone(value: string): IndianPhoneNormalizationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      normalized: "",
      status: "empty",
      originalDigits: "",
    };
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) {
    return {
      normalized: "",
      status: "empty",
      originalDigits: "",
    };
  }

  if (digitsOnly.length === 10) {
    return {
      normalized: digitsOnly,
      status: "valid",
      originalDigits: digitsOnly,
    };
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return {
      normalized: digitsOnly.slice(2),
      status: "country_code_trimmed",
      originalDigits: digitsOnly,
    };
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return {
      normalized: digitsOnly.slice(1),
      status: "leading_zero_trimmed",
      originalDigits: digitsOnly,
    };
  }

  return {
    normalized: digitsOnly,
    status: "invalid",
    originalDigits: digitsOnly,
  };
}

export function normalizePhone(value: string): string {
  return normalizeIndianPhone(value).normalized;
}

export function isValidPhone(value: string, options?: { optional?: boolean }): boolean {
  const normalized = normalizeIndianPhone(value);

  if (!normalized.normalized) {
    return Boolean(options?.optional);
  }

  return /^\d{10}$/.test(normalized.normalized);
}
