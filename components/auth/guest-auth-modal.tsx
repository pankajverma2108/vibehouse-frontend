"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Eye, EyeOff, AlertCircle, Check } from "lucide-react";
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

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field touched tracking for realtime inline error messages
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const resolvedEmail = email || prefillEmail || "";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const markTouched = (field: string) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const switchMode = (nextMode: AuthMode) => {
    setLocalError(null);
    setTouched({});
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (nextMode !== "forgot-password" && nextMode !== "forgot-password-otp") {
      setPhone("");
      setOtp("");
    }
    onSwitchMode(nextMode);
  };

  // Real-time inline field validations
  const inlineErrors = useMemo(() => {
    const errs: Record<string, string | null> = {};

    if (mode === "signup") {
      if (touched.firstName && !firstName.trim()) {
        errs.firstName = "First name is required.";
      }
      if (touched.lastName && !lastName.trim()) {
        errs.lastName = "Last name is required.";
      }
      if (touched.email) {
        const norm = normalizeEmail(email);
        if (!norm) {
          errs.email = "Email address is required.";
        } else if (!isValidEmail(norm)) {
          errs.email = "Enter a valid email address (e.g. name@domain.com).";
        }
      }
      if (touched.phone && phone.trim()) {
        const norm = normalizePhone(phone);
        if (!isValidPhone(norm, { optional: false })) {
          errs.phone = "Enter a valid 10-digit mobile number.";
        }
      }
      if (touched.password) {
        if (!password) {
          errs.password = "Password is required.";
        } else if (password.length < 8) {
          errs.password = "Password must be at least 8 characters.";
        } else if (!PASSWORD_REGEX.test(password)) {
          errs.password = "Must include at least one letter and one number.";
        }
      }
      if (touched.confirmPassword) {
        if (!confirmPassword) {
          errs.confirmPassword = "Confirm your password.";
        } else if (password !== confirmPassword) {
          errs.confirmPassword = "Passwords do not match.";
        }
      }
      if (touched.agreed && !agreed) {
        errs.agreed = "You must agree to Terms & Conditions and Privacy Policy to continue.";
      }
    } else if (mode === "signin") {
      if (touched.email) {
        const norm = normalizeEmail(email);
        if (!norm) {
          errs.email = "Email address is required.";
        } else if (!isValidEmail(norm)) {
          errs.email = "Enter a valid email address.";
        }
      }
      if (touched.password && !password) {
        errs.password = "Password is required.";
      }
    } else if (mode === "forgot-password") {
      if (touched.email) {
        const norm = normalizeEmail(email);
        if (!norm) {
          errs.email = "Email address is required.";
        } else if (!isValidEmail(norm)) {
          errs.email = "Enter a valid email address.";
        }
      }
    } else if (mode === "forgot-password-otp" || mode === "set-new-password") {
      if (touched.password) {
        if (!password) {
          errs.password = "Password is required.";
        } else if (!PASSWORD_REGEX.test(password)) {
          errs.password = "Must be at least 8 characters with letters & numbers.";
        }
      }
      if (touched.confirmPassword) {
        if (!confirmPassword) {
          errs.confirmPassword = "Confirm your password.";
        } else if (password !== confirmPassword) {
          errs.confirmPassword = "Passwords do not match.";
        }
      }
    }

    return errs;
  }, [mode, touched, firstName, lastName, email, phone, password, confirmPassword, agreed]);

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

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const normalizedEmail = normalizeEmail(email);

    if (mode === "signin") {
      setTouched({ email: true, password: true });
      if (!isValidEmail(normalizedEmail)) {
        setLocalError("Please enter a valid email address.");
        emailRef.current?.focus();
        return;
      }
      if (!password) {
        setLocalError("Please enter your password.");
        passwordRef.current?.focus();
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
      // Mark all fields touched so inline errors reveal immediately if anything is wrong
      setTouched({
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        password: true,
        confirmPassword: true,
        agreed: true,
      });

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (!firstName.trim()) {
        setLocalError("Please enter your first name.");
        firstNameRef.current?.focus();
        return;
      }
      if (!lastName.trim()) {
        setLocalError("Please enter your last name.");
        return;
      }
      if (!isValidEmail(normalizedEmail)) {
        setLocalError("Please enter a valid email address.");
        emailRef.current?.focus();
        return;
      }

      const normalizedPhone = normalizePhone(phone);
      if (phone.trim() && !isValidPhone(normalizedPhone, { optional: false })) {
        setLocalError("Please enter a valid 10-digit mobile number.");
        return;
      }

      if (password.length < 8) {
        setLocalError("Password must be at least 8 characters.");
        passwordRef.current?.focus();
        return;
      }

      if (!PASSWORD_REGEX.test(password)) {
        setLocalError("Password must include at least one letter and one number.");
        passwordRef.current?.focus();
        return;
      }

      if (password !== confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }

      if (!agreed) {
        setLocalError("Please accept the Terms & Conditions and Privacy Policy to continue.");
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
      setTouched({ email: true });
      if (!isValidEmail(normalizedEmail)) {
        setLocalError("Please enter a valid email address.");
        return;
      }
      await onForgotPassword?.({ email: normalizedEmail });
      setCountdown(60);
      return;
    }

    if (mode === "forgot-password-otp" || mode === "set-new-password") {
      setTouched({ password: true, confirmPassword: true });
      if (mode === "forgot-password-otp" && otp.length !== 6) {
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

  // Password requirement checks for signup mode
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasLetterAndNumber = hasLetter && hasNumber;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-4">
      <button
        aria-label="Close authentication modal"
        className="absolute inset-0 bg-black/65 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />

      <div className="relative z-10 w-full max-w-[560px] max-h-[92vh] overflow-y-auto rounded-none border border-white/10 bg-[#171822] p-4 shadow-[6px_6px_0px_#991438] md:p-6 custom-scrollbar">
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

        <form className="mt-5 space-y-3.5" noValidate onSubmit={onSubmit}>
          {mode === "signup" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <LabelledInput
                error={inlineErrors.firstName}
                inputRef={firstNameRef}
                label="First Name"
                onBlur={() => markTouched("firstName")}
                onChange={(val) => {
                  setFirstName(val);
                  if (val.trim()) setLocalError(null);
                }}
                placeholder="Alex"
                value={firstName}
              />
              <LabelledInput
                error={inlineErrors.lastName}
                label="Last Name"
                onBlur={() => markTouched("lastName")}
                onChange={(val) => {
                  setLastName(val);
                  if (val.trim()) setLocalError(null);
                }}
                placeholder="Vibe"
                value={lastName}
              />
            </div>
          ) : null}

          {mode === "signup" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <LabelledInput
                autoComplete="email"
                error={inlineErrors.email}
                inputRef={emailRef}
                label="Email Address"
                onBlur={() => markTouched("email")}
                onChange={(val) => {
                  setEmail(val);
                  setLocalError(null);
                }}
                placeholder="your@email.com"
                type="email"
                value={email}
              />
              <LabelledInput
                autoComplete="tel"
                error={inlineErrors.phone}
                label="Phone Number"
                onBlur={() => markTouched("phone")}
                onChange={(val) => {
                  setPhone(val);
                  setLocalError(null);
                }}
                optional
                placeholder="10-digit mobile"
                type="tel"
                value={phone}
              />
            </div>
          ) : (mode === "signin" || mode === "forgot-password") ? (
            <LabelledInput
              autoComplete="email"
              error={inlineErrors.email}
              inputRef={emailRef}
              label="Email Address"
              onBlur={() => markTouched("email")}
              onChange={(val) => {
                setEmail(val);
                setLocalError(null);
              }}
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
                    className="text-sm font-semibold text-[#FF2E62] disabled:opacity-50 hover:underline"
                  >
                    {countdown > 0 ? `Resend in 00:${countdown.toString().padStart(2, "0")}` : "Didn't receive it? Resend"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {(mode === "signup" || mode === "forgot-password-otp" || mode === "set-new-password") ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <LabelledInput
                    autoComplete="new-password"
                    error={inlineErrors.password}
                    inputRef={passwordRef}
                    isPasswordVisible={showPassword}
                    label="Password"
                    onBlur={() => markTouched("password")}
                    onChange={(val) => {
                      setPassword(val);
                      setLocalError(null);
                    }}
                    onToggleVisibility={() => setShowPassword((prev) => !prev)}
                    placeholder="••••••••"
                    showToggle
                    type="password"
                    value={password}
                  />
                  {mode === "signup" && password.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px]">
                      <span className={`inline-flex items-center gap-1 ${hasMinLength ? "text-emerald-400 font-semibold" : "text-white/40"}`}>
                        {hasMinLength ? <Check className="h-3 w-3" /> : "○"} 8+ chars
                      </span>
                      <span className={`inline-flex items-center gap-1 ${hasLetterAndNumber ? "text-emerald-400 font-semibold" : "text-white/40"}`}>
                        {hasLetterAndNumber ? <Check className="h-3 w-3" /> : "○"} Letters &amp; numbers
                      </span>
                    </div>
                  ) : null}
                </div>

                <div>
                  <LabelledInput
                    autoComplete="new-password"
                    error={inlineErrors.confirmPassword}
                    isPasswordVisible={showConfirmPassword}
                    label="Confirm Password"
                    onBlur={() => markTouched("confirmPassword")}
                    onChange={(val) => {
                      setConfirmPassword(val);
                      setLocalError(null);
                    }}
                    onToggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
                    placeholder="••••••••"
                    showToggle
                    type="password"
                    value={confirmPassword}
                  />
                  {mode === "signup" && confirmPassword.length > 0 ? (
                    <div className="mt-1.5 text-[11px]">
                      {passwordsMatch ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                          <Check className="h-3 w-3" /> Passwords match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#FF426F]">
                          ✕ Passwords do not match
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : mode === "signin" ? (
            <LabelledInput
              autoComplete="current-password"
              error={inlineErrors.password}
              inputRef={passwordRef}
              isPasswordVisible={showPassword}
              label="Password"
              onBlur={() => markTouched("password")}
              onChange={(val) => {
                setPassword(val);
                setLocalError(null);
              }}
              onToggleVisibility={() => setShowPassword((prev) => !prev)}
              placeholder="••••••••"
              showToggle
              type="password"
              value={password}
            />
          ) : null}

          {mode === "signin" ? (
            <div className="flex items-center justify-between text-sm text-white/80">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  checked={rememberMe}
                  className="h-[18px] w-[18px] rounded-none border border-white/15 bg-[#12131A] accent-[#FF2E62]"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span>Remember me</span>
              </label>

              <button
                className="font-semibold text-[#FF2E62] hover:underline"
                type="button"
                onClick={() => switchMode("forgot-password")}
              >
                Forgot?
              </button>
            </div>
          ) : mode === "signup" ? (
            <div>
              <label
                className={`block rounded-none border bg-[#12131A] px-4 py-3 text-sm text-white/85 transition-colors cursor-pointer ${
                  inlineErrors.agreed
                    ? "border-[#FF2E62] bg-[#FF2E62]/10"
                    : "border-dashed border-white/10 hover:border-white/20"
                }`}
              >
                <span className="inline-flex items-start gap-2.5">
                  <input
                    checked={agreed}
                    className="mt-[3px] h-[18px] w-[18px] rounded-none border border-white/15 bg-[#12131A] accent-[#FF2E62]"
                    onChange={(event) => {
                      setAgreed(event.target.checked);
                      if (event.target.checked) {
                        setTouched((t) => ({ ...t, agreed: false }));
                        setLocalError(null);
                      }
                    }}
                    type="checkbox"
                  />
                  <span>
                    I agree to the{" "}
                    <Link className="font-bold text-[#FF2E62] underline hover:text-[#FF426F]" href="/policies/terms" target="_blank">
                      Terms &amp; Conditions
                    </Link>{" "}
                    and{" "}
                    <Link className="font-bold text-[#FF2E62] underline hover:text-[#FF426F]" href="/policies/privacy" target="_blank">
                      Privacy Policy
                    </Link>
                  </span>
                </span>
              </label>
              {inlineErrors.agreed ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-[#FF426F]">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{inlineErrors.agreed}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            aria-busy={pending || undefined}
            className="inline-flex h-12 w-full items-center justify-center rounded-none bg-[#FF2E62] border border-[#FF2E62] text-base font-bold uppercase tracking-[0.08em] text-white shadow-[4px_4px_0px_#991438] hover:bg-[#FF426F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={pending}
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
            <div className="flex items-start gap-2 rounded-none border border-[#EE4D37] bg-[#EE4D37]/15 px-3 py-2 text-sm text-white">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#EE4D37] mt-0.5" />
              <span>{localError ?? errorMessage}</span>
            </div>
          ) : null}

          {(mode === "signin" || mode === "signup") ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-xs font-bold uppercase tracking-[1px] text-white/60">or</span>
                <div className="h-px flex-1 bg-white/20" />
              </div>

              <button
                className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-none border border-white/10 bg-[#12131A] text-sm font-bold text-white shadow-[3px_3px_0px_#991438] hover:bg-[#1E1F2D] cursor-pointer"
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

          <div className="text-center text-base text-white/80 pt-1">
            <span>{switchLabel} </span>
            <button
              className="font-bold text-[#FF2E62] hover:underline cursor-pointer"
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
  error?: string | null;
  onBlur?: () => void;
  showToggle?: boolean;
  isPasswordVisible?: boolean;
  onToggleVisibility?: () => void;
  optional?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

function LabelledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  error,
  onBlur,
  showToggle,
  isPasswordVisible,
  onToggleVisibility,
  optional,
  inputRef,
}: LabelledInputProps) {
  const inputType = showToggle ? (isPasswordVisible ? "text" : "password") : type;

  return (
    <div className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="block text-xs font-bold uppercase tracking-[1.2px] text-[#F1F5F9]">{label}</span>
        {optional ? <span className="text-[11px] font-medium uppercase text-white/40">Optional</span> : null}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          autoComplete={autoComplete}
          className={`h-[42px] w-full rounded-none border bg-[#12131A] px-3 text-sm text-white outline-none placeholder:text-white/40 transition-colors ${
            showToggle ? "pr-10" : ""
          } ${
            error
              ? "border-[#FF2E62] focus:border-[#FF426F]"
              : "border-white/10 focus:border-[#FF2E62]"
          }`}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={inputType}
          value={value}
        />
        {showToggle ? (
          <button
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors focus:outline-none cursor-pointer"
            onClick={onToggleVisibility}
            tabIndex={-1}
            type="button"
          >
            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-[#FF426F]">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
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
