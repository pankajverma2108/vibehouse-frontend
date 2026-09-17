import { notFound } from "next/navigation";

import { ClientRedirect } from "@/components/static-export/client-redirect";
import { BREAKFAST_TEST_TOKENS, isBreakfastTestToken } from "@/lib/breakfast-preview";

export function generateStaticParams() {
  return BREAKFAST_TEST_TOKENS.map((scenario) => ({ scenario }));
}

export default async function Page({ params }: { params: Promise<{ scenario: string }> }) {
  const { scenario } = await params;
  if (!isBreakfastTestToken(scenario)) notFound();
  return <ClientRedirect href={`/breakfast/${scenario}`} />;
}
