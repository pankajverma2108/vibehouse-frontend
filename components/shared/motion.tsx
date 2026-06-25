"use client";

import { motion, type HTMLMotionProps, useReducedMotion } from "motion/react";

import { MOTION_DISTANCE, MOTION_SCALE, createMotionTransition, createReducedMotionTransition, createRevealVariants, createStaggerContainerVariants, getHoverLift } from "@/lib/motion";
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
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className={cn(className)}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y }}
      transition={
        reducedMotion
          ? createReducedMotionTransition()
          : createMotionTransition("slow", "enter", { delay })
      }
      viewport={{ once: true, margin: "-10%" }}
      whileInView={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      {...props}
    />
  );
}

export function Stagger({
  className,
  ...props
}: HTMLMotionProps<"div">) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      variants={createStaggerContainerVariants({ reducedMotion })}
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
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className={cn(className)}
      variants={createRevealVariants({
        reducedMotion,
        y: MOTION_DISTANCE.xl,
        scale: MOTION_SCALE.subtleEnter,
      })}
      transition={reducedMotion ? createReducedMotionTransition() : createMotionTransition("slow", "enter")}
      {...props}
    />
  );
}

export function FloatCard({
  className,
  ...props
}: HTMLMotionProps<"div">) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      className={cn(className)}
      transition={reducedMotion ? createReducedMotionTransition() : createMotionTransition("moderate", "standard")}
      whileHover={getHoverLift(reducedMotion, MOTION_DISTANCE.xs)}
      {...props}
    />
  );
}
