import type { Transition, Variants } from "motion/react";

export const MOTION_DURATION = {
  instant: 0,
  feedback: 0.1,
  fast: 0.15,
  standard: 0.2,
  moderate: 0.25,
  slow: 0.3,
  route: 0.35,
  expressive: 0.4,
  max: 0.5,
} as const;

export const MOTION_EASE = {
  standard: [0.2, 0, 0, 1],
  enter: [0, 0, 0, 1],
  exit: [0.3, 0, 1, 1],
  emphasized: [0.05, 0.7, 0.1, 1],
  linear: "linear",
} as const;

export const MOTION_DISTANCE = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const MOTION_SCALE = {
  press: 0.98,
  subtleEnter: 0.98,
  emphasizedEnter: 0.96,
  exit: 0.98,
} as const;

export const MOTION_STAGGER = {
  dense: 0.02,
  standard: 0.04,
  relaxed: 0.06,
  expressive: 0.08,
} as const;

type MotionDurationToken = keyof typeof MOTION_DURATION;
type MotionEaseToken = keyof typeof MOTION_EASE;
type MotionStaggerToken = keyof typeof MOTION_STAGGER;

export function createMotionTransition(
  duration: MotionDurationToken,
  ease: MotionEaseToken,
  overrides: Omit<Transition, "duration" | "ease"> = {},
): Transition {
  return {
    duration: MOTION_DURATION[duration],
    ease: MOTION_EASE[ease],
    ...overrides,
  };
}

export function createReducedMotionTransition(
  overrides: Omit<Transition, "duration" | "ease"> = {},
): Transition {
  return {
    duration: MOTION_DURATION.feedback,
    ease: MOTION_EASE.linear,
    ...overrides,
  };
}

export function createRevealVariants({
  reducedMotion,
  y = MOTION_DISTANCE.md,
  scale,
  hiddenOpacity = 0,
}: {
  reducedMotion: boolean;
  y?: number;
  scale?: number;
  hiddenOpacity?: number;
}): Variants {
  return {
    hidden: reducedMotion
      ? { opacity: hiddenOpacity }
      : {
          opacity: hiddenOpacity,
          y,
          ...(typeof scale === "number" ? { scale } : {}),
        },
    show: reducedMotion
      ? { opacity: 1 }
      : {
          opacity: 1,
          y: 0,
          ...(typeof scale === "number" ? { scale: 1 } : {}),
        },
  };
}

export function createStaggerContainerVariants({
  reducedMotion,
  stagger = "standard",
  delayChildren = 0,
}: {
  reducedMotion: boolean;
  stagger?: MotionStaggerToken;
  delayChildren?: number;
}): Variants {
  return {
    hidden: {},
    show: {
      transition: reducedMotion
        ? createReducedMotionTransition()
        : {
            staggerChildren: MOTION_STAGGER[stagger],
            delayChildren,
          },
    },
  };
}

export function getHoverLift(reducedMotion: boolean, distance = MOTION_DISTANCE.xs) {
  if (reducedMotion) {
    return undefined;
  }

  return { y: -distance };
}
