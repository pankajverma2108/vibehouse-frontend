import type { Metadata } from "next";

import { PartnerWithUsPage } from "@/components/standalone/partner-with-us-page";

export const metadata: Metadata = {
  title: "Partner With Us",
  description: "Partner with Vibehouse to maximize property yield.",
};

export default function Page() {
  return <PartnerWithUsPage />;
}
