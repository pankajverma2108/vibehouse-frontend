"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/vibehouse-api";

import { GuestAuthModal } from "@/components/auth/guest-auth-modal";
import {
  type GuestProfile,
  clearStoredGuestToken,
  rememberPostAuthRedirect,
  getPostAuthRedirect,
  getGuestGoogleAuthUrl,
  getGuestMe,
  getStoredGuestToken,
  loginGuest,
  setStoredGuestToken,
  signupGuest,
  sendOtp,
  verifyOtp,
  verifyTwoFa,
  forgotPassword,
  resetPassword,
} from "@/lib/guest-auth-api";

export type AuthMode =
  | "signin"
  | "signup"
  | "verify-otp"
  | "verify-2fa"
  | "forgot-password"
  | "forgot-password-otp"
  | "set-new-password";

type GuestProfileUpdatePayload = {
  name: string;
  email: string;
  phone: string | null;
  birthDate?: string | null;
  location?: string | null;
  nationality?: string | null;
  emergencyContact?: string | null;
  gender?: string | null;
  prefersEmail?: boolean;
  prefersPhone?: boolean;
};

type AuthContextValue = {
  isModalOpen: boolean;
  mode: AuthMode;
  guest: GuestProfile | null;
  isAuthenticated: boolean;
  isPending: boolean;
  isRestoringSession: boolean;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  resendVerificationCode: (email: string) => Promise<void>;
  updateGuestProfile: (payload: GuestProfileUpdatePayload) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PROFILE_OVERRIDES_KEY = "vh_guest_profile_overrides";
const GUEST_PROFILE_CACHE_KEY = "vh_guest_profile_cache";

type AuthAction =
  | "signin"
  | "signup"
  | "verify-email-otp"
  | "send-email-otp"
  | "forgot-password-request"
  | "reset-password"
  | "verify-2fa";

function mapAuthErrorMessage(action: AuthAction, error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return "Something went wrong. Please try again.";
  }

  const backendMessage = error.message;

  if (action === "forgot-password-request") {
    if (error.status === 503) {
      return "We couldn't send the email right now. Please try again.";
    }
    if (error.status === 404) {
      return "No account found with this email address.";
    }
    if (error.status === 400 && backendMessage.toLowerCase().includes("google")) {
      return "This account uses Google login. Please sign in with Google.";
    }
    if (error.status === 400 && backendMessage.toLowerCase().includes("60 seconds")) {
      return "Please wait 60 seconds before requesting another OTP.";
    }
  }

  if (action === "signin" && error.status === 503) {
    return "Login verification email could not be sent. Please try again.";
  }

  if (action === "verify-2fa") {
    if (error.status === 401) {
      return "Incorrect code. Please try again.";
    }
    if (error.status === 400) {
      return "Code expired. Please sign in again to get a new code.";
    }
  }

  if (action === "reset-password") {
    if (error.status === 401) {
      return "Incorrect OTP. Please try again.";
    }
    if (error.status === 400 && backendMessage.toLowerCase().includes("password")) {
      return "Password must be at least 8 characters.";
    }
    if (error.status === 400) {
      return "OTP expired or invalid. Request a new code and try again.";
    }
  }

  return backendMessage || "Request failed. Please try again.";
}

function logAuthApiError(action: AuthAction, error: unknown, context?: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return;
  }
  const log = console.warn;

  if (error instanceof ApiRequestError) {
    const details = {
      action,
      status: error.status,
      method: error.method,
      path: error.path,
      message: error.message,
      response: error.data,
      context: context ?? null,
    };

    log("[Auth API Error]", details);
    return;
  }

  if (error instanceof Error) {
    log("[Auth Error]", {
      action,
      message: error.message,
      name: error.name,
      stack: error.stack,
      context: context ?? null,
    });
    return;
  }

  log("[Auth Error]", {
    action,
    message: "Non-error value thrown",
    thrown: error,
    context: context ?? null,
  });
}

type ProfileOverrides = {
  name: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  location: string | null;
  nationality: string | null;
  emergencyContact: string | null;
  gender: string | null;
  prefersEmail: boolean;
  prefersPhone: boolean;
};

