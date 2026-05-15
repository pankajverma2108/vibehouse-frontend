"use client";

import { BookOpen, Clock3, HelpCircle, LifeBuoy, MapPin, ShieldCheck, UtensilsCrossed } from "lucide-react";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { Button } from "@/components/ui/button";
import { locationMap, nearbyAttractions, propertyAmenities, propertyGuidelines, roomFaqs } from "@/content/rooms";
import { siteMeta } from "@/content/site";

const supportPhoneDigits = siteMeta.contact.phoneDisplay.replace(/\D/g, "");
const supportHref = `https://wa.me/${supportPhoneDigits}?text=${encodeURIComponent("Hey The Daily Social, I need help during my stay.")}`;

export function GuestGuide() {
  return (
    <div className="space-y-10 pb-10 pt-4 md:space-y-12 md:pb-12">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-7">
          <p className="text-[11px] font-black uppercase text-[#f9cb37]">Guest Companion</p>
          <h1 className="mt-3 font-sectiontitle text-[36px] leading-tight text-white md:text-[52px]">Everything useful, before you have to ask.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#cbd5e1] md:text-base">
            House rhythm, local direction, rules, FAQs, and support details for a cleaner stay experience.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <BentoCard description={`Check-in starts at ${propertyGuidelines.checkIn}. Check-out is by ${propertyGuidelines.checkOut}.`} icon={Clock3} sticker={{ label: "Included", bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" }} title="Stay timings" />
          <BentoCard description="Keep a valid government ID ready and confirm visitor access with the desk." icon={ShieldCheck} sticker={{ label: "Recommended", bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[1deg]" }} title="Arrival basics" />
        </div>
      </section>

      <SectionBlock description="The practical rules guests usually need first." sticker={guestStickerTags.guide} title="Property Guide">
        <div className="grid gap-4 md:grid-cols-3">
          {propertyGuidelines.sections.map((section) => (
            <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5" key={section.title}>
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

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-6">
          <MapPin className="h-5 w-5 text-[#f9cb37]" />
          <h2 className="mt-4 font-sectiontitle text-[28px] leading-tight text-white">Around the property</h2>
          <p className="mt-3 text-sm leading-7 text-[#cbd5e1]">{locationMap.address}</p>
          <Button asChild className="mt-5 h-10 rounded-[4px] bg-[var(--vh-pink)] px-4 font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]">
            <a href={locationMap.embedUrl} rel="noreferrer" target="_blank">Open map</a>
          </Button>
        </article>
        <div className="grid gap-4 md:grid-cols-2">
          {nearbyAttractions.map((place) => (
            <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5" key={place.name}>
              <UtensilsCrossed className="h-5 w-5 text-[#f9cb37]" />
              <h3 className="mt-4 font-sectiontitle text-[22px] leading-7 text-white">{place.name}</h3>
              <p className="mt-2 text-sm text-[#cbd5e1]">{place.type} - {place.travel}</p>
            </article>
          ))}
        </div>
      </section>

      <SectionBlock description="A quick scan of the facilities and the answers guests tend to need mid-stay." title="Stay Notes">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5">
            <h3 className="font-sectiontitle text-[24px] leading-8 text-white">Amenities</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {propertyAmenities.map((amenity) => (
                <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-xs font-bold uppercase text-white/74" key={amenity.label}>
                  {amenity.label}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            {roomFaqs.slice(0, 5).map((faq) => (
              <details className="group rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4" key={faq.question}>
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

      <section className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase text-[#f9cb37]">Emergency / Support</p>
            <h2 className="mt-2 font-sectiontitle text-[28px] leading-tight text-white">Need the team right now?</h2>
            <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">{siteMeta.contact.phoneDisplay} - {siteMeta.contact.email}</p>
          </div>
          <Button asChild className="h-10 rounded-[4px] bg-white px-4 font-black uppercase text-[#07070a] hover:bg-white/90">
            <a href={supportHref} rel="noreferrer" target="_blank">
              <LifeBuoy className="mr-2 h-4 w-4" />
              WhatsApp support
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
