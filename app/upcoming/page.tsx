import type { Metadata } from "next";

import { UpcomingPage } from "@/components/standalone/upcoming-page";

export const metadata: Metadata = {
  title: "Upcoming Hubs",
  description: "Upcoming Vibehouse hubs in Koramangala.",
};

export default function Page() {
  return <UpcomingPage />;
}
