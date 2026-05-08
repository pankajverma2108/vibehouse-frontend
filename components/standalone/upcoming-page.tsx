import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { StickerTag } from "@/components/shared/sticker-tag";

import styles from "./partner-upcoming-pages.module.css";

const upcomingFacts = [
  ["Location:", "Koramangala, Bangalore"],
  ["Status:", "Under Development"],
  ["Opening:", "Q2 2026"],
  ["Sites:", "02 -- Koramangala"],
  ["Filed:", "04.30.2026"],
];

const upcomingSites = [
  {
    count: "01/02",
    title: "TDSocial Stay",
    image: "/partner-upcoming/images/tdsocial-stay.png",
    facts: [
      ["Location:", "Koramangala, Bangalore"],
      ["Status:", "Launching 20th June"],
      ["Inventory:", "7 room hostel"],
    ],
  },
  {
    count: "02/02",
    title: "Buteak Suites",
    image: "/partner-upcoming/images/buteak-suites.png",
    href: "https://buteak.in/",
    facts: [
      ["Location:", "Koramangala Club Rd, Bangalore"],
      ["Status:", "Launching 25th May"],
      ["Inventory:", "34 apartments"],
    ],
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

function SiteCard({ site }: { site: (typeof upcomingSites)[number] }) {
  const card = (
    <article className={styles.siteCard}>
      <div className={styles.siteImageWrap}>
        <Image
          alt=""
          className={styles.siteImage}
          fill
          priority={site.count === "01/02"}
          sizes="(max-width: 767px) 90vw, 45vw"
          src={site.image}
        />
        <StickerTag
          bg="var(--vh-pink)"
          className={styles.siteSticker}
          label="New"
          rotate="rotate-[-2deg]"
          text="#ffffff"
        />
      </div>
      <div className={styles.siteBody}>
        <h2>{site.title}</h2>
        <Facts items={site.facts} />
      </div>
    </article>
  );

  if (site.href) {
    return (
      <a className={styles.siteCardLink} href={site.href} rel="noreferrer" target="_blank" aria-label={`${site.title} website`}>
        {card}
      </a>
    );
  }

  return card;
}

export function UpcomingPage() {
  return (
    <div className={styles.standaloneRoot}>
      <main>
        <section className={styles.upcomingHero}>
          <div className={styles.upcomingTitleBlock}>
            <p className={styles.fileStamp}>ED.&mdash;&mdash;459366627 / VOL.07</p>
            <HeroHeading
              className={styles.upcomingHeroHeading}
              lines={["Upcoming", "Hubs.", "A Movement.", "An Adventure."]}
            />
          </div>
          <aside className={styles.dispatchPanel}>
            <p className={styles.fileStamp}>{"{ Dispatch \u00A92026 }"}</p>
            <Facts items={upcomingFacts} />
            <p className={styles.dispatchCopy}>
              <span className={styles.dispatchCopyLine}>A new generation of social stays</span>
              <span className={styles.dispatchCopyLine}>built for creators, travelers, and doers.</span>
              <span className={styles.dispatchCopyLine}>Bold. Social. Unforgettable.</span>
            </p>
          </aside>
        </section>

        <section className={styles.upcomingSites}>
          <SectionEyebrow align="split">The New Seasons / 02 Sites</SectionEyebrow>
          <div className={styles.sitesGrid}>
            {upcomingSites.map((site) => (
              <SiteCard key={site.title} site={site} />
            ))}
          </div>
        </section>

        <Link className={styles.bigCta} href="mailto:hello@thedailysocial.co?subject=Upcoming%20hub%20updates">
          <span className={styles.ctaLabel}>Get Notified</span>
          <span className={styles.ctaArrow} aria-hidden="true">&rarr;</span>
        </Link>
      </main>
    </div>
  );
}
