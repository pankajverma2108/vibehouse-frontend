import { getApiBaseUrl, requestJson } from "@/lib/vibehouse-api";

export type GuestProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  two_fa_enabled?: boolean;
  profile_photo_url: string | null;
  created_at: string;
  birthDate?: string | null;
  location?: string | null;
  nationality?: string | null;
  emergencyContact?: string | null;
  gender?: string | null;
  prefersEmail?: boolean;
  prefersPhone?: boolean;
  bookings?: GuestBookingSummary[];
};

export type GuestBookingSummary = {
  ezee_reservation_id: string;
  role: "PRIMARY" | "SECONDARY";
  status: string;
  checkin_date: string;
  checkout_date: string;
  room_type_name: string;
  room_number?: string | null;
  property_name?: string | null;
  property_id: string;
  door_passcode?: string | null;
  lock_status?: string | null;
};

export type GuestAuthSuccessResponse = {
  access_token: string;
  guest: GuestProfile;
  otp_sent?: boolean;
};

export type GuestLoginRequiresTwoFaResponse = {
  requires_2fa: true;
};

export type GuestAuthResponse = GuestAuthSuccessResponse | GuestLoginRequiresTwoFaResponse;

export type GuestSignupPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

export type GuestLoginPayload = {
  email: string;
  password: string;
};

export async function sendOtp(payload: { email: string }): Promise<{ message: string; expires_in_seconds: number }> {
  return requestJson<{ message: string; expires_in_seconds: number }>("/guest/auth/send-otp", {
    method: "POST",
    body: payload,
  });
}

export async function verifyOtp(payload: { email: string; otp: string }): Promise<GuestAuthSuccessResponse> {
  return requestJson<GuestAuthSuccessResponse>("/guest/auth/verify-otp", {
    method: "POST",
    body: payload,
  });
}

export async function forgotPassword(payload: { email: string }): Promise<{ message: string; expires_in_seconds: number }> {
  return requestJson<{ message: string; expires_in_seconds: number }>("/guest/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export async function resetPassword(payload: { email: string; otp: string; newPassword: string }): Promise<GuestAuthSuccessResponse> {
  return requestJson<GuestAuthSuccessResponse>("/guest/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

export async function verifyTwoFa(payload: { email: string; otp: string }): Promise<GuestAuthSuccessResponse> {
  return requestJson<GuestAuthSuccessResponse>("/guest/auth/verify-2fa", {
    method: "POST",
    body: payload,
  });
}

const DEFAULT_GOOGLE_AUTH_PATH = "/guest/auth/google";
const POST_AUTH_REDIRECT_KEY = "vh_post_auth_redirect";
const POST_AUTH_REDIRECT_FALLBACK_KEY = "vh_post_auth_redirect_fallback";

const LOCAL_STORAGE_KEY = "vh_guest_access_token";
const SESSION_STORAGE_KEY = "vh_guest_access_token_session";

function resolveGoogleAuthBaseUrl(): string {
  const apiBaseUrl = getApiBaseUrl();
  const canonicalUrl = `${apiBaseUrl}${DEFAULT_GOOGLE_AUTH_PATH}`;
  const configuredUrl = process.env.NEXT_PUBLIC_GUEST_GOOGLE_AUTH_URL?.trim();

  if (!configuredUrl) {
    return canonicalUrl;
  }

  try {
    const apiOrigin = new URL(apiBaseUrl).origin;
    const resolvedConfiguredUrl = new URL(configuredUrl, apiBaseUrl);

    if (resolvedConfiguredUrl.origin !== apiOrigin) {
      return canonicalUrl;
    }

    return resolvedConfiguredUrl.toString();
  } catch {
    return canonicalUrl;
  }
}

export async function signupGuest(payload: GuestSignupPayload): Promise<GuestAuthSuccessResponse> {
  return requestJson<GuestAuthSuccessResponse>("/guest/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export async function loginGuest(payload: GuestLoginPayload): Promise<GuestAuthResponse> {
  return requestJson<GuestAuthResponse>("/guest/auth/login", {
    method: "POST",
    body: payload,
  });
}

export async function getGuestMe(token: string): Promise<GuestProfile> {
  return requestJson<GuestProfile>("/guest/auth/me", {
    method: "GET",
    token,
  });
}

function normalizeRedirectPath(candidate: string | null | undefined): string {
  if (!candidate) {
    return "/";
  }

  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    try {
      if (typeof window !== "undefined") {
        const parsed = new URL(candidate);
        if (parsed.origin !== window.location.origin) {
          return "/";
        }
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return "/";
    }
  }

  if (!candidate.startsWith("/")) {
    return "/";
  }

  return candidate;
}

export function rememberPostAuthRedirect(path?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextPath = normalizeRedirectPath(path || `${window.location.pathname}${window.location.search}${window.location.hash}`);
  window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, nextPath);
  window.localStorage.setItem(POST_AUTH_REDIRECT_FALLBACK_KEY, nextPath);
}

export function getPostAuthRedirect(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY) || window.localStorage.getItem(POST_AUTH_REDIRECT_FALLBACK_KEY);
  if (!stored) {
    return null;
  }

  return normalizeRedirectPath(stored);
}

export function consumePostAuthRedirect(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = getPostAuthRedirect();
  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  window.localStorage.removeItem(POST_AUTH_REDIRECT_FALLBACK_KEY);
  return stored;
}

export function getGuestGoogleAuthUrl(returnTo?: string): string {
  const baseUrl = resolveGoogleAuthBaseUrl();
  const redirectPath = normalizeRedirectPath(returnTo);

  try {
    const url = new URL(baseUrl);
    if (redirectPath && redirectPath !== "/") {
      url.searchParams.set("return_to", redirectPath);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export function getStoredGuestToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(LOCAL_STORAGE_KEY) || window.sessionStorage.getItem(SESSION_STORAGE_KEY);
}

export function setStoredGuestToken(token: string, persist = true): void {
  if (typeof window === "undefined") {
    return;
  }

  if (persist) {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, token);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export function clearStoredGuestToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}
