import { notFound, redirect } from "next/navigation";

import { isBreakfastTestToken } from "@/lib/breakfast-preview";

export default async function LegacyBreakfastPreviewScenarioPage({ params }: { params: Promise<{ scenario: string }> }) {
  const { scenario } = await params;
  if (!isBreakfastTestToken(scenario)) notFound();
  redirect(`/breakfast/${scenario}`);
}
