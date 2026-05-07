"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

export function TargetCursor() {
  const [enabled, setEnabled] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches,
  );
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");

    const onMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    const onMediaChange = () => {
      setEnabled(media.matches);
    };

    media.addEventListener("change", onMediaChange);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      media.removeEventListener("change", onMediaChange);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <motion.span
        aria-hidden
        className="pointer-events-none fixed z-[90] h-7 w-7 rounded-full border border-[var(--vh-cyan)]/70 mix-blend-screen"
        style={{ x: position.x - 14, y: position.y - 14 }}
        transition={{ type: "spring", damping: 24, stiffness: 380, mass: 0.35 }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none fixed z-[90] h-1.5 w-1.5 rounded-full bg-[var(--vh-ice)]"
        style={{ x: position.x - 3, y: position.y - 3 }}
        transition={{ type: "spring", damping: 26, stiffness: 620, mass: 0.2 }}
      />
    </>
  );
}
