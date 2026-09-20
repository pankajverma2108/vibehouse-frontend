"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { VibehouseLogo } from "./vibehouse-logo";
import { footerLinks, siteMeta } from "@/content/site";
import { isStandalonePublicRoute } from "@/lib/feedback-route";

export function Footer() {
  const pathname = usePathname();

  if (isStandalonePublicRoute(pathname)) {
    return null;
  }

  return (
    <footer className="bg-black border-t border-white/[0.08] px-4 py-16 md:px-8">
      <div className="vh-container max-w-[1545px] mx-auto">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2 space-y-4">
            <VibehouseLogo />
            <p className="text-xs uppercase tracking-[0.14em] text-white/75 font-body font-bold">
              Stay, Play, Belong.
            </p>
            <div className="space-y-1.5 text-xs text-white/65 font-body">
              {siteMeta.contact.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <a className="block transition-colors hover:text-[#E01E5A]" href={siteMeta.contact.mapsHref} target="_blank" rel="noreferrer">
                View on Google Maps
              </a>
              <a className="block transition-colors hover:text-[#E01E5A]" href={siteMeta.contact.emailHref}>
                {siteMeta.contact.email}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-2">
            <div>
              <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-wider text-white border-b border-white/10 pb-2">
                Quick Links
              </h3>
              <div className="space-y-2.5">
                {footerLinks.quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    className="block text-xs font-body uppercase tracking-[0.06em] text-white/70 transition-colors hover:text-white"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-wider text-white border-b border-white/10 pb-2">
                Policies
              </h3>
              <div className="space-y-2.5">
                {footerLinks.legal.map((item) => (
                  <Link
                    key={item.href}
                    className="block text-xs font-body uppercase tracking-[0.06em] text-white/70 transition-colors hover:text-white"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 h-px my-8 bg-white/10" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-wider text-white/40">
          <span>&copy; 2026 {siteMeta.name}. ALL RIGHTS RESERVED.</span>
          <span className="text-[#2FBC81]">● LIVE PROPERTY DIRECT</span>
        </div>
      </div>
    </footer>
  );
}
