"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp";

import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/guest-form-validation";
import { ButtonSpinner } from "@/components/ui/button-spinner";

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

import type { AuthMode } from "./guest-auth-provider";

type SignInPayload = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type SignUpPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

type GuestAuthModalProps = {
  open: boolean;
  mode: AuthMode;
  prefillEmail?: string;
  pending: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSignIn: (payload: SignInPayload) => Promise<void>;
  onSignUp: (payload: SignUpPayload) => Promise<void>;
  onVerifyOtp?: (payload: { email: string; otp: string }) => Promise<void>;
  onVerifyTwoFa?: (payload: { email: string; otp: string }) => Promise<void>;
  onSendOtp?: (email: string) => Promise<void>;
  onForgotPassword?: (payload: { email: string }) => Promise<void>;
  onResetPassword?: (payload: { email: string; otp: string; newPassword: string }) => Promise<void>;
  onGoogleAuth: () => void;
};

export function GuestAuthModal({
  open,
  mode,
  prefillEmail,
  pending,
  errorMessage,
  onClose,
  onSwitchMode,
  onSignIn,
  onSignUp,
  onVerifyOtp,
  onVerifyTwoFa,
  onSendOtp,
  onForgotPassword,
  onResetPassword,
  onGoogleAuth,
}: GuestAuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const resolvedEmail = email || prefillEmail || "";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const switchMode = (nextMode: AuthMode) => {
    setLocalError(null);
    setPassword("");
    setConfirmPassword("");
    if (nextMode !== "forgot-password" && nextMode !== "forgot-password-otp") {
      setPhone("");
      setOtp("");
    }
    onSwitchMode(nextMode);
  };

  const headline =
    mode === "signin" ? "Welcome Back" :
    mode === "signup" ? "Join The Crew" :
    mode === "verify-otp" ? "Verify Email" :
    mode === "verify-2fa" ? "Two-Factor Code" :
    mode === "forgot-password" ? "Forgot Password?" :
    mode === "forgot-password-otp" ? "Reset Password" :
    "Set New Password";

  const description =
    mode === "verify-otp" ? `We sent a 6-digit code to ${resolvedEmail || "your email"}` :
    mode === "verify-2fa" ? `Enter the 6-digit login code sent to ${resolvedEmail || "your email"}` :
    mode === "forgot-password" ? "Enter your email and we will send you a 6-digit OTP." :
    mode === "forgot-password-otp" ? `Enter the OTP sent to ${resolvedEmail || "your email"} and set your new password.` :
    mode === "set-new-password" ? "Create a new password for your account." :
    null;

  const ctaLabel =
    mode === "signin" ? "Let's Go!" :
    mode === "signup" ? "Start My Journey!" :
    mode === "verify-otp" ? "Verify" :
    mode === "verify-2fa" ? "Verify & Sign In" :
    mode === "forgot-password" ? "Send OTP" :
    mode === "forgot-password-otp" ? "Update Password" :
    "Update Password";

  const switchLabel =
    mode === "signin" ? "New to the vibe?" :
    mode === "signup" ? "Already vibing?" :
    "";

  const switchAction =
    mode === "signin" ? "Join the crew!" :
    mode === "signup" ? "Sign in here!" :
    "Back to Login";

  const switchTarget =
    mode === "signin" ? "signup" :
    "signin";

  const showOtpSection = mode === "verify-otp" || mode === "verify-2fa" || mode === "forgot-password-otp";
  const showResendButton = mode === "verify-otp" || mode === "forgot-password-otp";

  const onResendOtp = async () => {
    const normalizedEmail = normalizeEmail(resolvedEmail);
    if (!isValidEmail(normalizedEmail)) {
      setLocalError("Please enter a valid email before requesting OTP.");
      return;
    }

    if (mode === "forgot-password-otp") {
      await onForgotPassword?.({ email: normalizedEmail });
    } else if (mode === "verify-2fa") {
      setLocalError("Please sign in again to request a new 2FA code.");
      return;
    } else {
      await onSendOtp?.(normalizedEmail);
    }

    setCountdown(60);
  };

  // Check if form is valid for signup
  const isSignupValid = useMemo(() => {
    if (mode !== "signup") return true;
    const normalizedName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    const nameValid = normalizedName.length > 0;
    const emailValid = isValidEmail(normalizedEmail);
    const passwordValid = PASSWORD_REGEX.test(password);
    const confirmPasswordValid = password === confirmPassword && password.length > 0;
    const phoneValid = isValidPhone(normalizedPhone, { optional: true });

    return nameValid && emailValid && passwordValid && confirmPasswordValid && phoneValid && agreed;
  }, [mode, firstName, lastName, email, password, confirmPassword, phone, agreed]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (mode === "signin") {
      if (!PASSWORD_REGEX.test(password)) {
        setLocalError("Password must be at least 8 characters and include letters and numbers.");
        return;
      }
      await onSignIn({
        email: normalizedEmail,
        password,
        rememberMe,
      });
      return;
    }

    if (mode === "signup") {
      if (!PASSWORD_REGEX.test(password)) {
        setLocalError("Password must be at least 8 characters and include letters and numbers.");
        return;
      }
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (!fullName) {
        setLocalError("Please add your first and last name.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }
      if (!agreed) {
        setLocalError("Please accept Terms & Conditions and Privacy Policy.");
        return;
      }
      const normalizedPhone = normalizePhone(phone);
      if (!isValidPhone(normalizedPhone, { optional: true })) {
        setLocalError("Use a 10-digit mobile number. If it starts with 91, we trim it automatically.");
        return;
      }
      await onSignUp({
        name: fullName,
        email: normalizedEmail,
        password,
        phone: normalizedPhone || undefined,
      });
      return;
    }

    if (mode === "verify-otp") {
      if (otp.length !== 6) {
        setLocalError("Please enter a 6-digit code.");
        return;
      }
      await onVerifyOtp?.({ email: normalizedEmail, otp });
      return;
    }

    if (mode === "verify-2fa") {
      if (otp.length !== 6) {
        setLocalError("Please enter a 6-digit code.");
        return;
      }
      await onVerifyTwoFa?.({ email: normalizedEmail, otp });
      return;
    }

    if (mode === "forgot-password") {
      await onForgotPassword?.({ email: normalizedEmail });
      setCountdown(60);
      return;
    }

    if (mode === "forgot-password-otp") {
      if (otp.length !== 6) {
        setLocalError("Please enter a 6-digit code.");
        return;
      }
      if (!PASSWORD_REGEX.test(password)) {
        setLocalError("Password must be at least 8 characters and include letters and numbers.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }
      await onResetPassword?.({ email: normalizedEmail, otp, newPassword: password });
      return;
    }
  };

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-4">
      <button
        aria-label="Close authentication modal"
        className="absolute inset-0 bg-black/65 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />

      <div className="relative z-10 w-full max-w-[560px] rounded-none border border-white/10 bg-[#171822] p-4 shadow-[6px_6px_0px_#991438] md:p-6">
        <button
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-5 w-5 items-center justify-center text-white/85 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <h2 className="font-['Cirka',serif] text-3xl font-bold tracking-tight text-white md:text-[40px] md:leading-[1]">{headline}</h2>
          {description && (
            <p className="mt-2 text-sm text-[#cbd5e1] font-medium font-['Space_Grotesk']">
              {description}
            </p>
          )}
        </div>

        <form className="mt-5 space-y-3 overflow-hidden" onSubmit={onSubmit}>
          {mode === "signup" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <LabelledInput
                label="First Name"
                onChange={setFirstName}
                placeholder="Alex"
                value={firstName}
              />
              <LabelledInput
                label="Last Name"
                onChange={setLastName}
                placeholder="Vibe"
                value={lastName}
              />
            </div>
          ) : null}

          {mode === "signup" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <LabelledInput
                autoComplete="email"
                label="Email Address"
                onChange={setEmail}
                placeholder="your@email.com"
                type="email"
                value={email}
              />
              <LabelledInput
                autoComplete="tel"
                label="Phone Number"
                onChange={setPhone}
                placeholder="Optional"
                type="tel"
                value={phone}
              />
            </div>
          ) : (mode === "signin" || mode === "forgot-password") ? (
            <LabelledInput
              autoComplete="email"
              label="Email Address"
              onChange={setEmail}
              placeholder="your@email.com"
              type="email"
              value={email}
            />
          ) : null}

          {showOtpSection ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[1.2px] text-[#F1F5F9]">6-Digit Code</span>
                <OtpField value={otp} onChange={setOtp} />
              </div>
              {showResendButton ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onResendOtp}
                    disabled={countdown > 0 || pending}
                    className="text-sm font-semibold text-[#FF2E62] disabled:opacity-50"
                  >
                    {countdown > 0 ? `Resend in 00:${countdown.toString().padStart(2, "0")}` : "Didn't receive it? Resend"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {(mode === "signup" || mode === "forgot-password-otp" || mode === "set-new-password") ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <LabelledInput
                autoComplete="new-password"
                label="Password"
                onChange={setPassword}
                placeholder="••••••••"
                type="password"
                value={password}
              />
              <LabelledInput
                autoComplete="new-password"
                label="Confirm Password"
                onChange={setConfirmPassword}
                placeholder="••••••••"
                type="password"
                value={confirmPassword}
              />
            </div>
          ) : mode === "signin" ? (
            <LabelledInput
              autoComplete="current-password"
              label="Password"
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
              value={password}
            />
          ) : null}

          {mode === "signin" ? (
            <div className="flex items-center justify-between text-sm text-white/80">
              <label className="inline-flex items-center gap-2.5">
                <input
                  checked={rememberMe}
                  className="h-[18px] w-[18px] rounded-none border border-white/15 bg-[#12131A] accent-[#FF2E62]"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span>Remember me</span>
              </label>

              <button
                className="font-semibold text-[#FF2E62]"
                type="button"
                onClick={() => switchMode("forgot-password")}
              >
                Forgot?
              </button>
            </div>
          ) : mode === "signup" ? (
            <label className="block rounded-none border border-dashed border-white/10 bg-[#12131A] px-4 py-3 text-sm text-white/85">
              <span className="inline-flex items-start gap-2.5">
                <input
                  checked={agreed}
                  className="mt-[3px] h-[18px] w-[18px] rounded-none border border-white/15 bg-[#12131A] accent-[#FF2E62]"
                  onChange={(event) => setAgreed(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I agree to the <Link className="font-bold text-[#FF2E62]" href="/policies/terms">Terms &amp; Conditions</Link> and{" "}
                  <Link className="font-bold text-[#FF2E62]" href="/policies/privacy">Privacy Policy</Link>
                </span>
              </span>
            </label>
          ) : null}

          <button
            aria-busy={pending || undefined}
            className="inline-flex h-12 w-full items-center justify-center rounded-none bg-[#FF2E62] border border-[#FF2E62] text-base font-bold uppercase tracking-[0.08em] text-white shadow-[4px_4px_0px_#991438] hover:bg-[#FF426F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pending || (mode === "signup" && !isSignupValid)}
            type="submit"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <ButtonSpinner className="h-4 w-4" />
                Please wait
              </span>
            ) : (
              ctaLabel
            )}
          </button>

          {(localError || errorMessage) ? (
            <p className="rounded-none border border-[#EE4D37] bg-[#EE4D37]/10 px-3 py-2 text-sm text-white">{localError ?? errorMessage}</p>
          ) : null}

          {(mode === "signin" || mode === "signup") ? (
            <>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-xs font-bold uppercase tracking-[1px] text-white/60">or</span>
                <div className="h-px flex-1 bg-white/20" />
              </div>

              <button
                className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-none border border-white/10 bg-[#12131A] text-sm font-bold text-white shadow-[3px_3px_0px_#991438] hover:bg-[#1E1F2D]"
                onClick={onGoogleAuth}
                type="button"
              >
                <Image
                  alt="Google"
                  className="h-[20px] w-[20px]"
                  height={20}
                  src="/testimonials logos/icons8-google-logo-96.png"
                  width={20}
                />
                <span>{mode === "signin" ? "Continue with Google" : "Sign up with Google"}</span>
              </button>
            </>
          ) : null}

          <div className="text-center text-base text-white/80">
            <span>{switchLabel} </span>
            <button
              className="font-bold text-[#FF2E62]"
              onClick={() => switchMode(switchTarget)}
              type="button"
            >
              {switchAction}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body,
  );
}

type LabelledInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "email" | "password" | "tel";
  autoComplete?: string;
};

function LabelledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: LabelledInputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[1.2px] text-[#F1F5F9]">{label}</span>
      <input
        autoComplete={autoComplete}
        className="h-[42px] w-full rounded-none border border-white/10 bg-[#12131A] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#FF2E62]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

type OtpFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

function OtpField({ value, onChange }: OtpFieldProps) {
  return (
    <OTPInput
      value={value}
      onChange={(nextValue) => onChange(nextValue.slice(0, 6))}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      containerClassName="flex items-center justify-between gap-2 sm:gap-3"
      className="w-full"
      autoFocus
      inputMode="numeric"
    >
      <OtpSlot index={0} />
      <OtpSlot index={1} />
      <OtpSlot index={2} />
      <OtpSlot index={3} />
      <OtpSlot index={4} />
      <OtpSlot index={5} />
    </OTPInput>
  );
}

function OtpSlot({ index }: { index: number }) {
  const inputOTPContext = useContext(OTPInputContext);
  const slot = inputOTPContext?.slots?.[index];

  return (
    <div
      className={`relative flex h-12 w-11 items-center justify-center rounded-none border border-[#3D3D3D] bg-[#12131A] text-lg font-bold text-white transition sm:h-14 sm:w-12 ${
        slot?.isActive ? "border-[#FF2E62] shadow-[2px_2px_0px_#FF2E62]" : "border-white/25"
      }`}
    >
      {slot?.char ?? ""}
      {slot?.hasFakeCaret ? <div className="absolute h-5 w-px animate-pulse bg-[#FF2E62]" /> : null}
    </div>
  );
}
