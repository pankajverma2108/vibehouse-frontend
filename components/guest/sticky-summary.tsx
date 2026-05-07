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
  { label: "Borrow", value: "0 items" },
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
        "fixed bottom-[92px] left-4 right-4 z-30 rounded-[8px] border-2 border-dashed border-[var(--vh-pink)]/65 bg-[#16070c] p-4 shadow-[0_22px_56px_rgba(0,0,0,0.44)] lg:sticky lg:top-28 lg:left-auto lg:right-auto lg:z-auto lg:self-start",
        className,
      )}
    >
      <h3 className="font-['Geologica'] text-[22px] font-black uppercase leading-7 tracking-[-0.04em] text-[#f1f5f9]">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 border-b border-[var(--vh-pink)]/25 px-1 py-2">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#94a3b8]">{item.label}</span>
            <span className="text-sm font-black text-white">{item.value}</span>
          </div>
        ))}
      </div>
      <Button className="mt-4 h-10 w-full rounded-[4px] bg-[var(--vh-pink)] font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]" type="button">
        {ctaLabel}
      </Button>
    </aside>
  );
}
