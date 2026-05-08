import Image from "next/image";
import type { ReactNode } from "react";

import { FloatCard, Stagger, StaggerItem } from "@/components/shared/motion";
import { StickerTag } from "@/components/shared/sticker-tag";

import styles from "./partner-upcoming-pages.module.css";

const partnerFacts = [
  ["ROI:", "Unsurpassed"],
  ["Ops:", "Hassle-Free"],
  ["Reach:", "Global Visibility"],
  ["Tribe:", "The Hostel Generation"],
];

const partnerPillars = [
  {
    number: "01",
    icon: "/partner-upcoming/icons/roi.svg",
    title: "Unsurpassed ROI",
    copyLines: ["Turn property into profit.", "industry-leading occupancy,", "repeat tribe, premium pricing."],
  },
  {
    number: "02",
    icon: "/partner-upcoming/icons/operations.svg",
    title: "Hassle-Free Operations",
    copyLines: ["We manage. You earn.", "Full-stack hospitality, staffing,", "software & branding handled."],
  },
  {
    number: "03",
    icon: "/partner-upcoming/icons/visibility.svg",
    title: "Global Visibility",
    copyLines: ["Reach the hostel tribe.", "Distribution across 40+ channels &", "a loyal direct community."],
  },
];

const partnerModels = [
  {
    label: "Model A",
    title: "Leasing Model",
    points: ["Fixed Rent", "Long-Term Agreements", "Consistent Revenue", "Zero Operational Load"],
  },
  {
    label: "Model B",
    title: "Revenue Share",
    points: ["Partnership Focus", "Flexible Returns", "Scalable Profit", "Aligned Incentives"],
  },
];

function HeroHeading({
  className,
  lines,
}: {
  className: string;
  lines: string[];
}) {
  return (
    <h1 className={className}>
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </h1>
  );
}

function Facts({ items }: { items: string[][] }) {
  return (
    <dl className={styles.facts}>
      {items.map(([label, value]) => (
        <div key={label} className={styles.factRow}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionEyebrow({ children, align = "left" }: { children: ReactNode; align?: "left" | "split" }) {
  return (
    <div className={align === "split" ? styles.splitEyebrow : styles.sectionEyebrow}>
      <span><span aria-hidden="true">&#9673;</span> {children}</span>
    </div>
  );
}

function PillarCard({ pillar }: { pillar: (typeof partnerPillars)[number] }) {
  return (
    <article className={styles.pillarCard}>
      <div className={styles.pillarTop}>
        <Image alt="" className={styles.pillarIcon} height={56} src={pillar.icon} width={56} />
        <span>{pillar.number}</span>
      </div>
      <h2>{pillar.title}</h2>
      <p className={styles.pillarCopy}>
        {pillar.copyLines.map((line) => (
          <span key={line} className={styles.pillarCopyLine}>
            {line}
          </span>
        ))}
      </p>
    </article>
  );
}

function ModelCard({ model }: { model: (typeof partnerModels)[number] }) {
  return (
    <FloatCard className={styles.modelCardWrap}>
      <article className={styles.modelCard}>
        <StickerTag
          bg="var(--vh-pink)"
          className={styles.modelTag}
          label={model.label}
          rotate="rotate-[-2deg]"
          text="#ffffff"
        />
        <span className={styles.modelYear}>{"{ 2026 }"}</span>
        <h2>{model.title}</h2>
        <ul>
          {model.points.map((point) => (
            <li key={point}>
              <span className={styles.modelPointText}>&mdash; {point}</span>
              <span aria-hidden="true" className={styles.modelPointMarker}>*</span>
            </li>
          ))}
        </ul>
      </article>
    </FloatCard>
  );
}

export function PartnerWithUsPage() {
  return (
    <div className={styles.standaloneRoot}>
      <main>
        <section className={styles.partnerHero}>
          <aside className={styles.partnerFacts}>
            <p className={styles.fileStamp}>{"{ Invest File / 02 }"}</p>
            <Facts items={partnerFacts} />
          </aside>
          <div className={styles.partnerTitleBlock}>
            <p className={styles.fileStamp}>ED.&mdash;&mdash;92394757 / 04.30.2026</p>
            <HeroHeading
              className={styles.partnerHeroHeading}
              lines={["Partner", "With Us.", "Maximize", "Yield.", "Build The", "Future."]}
            />
          </div>
        </section>

        <section className={styles.pillarsSection}>
          <SectionEyebrow>The Offer / 03 Pillars</SectionEyebrow>
          <div className={styles.pillarsGrid}>
            {partnerPillars.map((pillar) => (
              <PillarCard key={pillar.title} pillar={pillar} />
            ))}
          </div>
        </section>

        <section className={styles.modelsSection}>
          <SectionEyebrow>The Models / Choose One</SectionEyebrow>
          <Stagger className={styles.modelsGrid}>
            {partnerModels.map((model) => (
              <StaggerItem key={model.title}>
                <ModelCard model={model} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section className={styles.inquirySection}>
          <form className={styles.inquiryForm} action="mailto:partner@thedailysocial.co?subject=Partner%20Inquiry" encType="text/plain" method="post">
            <div className={styles.inquiryFields}>
              <label>
                Name
                <input name="name" type="text" />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" />
              </label>
              <label>
                Message
                <textarea name="message" rows={3} />
              </label>
            </div>
            <div className={styles.inquirySummary}>
              <SectionEyebrow>The Inquiry</SectionEyebrow>
              <p className={styles.inquiryCopy}>
                <span className={styles.inquiryCopyLine}>Drop your details.</span>
                <span className={styles.inquiryCopyLine}>A partnership lead reaches out within 48 hours.</span>
                <span className={styles.inquiryCopyLine}>No shortcuts.</span>
              </p>
            </div>
            <div className={styles.inquiryCtaWrap}>
              <button className={`${styles.bigCta} ${styles.inquiryCta}`} type="submit">
                <span className={styles.ctaLabel}>INQUIRE NOW</span>
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
