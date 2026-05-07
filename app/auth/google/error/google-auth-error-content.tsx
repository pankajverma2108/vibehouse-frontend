"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getGuestGoogleAuthUrl, getPostAuthRedirect } from "@/lib/guest-auth-api";

type ReasonDetails = {
  title: string;
  description: string;
};

const reasonMap: Record<string, ReasonDetails> = {
  callback_failed: {
    title: "Google Login Could Not Be Completed",
    description: "We could not finish the callback handshake. This is usually a temporary server-side issue.",
  },
  auth_failed: {
    title: "Google Authentication Failed",
    description: "We could not exchange the Google sign-in response for your account session. Please try again.",
  },
  login_failed: {
    title: "Account Login Could Not Be Completed",
    description: "Google sign-in succeeded, but we could not finish creating your account session. Please try again.",
  },
  missing_token: {
    title: "Google Login Did Not Return A Token",
    description: "Google sign-in finished, but no session token reached the app.",
  },
  session_validation_failed: {
    title: "Google Session Could Not Be Restored",
    description: "We received a Google login token, but the backend rejected it when the app tried to restore your session.",
  },
  unknown: {
    title: "Login Could Not Be Completed",
    description: "Something interrupted sign-in before your session was created.",
  },
};

export function GoogleAuthErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") ?? "unknown";
  const detail = searchParams.get("detail");
  const returnPath = getPostAuthRedirect() || "/";
  const reasonDetails = reasonMap[reason] ?? reasonMap.unknown;

  return (
    <section className="vh-section py-20 pt-28 md:pt-32">
      <div className="vh-container">
        <div className="mx-auto max-w-[560px] rounded-[14px] border border-[#c62828]/45 bg-[#2a1118] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
          <h1 className="text-3xl font-bold uppercase tracking-[1px] text-white">{reasonDetails.title}</h1>
          <p className="mt-3 text-white/80">{reasonDetails.description}</p>
          {detail ? <p className="mt-2 text-sm text-white/70">Detail: {detail}</p> : null}
          <p className="mt-2 text-sm text-white/60">Reason: {reason}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--vh-pink)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--vh-pink-soft)]"
              onClick={() => {
                const returnPath = getPostAuthRedirect() || undefined;
                window.location.href = getGuestGoogleAuthUrl(returnPath);
              }}
              type="button"
            >
              Try Google Sign-In Again
            </button>

            <Link
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
              href={returnPath}
            >
              Go Back
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
