"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp";

import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/guest-form-validation";

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

      <div className="relative z-10 w-full max-w-[560px] rounded-[24px] border border-white/14 bg-[radial-gradient(110%_84%_at_4%_0%,rgba(0,209,255,0.09),transparent_54%),radial-gradient(120%_100%_at_90%_84%,rgba(198,40,40,0.08),transparent_58%),linear-gradient(170deg,#250F16_0%,#180A12_58%,#130811_100%)] p-4 shadow-[0_26px_70px_rgba(0,0,0,0.45)] md:p-6">
        <button
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-5 w-5 items-center justify-center text-white/85 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <h2 className="text-3xl font-extrabold uppercase tracking-[-0.8px] text-white md:text-[42px] md:leading-[1]">{headline}</h2>
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
                    className="text-sm font-semibold text-[var(--vh-cyan)] disabled:opacity-50"
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
                  className="h-[18px] w-[18px] rounded border border-white/20 bg-white/5 accent-[var(--vh-pink)]"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span>Remember me</span>
              </label>

              <button 
                className="font-semibold text-[var(--vh-cyan)]" 
                type="button"
                onClick={() => switchMode("forgot-password")}
              >
                Forgot?
              </button>
            </div>
          ) : mode === "signup" ? (
            <label className="block rounded-[10px] border border-dashed border-white/25 bg-white/[0.03] px-4 py-3 text-sm text-white/85">
              <span className="inline-flex items-start gap-2.5">
                <input
                  checked={agreed}
                  className="mt-[3px] h-[18px] w-[18px] rounded border border-white/20 bg-white/5 accent-[var(--vh-cyan)]"
                  onChange={(event) => setAgreed(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I agree to the <Link className="font-bold text-[var(--vh-cyan)]" href="/policies/terms">Terms & Conditions</Link> and{" "}
                  <Link className="font-bold text-[var(--vh-cyan)]" href="/policies/privacy">Privacy Policy</Link>
                </span>
              </span>
            </label>
          ) : null}

          <button
            className={`inline-flex h-14 w-full items-center justify-center rounded-[10px] border-2 border-[#0F172A] text-lg font-extrabold uppercase tracking-[0.4px] shadow-[4px_4px_0px_rgba(0,0,0,0.30)] transition hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === "signin" ? "bg-[var(--vh-pink)] text-white" : "bg-[var(--vh-lime)] text-[#0F172A]"
            }`}
            disabled={pending || (mode === "signup" && !isSignupValid)}
            type="submit"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Please wait
              </span>
            ) : (
              ctaLabel
            )}
          </button>

          {(localError || errorMessage) ? (
            <p className="rounded-lg border border-[#c62828]/50 bg-[#c62828]/10 px-3 py-2 text-sm text-[#FDECEC]">{localError ?? errorMessage}</p>
          ) : null}

          {(mode === "signin" || mode === "signup") ? (
            <>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-xs font-bold uppercase tracking-[1px] text-white/60">or</span>
                <div className="h-px flex-1 bg-white/20" />
              </div>

              <button
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-[#39FF14]/35 bg-[#1E293B] text-sm font-medium text-[#F1F5F9] hover:bg-[#22314a]"
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
              className={`font-bold ${mode === "signin" ? "text-[var(--vh-pink)]" : "text-[var(--vh-lime)]"}`}
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
        className="h-[40px] w-full rounded-[10px] border-2 border-white/25 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[var(--vh-cyan)]"
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
      className={`relative flex h-12 w-11 items-center justify-center rounded-[10px] border-2 bg-white/5 text-lg font-bold text-white transition sm:h-14 sm:w-12 ${
        slot?.isActive ? "border-[var(--vh-cyan)]" : "border-white/25"
      }`}
    >
      {slot?.char ?? ""}
      {slot?.hasFakeCaret ? <div className="absolute h-5 w-px animate-pulse bg-[var(--vh-cyan)]" /> : null}
    </div>
  );
}
