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
  ArrowRight,
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
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { Button as NeoPopButton } from "@/components/neopop";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TestimonialsMarquee = dynamic(() => import("@/components/testimonials-with-marquee"));

type SectionFrameProps = {
  alt?: boolean;
  children: ReactNode;
};

function SectionFrame({ alt = false, children }: SectionFrameProps) {
  return (
    <section className={cn("py-20 border-b border-[#3D3D3D]", alt ? "bg-[#0A0A0A]" : "bg-[#0D0D0D]")}>
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
  lamp: LampDesk,
  briefcase: Briefcase,
  cross: Cross,
  sparkles: ShieldCheck,
  "shield-check": ShieldCheck,
  "bed-double": BedDouble,
  "lock-keyhole": LockKeyhole,
  "calendar-check": CalendarCheck,
} as const;

function AmenitiesSection() {
  return (
    <SectionFrame alt>
      <div className="vh-container">
        <SectionHeading tagline={homePageContent.amenitiesTagline} title={homePageContent.amenitiesTitle} />
        
        <FadeIn className="-mt-4 mb-8 text-center">
          <span className="inline-block border border-[var(--np-yellow)] bg-[var(--np-yellow)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--np-yellow)] font-['Gilroy',sans-serif]">
            Live Better · Stay Better
          </span>
        </FadeIn>

        <Stagger className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
          {amenities.map((item) => {
            const Icon = amenityIconMap[item.icon as keyof typeof amenityIconMap] ?? ShieldCheck;

            return (
              <StaggerItem key={item.label}>
                <div className="flex items-center gap-3 border border-[#3D3D3D] bg-[#161616] p-3.5 shadow-[3px_3px_0px_#000000] hover:border-white/50 transition-colors">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#3D3D3D] bg-[#121212] text-[var(--np-yellow)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-white font-['Gilroy',sans-serif]">
                    {item.label}
                  </span>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </SectionFrame>
  );
}

function InlineSectionState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border border-dashed border-[#3D3D3D] bg-[#161616] p-8 text-center text-white max-w-xl mx-auto">
      <p className="font-['Gilroy',sans-serif] text-lg font-bold uppercase tracking-[0.08em]">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-white/60 font-['Gilroy',sans-serif]">{body}</p>
    </div>
  );
}

function SectionCardSkeletons() {
  return (
    <div aria-busy="true" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Live content is being prepared.</span>
      {[0, 1, 2].map((item) => (
        <div className="border border-[#3D3D3D] bg-[#161616] p-4" key={item}>
          <Skeleton className="h-[220px] w-full bg-white/5 rounded-none" />
          <div className="space-y-3 mt-4">
            <Skeleton className="h-6 w-2/3 bg-white/5 rounded-none" />
            <Skeleton className="h-4 w-full bg-white/5 rounded-none" />
            <Skeleton className="h-4 w-4/5 bg-white/5 rounded-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomsSection({ pending, roomError, rooms }: { pending?: boolean; roomError?: string | null; rooms: RoomCardProps[] }) {
  const roomItems = rooms;
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
        
        <FadeIn className="-mt-4 mb-8 text-center">
          <span className="inline-block border border-[var(--np-yellow)] bg-[var(--np-yellow)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--np-yellow)] font-['Gilroy',sans-serif]">
            Your Sanctuary
          </span>
        </FadeIn>

        {pending ? (
          <SectionCardSkeletons />
        ) : roomError ? (
          <FadeIn>
            <InlineSectionState body={roomError} title="Rooms did not load" />
          </FadeIn>
        ) : roomItems.length === 0 ? (
          <FadeIn>
            <InlineSectionState body="No rooms are available right now for the selected stay window." title="No rooms available" />
          </FadeIn>
        ) : (
          <Stagger className={roomGridClass}>
            {roomItems.map((room) => (
              <StaggerItem key={room.title}>
                <RoomCard {...room} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </SectionFrame>
  );
}

function EventsSection({ eventError, events, pending }: { eventError?: string | null; events: EventCardProps[]; pending?: boolean }) {
  const eventItems = events;
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
        
        <FadeIn className="-mt-4 mb-8 text-center">
          <span className="inline-block border border-[var(--np-blue)] bg-[var(--np-blue)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--np-blue)] font-['Gilroy',sans-serif]">
            Weekly Lineup
          </span>
        </FadeIn>

        {pending ? (
          <SectionCardSkeletons />
        ) : eventError ? (
          <FadeIn>
            <InlineSectionState body={eventError} title="Events did not load" />
          </FadeIn>
        ) : eventItems.length === 0 ? (
          <FadeIn>
            <InlineSectionState body="No events are scheduled right now." title="No upcoming events" />
          </FadeIn>
        ) : (
          <Stagger className={eventGridClass}>
            {eventItems.slice(0, 3).map((event) => (
              <StaggerItem key={`${event.title}-${event.date}-${event.time}`}>
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
      <div className="vh-container">
        <SectionHeading title={homePageContent.upsellTitle} />
        
        <FadeIn className="-mt-4 mb-8 text-center">
          <span className="inline-block border border-[var(--np-yellow)] bg-[var(--np-yellow)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--np-yellow)] font-['Gilroy',sans-serif]">
            Elevate Your Nights
          </span>
        </FadeIn>

        <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upsellBentoItems.map((item) => (
            <StaggerItem key={item.id}>
              <div className="border border-[#3D3D3D] bg-[#161616] p-6 shadow-[4px_4px_0px_#000000] hover:border-white/40 transition-colors h-full flex flex-col justify-between">
                <div>
                  <div className="mb-4">
                    <span className="border border-black bg-[var(--np-yellow)] text-black px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]">
                      {item.kicker}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold uppercase tracking-[0.06em] text-white font-['Gilroy',sans-serif] mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs leading-relaxed text-white/65 font-['Gilroy',sans-serif]">
                    {item.body}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
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
        
        <FadeIn className="-mt-4 mb-8 text-center">
          <span className="inline-block border border-[var(--np-green)] bg-[var(--np-green)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--np-green)] font-['Gilroy',sans-serif]">
            The Daily Experience
          </span>
        </FadeIn>

        <Stagger className="mx-auto grid max-w-screen-lg grid-cols-1 gap-6 md:grid-cols-2">
          {experienceCards.map((item) => (
            <StaggerItem key={item.title}>
              <div className="border border-[#3D3D3D] bg-[#161616] p-6 shadow-[4px_4px_0px_#000000] hover:border-white/40 transition-colors">
                <h3 className="mb-2 font-['Gilroy',sans-serif] text-xl font-extrabold uppercase tracking-[0.06em] text-[var(--np-yellow)]">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-white/70 font-['Gilroy',sans-serif]">
                  {item.body}
                </p>
              </div>
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
        <Stagger className="mx-auto mt-4 grid max-w-screen-lg grid-cols-1 gap-6 md:grid-cols-2">
          {/* Upcoming Properties card */}
          <StaggerItem className="h-full">
            <Link
              href="/upcoming"
              className="group flex h-full flex-col border border-[#3D3D3D] bg-[#161616] p-6 shadow-[4px_4px_0px_#000000] hover:border-white/40 transition-all"
            >
              <div className="space-y-3">
                <span className="inline-block border border-black bg-[var(--np-yellow)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-black">
                  Coming Soon
                </span>
                <h3 className="text-xl font-extrabold uppercase tracking-[0.06em] text-white font-['Gilroy',sans-serif]">
                  Upcoming Properties
                </h3>
                <p className="text-xs leading-relaxed text-white/65 font-['Gilroy',sans-serif]">
                  Two bold new social hubs landing in Bangalore — built for creators, travellers, and doers.
                </p>
              </div>

              <div className="mt-5 flex-1 space-y-2 border border-[#3D3D3D] bg-[#121212] p-4">
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-[0.12em]">What&apos;s Coming</p>
                <p className="text-sm font-bold text-white font-['Gilroy',sans-serif]">TDSocial Stay · Buteak Suites</p>
                <p className="text-xs text-white/65 font-['Gilroy',sans-serif]">
                  Koramangala, Bangalore &mdash; opening 2026.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-[0.1em] text-[var(--np-yellow)] font-['Gilroy',sans-serif]">
                <span>Explore Properties</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </StaggerItem>

          {/* Partner with Us card */}
          <StaggerItem className="h-full">
            <Link
              href="/partner-with-us"
              className="group flex h-full flex-col border border-[#3D3D3D] bg-[#161616] p-6 shadow-[4px_4px_0px_#000000] hover:border-white/40 transition-all"
            >
              <div className="space-y-3">
                <span className="inline-block border border-black bg-[var(--np-green)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-black">
                  Invest &amp; Grow
                </span>
                <h3 className="text-xl font-extrabold uppercase tracking-[0.06em] text-white font-['Gilroy',sans-serif]">
                  Partner With Us
                </h3>
                <p className="text-xs leading-relaxed text-white/65 font-['Gilroy',sans-serif]">
                  We manage. You earn. Full-stack hospitality, staffing, software &amp; branding handled.
                </p>
              </div>

              <div className="mt-5 flex-1 space-y-2 border border-[#3D3D3D] bg-[#121212] p-4">
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-[0.12em]">Partnership Models</p>
                <p className="text-sm font-bold text-white font-['Gilroy',sans-serif]">Leasing Model · Revenue Share</p>
                <p className="text-xs text-white/65 font-['Gilroy',sans-serif]">
                  Fixed rent or scalable profit &mdash; choose what fits.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-[0.1em] text-[var(--np-green)] font-['Gilroy',sans-serif]">
                <span>Partner Inquiries</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
        
        <FadeIn className="-mt-4 mb-8 text-center">
          <span className="inline-block border border-[var(--np-yellow)] bg-[var(--np-yellow)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--np-yellow)] font-['Gilroy',sans-serif]">
            Reel Moments
          </span>
        </FadeIn>

        <Stagger className="mx-auto mb-8 grid max-w-screen-lg grid-cols-2 gap-4 md:grid-cols-4">
          {guestEnergyImages.map((image, index) => (
            <StaggerItem key={image}>
              <div className="border border-[#3D3D3D] bg-[#161616] p-2 shadow-[4px_4px_0px_#000000]">
                <ImageWithFallback
                  alt={`Guest energy ${index + 1}`}
                  className="aspect-square w-full object-cover"
                  src={image}
                />
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <FadeIn className="text-center">
          <NeoPopButton asChild size="default" variant="secondary">
            <Link href="https://instagram.com/thedailysocial01" rel="noreferrer" target="_blank">
              Follow on Instagram
            </Link>
          </NeoPopButton>
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
        <FadeIn className="mx-auto max-w-[600px] border border-[#3D3D3D] bg-[#121212] p-8 shadow-[8px_8px_0px_#000000]">
          <div className="mb-4 text-center">
            <span className="font-['Gilroy',sans-serif] text-xs font-black uppercase tracking-[0.2em] text-[var(--np-yellow)]">
              THE DAILY SOCIAL
            </span>
          </div>

          <SectionHeading subtitle={homePageContent.ctaBody} title={homePageContent.ctaTitle} />

          <div className="mt-6">
            <BookingWidget
              destinationHref={destinationHref}
              submitLabel="Book Now"
              urgencyChips={homePageContent.ctaUrgencyChips}
              variant="cta"
            />
          </div>

          <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white/50 font-['Gilroy',sans-serif]">
            Free Cancellation · No Hidden Booking Fees
          </p>
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
          return <RoomsSection key={sectionId} pending={roomsPending} roomError={roomError} rooms={homeRooms} />;
        }

        if (sectionId === "events") {
          return <EventsSection eventError={eventError} events={homeEvents} key={sectionId} pending={eventsPending} />;
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
