"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";

function Calendar({
  className,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("rounded-lg bg-white p-3 text-slate-900", className)}
      {...props}
    />
  );
}

export { Calendar };
