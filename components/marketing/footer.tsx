"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { footerLinks, siteMeta } from "@/content/site";

export function Footer() {
  const pathname = usePathname();

  if (pathname === "/upcoming" || pathname === "/partner-with-us") {
    return null;
  }

  return (
    <footer className="bg-[#07070a] px-4 py-10 md:px-6">
      <div className="vh-container">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4">
              <div className="vh-retro-sign-flat py-2 text-2xl md:text-4xl">
                THE D<span className="vh-flicker">A</span>ILY SO<span className="vh-flicker" style={{ animationDelay: "0.6s" }}>C</span>IA<span className="vh-flicker" style={{ animationDelay: "1.2s" }}>L</span>
              </div>
            </div>
            <p className="mb-4 italic text-white/65">{siteMeta.tagline}</p>
            <div className="space-y-1 text-sm text-white/65">
              {siteMeta.contact.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <a className="block hover:text-white" href={siteMeta.contact.mapsHref}>
                View on Google Maps
              </a>
              <a className="block hover:text-white" href={siteMeta.contact.phoneHref}>
                {siteMeta.contact.phoneDisplay}
              </a>
              <a className="block hover:text-white" href={siteMeta.contact.emailHref}>
                {siteMeta.contact.email}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-2">
            <div>
              <h3 className="mb-4 font-['Geologica'] text-sm font-bold uppercase tracking-[1px] text-white">
                Quick Links
              </h3>
              <div className="space-y-2">
                {footerLinks.quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    className="block text-sm text-white/65 hover:text-white"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-['Geologica'] text-sm font-bold uppercase tracking-[1px] text-white">
                Policies
              </h3>
              <div className="space-y-2">
                {footerLinks.legal.map((item) => (
                  <Link
                    key={item.href}
                    className="block text-sm text-white/65 hover:text-white"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 h-px my-8">
          <div className="flex-grow h-px bg-gradient-to-r from-transparent via-light-stroke-primary dark:via-dark-stroke-primary to-transparent" />
        </div>

        <div className="text-center text-xs text-white/45">
          &copy; 2026 {siteMeta.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
