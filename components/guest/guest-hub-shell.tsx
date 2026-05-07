import type { ReactNode } from "react";

import { GuestNav } from "@/components/guest/guest-nav";
import { GuestPageShell } from "@/components/guest/guest-page-shell";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";

export function GuestHubShell({ children }: { children: ReactNode }) {
  return (
    <GuestPageShell sticker={guestStickerTags.shell} title="Guest Hub">
      <GuestNav />
      {children}
    </GuestPageShell>
  );
}
