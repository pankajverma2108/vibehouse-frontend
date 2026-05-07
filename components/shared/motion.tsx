"use client";

import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/utils";

export function FadeIn({
  className,
  delay = 0,
  y = 24,
  ...props
}: HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      viewport={{ once: true, margin: "-10%" }}
      whileInView={{ opacity: 1, y: 0 }}
      {...props}
    />
  );
}

export function Stagger({
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
      viewport={{ once: true, margin: "-10%" }}
      whileInView="show"
      {...props}
    />
  );
}

export function StaggerItem({
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      {...props}
    />
  );
}

export function FloatCard({
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(className)}
      transition={{ duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -6, rotate: 0, scale: 1.01 }}
      {...props}
    />
  );
}
