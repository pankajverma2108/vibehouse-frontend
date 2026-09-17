"use client";

import { useEffect } from "react";

import { DynamicRouteState } from "@/components/static-export/dynamic-route-state";

export function ClientRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return <DynamicRouteState />;
}
