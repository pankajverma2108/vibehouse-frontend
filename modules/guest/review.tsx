"use client";

import { MessageSquareText, Sparkles, Star } from "lucide-react";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { Button } from "@/components/ui/button";

export function GuestReview() {
  return (
    <div className="space-y-8 pb-10 pt-4 md:pb-12">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-7">
          <p className="text-[11px] font-black uppercase text-[#f9cb37]">Guest Note</p>
          <h1 className="mt-3 font-sectiontitle text-[36px] leading-tight text-white md:text-[52px]">Tell the team what mattered.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#cbd5e1] md:text-base">
            A short, useful review helps the property sharpen the next stay without turning feedback into a form marathon.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <BentoCard description="Rate the stay across arrival, room comfort, service, and property experience." icon={Star} sticker={{ label: "Guest Favorite", bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" }} title="Stay rating" />
          <BentoCard description="Add a concise note for the team to act on before your next visit." icon={MessageSquareText} sticker={{ label: "Recommended", bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[1deg]" }} title="Helpful feedback" />
        </div>
      </section>

      <SectionBlock
        description="This visual pass keeps the review surface ready for the existing feedback flow."
        sticker={guestStickerTags.review}
        title="Review Your Stay"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <BentoCard description="Room comfort, cleanliness, and access basics." icon={Star} title="Stay quality">
            <div className="flex gap-1 text-[#f9cb37]" aria-label="Five star rating preview">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star className="h-5 w-5 fill-current" key={index} />
              ))}
            </div>
          </BentoCard>
          <BentoCard description="Services, desk response, and issue handling." icon={Sparkles} title="Hospitality">
            <p className="text-sm leading-6 text-white/72">Quick notes beat vague compliments. Mention the moment that helped.</p>
          </BentoCard>
          <BentoCard description="A short note for future guests and the property team." icon={MessageSquareText} title="Your note">
            <Button className="h-10 rounded-[4px] bg-[var(--vh-pink)] px-4 font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]" type="button">
              Add feedback
            </Button>
          </BentoCard>
        </div>
      </SectionBlock>
    </div>
  );
}
