"use client";

import { FeedbackPage } from "@/components/feedback/feedback-page";
import { DynamicRouteState } from "@/components/static-export/dynamic-route-state";
import { useViewerPathParam } from "@/hooks/use-viewer-path-param";

export function FeedbackRoute() {
  const token = useViewerPathParam(1);
  if (!token.isReady) return <DynamicRouteState />;
  if (!token.value) return <DynamicRouteState invalid />;
  return <FeedbackPage token={token.value} />;
}
