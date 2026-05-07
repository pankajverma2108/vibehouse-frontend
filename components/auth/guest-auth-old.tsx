"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

import { ElectricBorder } from "@/components/shared/electric-border";

type AuthMode = "signin" | "signup";

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
  pending: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSignIn: (payload: SignInPayload) => Promise<void>;
  onSignUp: (payload: SignUpPayload) => Promise<void>;
  onGoogleAuth: () => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export function GuestAuthModal({
  open,
  mode,
  pending,
  errorMessage,
  onClose,
  onSwitchMode,
  onSignIn,
  onSignUp,
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

  const switchMode = (nextMode: AuthMode) => {
    setLocalError(null);
    setPassword("");
    setConfirmPassword("");
    setPhone("");
    onSwitchMode(nextMode);
  };

  const headline = mode === "signin" ? "Welcome Back" : "Join The Crew";
  const ctaLabel = mode === "signin" ? "Let's Go!" : "Start My Journey!";
  const switchLabel = mode === "signin" ? "New to the vibe?" : "Already vibing?";
  const switchAction = mode === "signin" ? "Join the crew!" : "Sign in here!";
  const switchTarget = mode === "signin" ? "signup" : "signin";

  // Check if form is valid for signup
  const isSignupValid = useMemo(() => {
    if (mode !== "signup") return true;
    const normalizedName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const nameValid = normalizedName.length > 0;
    const emailValid = EMAIL_REGEX.test(normalizedEmail);
    const passwordValid = PASSWORD_REGEX.test(password);
    const confirmPasswordValid = password === confirmPassword && password.length > 0;
    const phoneValid = !normalizedPhone || PHONE_REGEX.test(normalizedPhone);

    return nameValid && emailValid && passwordValid && confirmPasswordValid && phoneValid && agreed;
  }, [mode, firstName, lastName, email, password, confirmPassword, phone, agreed]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setLocalError("Password must be at least 8 characters and include letters and numbers.");
      return;
    }

    if (mode === "signin") {
      await onSignIn({
        email: normalizedEmail,
        password,
        rememberMe,
      });
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

    const normalizedPhone = phone.trim();
    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      setLocalError("Phone number must be valid and include country code when possible.");
      return;
    }

    await onSignUp({
      name: fullName,
      email: normalizedEmail,
      password,
      phone: normalizedPhone || undefined,
    });
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
          ) : (
            <LabelledInput
              autoComplete="email"
              label="Email Address"
              onChange={setEmail}
              placeholder="your@email.com"
              type="email"
              value={email}
            />
          )}

          {mode === "signup" ? (
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
          ) : (
            <LabelledInput
              autoComplete="current-password"
              label="Password"
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
              value={password}
            />
          )}

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

              <button className="font-semibold text-[var(--vh-cyan)]" type="button">
                Forgot?
              </button>
            </div>
          ) : (
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
          )}

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

          <div className="flex items-center gap-3">
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

          <div className="flex justify-center pb-1">
            <ElectricBorder accentColor="#ff0088" className="rounded-[12px]" innerClassName="rounded-[11px] border-white/25 bg-[#1B2332] px-4 py-2" speed={3}>
              <span className="text-base font-semibold italic text-white/95">Let&apos;s Vibe!</span>
            </ElectricBorder>
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
