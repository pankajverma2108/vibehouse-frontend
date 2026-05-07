"use client";

import { useEffect } from "react";

import { clearStoredGuestToken, consumePostAuthRedirect, getGuestMe, setStoredGuestToken } from "@/lib/guest-auth-api";

function buildGoogleAuthErrorUrl(reason: string, detail?: string): string {
  const params = new URLSearchParams({ reason });

  if (detail && detail.trim().length > 0) {
    params.set("detail", detail);
  }

  return `/auth/google/error?${params.toString()}`;
}

export default function GoogleAuthSuccessPage() {
  useEffect(() => {
    let cancelled = false;

    const finalizeGoogleLogin = async () => {
      const searchParams = new URLSearchParams(window.location.search);

      const callbackReason = searchParams.get("reason");
      const callbackError = searchParams.get("error");
      const callbackDetail =
        searchParams.get("detail") ??
        searchParams.get("message") ??
        searchParams.get("error_description") ??
        undefined;

      if (callbackReason || callbackError) {
        const mappedReason = callbackReason || (callbackError === "access_denied" ? "auth_failed" : "callback_failed");
        window.location.replace(buildGoogleAuthErrorUrl(mappedReason, callbackDetail));
        return;
      }

      const token = (searchParams.get("token") ?? searchParams.get("access_token") ?? "").trim();

      if (!token) {
        window.location.replace(buildGoogleAuthErrorUrl("missing_token", callbackDetail));
        return;
      }

      setStoredGuestToken(token, true);

      try {
        await getGuestMe(token);

        if (!cancelled) {
          const searchParamsReturnTo = searchParams.get("return_to");
          const rememberedReturnTo = consumePostAuthRedirect();
          const nextPath = rememberedReturnTo || (searchParamsReturnTo?.startsWith("/") ? searchParamsReturnTo : "/");
          window.location.replace(nextPath);
        }
      } catch (error) {
        clearStoredGuestToken();

        const detail =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "The returned Google session token was rejected by /guest/auth/me.";

        if (!cancelled) {
          window.location.replace(buildGoogleAuthErrorUrl("session_validation_failed", detail));
        }
      }
    };

    void finalizeGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="vh-section py-20 pt-28 md:pt-32">
      <div className="vh-container">
        <div className="mx-auto max-w-[520px] rounded-[12px] border border-white/15 bg-white/5 p-8 text-center">
          <h1 className="text-3xl font-bold uppercase tracking-[1px] text-white">Signing You In</h1>
          <p className="mt-2 text-white/75">Finalizing your Google login...</p>
        </div>
      </div>
    </section>
  );
}
