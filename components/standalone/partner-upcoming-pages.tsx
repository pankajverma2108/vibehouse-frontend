import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./partner-upcoming-pages.module.css";
import { StandaloneMobileMenu } from "./standalone-mobile-menu";

type StandaloneNavLink = {
  href: string;
  label: string;
};

const upcomingNavLinks: StandaloneNavLink[] = [
  { label: "Home", href: "/" },
  { label: "Invest & Partner", href: "/partner-with-us" },
  { label: "Events", href: "/events" },
];

const partnerNavLinks: StandaloneNavLink[] = [
  { label: "Home", href: "/" },
  { label: "Upcoming", href: "/upcoming" },
  { label: "Events", href: "/events" },
];

const upcomingFacts = [
  ["Location:", "Koramangala, Bangalore"],
  ["Status:", "Under Development"],
  ["Opening:", "Q2 & Q3 2026"],
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
      ["Status:", "Opening Q2 2026"],
      ["Key Features:", "Co-Working, Social Lounge, Cafe"],
    ],
  },
  {
    count: "02/02",
    title: "Buteak Suites",
    image: "/partner-upcoming/images/buteak-suites.png",
    facts: [
      ["Location:", "Koramangala Club Rd, Bangalore"],
      ["Status:", "Opening Q3 2026"],
      ["Key Features:", "Premium Suites, Community Kitchen"],
    ],
  },
];

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
    copy: "Turn property into profit. Industry-leading occupancy, repeat tribe, premium pricing.",
  },
  {
    number: "02",
    icon: "/partner-upcoming/icons/operations.svg",
    title: "Hassle-Free Operations",
    copy: "We manage. You earn. Full-stack hospitality, staffing, software & branding handled.",
  },
  {
    number: "03",
    icon: "/partner-upcoming/icons/visibility.svg",
    title: "Global Visibility",
    copy: "Reach the hostel tribe. Distribution across 40+ channels & a loyal direct community.",
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

function formatStandaloneDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kolkata",
    year: "numeric",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function getBookNowHref(): string {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const checkin = formatStandaloneDate(today);
  const checkout = formatStandaloneDate(tomorrow);

  return `/property?checkin=${checkin}&checkout=${checkout}&property_id=60765`;
}

function StandaloneHeader({ links }: { links: StandaloneNavLink[] }) {
  const bookNowHref = getBookNowHref();

  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/">
        The Daily Social<sup>&reg;</sup>
      </Link>
      <nav className={styles.desktopNav} aria-label="Standalone navigation">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <Link href={bookNowHref}>Book Now</Link>
      </nav>
      <StandaloneMobileMenu />
    </header>
  );
}

function StandaloneFooter() {
  return (
    <footer className={styles.standaloneFooter}>
      <span aria-hidden="true" className={styles.footerSpacer} />
      <span>&copy; 2026 The Daily Social &mdash; partner@thedailysocial.co</span>
      <Link href="/policies">Privacy Policy</Link>
    </footer>
  );
}

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
      {align === "split" ? <span>Scroll &darr;</span> : null}
    </div>
  );
}

function SiteCard({ site }: { site: (typeof upcomingSites)[number] }) {
  return (
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
        <span>ED.&mdash;&mdash;{site.count}</span>
      </div>
      <div className={styles.siteBody}>
        <h2>{site.title}</h2>
        <p><span aria-hidden="true">&#9673;</span> New</p>
        <Facts items={site.facts} />
      </div>
    </article>
  );
}

export function UpcomingPage() {
  return (
    <div className={styles.standaloneRoot}>
      <StandaloneHeader links={upcomingNavLinks} />
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
            <p className={styles.dispatchCopy}>A new generation of social stays built for creators, travelers, and doers. Bold. Social. Unforgettable.</p>
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
      <StandaloneFooter />
    </div>
  );
}

function PillarCard({ pillar }: { pillar: (typeof partnerPillars)[number] }) {
  return (
    <article className={styles.pillarCard}>
      <div className={styles.pillarTop}>
        <Image alt="" height={56} src={pillar.icon} width={56} />
        <span>{pillar.number}</span>
      </div>
      <h2>{pillar.title}</h2>
      <p>{pillar.copy}</p>
    </article>
  );
}

function ModelCard({ model }: { model: (typeof partnerModels)[number] }) {
  return (
    <article className={styles.modelCard}>
      <div className={styles.modelMeta}>
        <span><span aria-hidden="true">&#9673;</span> {model.label}</span>
        <span>{"{ 2026 }"}</span>
      </div>
      <h2>{model.title}</h2>
      <ul>
        {model.points.map((point) => (
          <li key={point}>
            <span>&mdash; {point}</span>
            <span aria-hidden="true">*</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PartnerWithUsPage() {
  return (
    <div className={styles.standaloneRoot}>
      <StandaloneHeader links={partnerNavLinks} />
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
          <div className={styles.modelsGrid}>
            {partnerModels.map((model) => (
              <ModelCard key={model.title} model={model} />
            ))}
          </div>
        </section>

        <section className={styles.inquirySection}>
          <div className={styles.inquiryIntro}>
            <SectionEyebrow>The Inquiry</SectionEyebrow>
            <p>Drop your details. A partnership lead reaches out within 48 hours. No shortcuts.</p>
          </div>
          <form className={styles.inquiryForm} action="mailto:partner@thedailysocial.co?subject=Partner%20Inquiry" encType="text/plain" method="post">
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
              <textarea name="message" rows={4} />
            </label>
            <button className={styles.formButton} type="submit">
              <span className={styles.ctaLabel}>Inquire Now</span>
              <span className={styles.ctaArrow} aria-hidden="true">&rarr;</span>
            </button>
          </form>
        </section>
      </main>
      <StandaloneFooter />
    </div>
  );
}
