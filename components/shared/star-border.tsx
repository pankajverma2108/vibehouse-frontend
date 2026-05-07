import type { CSSProperties, ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

import styles from "./star-border.module.css";

type StarBorderProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  color?: string;
  speed?: CSSProperties["animationDuration"];
  thickness?: number;
  innerClassName?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function StarBorder<T extends ElementType = "div">({
  as,
  children,
  className,
  color = "white",
  speed = "6s",
  thickness = 1,
  innerClassName,
  style,
  ...props
}: StarBorderProps<T>) {
  const Comp = (as || "div") as ElementType;

  return (
    <Comp
      {...props}
      className={cn(styles.container, className)}
      style={{ padding: `${thickness}px 0`, ...style }}
    >
      <div
        className={styles.glowBottom}
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        className={styles.glowTop}
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div className={cn(styles.inner, innerClassName)}>{children}</div>
    </Comp>
  );
}
