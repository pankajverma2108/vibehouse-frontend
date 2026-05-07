"use client";

import { useEffect, useState } from "react";
import { useGuestAuth } from "./guest-auth-provider";
import { AlertCircle } from "lucide-react";

export function GuestVerificationBanner() {
  const { guest, isAuthenticated, isPending, openAuthModal, resendVerificationCode } = useGuestAuth();
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  if (!isAuthenticated || !guest || guest.email_verified) {
    return null;
  }

  const onResendCode = async () => {
    await resendVerificationCode(guest.email);
    setCountdown(60);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-[var(--vh-pink)]/45 bg-[linear-gradient(135deg,rgba(198,40,40,0.18),rgba(15,16,26,0.92))] px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <AlertCircle className="h-4 w-4 shrink-0 text-[var(--vh-cyan)]" />
            Verify your email to link bookings and keep your account secure.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onResendCode}
            disabled={isPending || countdown > 0}
            className="rounded-full border border-white/25 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.8px] text-white transition hover:border-white/45 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {countdown > 0 ? `Resend in 00:${countdown.toString().padStart(2, "0")}` : "Resend code"}
          </button>
          <button
            onClick={() => openAuthModal("verify-otp")}
            className="rounded-full bg-[var(--vh-pink)] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.8px] text-white transition hover:bg-[var(--vh-pink-soft)]"
          >
            Verify Now
          </button>
        </div>
      </div>
    </div>
  );
}
