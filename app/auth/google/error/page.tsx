import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { GoogleAuthErrorContent } from "./google-auth-error-content";

function GoogleAuthErrorFallback() {
  return (
    <section className="vh-section py-20 pt-28 md:pt-32">
      <div className="vh-container">
        <div className="mx-auto w-full max-w-[560px] space-y-4 rounded-[14px] border border-[#c62828]/25 bg-[#2a1118]/60 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
          <Skeleton className="mx-auto h-8 w-72 rounded-full bg-white/12" />
          <Skeleton className="h-11 w-full rounded-xl bg-white/10" />
          <Skeleton className="h-11 w-full rounded-xl bg-white/10" />
        </div>
      </div>
    </section>
  );
}

export default function GoogleAuthErrorPage() {
  return (
    <Suspense fallback={<GoogleAuthErrorFallback />}>
      <GoogleAuthErrorContent />
    </Suspense>
  );
}
