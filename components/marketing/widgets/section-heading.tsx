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
    <FadeIn className={`mb-5 ${alignment}`}>
      <h2 className="vh-title">{title}</h2>
      {subtitle ? <p className="vh-subtitle mt-1.5">{subtitle}</p> : null}
      {tagline ? <p className="mx-auto mt-3 max-w-[720px] text-[15px] font-medium leading-7 text-white/84 md:text-base">{tagline}</p> : null}
    </FadeIn>
  );
}
