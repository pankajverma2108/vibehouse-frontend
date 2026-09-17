"use client";

import { useEffect, useState } from "react";

import { STATIC_ROUTE_SHELL_SEGMENT } from "@/lib/static-export-routes";

type ViewerPathParam = {
  isReady: boolean;
  value: string | null;
};

function readPathSegment(segmentIndex: number): string | null {
  const raw = window.location.pathname.split("/").filter(Boolean)[segmentIndex];
  if (!raw) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded && decoded !== STATIC_ROUTE_SHELL_SEGMENT ? decoded : null;
  } catch {
    return null;
  }
}

export function useViewerPathParam(segmentIndex: number): ViewerPathParam {
  const [result, setResult] = useState<ViewerPathParam>({ isReady: false, value: null });

  useEffect(() => {
    const update = () => setResult({ isReady: true, value: readPathSegment(segmentIndex) });
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, [segmentIndex]);

  return result;
}
