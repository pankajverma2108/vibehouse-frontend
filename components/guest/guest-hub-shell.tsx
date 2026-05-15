import type { ReactNode } from "react";

import { GuestNav } from "@/components/guest/guest-nav";
import { GuestPageShell } from "@/components/guest/guest-page-shell";

export function GuestHubShell({ children }: { children: ReactNode }) {
  return (
    <GuestPageShell>
      <GuestNav />
      {children}
    </GuestPageShell>
  );
}
