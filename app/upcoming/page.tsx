import type { Metadata } from "next";

import { UpcomingPage } from "@/components/standalone/partner-upcoming-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upcoming Hubs",
  description: "Upcoming The Daily Social hubs in Koramangala.",
};

export default function Page() {
  return <UpcomingPage />;
}
