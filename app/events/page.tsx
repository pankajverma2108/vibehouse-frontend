import { EventCard } from "@/components/marketing/event-card";
import MagicBento from "@/components/marketing/magic-bento";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { eventPageContent, pastEventImages, weeklyLineup } from "@/content/events";
import { getDefaultPropertyId, getPublicEvents } from "@/lib/cx-api";

export default async function EventsPage() {
  const propertyId = getDefaultPropertyId() || undefined;
  const liveEvents = await getPublicEvents({ propertyId });

  const eventGridClass =
    liveEvents.length <= 1
      ? "grid grid-cols-1 gap-8 md:max-w-[460px] md:mx-auto"
      : liveEvents.length === 2
      ? "grid grid-cols-1 gap-8 md:grid-cols-2"
      : "grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            alt="Experiences hero"
            className="h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1758179764880-7513421d202a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1400"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(15,23,42,0.65)] to-[var(--vh-surface-2)]" />
        </div>
        <FadeIn className="relative z-10 vh-container py-16 text-center">
          <p className="inline-block rounded-[4px] bg-gradient-to-r from-[var(--vh-pink)] to-[var(--vh-pink-soft)] px-4 py-2 text-sm font-bold uppercase tracking-[1.4px] text-white">
            Every Night is an Adventure
          </p>
          <h1 className="mt-8 leading-none">
            <span className="vh-retro-sign-flat text-5xl md:text-7xl lg:text-8xl" style={{ display: "block" }}>Never a</span>
            <span className="vh-retro-sign-flat text-5xl md:text-7xl lg:text-8xl" style={{ display: "block", marginTop: "0.15em" }}>
              Dull <span className="vh-flicker-sign">E</span>v<span className="vh-flicker-sign" style={{ animationDelay: "0.35s" }}>e</span>ning.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[700px] text-lg italic text-white/85">
            From pub crawls to game nights, meet travelers from around the world and create memories that last.
          </p>
        </FadeIn>
      </section>

      <section className="vh-section">
        <div className="vh-container">
          <SectionHeading align="center" subtitle={eventPageContent.upcomingSubtitle} title="This Week" />
          <Stagger className={eventGridClass}>
            {liveEvents.map((event) => (
              <StaggerItem key={`${event.title}-${event.date}-${event.time}`}>
                <EventCard {...event} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <SectionHeading align="center" subtitle={eventPageContent.weeklySubtitle} title="Standard Weekly Experiences" />
          <MagicBento
            clickEffect
            disableAnimations={false}
            enableBorderGlow
            enableMagnetism={false}
            enableSpotlight
            enableStars
            enableTilt={false}
            glowColor="132, 0, 255"
            items={weeklyLineup}
            particleCount={12}
            spotlightRadius={400}
            textAutoHide
          />
        </div>
      </section>

      <section className="vh-section">
        <div className="vh-container">
          <SectionHeading align="center" subtitle={eventPageContent.pastSubtitle} title="The Memories" />
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {pastEventImages.map((image, index) => (
              <StaggerItem key={image}>
                <div
                  className="overflow-hidden rounded-[8px] border-4 border-white shadow-[8px_8px_0px_0px_rgba(198,40,40,0.5)]"
                  style={{ transform: `rotate(${(index % 3) - 1}deg)` }}
                >
                  <ImageWithFallback
                    alt={`Past experience ${index + 1}`}
                    className="aspect-square w-full object-cover hover:scale-110"
                    src={image}
                  />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <FadeIn className="mt-10 text-center">
            <a
              className="vh-cta-button"
              href="https://instagram.com/thedailysocial01"
            >
              Follow on Instagram
            </a>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
