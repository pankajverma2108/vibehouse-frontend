import type { Metadata } from "next";

import { FeedbackPage } from "@/components/feedback/feedback-page";

type FeedbackRoutePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support Feedback",
  description: "Rate a completed support request from The Daily Social.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function FeedbackRoutePage({
  params,
}: FeedbackRoutePageProps) {
  const resolvedParams = await params;

  return <FeedbackPage token={resolvedParams.token} />;
}
