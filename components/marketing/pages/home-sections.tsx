"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { EventCardProps, RoomCardProps } from "@/content/types";
import {
  Bed,
  BedDouble,
  Briefcase,
  CalendarCheck,
  Coffee,
  Droplets,
  Laptop,
  Lock,
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
  ArrowRight,
  Zap,
  Compass,
} from "lucide-react";

import { upcomingEvents as fallbackEvents } from "@/content/events";
import { rooms as fallbackRooms } from "@/content/rooms";

import {
  amenities,
  experienceCards,
  guestEnergyImages,
  homeSectionOrder,
  type HomeSectionId,
  upsellBentoItems,
} from "@/content/home";
import { BookingWidget } from "@/components/marketing/widgets/booking-widget";
import { EventCard } from "@/components/marketing/widgets/event-card";
import { RoomCard } from "@/components/marketing/widgets/room-card";
import { SectionHeading } from "@/components/marketing/widgets/section-heading";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { MagneticButton } from "@/components/marketing/interactive/magnetic-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TestimonialsMarquee = dynamic(() => import("@/components/testimonials-with-marquee"));

type SectionFrameProps = {
  alt?: boolean;
  children: ReactNode;
  className?: string;
};

function SectionFrame({ alt = false, children, className = "" }: SectionFrameProps) {
  return (
    <section
      className={cn(
        "relative py-24 sm:py-32 overflow-hidden border-b border-white/[0.07]",
        alt ? "bg-[#060608]" : "bg-black",
        className
      )}
    >
      {/* Subtle Atmospheric Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E01E5A]/[0.025] blur-[120px] rounded-full" />
      {children}
    </section>
  );
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
  briefcase: Briefcase,
  sparkles: ShieldCheck,
  "shield-check": ShieldCheck,
  "bed-double": BedDouble,
  "calendar-check": CalendarCheck,
} as const;

function AmenitiesSection() {
  const amenityPillars = [
    {
      icon: Laptop,
      title: "Nomad Workspace",
      subtitle: "100Mbps Dedicated Fiber",
      description: "Ergonomic seating, silent focus zones, universal power strips, and zero lag for remote founders and creators.",
      accentClass: "bg-[#36C5F0]/10 border-[#36C5F0]/25 text-[#36C5F0]",
      subtitleClass: "text-[#36C5F0]",
    },
    {
      icon: Coffee,
      title: "Rooftop Cafe & Bar",
      subtitle: "Artisanal Pour-Overs",
      description: "Sunlit terrace, specialty coffee blends, healthy breakfasts, and evening craft cocktails under the Bangalore sky.",
      accentClass: "bg-[#ECB22E]/10 border-[#ECB22E]/25 text-[#ECB22E]",
      subtitleClass: "text-[#ECB22E]",
    },
    {
      icon: Bed,
      title: "Sanctuary Rest",
      subtitle: "Acoustic Privacy Pods",
      description: "Blackout privacy curtains, orthopedic mattresses, individual climate vents, personal reading lamps and USB-C docks.",
      accentClass: "bg-[#2FBC81]/10 border-[#2FBC81]/25 text-[#2FBC81]",
      subtitleClass: "text-[#2FBC81]",
    },
    {
      icon: ShieldCheck,
      title: "Seamless Safety",
      subtitle: "24/7 Smart Biometrics",
      description: "Keyless access, secure luggage vaults, daily professional housekeeping, and friendly 24-hour community hosts.",
      accentClass: "bg-[#E01E5A]/10 border-[#E01E5A]/25 text-[#E01E5A]",
      subtitleClass: "text-[#E01E5A]",
    },
  ];

  return (
    <SectionFrame alt>
      <div className="vh-container max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeading
          subtitle="Engineered for Nomads"
          title="Everything You Need. Nothing You Don't."
          tagline="Thoughtfully designed amenities to elevate your workday, recharge your body, and ignite your social life."
        />

        {/* 4 Architectural Lifestyle Pillars with Nudge Quad-Color Accents */}
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 mb-12">
          {amenityPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <StaggerItem key={pillar.title}>
                <div className="bg-[#121216] p-6 sm:p-7 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between group shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div>
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border mb-6 group-hover:scale-105 transition-transform", pillar.accentClass)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className={cn("text-[10.5px] font-mono font-medium uppercase tracking-wider mb-2", pillar.subtitleClass)}>
                      {pillar.subtitle}
                    </p>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-white font-display mb-3">
                      {pillar.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-white/65 font-body">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>

        {/* Floating Amenities Chip Bar */}
        <FadeIn className="bg-[#121216] p-4 sm:p-6 rounded-2xl border border-white/8 mt-6">
          <p className="text-center text-[10px] font-mono font-medium uppercase tracking-wider text-white/45 mb-4">
            Full Complimentary In-House Perks
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {amenities.map((item) => {
              const Icon = amenityIconMap[item.icon as keyof typeof amenityIconMap] ?? ShieldCheck;
              return (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/8 text-[11px] font-mono font-medium uppercase tracking-wider text-white/80 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 text-[#36C5F0]" />
                  <span>{item.label}</span>
                </span>
              );
            })}
          </div>
        </FadeIn>
      </div>
    </SectionFrame>
  );
}

function InlineSectionState({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-[#121216] p-8 text-center text-white max-w-xl mx-auto rounded-2xl border border-white/10">
      <p className="font-display text-xl font-bold uppercase tracking-wide text-white">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-white/60 font-body">{body}</p>
    </div>
  );
}

function SectionCardSkeletons() {
  return (
    <div aria-busy="true" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
      {[0, 1, 2].map((item) => (
        <div className="bg-[#121216] p-5 rounded-2xl border border-white/10 space-y-4" key={item}>
          <Skeleton className="h-[220px] w-full bg-white/5 rounded-xl" />
          <Skeleton className="h-6 w-2/3 bg-white/5 rounded-lg" />
          <Skeleton className="h-4 w-full bg-white/5 rounded-lg" />
          <Skeleton className="h-10 w-full bg-white/5 rounded-xl mt-4" />
        </div>
      ))}
    </div>
  );
}

function RoomsSection({
  pending,
  roomError,
  rooms,
}: {
  pending?: boolean;
  roomError?: string | null;
  rooms: RoomCardProps[];
}) {
  const roomItems = rooms && rooms.length > 0 ? rooms : fallbackRooms;

  return (
    <SectionFrame>
      <div className="vh-container max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeading
          subtitle="Bespoke Rooms & Nomad Suites"
          title="Your Private Sanctuary"
          tagline="Crafted for deep rest, effortless co-working, and seamless privacy in the pulsing heart of Bangalore."
        />

        {pending ? (
          <SectionCardSkeletons />
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {roomItems.map((room) => (
              <StaggerItem key={room.title} className="h-full">
                <RoomCard {...room} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </SectionFrame>
  );
}

function EventsSection({
  eventError,
  events,
  pending,
}: {
  eventError?: string | null;
  events: EventCardProps[];
  pending?: boolean;
}) {
  const eventItems = events && events.length > 0 ? events : fallbackEvents.slice(0, 3);

  return (
    <SectionFrame alt>
      <div className="vh-container max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeading
          subtitle="The Weekly Rhythm"
          title="Culture, Beats & Connections"
          tagline="Live acoustic sunsets, creator meetups, rooftop screening parties, and local food walks."
        />

        {pending ? (
          <SectionCardSkeletons />
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {eventItems.slice(0, 3).map((event) => (
              <StaggerItem key={`${event.title}-${event.date}-${event.time}`} className="h-full">
                <EventCard {...event} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </SectionFrame>
  );
}

function UpsellSection() {
  return (
    <SectionFrame alt>
      <div className="vh-container max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeading
          subtitle="Stay Longer, Go Deeper"
          title="Designed for Extended Nomads"
          tagline="Zero lock-ins, seamless monthly renewals, and curated community dining."
        />

        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {upsellBentoItems.map((item, index) => {
            const accents = ["#36C5F0", "#ECB22E", "#2FBC81"];
            const currentAccent = accents[index % accents.length];
            return (
              <StaggerItem key={item.id} className="h-full">
                <div className="bg-[#121216] p-7 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between group shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-[10px] font-mono font-medium uppercase tracking-wider mb-4 border"
                      style={{
                        backgroundColor: `${currentAccent}1A`,
                        borderColor: `${currentAccent}4D`,
                        color: currentAccent,
                      }}
                    >
                      {item.kicker}
                    </span>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-white font-display mb-3">
                      {item.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-white/65 font-body">
                      {item.body}
                    </p>
                  </div>
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
  const quadAccents = [
    { color: "#E01E5A", icon: Zap, kicker: "HIGH OCTANE" },
    { color: "#2FBC81", icon: ShieldCheck, kicker: "SAFE HAVEN" },
    { color: "#36C5F0", icon: Users, kicker: "TRIBE CULTURE" },
    { color: "#ECB22E", icon: Compass, kicker: "CITY CENTER" },
  ];

  return (
    <SectionFrame>
      <div className="vh-container max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeading
          subtitle="The Vibehouse Ethos"
          title="More Than A Bed"
          tagline="A sanctuary built on spontaneous conversations, shared journeys, and creative momentum."
        />

        <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-5xl mx-auto">
          {experienceCards.map((item, index) => {
            const quad = quadAccents[index % quadAccents.length];
            const Icon = quad.icon;

            return (
              <StaggerItem key={item.title}>
                <div className="bg-[#121216] p-8 rounded-2xl border border-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center border"
                        style={{
                          backgroundColor: `${quad.color}15`,
                          borderColor: `${quad.color}35`,
                          color: quad.color,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                        style={{
                          backgroundColor: `${quad.color}10`,
                          borderColor: `${quad.color}30`,
                          color: quad.color,
                        }}
                      >
                        {quad.kicker}
                      </span>
                    </div>
                    <h3
                      className="font-display text-2xl font-bold uppercase tracking-tight mb-3 transition-colors"
                      style={{ color: quad.color }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm leading-relaxed text-white/70 font-body">
                      {item.body}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </SectionFrame>
  );
}

function MoreAboutUsSection() {
  return (
    <SectionFrame>
      <div className="vh-container max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeading
          subtitle="Expansion & Ecosystem"
          title="The Future of Social Hospitality"
        />

        <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-5xl mx-auto">
          {/* Upcoming Properties */}
          <StaggerItem className="h-full">
            <Link
              href="/upcoming"
              className="group flex h-full flex-col justify-between bg-[#121216] p-8 rounded-2xl border border-white/10 hover:border-[#E01E5A]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)]"
            >
              <div>
                <span className="inline-block rounded-full bg-[#E01E5A] text-white px-3 py-1 text-[10px] font-mono font-medium uppercase tracking-wider mb-4 shadow-md">
                  Coming Soon · 2026
                </span>
                <h3 className="font-display text-3xl font-bold uppercase tracking-tight text-white group-hover:text-white transition-colors">
                  Upcoming Properties
                </h3>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-white/70 font-body">
                  Two bold new social destinations landing in Bangalore — TDSocial Stay &amp; Buteak Suites on Koramangala Club Road.
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono font-medium uppercase tracking-wider text-[#E01E5A]">
                <span>Preview New Hubs</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
              </div>
            </Link>
          </StaggerItem>

          {/* Partner With Us */}
          <StaggerItem className="h-full">
            <Link
              href="/partner-with-us"
              className="group flex h-full flex-col justify-between bg-[#121216] p-8 rounded-2xl border border-white/10 hover:border-[#E01E5A]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)]"
            >
              <div>
                <span className="inline-block rounded-full bg-white/[0.08] border border-white/15 text-white px-3 py-1 text-[10px] font-mono font-medium uppercase tracking-wider mb-4">
                  Invest &amp; Scale
                </span>
                <h3 className="font-display text-3xl font-bold uppercase tracking-tight text-white group-hover:text-white transition-colors">
                  Partner With Us
                </h3>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-white/70 font-body">
                  Turn real estate into industry-leading yields. Full-stack hospitality management, brand architecture, and direct tribe distribution.
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono font-medium uppercase tracking-wider text-[#E01E5A]">
                <span>Explore Models</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
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
      <div className="vh-container max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeading
          subtitle="Captured In The Wild"
          title="Vibes Unfiltered"
          tagline="Real moments from our rooftop acoustics, community dinners, and Koramangala wanderings."
        />

        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-12 max-w-6xl mx-auto">
          {guestEnergyImages.map((image, index) => (
            <StaggerItem key={image}>
              <div className="group relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 p-2 shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
                <ImageWithFallback
                  alt={`Guest energy ${index + 1}`}
                  className="aspect-square w-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
                  src={image}
                />
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <FadeIn className="mt-10 text-center">
          <Link href="https://instagram.com/vibehouse" rel="noreferrer" target="_blank">
            <MagneticButton className="rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 px-6 py-3 text-xs font-mono font-medium uppercase tracking-wider text-white transition-all">
              <span>Follow @vibehouse</span>
            </MagneticButton>
          </Link>
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
    <SectionFrame alt className="py-28 sm:py-36">
      <div className="vh-container max-w-4xl mx-auto px-4 sm:px-6">
        <FadeIn className="bg-[#121216] rounded-3xl p-8 sm:p-12 border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.8)] text-center relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[450px] h-[250px] bg-[#E01E5A]/10 blur-[90px] rounded-full" />

          <p className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#E01E5A] mb-3">
            Your Bengaluru Base
          </p>

          <h2 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-white leading-tight max-w-2xl mx-auto">
            Experience Koramangala&apos;s Creative Energy
          </h2>

          <p className="mt-4 text-xs sm:text-sm font-body text-white/70 max-w-md mx-auto leading-relaxed">
            Direct bookings guarantee best available rates, instant confirmation, and full community access.
          </p>

          <div className="mt-8 max-w-lg mx-auto">
            <BookingWidget
              destinationHref={destinationHref}
              submitLabel="Check Dates"
              variant="cta"
            />
          </div>
        </FadeIn>
      </div>
    </SectionFrame>
  );
}

export function HomeSections({
  order = homeSectionOrder,
  eventError = null,
  eventsPending = false,
  homeEvents = [],
  homeRooms = [],
  propertyDestinationHref = "/property",
  roomError = null,
  roomsPending = false,
}: {
  order?: HomeSectionId[];
  eventError?: string | null;
  eventsPending?: boolean;
  homeEvents?: EventCardProps[];
  homeRooms?: RoomCardProps[];
  propertyDestinationHref?: string;
  roomError?: string | null;
  roomsPending?: boolean;
}) {
  return (
    <>
      {order.map((sectionId) => {
        if (sectionId === "rooms") {
          return (
            <RoomsSection
              key={sectionId}
              pending={roomsPending}
              roomError={roomError}
              rooms={homeRooms}
            />
          );
        }

        if (sectionId === "events") {
          return (
            <EventsSection
              eventError={eventError}
              events={homeEvents}
              key={sectionId}
              pending={eventsPending}
            />
          );
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
