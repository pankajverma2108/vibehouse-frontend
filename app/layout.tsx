import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { GuestAuthProvider } from "@/components/auth/guest-auth-provider";
import { Footer } from "@/components/marketing/footer";
import { Navigation } from "@/components/marketing/navigation";
import { Toaster } from "@/components/ui/sonner";
import { siteMeta } from "@/content/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://thedailysocial.co.in"),
  title: {
    default: siteMeta.name,
    template: `%s | ${siteMeta.name}`,
  },
  description: siteMeta.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body suppressHydrationWarning className="vh-shell flex min-h-screen flex-col font-body bg-[#0D0D0D] text-white antialiased">
        <GuestAuthProvider>
          <Suspense fallback={null}>
            <Navigation />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster position="bottom-right" />
        </GuestAuthProvider>
      </body>
    </html>
  );
}