function readProfileOverrides(): ProfileOverrides | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PROFILE_OVERRIDES_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProfileOverrides>;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" || parsed.phone === null ? parsed.phone : null,
      birthDate: typeof parsed.birthDate === "string" || parsed.birthDate === null ? parsed.birthDate : null,
      location: typeof parsed.location === "string" || parsed.location === null ? parsed.location : null,
      nationality: typeof parsed.nationality === "string" || parsed.nationality === null ? parsed.nationality : null,
      emergencyContact:
        typeof parsed.emergencyContact === "string" || parsed.emergencyContact === null ? parsed.emergencyContact : null,
      gender: typeof parsed.gender === "string" || parsed.gender === null ? parsed.gender : null,
      prefersEmail: typeof parsed.prefersEmail === "boolean" ? parsed.prefersEmail : true,
      prefersPhone: typeof parsed.prefersPhone === "boolean" ? parsed.prefersPhone : false,
    };
  } catch {
    return null;
  }
}

function mergeWithOverrides(guest: GuestProfile): GuestProfile {
  const overrides = readProfileOverrides();
  if (!overrides) {
    return guest;
  }

  return {
    ...guest,
    name: overrides.name || guest.name,
    email: overrides.email || guest.email,
    phone: overrides.phone ?? guest.phone,
    birthDate: overrides.birthDate ?? guest.birthDate ?? null,
    location: overrides.location ?? guest.location ?? null,
    nationality: overrides.nationality ?? guest.nationality ?? null,
    emergencyContact: overrides.emergencyContact ?? guest.emergencyContact ?? null,
    gender: overrides.gender ?? guest.gender ?? null,
    prefersEmail: overrides.prefersEmail ?? guest.prefersEmail ?? true,
    prefersPhone: overrides.prefersPhone ?? guest.prefersPhone ?? false,
  };
}

function readCachedGuestProfile(): GuestProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(GUEST_PROFILE_CACHE_KEY) || window.sessionStorage.getItem(GUEST_PROFILE_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as GuestProfile;
    if (!parsed || typeof parsed !== "object" || typeof parsed.id !== "string") {
      return null;
    }

    return mergeWithOverrides(parsed);
  } catch {
    return null;
  }
}

function writeCachedGuestProfile(guest: GuestProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  const tokenInLocalStorage = window.localStorage.getItem("vh_guest_access_token");
  const targetStorage = tokenInLocalStorage ? window.localStorage : window.sessionStorage;
  targetStorage.setItem(GUEST_PROFILE_CACHE_KEY, JSON.stringify(guest));
}

function clearCachedGuestProfile(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GUEST_PROFILE_CACHE_KEY);
  window.sessionStorage.removeItem(GUEST_PROFILE_CACHE_KEY);
}

