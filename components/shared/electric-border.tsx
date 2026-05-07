"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type ElectricBorderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "pink" | "blue" | "green";
  accentColor?: string;
  speed?: number;
  innerClassName?: string;
};

const toneMap: Record<NonNullable<ElectricBorderProps["tone"]>, string> = {
  pink: "from-[var(--vh-hot)] via-[var(--vh-amber)] to-[var(--vh-hot)]",
  blue: "from-[var(--vh-cyan)] via-[var(--vh-ice)] to-[var(--vh-cyan)]",
  green: "from-[var(--vh-lime)] via-[var(--vh-ice)] to-[var(--vh-lime)]",
};

export function ElectricBorder({
  children,
  className,
  tone = "pink",
  accentColor,
  speed = 3.2,
  innerClassName,
  ...props
}: ElectricBorderProps) {
  const glowGradient = accentColor
    ? `linear-gradient(90deg, transparent 0%, ${accentColor} 45%, ${accentColor} 55%, transparent 100%)`
    : undefined;

  const conicGradient = accentColor
    ? `conic-gradient(from 0deg, transparent, ${accentColor}, transparent)`
    : undefined;

  return (
    <div className={cn("group relative rounded-[16px]", className)} {...props}>
      <motion.div
        aria-hidden
        animate={{ rotate: [0, 360] }}
        className={cn(
          "pointer-events-none absolute -inset-[1px] rounded-[16px] bg-conic from-transparent via-white/20 to-transparent opacity-80",
        )}
        style={conicGradient ? { background: conicGradient } : undefined}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      />
      <motion.div
        aria-hidden
        animate={{ backgroundPositionX: ["0%", "100%", "0%"] }}
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[16px] bg-[length:200%_100%] bg-gradient-to-r blur-[9px] opacity-65",
          toneMap[tone],
        )}
        style={glowGradient ? { backgroundImage: glowGradient } : undefined}
        transition={{ duration: speed, ease: "easeInOut", repeat: Infinity }}
      />
      <div className={cn("relative rounded-[15px] border border-white/20 bg-[#130b10]", innerClassName)}>{children}</div>
    </div>
  );
}
