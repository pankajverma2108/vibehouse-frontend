"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

function Calendar({
  className,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const mergedClassNames: React.ComponentProps<typeof DayPicker>["classNames"] = {
    ...props.classNames,
    root: cn("vh-calendar-dark", props.classNames?.root),
    months: cn("rdp-months", props.classNames?.months),
    month: cn("rdp-month", props.classNames?.month),
    month_caption: cn("rdp-month_caption", props.classNames?.month_caption),
    caption_label: cn("rdp-caption_label", props.classNames?.caption_label),
    nav: cn("rdp-nav", props.classNames?.nav),
    button_previous: cn("rdp-button_previous", props.classNames?.button_previous),
    button_next: cn("rdp-button_next", props.classNames?.button_next),
    month_grid: cn("rdp-month_grid", props.classNames?.month_grid),
    weekdays: cn("rdp-weekdays", props.classNames?.weekdays),
    weekday: cn("rdp-weekday", props.classNames?.weekday),
    week: cn("rdp-week", props.classNames?.week),
    day: cn("rdp-day", props.classNames?.day),
    day_button: cn("rdp-day_button", props.classNames?.day_button),
    selected: cn("rdp-selected", props.classNames?.selected),
    today: cn("rdp-today", props.classNames?.today),
    outside: cn("rdp-outside", props.classNames?.outside),
    disabled: cn("rdp-disabled", props.classNames?.disabled),
    range_start: cn("rdp-range_start", props.classNames?.range_start),
    range_middle: cn("rdp-range_middle", props.classNames?.range_middle),
    range_end: cn("rdp-range_end", props.classNames?.range_end),
  };

  return (
    <DayPicker
      className={cn("rounded-[18px] p-2", className)}
      classNames={mergedClassNames}
      {...props}
    />
  );
}

export { Calendar };
