"use client";
/* eslint-disable @next/next/no-img-element */

import type { ImgHTMLAttributes } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const ERROR_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4=";

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement>;

export function ImageWithFallback({
  alt,
  className,
  src,
  ...props
}: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  return (
    <img
      {...props}
      alt={alt}
      className={cn(className)}
      decoding={props.decoding ?? "async"}
      loading={props.loading ?? "lazy"}
      onError={() => setDidError(true)}
      src={didError ? ERROR_IMAGE : src}
    />
  );
}
