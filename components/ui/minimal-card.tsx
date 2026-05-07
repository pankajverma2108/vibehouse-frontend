"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function MinimalCard({
  className,
  ...props
}: React.ComponentProps<"article">) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-4 text-white shadow-[0_30px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}

function MinimalCardImage({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(12,16,24,0.68)] p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function MinimalCardTitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("mt-4 text-lg font-bold uppercase tracking-[0.08em] text-white md:text-xl", className)}
      {...props}
    />
  );
}

function MinimalCardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("mt-2 text-sm leading-6 text-white/74", className)}
      {...props}
    />
  );
}

export { MinimalCard, MinimalCardDescription, MinimalCardImage, MinimalCardTitle };
