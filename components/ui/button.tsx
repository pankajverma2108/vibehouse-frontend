import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { ButtonSpinner } from "@/components/ui/button-spinner"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:border-[var(--np-yellow)] focus-visible:ring-2 focus-visible:ring-[var(--np-yellow)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[#EE4D37] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[var(--np-yellow)] text-black border-[var(--np-yellow)] shadow-[3px_3px_0px_#000000] hover:bg-[var(--np-yellow)]/90",
        outline: "border-[#3D3D3D] bg-[#121212] text-white hover:bg-[#202029]",
        secondary: "bg-[#161616] text-white border-[#3D3D3D] hover:bg-[#202029]",
        ghost: "hover:bg-white/10 hover:text-white",
        destructive: "bg-[#EE4D37] text-white border-[#EE4D37] shadow-[3px_3px_0px_#000000] hover:bg-[#EE4D37]/90",
        link: "text-[var(--np-yellow)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3",
        xs: "h-6 gap-1 rounded-none px-2 text-xs",
        sm: "h-7 gap-1 rounded-none px-2.5 text-[0.8rem]",
        lg: "h-11 gap-1.5 px-5 text-base",
        icon: "size-8 rounded-none",
        "icon-xs": "size-6 rounded-none",
        "icon-sm": "size-7 rounded-none",
        "icon-lg": "size-9 rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  loadingText,
  spinnerClassName,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    loadingText?: React.ReactNode
    spinnerClassName?: string
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const isDisabled = Boolean(disabled || loading)
  const busyContent = loadingText ?? children

  return (
    <Comp
      aria-busy={loading || undefined}
      data-slot="button"
      data-loading={loading ? "true" : "false"}
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : isDisabled}
      {...(asChild ? {} : { disabled: isDisabled })}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <ButtonSpinner className={spinnerClassName} />
          {busyContent}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
