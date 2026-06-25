import { Ring } from "@/components/ring";
import { cn } from "@/lib/utils";

export function ButtonSpinner({ className }: { className?: string }) {
  return <Ring aria-hidden="true" className={cn("size-4 shrink-0 text-current", className)} />;
}
