"use client";

import { BookOpen, MapPin } from "lucide-react";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";

export function GuestGuide() {
  return (
    <SectionBlock
      description="Everything you need to settle in, step out, and get back smoothly."
      sticker={guestStickerTags.guide}
      title="Property guide"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <BentoCard description="Quick house rules, timings, access notes, and the practical stuff guests ask first." icon={BookOpen} title="Guide basics" />
        <BentoCard description="Helpful neighborhood directions, nearby picks, and easy arrival references." icon={MapPin} title="Around here" />
      </div>
    </SectionBlock>
  );
}