export function GuestAuthProvider({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredGuestToken();
    if (!token) {
      clearCachedGuestProfile();
      queueMicrotask(() => {
        if (!cancelled) {
          setGuest(null);
          setIsRestoringSession(false);
        }
      });
      return;
    }

    const cachedGuest = readCachedGuestProfile();
    if (cachedGuest) {
      queueMicrotask(() => {
        if (!cancelled) {
          setGuest(cachedGuest);
        }
      });
    }

    const restoreSession = async () => {
      try {
        const me = await getGuestMe(token);
        if (!cancelled) {
          const nextGuest = mergeWithOverrides(me);
          setGuest(nextGuest);
          writeCachedGuestProfile(nextGuest);
        }
      } catch {
        clearStoredGuestToken();
        clearCachedGuestProfile();
        if (!cancelled) {
          setGuest(null);
        }
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsModalOpen(false);
    setErrorMessage(null);
  }, []);

  const openAuthModal = useCallback((nextMode: AuthMode = "signin") => {
    rememberPostAuthRedirect();
    setMode(nextMode);
    setErrorMessage(null);
    setIsModalOpen(true);
  }, []);

  const onSwitchMode = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
  }, []);

  const signOut = useCallback(() => {
    clearStoredGuestToken();
    clearCachedGuestProfile();

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PROFILE_OVERRIDES_KEY);
    }

    setGuest(null);
  }, []);

  const onSignIn = useCallback(async (payload: { email: string; password: string; rememberMe: boolean }) => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await loginGuest({ email: payload.email, password: payload.password });
      if ("requires_2fa" in response) {
        setMode("verify-2fa");
        toast.success("OTP sent", {
          description: "Enter the 6-digit code sent to your email to complete sign in.",
        });
        return;
      }

      setStoredGuestToken(response.access_token, payload.rememberMe);
      const me = await getGuestMe(response.access_token).catch(() => response.guest);
      const nextGuest = mergeWithOverrides(me);
      setGuest(nextGuest);
      writeCachedGuestProfile(nextGuest);
      setIsRestoringSession(false);
      toast.success("Signed in successfully", {
        description: `Welcome back, ${me.name.split(" ")[0] ?? "Guest"}.`,
      });
      closeAuthModal();
    } catch (error) {
      logAuthApiError("signin", error, { email: payload.email });
      const message = mapAuthErrorMessage("signin", error);
      setErrorMessage(message);
      toast.error("Sign in failed", { description: message });
    } finally {
      setIsPending(false);
    }
  }, [closeAuthModal]);

  const onSignUp = useCallback(async (payload: { name: string; email: string; password: string; phone?: string }) => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await signupGuest(payload);
      setStoredGuestToken(response.access_token);
      const me = await getGuestMe(response.access_token).catch(() => response.guest);
      const nextGuest = mergeWithOverrides(me);
      setGuest(nextGuest);
      writeCachedGuestProfile(nextGuest);
      setIsRestoringSession(false);
      
      if (response.otp_sent) {
        toast.success("Account created", {
          description: "Please check your email for the verification code.",
        });
        setMode("verify-otp");
      } else {
        toast.success("Account created", {
          description: `Great to have you here, ${me.name.split(" ")[0] ?? "Guest"}.`,
        });
        closeAuthModal();
      }
    } catch (error) {
      logAuthApiError("signup", error, { email: payload.email });
      const message = mapAuthErrorMessage("signup", error);
      setErrorMessage(message);
      toast.error("Sign up failed", { description: message });
    } finally {
      setIsPending(false);
    }
  }, [closeAuthModal]);

  const onVerifyOtp = useCallback(async (payload: { email: string; otp: string }) => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await verifyOtp(payload);
      setStoredGuestToken(response.access_token);
      const me = await getGuestMe(response.access_token).catch(() => response.guest);
      const nextGuest = mergeWithOverrides(me);
      setGuest(nextGuest);
      writeCachedGuestProfile(nextGuest);
      setIsRestoringSession(false);
      toast.success("Email verified", {
        description: "Your email has been successfully verified.",
      });
      closeAuthModal();
    } catch (error) {
      logAuthApiError("verify-email-otp", error, { email: payload.email });
      const message = mapAuthErrorMessage("verify-email-otp", error);
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }, [closeAuthModal]);

  const onSendOtp = useCallback(async (email: string) => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await sendOtp({ email });
      toast.success("Code sent", {
        description: `We've sent a new code to ${email}.`,
      });
    } catch (error) {
      logAuthApiError("send-email-otp", error, { email });
      const message = mapAuthErrorMessage("send-email-otp", error);
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }, []);

  const onForgotPassword = useCallback(async (payload: { email: string }) => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await forgotPassword(payload);
      setMode("forgot-password-otp");
      toast.success("OTP sent", {
        description: `We've sent a 6-digit password reset code to ${payload.email}.`,
      });
    } catch (error) {
      logAuthApiError("forgot-password-request", error, { email: payload.email });
      const message = mapAuthErrorMessage("forgot-password-request", error);
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }, []);

  const onResetPassword = useCallback(async (payload: { email: string; otp: string; newPassword: string }) => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await resetPassword(payload);
      setStoredGuestToken(response.access_token);
      const me = await getGuestMe(response.access_token).catch(() => response.guest);
      const nextGuest = mergeWithOverrides(me);
      setGuest(nextGuest);
      writeCachedGuestProfile(nextGuest);
      setIsRestoringSession(false);
      toast.success("Password reset", {
        description: "Your password was updated successfully.",
      });
      closeAuthModal();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (error) {
      logAuthApiError("reset-password", error, { email: payload.email });
      const message = mapAuthErrorMessage("reset-password", error);
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }, [closeAuthModal]);

  const onVerifyTwoFa = useCallback(async (payload: { email: string; otp: string }) => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await verifyTwoFa(payload);
      setStoredGuestToken(response.access_token);
      const me = await getGuestMe(response.access_token).catch(() => response.guest);
      const nextGuest = mergeWithOverrides(me);
      setGuest(nextGuest);
      writeCachedGuestProfile(nextGuest);
      setIsRestoringSession(false);
      toast.success("Signed in successfully", {
        description: `Welcome back, ${me.name.split(" ")[0] ?? "Guest"}.`,
      });
      closeAuthModal();
    } catch (error) {
      logAuthApiError("verify-2fa", error, { email: payload.email });
      const message = mapAuthErrorMessage("verify-2fa", error);
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }, [closeAuthModal]);

  const onGoogleAuth = useCallback(() => {
    rememberPostAuthRedirect();
    const returnPath = getPostAuthRedirect() || undefined;
    const googleAuthUrl = getGuestGoogleAuthUrl(returnPath);
    window.location.href = googleAuthUrl;
  }, []);

  const updateGuestProfile = useCallback((payload: GuestProfileUpdatePayload) => {
    setGuest((current) => {
      if (!current) {
        return current;
      }

      const nextProfile: GuestProfile = {
        ...current,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        birthDate: payload.birthDate ?? current.birthDate ?? null,
        location: payload.location ?? current.location ?? null,
        nationality: payload.nationality ?? current.nationality ?? null,
        emergencyContact: payload.emergencyContact ?? current.emergencyContact ?? null,
        gender: payload.gender ?? current.gender ?? null,
        prefersEmail: payload.prefersEmail ?? current.prefersEmail ?? true,
        prefersPhone: payload.prefersPhone ?? current.prefersPhone ?? false,
      };

      if (typeof window !== "undefined") {
        const overrides: ProfileOverrides = {
          name: nextProfile.name,
          email: nextProfile.email,
          phone: nextProfile.phone,
          birthDate: nextProfile.birthDate ?? null,
          location: nextProfile.location ?? null,
          nationality: nextProfile.nationality ?? null,
          emergencyContact: nextProfile.emergencyContact ?? null,
          gender: nextProfile.gender ?? null,
          prefersEmail: nextProfile.prefersEmail ?? true,
          prefersPhone: nextProfile.prefersPhone ?? false,
        };

        window.localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(overrides));
      }

      writeCachedGuestProfile(nextProfile);

      return nextProfile;
    });
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      isModalOpen,
      mode,
      guest,
      isAuthenticated: Boolean(guest),
      isPending,
      isRestoringSession,
      openAuthModal,
      closeAuthModal,
      resendVerificationCode: onSendOtp,
      updateGuestProfile,
      signOut,
    }),
    [closeAuthModal, guest, isModalOpen, isPending, isRestoringSession, mode, onSendOtp, openAuthModal, signOut, updateGuestProfile],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}

      <GuestAuthModal
        errorMessage={errorMessage}
        mode={mode}
        onClose={closeAuthModal}
        onGoogleAuth={onGoogleAuth}
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        onVerifyOtp={onVerifyOtp}
        onVerifyTwoFa={onVerifyTwoFa}
        onSendOtp={onSendOtp}
        onForgotPassword={onForgotPassword}
        onResetPassword={onResetPassword}
        onSwitchMode={onSwitchMode}
        open={isModalOpen}
        pending={isPending}
        prefillEmail={guest?.email ?? ""}
      />
    </AuthContext.Provider>
  );
}

export function useGuestAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useGuestAuth must be used within GuestAuthProvider");
  }

  return context;
}

