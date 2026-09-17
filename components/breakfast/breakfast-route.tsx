"use client";

import { BreakfastPage } from "@/components/breakfast/breakfast-page";
import { DynamicRouteState } from "@/components/static-export/dynamic-route-state";
import { useViewerPathParam } from "@/hooks/use-viewer-path-param";
import { getBreakfastTestScenario, isBreakfastTestToken } from "@/lib/breakfast-preview";

export function BreakfastRoute() {
  const token = useViewerPathParam(1);
  if (!token.isReady) return <DynamicRouteState />;
  if (!token.value) return <DynamicRouteState invalid />;

  if (isBreakfastTestToken(token.value)) {
    const scenario = getBreakfastTestScenario(token.value);
    return <BreakfastPage initialLookup={scenario.response} previewLabel={scenario.label} simulateSubmit token={token.value} />;
  }

  return <BreakfastPage token={token.value} />;
}
