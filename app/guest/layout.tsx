import type { ReactNode } from "react";

import { GuestHubShell } from "@/components/guest/guest-hub-shell";
import { GuestExperienceProvider } from "@/state/guest-experience-provider";

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <GuestExperienceProvider>
      <GuestHubShell>
        {children}
      </GuestHubShell>
    </GuestExperienceProvider>
  );
}
