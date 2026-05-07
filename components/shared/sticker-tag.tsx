import { cn } from "@/lib/utils";

type StickerTagProps = {
  label: string;
  bg?: string;
  text?: string;
  rotate?: string;
  className?: string;
};

export function StickerTag({
  label,
  bg = "#FEF08A",
  text = "#000000",
  rotate = "rotate-[10deg]",
  className,
}: StickerTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[8px] border border-black/15 px-2.5 py-1 text-xs italic leading-4 shadow-[0px_4px_8px_-3px_rgba(0,0,0,0.18),0px_8px_14px_-8px_rgba(0,0,0,0.2)]",
        rotate,
        className,
      )}
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}