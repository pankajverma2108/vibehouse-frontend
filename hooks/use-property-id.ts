"use client";

import { useCallback, useSyncExternalStore } from "react";

import { resolveClientPropertyId, resolveServerPropertyId } from "@/lib/property-resolver";

function subscribeToLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

export function usePropertyId(explicit?: string | null): string {
  const getSnapshot = useCallback(
    () => resolveClientPropertyId({ explicit }),
    [explicit],
  );
  const getServerSnapshot = useCallback(
    () => resolveServerPropertyId({ explicit }),
    [explicit],
  );

  return useSyncExternalStore(subscribeToLocation, getSnapshot, getServerSnapshot);
}
