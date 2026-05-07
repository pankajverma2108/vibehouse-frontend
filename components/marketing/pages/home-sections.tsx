import type { ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { EventCardProps, RoomCardProps } from "@/content/types";
import {
  Bed,
  BedDouble,
  Briefcase,
  CalendarCheck,
  Cross,
  Coffee,
  Droplets,
  LampDesk,
  Laptop,
  Lock,
  LockKeyhole,
  MapPin,
  Moon,
  Music,
  ShieldCheck,
  Shirt,
  Snowflake,
  Sunset,
  UtensilsCrossed,
  Users,
  Wifi,
} from "lucide-react";

import {
  amenities,
  experienceCards,
  guestEnergyImages,
  homePageContent,
  homeSectionOrder,
  type HomeSectionId,
  upsellBentoItems,
} from "@/content/home";
import { BookingWidget } from "@/components/marketing/widgets/booking-widget";
import { EventCard } from "@/components/marketing/widgets/event-card";
import { RoomCard } from "@/components/marketing/widgets/room-card";
import { SectionHeading } from "@/components/marketing/widgets/section-heading";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { FadeIn, FloatCard, Stagger, StaggerItem } from "@/components/shared/motion";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";

const TestimonialsMarquee = dynamic(() => import("@/components/testimonials-with-marquee"));

type SectionFrameProps = {
  alt?: boolean;
  children: ReactNode;
};

function SectionFrame({ alt = false, children }: SectionFrameProps) {
  return <section className={alt ? "vh-section vh-section-alt" : "vh-section"}>{children}</section>;
}

const amenityIconMap = {
  wifi: Wifi,
  droplets: Droplets,
  coffee: Coffee,
  shirt: Shirt,
  snowflake: Snowflake,
  utensils: UtensilsCrossed,
  "map-pin": MapPin,
  lock: Lock,
  bed: Bed,
  moon: Moon,
  music: Music,
  laptop: Laptop,
  sunset: Sunset,
  users: Users,
  lamp: LampDesk,
  briefcase: Briefcase,
  cross: Cross,
  sparkles: ShieldCheck,
  "shield-check": ShieldCheck,
  "bed-double": BedDouble,
  "lock-keyhole": LockKeyhole,
  "calendar-check": CalendarCheck,
} as const;

const sectionHeaderStickers = {
  amenities: { label: "Live better, stay better", bg: "#00d1ff", text: "#0f172a", rotate: "rotate-[-2deg]" },
  rooms: { label: "Your sanctuary", bg: "#c62828", text: "#ffffff", rotate: "rotate-[2deg]" },
  upsell: { label: "Elevate your nights", bg: "#facc15", text: "#0f172a", rotate: "rotate-[-2deg]" },
  events: { label: "Experiences", bg: "#39ff14", text: "#0f172a", rotate: "rotate-[2deg]" },
  experience: { label: "We're unforgettable", bg: "#c62828", text: "#ffffff", rotate: "rotate-[-1deg]" },
  energy: { label: "Reel moments", bg: "#00d1ff", text: "#0f172a", rotate: "rotate-[1deg]" },
} as const;

function AmenitiesSection() {
  return (
    <SectionFrame alt>
      <div className="vh-container">
        <SectionHeading tagline={homePageContent.amenitiesTagline} title={homePageContent.amenitiesTitle} />
        <FadeIn className="-mt-4 mb-6 text-center">
          <StickerTag
            bg={sectionHeaderStickers.amenities.bg}
            className="px-3 py-1.5 text-sm font-bold not-italic uppercase tracking-[0.08em]"
            label={sectionHeaderStickers.amenities.label}
            rotate={sectionHeaderStickers.amenities.rotate}
            text={sectionHeaderStickers.amenities.text}
          />
        </FadeIn>
        <Stagger className="mx-auto flex max-w-[390px] flex-wrap items-start justify-center gap-x-2 gap-y-2.5 md:max-w-[980px] md:justify-center md:gap-3">
          {amenities.map((item, index) => {
            const Icon = amenityIconMap[item.icon as keyof typeof amenityIconMap] ?? ShieldCheck;
            const scatterPattern = [
              "ml-0",
              "ml-1",
              "ml-3",
              "ml-1",
              "ml-2",
              "ml-0",
              "ml-2",
              "ml-1",
              "ml-3",
              "ml-0",
              "ml-2",
              "ml-2",
              "ml-0",
              "ml-3",
            ] as const;
            const offsetClass =
              index % 5 === 0
                ? "translate-y-0"
                : index % 5 === 1
                ? "translate-y-1"
                : index % 5 === 2
                ? "-translate-y-[1px]"
                : index % 5 === 3
                ? "translate-y-0.5"
                : "-translate-y-[0.5px]";
              const scatterClass = item.label === "AC" ? "ml-1" : scatterPattern[index] ?? scatterPattern[index % scatterPattern.length];

            return (
            <StaggerItem key={item.label} className={`${scatterClass} ${offsetClass} md:ml-0 md:translate-y-0`}>
              <FloatCard
                className={`inline-flex items-center gap-2 rounded-[12px] border border-white/30 bg-white/10 px-3 py-2 text-xs font-bold uppercase text-white shadow-[0px_10px_20px_rgba(0,0,0,0.16)] backdrop-blur-sm hover:border-white md:gap-3 md:px-5 md:py-3 md:text-sm ${item.tilt ?? ""}`}
              >
                <span className="flex h-5 w-5 items-center justify-center md:h-7 md:w-7" style={{ color: item.color }}>
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                </span>
                <span className="text-white">{item.label}</span>
              </FloatCard>
            </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </SectionFrame>
  );
}

function RoomsSection({ rooms }: { rooms: RoomCardProps[] }) {
  const roomItems = rooms.length > 0 ? rooms : homePageContent.homeRooms;
  const roomGridClass =
    roomItems.length <= 1
      ? "grid grid-cols-1 gap-6 md:max-w-[420px] md:mx-auto"
      : roomItems.length === 2
      ? "grid grid-cols-1 gap-6 md:grid-cols-2 md:max-w-[920px] md:mx-auto"
      : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

  return (
    <SectionFrame>
      <div className="vh-container">
        <SectionHeading tagline={homePageContent.roomsTagline} title={homePageContent.roomsTitle} />
        <FadeIn className="-mt-4 mb-6 text-center">
          <StickerTag
            bg={sectionHeaderStickers.rooms.bg}
            className="px-3 py-1.5 text-sm font-bold not-italic uppercase tracking-[0.08em]"
            label={sectionHeaderStickers.rooms.label}
            rotate={sectionHeaderStickers.rooms.rotate}
            text={sectionHeaderStickers.rooms.text}
          />
        </FadeIn>
        <Stagger className={roomGridClass}>
          {roomItems.map((room) => (
            <StaggerItem key={room.title}>
              <RoomCard {...room} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </SectionFrame>
  );
}

function EventsSection({ events }: { events: EventCardProps[] }) {
  const eventItems = events.length > 0 ? events : homePageContent.homeEvents;
  const eventGridClass =
    eventItems.length <= 1
      ? "grid grid-cols-1 gap-6 md:grid-cols-1 md:max-w-[460px] md:mx-auto"
      : eventItems.length === 2
      ? "grid grid-cols-1 gap-6 md:grid-cols-2"
      : "grid grid-cols-1 gap-6 md:grid-cols-3";

  return (
    <SectionFrame alt>
      <div className="vh-container">
        <SectionHeading title={homePageContent.eventsTitle} />
        <FadeIn className="-mt-4 mb-6 text-center">
          <StickerTag
            bg={sectionHeaderStickers.events.bg}
            className="px-3 py-1.5 text-sm font-bold not-italic uppercase tracking-[0.08em]"
            label={sectionHeaderStickers.events.label}
            rotate={sectionHeaderStickers.events.rotate}
            text={sectionHeaderStickers.events.text}
          />
        </FadeIn>
        <Stagger className={eventGridClass}>
          {eventItems.slice(0, 3).map((event) => (
            <StaggerItem key={`${event.title}-${event.date}-${event.time}`}>
              <EventCard {...event} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </SectionFrame>
  );
}

function UpsellSection() {
  const toneStyles = {
    pink: { border: "#c62828", accent: "#c62828", sticker: "#FEF08A", text: "#0f172a" },
    blue: { border: "#00d1ff", accent: "#00d1ff", sticker: "#00d1ff", text: "#0f172a" },
    green: { border: "#39ff14", accent: "#39ff14", sticker: "#39ff14", text: "#0f172a" },
  } as const;

  return (
    <SectionFrame alt>
      <div className="vh-container">
        <SectionHeading title={homePageContent.upsellTitle} />
        <FadeIn className="-mt-4 mb-6 text-center">
          <StickerTag
            bg={sectionHeaderStickers.upsell.bg}
            className="px-3 py-1.5 text-sm font-bold not-italic uppercase tracking-[0.08em]"
            label={sectionHeaderStickers.upsell.label}
            rotate={sectionHeaderStickers.upsell.rotate}
            text={sectionHeaderStickers.upsell.text}
          />
        </FadeIn>
        <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upsellBentoItems.map((item, index) => {
            const tone = toneStyles[item.tone];

            return (
              <StaggerItem key={item.id}>
                <div
                  className="group relative rounded-[12px] border-2 bg-[#1e293b] p-5 text-left transition-all hover:border-white"
                  style={{ borderColor: "#334155", transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)` }}
                >
                  <StickerTag
                    bg={tone.sticker}
                    className="absolute left-3 top-3 rounded-[3px] border-2 border-[var(--vh-surface-2)] px-2 py-1 text-[9px] font-bold not-italic uppercase"
                    label={item.kicker}
                    rotate={index % 2 === 0 ? "rotate-[2deg]" : "rotate-[-2deg]"}
                    text={tone.text}
                  />

                  <div className="mb-3 mt-8 flex items-center gap-3">
                    <div
                      className="inline-flex rounded-full p-2.5 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${tone.accent}22`, color: tone.accent }}
                    >
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: tone.accent }} />
                    </div>
                    <h3 className="text-lg font-bold uppercase text-white">{item.title}</h3>
                  </div>

                  <p className="text-xs leading-5 text-white/80 md:text-sm">{item.body}</p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </SectionFrame>
  );
}

function ExperienceSection() {
  return (
    <SectionFrame>
      <div className="vh-container">
        <SectionHeading title={homePageContent.experienceTitle} />
        <FadeIn className="-mt-4 mb-6 text-center">
          <StickerTag
            bg={sectionHeaderStickers.experience.bg}
            className="px-3 py-1.5 text-sm font-bold not-italic uppercase tracking-[0.08em]"
            label={sectionHeaderStickers.experience.label}
            rotate={sectionHeaderStickers.experience.rotate}
            text={sectionHeaderStickers.experience.text}
          />
        </FadeIn>
        <Stagger className="mx-auto grid max-w-screen-lg grid-cols-1 gap-6 md:grid-cols-2">
          {experienceCards.map((item, index) => (
            <StaggerItem key={item.title}>
              <FloatCard
                className="rounded-[8px] border-2 p-6 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.18)]"
                style={{
                  background: index === 0
                    ? "linear-gradient(135deg, #c62828, #8e1b1b)"
                    : index === 1
                    ? "linear-gradient(135deg, #39ff14, #6fff47)"
                    : index === 2
                    ? "linear-gradient(135deg, #00d1ff, #4ce4ff)"
                    : "linear-gradient(135deg, #facc15, #ffd966)",
                  borderColor: index === 0 || index === 1 || index === 3 ? "#ffffff" : "#0f172a",
                  color: item.darkText ? "#0f172a" : "#ffffff",
                  rotate: index % 2 === 0 ? "-1deg" : "1deg",
                }}
              >
                <h3 className="mb-4 font-['Geologica'] text-xl font-bold uppercase">{item.title}</h3>
                <p className="text-sm leading-6">{item.body}</p>
              </FloatCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </SectionFrame>
  );
}

function MoreAboutUsSection() {
  return (
    <SectionFrame>
      <div className="vh-container">
        <SectionHeading title="More About Us" />
        <Stagger className="mx-auto mt-2 grid max-w-screen-lg grid-cols-1 gap-6 md:grid-cols-2">

          {/* Upcoming Properties card */}
          <StaggerItem className="h-full">
            <Link
              href="/upcoming"
              className="group flex h-full flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] transition-all duration-200 hover:border-[rgba(255,255,255,0.5)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:p-6"
            >
              {/* Header */}
              <div className="space-y-3">
                <StickerTag
                  bg="#f9cb37"
                  className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
                  label="Coming Soon"
                  rotate="rotate-[-2deg]"
                  text="#111111"
                />
                <h2 className="font-sectiontitle mt-3 text-[22px] text-white">
                  Upcoming Properties
                </h2>
                <p className="text-sm leading-7 text-white/72">
                  Two bold new social hubs landing in Bangalore — built for creators, travellers, and doers. Bold. Social. Unforgettable.
                </p>
              </div>

              {/* Inner info panel */}
              <div className="mt-5 flex-1 space-y-3 rounded-[18px] border border-white/10 bg-black/20 p-4 md:p-5">
                <p className="font-caption text-white/55">What&apos;s coming</p>
                <p className="font-bodyfocus text-[15px] text-white">TDSocial Stay · Buteak Suites</p>
                <p className="font-body text-sm leading-7 text-white/72">
                  Koramangala, Bangalore &mdash; opening Q2 &amp; Q3 2026.
                </p>
                <div className="pt-1">
                  <p className="font-body text-xs uppercase tracking-[0.12em] text-white/48">02 Sites · 2026</p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-6">
                <span className="vh-cta-button inline-flex w-full items-center justify-center gap-2 group-hover:bg-[#8e1b1b]">
                  Get Excited &rarr;
                </span>
              </div>
            </Link>
          </StaggerItem>

          {/* Partner with Us card */}
          <StaggerItem className="h-full">
            <Link
              href="/partner-with-us"
              className="group flex h-full flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] transition-all duration-200 hover:border-[rgba(255,255,255,0.5)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:p-6"
            >
              {/* Header */}
              <div className="space-y-3">
                <StickerTag
                  bg="#39ff14"
                  className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
                  label="Invest &amp; Grow"
                  rotate="rotate-[1deg]"
                  text="#111111"
                />
                <h2 className="font-sectiontitle mt-3 text-[22px] text-white">
                  Partner With Us
                </h2>
                <p className="text-sm leading-7 text-white/72">
                  We manage. You earn. Full-stack hospitality, staffing, software &amp; branding handled — with unsurpassed ROI.
                </p>
              </div>

              {/* Inner info panel */}
              <div className="mt-5 flex-1 space-y-3 rounded-[18px] border border-white/10 bg-black/20 p-4 md:p-5">
                <p className="font-caption text-white/55">Partnership models</p>
                <p className="font-bodyfocus text-[15px] text-white">Leasing Model · Revenue Share</p>
                <p className="font-body text-sm leading-7 text-white/72">
                  Fixed rent or scalable profit &mdash; pick the model that fits. A partnership lead reaches out within 48 hours.
                </p>
                <div className="pt-1">
                  <p className="font-body text-xs uppercase tracking-[0.12em] text-white/48">Zero Operational Load</p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-6">
                <span className="vh-cta-button inline-flex w-full items-center justify-center gap-2 group-hover:bg-[#8e1b1b]">
                  Get In Touch &rarr;
                </span>
              </div>
            </Link>
          </StaggerItem>

        </Stagger>
      </div>
    </SectionFrame>
  );
}

function EnergySection() {
  return (
    <SectionFrame>
      <div className="vh-container">
        <SectionHeading title={homePageContent.energyTitle} />
        <FadeIn className="-mt-4 mb-6 text-center">
          <StickerTag
            bg={sectionHeaderStickers.energy.bg}
            className="px-3 py-1.5 text-sm font-bold not-italic uppercase tracking-[0.08em]"
            label={sectionHeaderStickers.energy.label}
            rotate={sectionHeaderStickers.energy.rotate}
            text={sectionHeaderStickers.energy.text}
          />
        </FadeIn>
        <Stagger className="mx-auto mb-8 grid max-w-screen-lg grid-cols-2 gap-4 md:grid-cols-4">
          {guestEnergyImages.map((image, index) => (
            <StaggerItem key={image}>
              <FloatCard
                className="overflow-hidden rounded-[4px] border-4 border-white shadow-[8px_8px_0px_0px_#c62828]"
                style={{ rotate: `${index % 2 === 0 ? -2 : 2}deg` }}
              >
                <ImageWithFallback
                  alt={`Guest energy ${index + 1}`}
                  className="aspect-square w-full object-cover hover:scale-110"
                  src={image}
                />
              </FloatCard>
            </StaggerItem>
          ))}
        </Stagger>
        <FadeIn className="text-center">
          <Button asChild className="vh-cta-button" size="lg">
            <Link href="https://instagram.com/thedailysocial01" rel="noreferrer" target="_blank">
              Follow on Instagram
            </Link>
          </Button>
        </FadeIn>
      </div>
    </SectionFrame>
  );
}

function ReviewsSection() {
  return <TestimonialsMarquee />;
}

function CtaSection({ destinationHref = "/property" }: { destinationHref?: string }) {
  return (
    <SectionFrame alt>
      <div className="vh-container">
        <FadeIn className="mx-auto max-w-[520px] rounded-[12px] border-4 border-white bg-gradient-to-br from-[var(--vh-pink)] via-[var(--vh-pink-soft)] to-[var(--vh-pink)] p-6 shadow-[12px_12px_0px_0px_rgba(255,255,255,0.25)]">
          <div className="mb-3 text-center">
            <span
              className="vh-retro-3d"
              style={{ fontSize: '0.7rem', letterSpacing: '4px', color: '#fff0c0', opacity: 0.9 }}
            >
              THE D<span className="vh-flicker">A</span>ILY SO<span className="vh-flicker" style={{ animationDelay: '0.6s' }}>C</span>IA<span className="vh-flicker" style={{ animationDelay: '1.2s' }}>L</span>
            </span>
          </div>
          <SectionHeading subtitle={homePageContent.ctaBody} title={homePageContent.ctaTitle} />
          <BookingWidget
            destinationHref={destinationHref}
            submitLabel="Book Now"
            urgencyChips={homePageContent.ctaUrgencyChips}
            variant="cta"
          />
          <p className="mt-4 text-center text-xs font-bold uppercase tracking-[1px] text-white">
            Free Cancellation | No Booking Fees
          </p>
        </FadeIn>
      </div>
    </SectionFrame>
  );
}

export function HomeSections({
  order = homeSectionOrder,
  homeEvents = homePageContent.homeEvents,
  homeRooms = homePageContent.homeRooms,
  propertyDestinationHref = "/property",
}: {
  order?: HomeSectionId[];
  homeEvents?: EventCardProps[];
  homeRooms?: RoomCardProps[];
  propertyDestinationHref?: string;
}) {
  return (
    <>
      {order.map((sectionId) => {
        if (sectionId === "rooms") {
          return <RoomsSection key={sectionId} rooms={homeRooms} />;
        }

        if (sectionId === "events") {
          return <EventsSection key={sectionId} events={homeEvents} />;
        }

        const sectionComponents: Record<Exclude<HomeSectionId, "rooms" | "events">, () => ReactNode> = {
          amenities: AmenitiesSection,
          upsell: UpsellSection,
          experience: ExperienceSection,
          moreAboutUs: MoreAboutUsSection,
          energy: EnergySection,
          reviews: ReviewsSection,
          cta: () => <CtaSection destinationHref={propertyDestinationHref} />,
        };

        const SectionComponent = sectionComponents[sectionId as Exclude<HomeSectionId, "rooms" | "events">];
        return <SectionComponent key={sectionId} />;
      })}
    </>
  );
}
