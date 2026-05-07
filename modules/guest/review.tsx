"use client";

import { MessageSquareText, Star } from "lucide-react";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";

export function GuestReview() {
  return (
    <SectionBlock
      description="Tell us what felt great and what should be even sharper next time."
      sticker={guestStickerTags.review}
      title="Leave review"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <BentoCard description="Rate the stay across the moments that mattered most." icon={Star} title="Rating" />
        <BentoCard description="Leave a note the team can actually act on before you come back." icon={MessageSquareText} title="Feedback" />
      </div>
    </SectionBlock>
  );
}
