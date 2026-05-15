import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StickySummaryItem = {
  label: string;
  value: string;
};

type StickySummaryProps = {
  title?: string;
  items?: StickySummaryItem[];
  ctaLabel?: string;
  className?: string;
};

const placeholderItems: StickySummaryItem[] = [
  { label: "Add-ons", value: "0 selected" },
  { label: "Rentals", value: "0 items" },
  { label: "Requests", value: "None yet" },
];

export function StickySummary({
  title = "Stay summary",
  items = placeholderItems,
  ctaLabel = "Review actions",
  className,
}: StickySummaryProps) {
  return (
    <aside
      className={cn(
        "rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4 shadow-[0_22px_56px_rgba(0,0,0,0.36)] lg:sticky lg:top-28 lg:self-start",
        className,
      )}
    >
      <h3 className="font-sectiontitle text-[22px] leading-7 text-[#f1f5f9]">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/10 px-1 py-2">
            <span className="text-xs font-bold uppercase text-[#94a3b8]">{item.label}</span>
            <span className="text-sm font-black text-white">{item.value}</span>
          </div>
        ))}
      </div>
      <Button className="vh-cta-button mt-4 h-10 w-full rounded-[4px] text-xs" type="button">
        {ctaLabel}
      </Button>
    </aside>
  );
}
