import type { Metadata } from "next";

import { FeedbackRoute } from "@/components/feedback/feedback-route";
import { STATIC_ROUTE_SHELL_SEGMENT } from "@/lib/static-export-routes";

export const metadata: Metadata = {
  title: "Support Feedback",
  description: "Rate a completed support request from The Daily Social.",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [{ token: STATIC_ROUTE_SHELL_SEGMENT }];
}

export default function Page() {
  return <FeedbackRoute />;
}
