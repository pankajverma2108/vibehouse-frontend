import type { Metadata } from "next";

import { BreakfastPage } from "@/components/breakfast/breakfast-page";
import { getBreakfastTestScenario, isBreakfastTestToken } from "@/lib/breakfast-preview";

type BreakfastRoutePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Breakfast Menu",
  description: "Choose breakfast for your stay.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BreakfastRoutePage({
  params,
}: BreakfastRoutePageProps) {
  const resolvedParams = await params;

  if (isBreakfastTestToken(resolvedParams.token)) {
    const scenario = getBreakfastTestScenario(resolvedParams.token);
    return (
      <BreakfastPage
        initialLookup={scenario.response}
        previewLabel={scenario.label}
        simulateSubmit
        token={resolvedParams.token}
      />
    );
  }

  return <BreakfastPage token={resolvedParams.token} />;
}
