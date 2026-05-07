"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border !border-white/15 !bg-[rgba(12,14,24,0.94)] !text-white",
          title: "!text-white !font-semibold",
          description: "!text-white/75",
          actionButton: "!bg-[var(--vh-pink)] !text-white",
          cancelButton: "!bg-white/10 !text-white",
        },
      }}
      {...props}
    />
  );
}
