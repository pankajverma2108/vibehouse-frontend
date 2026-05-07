"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

import styles from "@/components/marketing/magic-bento.module.css";

type WeeklyBentoItem = {
  day: string;
  event: string;
  hook: string;
  description: string;
  color: string;
};

export interface MagicBentoProps {
  items: WeeklyBentoItem[];
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const MOBILE_BREAKPOINT = 768;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function MagicBento({
  items,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = 400,
  particleCount = 12,
  enableTilt = false,
  glowColor = "132, 0, 255",
  clickEffect = true,
  enableMagnetism = false,
}: MagicBentoProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const shouldDisableAnimations = useMemo(
    () => disableAnimations || (typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT),
    [disableAnimations],
  );

  const updateCardGlow = useCallback((card: HTMLDivElement, x: number, y: number, intensity: number) => {
    const rect = card.getBoundingClientRect();
    const relativeX = ((x - rect.left) / rect.width) * 100;
    const relativeY = ((y - rect.top) / rect.height) * 100;
    card.style.setProperty("--glow-x", `${relativeX}%`);
    card.style.setProperty("--glow-y", `${relativeY}%`);
    card.style.setProperty("--glow-intensity", intensity.toFixed(3));
    card.style.setProperty("--glow-radius", `${spotlightRadius}px`);
    card.style.setProperty("--glow-color", glowColor);
  }, [glowColor, spotlightRadius]);

  const spawnParticles = useCallback((card: HTMLDivElement, originX: number, originY: number) => {
    if (!enableStars || shouldDisableAnimations) {
      return;
    }

    const rect = card.getBoundingClientRect();
    const count = clamp(particleCount, 4, 18);

    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement("span");
      dot.style.position = "absolute";
      dot.style.width = "4px";
      dot.style.height = "4px";
      dot.style.borderRadius = "999px";
      dot.style.left = `${originX - rect.left}px`;
      dot.style.top = `${originY - rect.top}px`;
      dot.style.background = `rgba(${glowColor}, 0.95)`;
      dot.style.boxShadow = `0 0 8px rgba(${glowColor}, 0.7)`;
      dot.style.pointerEvents = "none";
      dot.style.zIndex = "20";
      card.appendChild(dot);

      const driftX = (Math.random() - 0.5) * 64;
      const driftY = (Math.random() - 0.5) * 64;

      gsap.fromTo(
        dot,
        { opacity: 1, scale: 1 },
        {
          x: driftX,
          y: driftY,
          opacity: 0,
          scale: 0.3,
          duration: 0.55 + Math.random() * 0.25,
          ease: "power2.out",
          onComplete: () => dot.remove(),
        },
      );
    }
  }, [enableStars, glowColor, particleCount, shouldDisableAnimations]);

  useEffect(() => {
    if (!enableSpotlight || shouldDisableAnimations) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      cardRefs.current.forEach((card) => {
        if (!card) {
          return;
        }
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const distance = Math.hypot(event.clientX - cx, event.clientY - cy);
        const intensity = clamp(1 - distance / spotlightRadius, 0, 1);
        updateCardGlow(card, event.clientX, event.clientY, intensity);
      });
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [enableSpotlight, shouldDisableAnimations, spotlightRadius, updateCardGlow]);

  return (
    <div className={styles.section} ref={gridRef}>
      <div className={styles.grid}>
        {items.map((item, index) => {
          const isLastSoloInDesktop = items.length % 3 === 1 && index === items.length - 1;
          return (
            <div
              key={`${item.day}-${item.event}`}
              className={`${styles.card} ${isLastSoloInDesktop ? styles.cardCenter : ""}`}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              onClick={(event) => {
                const card = cardRefs.current[index];
                if (!card) {
                  return;
                }
                if (clickEffect) {
                  const rect = card.getBoundingClientRect();
                  const ripple = document.createElement("span");
                  const x = event.clientX - rect.left;
                  const y = event.clientY - rect.top;
                  const radius = Math.max(rect.width, rect.height);
                  ripple.style.position = "absolute";
                  ripple.style.left = `${x - radius}px`;
                  ripple.style.top = `${y - radius}px`;
                  ripple.style.width = `${radius * 2}px`;
                  ripple.style.height = `${radius * 2}px`;
                  ripple.style.borderRadius = "999px";
                  ripple.style.background = `radial-gradient(circle, rgba(${glowColor}, 0.35) 0%, transparent 65%)`;
                  ripple.style.pointerEvents = "none";
                  ripple.style.zIndex = "15";
                  card.appendChild(ripple);

                  gsap.fromTo(
                    ripple,
                    { scale: 0, opacity: 1 },
                    {
                      scale: 1,
                      opacity: 0,
                      duration: 0.7,
                      ease: "power2.out",
                      onComplete: () => ripple.remove(),
                    },
                  );
                }
                spawnParticles(card, event.clientX, event.clientY);
              }}
              onMouseMove={(event) => {
                const card = cardRefs.current[index];
                if (!card || shouldDisableAnimations) {
                  return;
                }

                updateCardGlow(card, event.clientX, event.clientY, enableBorderGlow ? 1 : 0);

                if (enableTilt || enableMagnetism) {
                  const rect = card.getBoundingClientRect();
                  const dx = event.clientX - (rect.left + rect.width / 2);
                  const dy = event.clientY - (rect.top + rect.height / 2);
                  gsap.to(card, {
                    rotateX: enableTilt ? clamp((-dy / rect.height) * 10, -6, 6) : 0,
                    rotateY: enableTilt ? clamp((dx / rect.width) * 10, -6, 6) : 0,
                    x: enableMagnetism ? clamp(dx * 0.04, -8, 8) : 0,
                    y: enableMagnetism ? clamp(dy * 0.04, -8, 8) : 0,
                    duration: 0.15,
                    ease: "power2.out",
                  });
                }
              }}
              onMouseLeave={() => {
                const card = cardRefs.current[index];
                if (!card) {
                  return;
                }
                gsap.to(card, {
                  rotateX: 0,
                  rotateY: 0,
                  x: 0,
                  y: 0,
                  duration: 0.2,
                  ease: "power2.out",
                });
                card.style.setProperty("--glow-intensity", "0");
              }}
            >
              <p className={styles.day} style={{ color: item.color }}>{item.day}</p>
              <h3 className={styles.title}>{item.event}</h3>
              <p className={styles.hook}>{item.hook}</p>
              <p className={styles.description}>{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
