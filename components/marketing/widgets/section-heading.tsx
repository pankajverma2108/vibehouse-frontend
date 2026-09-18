import { FadeIn } from "@/components/shared/motion";

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  tagline?: string;
  align?: "left" | "center";
};

export function SectionHeading({
  title,
  subtitle,
  tagline,
  align = "center",
}: SectionHeadingProps) {
  const alignment = align === "center" ? "text-center" : "text-left";

  return (
    <FadeIn className={`mb-8 ${alignment}`}>
      {subtitle ? (
        <p className="font-['Gilroy',sans-serif] text-xs font-black uppercase tracking-[0.18em] text-[var(--np-yellow)] mb-2">
          {subtitle}
        </p>
      ) : null}
      <h2 className="font-['Cirka',serif] text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-[-0.02em] text-white leading-tight">
        {title}
      </h2>
      {tagline ? (
        <p className="mx-auto mt-3 max-w-[720px] font-['Gilroy',sans-serif] text-xs sm:text-sm font-semibold uppercase tracking-[0.08em] leading-relaxed text-white/65">
          {tagline}
        </p>
      ) : null}
    </FadeIn>
  );
}
