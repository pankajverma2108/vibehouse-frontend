"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { siteMeta } from "@/content/site";

interface VibehouseLogoProps {
  variant?: "white" | "red";
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  onClick?: () => void;
}

export function VibehouseLogo({
  variant = "white",
  className,
  imageClassName,
  priority = true,
  onClick,
}: VibehouseLogoProps) {
  const logoSrc =
    variant === "red"
      ? "/logo/logo_design_redOnWhite.jpg-Photoroom.png"
      : "/logo/logo_design_whiteOnRed.jpg-Photoroom.png";

  return (
    <Link
      href="/"
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-2 select-none transition-transform duration-200 hover:scale-[1.02]",
        className
      )}
      aria-label="Vibehouse - Stay, Play, Belong"
    >
      <div className="relative flex items-center">
        <Image
          src={logoSrc}
          alt="Vibehouse - Stay, Play, Belong"
          width={130}
          height={50}
          priority={priority}
          className={cn(
            "h-9 sm:h-10 w-auto object-contain transition-opacity group-hover:opacity-100",
            imageClassName
          )}
        />
      </div>
      <span className="sr-only">{siteMeta.name}</span>
    </Link>
  );
}
