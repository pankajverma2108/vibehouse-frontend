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
    <FadeIn className={`mb-10 ${alignment}`}>
      {subtitle ? (
        <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#2FBC81] mb-2.5">
          {subtitle}
        </p>
      ) : null}
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight uppercase">
        {title}
      </h2>
      {tagline ? (
        <p className="mx-auto mt-3 max-w-[680px] font-body text-sm sm:text-base text-white/65 leading-relaxed">
          {tagline}
        </p>
      ) : null}
    </FadeIn>
  );
}
