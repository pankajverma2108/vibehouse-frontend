import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FeedbackPage } from "@/components/feedback/feedback-page";
import {
  getFeedbackPreviewConfig,
  isFeedbackPreviewScenario,
} from "@/lib/feedback-preview";

type FeedbackPreviewScenarioPageProps = {
  params: Promise<{
    scenario: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: FeedbackPreviewScenarioPageProps): Promise<Metadata> {
  const resolvedParams = await params;

  if (!isFeedbackPreviewScenario(resolvedParams.scenario)) {
    return {
      title: "Feedback Preview",
    };
  }

  const preview = getFeedbackPreviewConfig(resolvedParams.scenario);

  return {
    title: `${preview.label} Preview`,
    description: preview.description,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function FeedbackPreviewScenarioPage({
  params,
}: FeedbackPreviewScenarioPageProps) {
  const resolvedParams = await params;

  if (!isFeedbackPreviewScenario(resolvedParams.scenario)) {
    notFound();
  }

  return (
    <FeedbackPage
      previewScenario={resolvedParams.scenario}
      token={`preview-${resolvedParams.scenario}`}
    />
  );
}
