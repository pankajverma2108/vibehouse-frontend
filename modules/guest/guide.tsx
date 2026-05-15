"use client";

import { BookOpen, Clock3, HelpCircle, MapPin, ShieldCheck, UtensilsCrossed } from "lucide-react";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { Button } from "@/components/ui/button";
import { locationMap, nearbyAttractions, propertyAmenities, propertyGuidelines, roomFaqs } from "@/content/rooms";
import { siteMeta } from "@/content/site";

const supportPhoneDigits = siteMeta.contact.phoneDisplay.replace(/\D/g, "");
const supportHref = `https://wa.me/${supportPhoneDigits}?text=${encodeURIComponent("Hey The Daily Social, I need help during my stay.")}`;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M19.11 4.93A10 10 0 0 0 12 2a9.95 9.95 0 0 0-8.38 15.34L3 22l4.82-1.48A10 10 0 1 0 19.11 4.93ZM12 20.1a8.04 8.04 0 0 1-4.09-1.12l-.29-.17-2.86.88.93-2.77-.19-.3A8.05 8.05 0 1 1 12 20.1Zm4.23-5.9c-.23-.11-1.34-.66-1.55-.74-.21-.08-.36-.11-.52.11-.15.23-.6.74-.73.9-.13.15-.27.17-.5.06-.23-.12-.96-.35-1.83-1.12-.67-.6-1.13-1.34-1.26-1.57-.13-.23-.01-.35.1-.47.1-.1.23-.27.34-.4.11-.13.15-.23.23-.38.08-.16.04-.29-.02-.4-.06-.11-.53-1.27-.72-1.74-.19-.46-.38-.4-.52-.4h-.44c-.16 0-.4.06-.61.29-.21.23-.8.78-.8 1.9s.82 2.19.93 2.34c.11.15 1.6 2.44 3.88 3.42.54.23.96.37 1.29.47.54.17 1.03.15 1.42.09.43-.07 1.34-.55 1.53-1.08.19-.53.19-.98.13-1.08-.06-.1-.21-.17-.44-.28Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function GuestGuide() {
  return (
    <div className="space-y-10 pb-10 pt-4 md:space-y-12 md:pb-12">
      {/* SECTION: Guide Hero */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]" id="guide-hero-section">
        <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-7" id="guide-hero-card">
          <p className="text-[11px] font-black uppercase text-[#f9cb37]">Guest Companion</p>
          <h1 className="mt-3 font-sectiontitle text-[36px] leading-tight text-white md:text-[52px]">Everything useful, before you have to ask.</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <BentoCard description={`Check-in starts at ${propertyGuidelines.checkIn}. Check-out is by ${propertyGuidelines.checkOut}.`} icon={Clock3} sticker={{ label: "Included", bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" }} title="Stay timings" />
          <BentoCard description="Keep a valid government ID ready and confirm visitor access with the desk." icon={ShieldCheck} sticker={{ label: "Recommended", bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[1deg]" }} title="Arrival basics" />
        </div>
      </section>

      {/* SECTION: Property Guide */}
      <SectionBlock description="The practical rules guests usually need first." sticker={guestStickerTags.guide} title="Property Guide">
        <div className="grid gap-4 md:grid-cols-3">
          {propertyGuidelines.sections.map((section) => (
            <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5" id={`guide-card-${section.title.toLowerCase().replaceAll(" ", "-")}`} key={section.title}>
              <BookOpen className="h-5 w-5 text-[#f9cb37]" />
              <h3 className="mt-4 font-sectiontitle text-[22px] leading-7 text-white">{section.title}</h3>
              <div className="mt-4 space-y-3">
                {section.content.map((line) => (
                  <p className="border-t border-white/10 pt-3 text-sm leading-6 text-[#cbd5e1]" key={line}>{line}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionBlock>

      {/* SECTION: Around Property */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]" id="around-property-section">
        <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-6" id="around-property-map-card">
          <MapPin className="h-5 w-5 text-[#f9cb37]" />
          <h2 className="mt-4 font-sectiontitle text-[28px] leading-tight text-white">Around the property</h2>
          <p className="mt-3 text-sm leading-7 text-[#cbd5e1]">{locationMap.address}</p>
          <Button asChild className="vh-cta-button mt-5 h-10 rounded-[4px] px-4 text-xs">
            <a href={locationMap.embedUrl} rel="noreferrer" target="_blank">Open map</a>
          </Button>
        </article>
        <div className="grid gap-4 md:grid-cols-2">
          {nearbyAttractions.map((place) => (
            <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5" id={`local-card-${place.name.toLowerCase().replaceAll(" ", "-")}`} key={place.name}>
              <UtensilsCrossed className="h-5 w-5 text-[#f9cb37]" />
              <h3 className="mt-4 font-sectiontitle text-[22px] leading-7 text-white">{place.name}</h3>
              <p className="mt-2 text-sm text-[#cbd5e1]">{place.type} - {place.travel}</p>
            </article>
          ))}
        </div>
      </section>

      {/* SECTION: Stay Notes */}
      <SectionBlock description="A quick scan of the facilities and the answers guests tend to need mid-stay." title="Stay Notes">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5" id="stay-notes-amenities-card">
            <h3 className="font-sectiontitle text-[24px] leading-8 text-white">Amenities</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {propertyAmenities.map((amenity) => (
                <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-xs font-bold uppercase text-white/74" key={amenity.label}>
                  {amenity.label}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-7 text-[#cbd5e1]">
              House rhythm, local direction, rules, FAQs, and support details for a cleaner stay experience.
            </p>
          </div>
          <div className="grid gap-3">
            {roomFaqs.slice(0, 5).map((faq) => (
              <details className="group rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4" id={`faq-card-${faq.question.toLowerCase().replaceAll(" ", "-").replaceAll("?", "")}`} key={faq.question}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-sectiontitle text-base text-white">
                  {faq.question}
                  <HelpCircle className="h-4 w-4 shrink-0 text-[#f9cb37]" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-[#cbd5e1]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </SectionBlock>

      {/* SECTION: Emergency Support */}
      <section className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-6" id="emergency-support-section">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase text-[#f9cb37]">Emergency / Support</p>
            <h2 className="mt-2 font-sectiontitle text-[28px] leading-tight text-white">Need the team right now?</h2>
            <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">
              <a className="underline underline-offset-4 hover:text-white" href={siteMeta.contact.phoneHref}>{siteMeta.contact.phoneDisplay}</a>
              {" - "}
              <a className="underline underline-offset-4 hover:text-white" href={siteMeta.contact.emailHref}>{siteMeta.contact.email}</a>
            </p>
          </div>
          <Button asChild className="vh-cta-button h-10 rounded-[4px] px-4 text-xs">
            <a href={supportHref} rel="noreferrer" target="_blank">
              <WhatsAppIcon className="mr-2 h-4 w-4" />
              WhatsApp support
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
