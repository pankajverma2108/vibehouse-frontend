"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { footerLinks, siteMeta } from "@/content/site";
import { isStandalonePublicRoute } from "@/lib/feedback-route";

export function Footer() {
  const pathname = usePathname();

  if (isStandalonePublicRoute(pathname)) {
    return null;
  }

  return (
    <footer className="bg-[#0D0D0D] border-t border-[#3D3D3D] px-4 py-12 md:px-6">
      <div className="vh-container">
        <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4">
              <div className="text-2xl md:text-3xl font-extrabold tracking-[0.1em] uppercase text-white font-['Gilroy',sans-serif]">
                THE DAILY SOCIAL
              </div>
            </div>
            <p className="mb-4 text-sm uppercase tracking-[0.06em] text-white/65 font-['Gilroy',sans-serif]">{siteMeta.tagline}</p>
            <div className="space-y-1.5 text-sm text-white/65 font-['Gilroy',sans-serif]">
              {siteMeta.contact.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <a className="block transition-colors hover:text-[var(--np-yellow)]" href={siteMeta.contact.mapsHref} target="_blank" rel="noreferrer">
                View on Google Maps
              </a>
              <a className="block transition-colors hover:text-[var(--np-yellow)]" href={siteMeta.contact.phoneHref}>
                {siteMeta.contact.phoneDisplay}
              </a>
              <a className="block transition-colors hover:text-[var(--np-yellow)]" href={siteMeta.contact.emailHref}>
                {siteMeta.contact.email}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-2">
            <div>
              <h3 className="mb-4 font-['Gilroy',sans-serif] text-xs font-bold uppercase tracking-[0.12em] text-[var(--np-yellow)]">
                Quick Links
              </h3>
              <div className="space-y-2.5">
                {footerLinks.quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    className="block text-sm text-white/65 transition-colors hover:text-white"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-['Gilroy',sans-serif] text-xs font-bold uppercase tracking-[0.12em] text-[var(--np-yellow)]">
                Policies
              </h3>
              <div className="space-y-2.5">
                {footerLinks.legal.map((item) => (
                  <Link
                    key={item.href}
                    className="block text-sm text-white/65 transition-colors hover:text-white"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 h-px my-8 bg-[#3D3D3D]" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs uppercase tracking-[0.08em] text-white/45 font-['Gilroy',sans-serif]">
          <span>&copy; 2026 {siteMeta.name}. ALL RIGHTS RESERVED.</span>
          <span className="text-[var(--np-green)]">• LIVE PROPERTY DIRECT</span>
        </div>
      </div>
    </footer>
  );
}
