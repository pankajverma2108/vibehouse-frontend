"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  Mail,
  Phone,
  UserCircle2,
  VenusAndMars,
} from "lucide-react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { GuestVerificationBanner } from "@/components/auth/guest-verification-banner";
import ReflectiveCard from "@/components/profile/reflective-card";
import { StickerTag } from "@/components/shared/sticker-tag";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { upcomingEvents } from "@/content/events";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/guest-form-validation";

type EventCardsProps = {
  events: typeof upcomingEvents;
  accent: string;
  border: string;
};

function EventCards({ events, accent, border }: EventCardsProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const autoplayPlugin = useRef(
    Autoplay({
      delay: 3400,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );

  return (
    <Carousel
      setApi={setCarouselApi}
      opts={{ align: "start", loop: events.length > 1, slidesToScroll: 1 }}
      plugins={events.length > 1 ? [autoplayPlugin.current] : []}
      className="w-full lg:flex lg:h-full lg:flex-col [&>[data-slot=carousel-content]]:lg:flex-1 [&>[data-slot=carousel-content]]:lg:min-h-0 [&>[data-slot=carousel-content]>div]:lg:h-full"
    >
      <CarouselContent className="-ml-0 lg:h-full">
        {events.map((event) => (
          <CarouselItem key={event.title} className="basis-full pl-0 lg:h-full">
            <Link
              href={event.href}
              className="group relative block h-full min-h-[262px] w-full overflow-hidden rounded-2xl border shadow-[0_16px_36px_rgba(0,0,0,0.35)] sm:min-h-[300px] md:min-h-[376px] lg:min-h-0"
              style={{ borderColor: border }}
            >
              <ImageWithFallback alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={event.image} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/38 to-black/8" />
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <p className="line-clamp-2 text-base font-bold leading-6 text-white md:text-lg">{event.title}</p>
                <p className="mt-1 text-[12px] uppercase tracking-[0.1em] text-white/80">{event.time}</p>
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="pt-2 sm:pt-3 lg:pt-2">
        <div className="grid items-center md:grid-cols-[44px_1fr_44px]">
          <div className="hidden justify-start md:flex">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 border text-white hover:bg-white/5"
              style={{ borderColor: border }}
              onClick={() => {
                autoplayPlugin.current.stop();
                carouselApi?.scrollPrev();
                autoplayPlugin.current.play();
              }}
              disabled={!carouselApi?.canScrollPrev()}
              data-slot="event-prev"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous event</span>
            </Button>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => (window.location.href = "/events")}
              className="h-9 rounded-full px-4 text-xs font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              View All Events
            </Button>
          </div>

          <div className="hidden justify-end md:flex">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 border text-white hover:bg-white/5"
              style={{ borderColor: border }}
              onClick={() => {
                autoplayPlugin.current.stop();
                carouselApi?.scrollNext();
                autoplayPlugin.current.play();
              }}
              disabled={!carouselApi?.canScrollNext()}
              data-slot="event-next"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next event</span>
            </Button>
          </div>
        </div>
      </div>
    </Carousel>
  );
}

function buildPassportId(seed: string, createdAt: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const digits = String(hash % 1000).padStart(3, "0");
  const letters = [
    alphabet[(hash >> 5) % 26],
    alphabet[(hash >> 10) % 26],
    alphabet[(hash >> 15) % 26],
  ].join("");
  const year = new Date(createdAt).getFullYear() || new Date().getFullYear();

  return `VP-${digits}-${letters}-${year}`;
}

function parseDateString(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function toInputDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDobDate(value?: string): string {
  const parsed = parseDateString(value);
  if (!parsed) {
    return "Select date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

const CORAL_THEME = {
  accent: "#c62828",
  accentMuted: "#8e1b1b",
  panel: "#07070a",
  panelStrong: "#07070a",
  border: "rgba(198, 40, 40, 0.44)",
  chip: "#07070a",
};

const subscribe = () => () => {};

export default function ProfilePage() {
  const router = useRouter();
  const { guest, isAuthenticated, isRestoringSession, openAuthModal, updateGuestProfile, signOut } = useGuestAuth();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hasMounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(guest?.name ?? "");
  const [email, setEmail] = useState(guest?.email ?? "");
  const [phone, setPhone] = useState(guest?.phone ?? "");
  const [birthDate, setBirthDate] = useState(guest?.birthDate ?? "");
  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [nationality, setNationality] = useState(guest?.nationality ?? "");
  const [fromLocation, setFromLocation] = useState(guest?.location ?? "");
  const [gender, setGender] = useState(guest?.gender ?? "");
  const [error, setError] = useState<string | null>(null);
  const guestId = guest?.id;

  const passportId = useMemo(() => {
    return buildPassportId(guestId ?? "guest", guest?.created_at ?? "2021-09-15");
  }, [guest?.created_at, guestId]);

  const featuredEvents = useMemo(() => upcomingEvents.slice(0, 3), []);

  const theme = CORAL_THEME;

  useEffect(() => {
    if (!hasMounted) {
      return;
    }

    if (isRestoringSession || isAuthenticated) {
      return;
    }

    openAuthModal("signin");
    router.replace("/");
  }, [hasMounted, isAuthenticated, isRestoringSession, openAuthModal, router]);

  useEffect(() => {
    if (!rootRef.current || !guestId || isRestoringSession || !isAuthenticated) {
      return;
    }

    const root = rootRef.current;

    const context = gsap.context(() => {
      const hero = root.querySelector("[data-gsap='hero']");
      const side = root.querySelector("[data-gsap='side']");
      const details = root.querySelector("[data-gsap='details']");
      const fields = root.querySelectorAll(".vh-field-enter");

      if (hero) {
        gsap.fromTo(hero, { y: 22, opacity: 0, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" });
      }

      if (side) {
        gsap.fromTo(side, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.72, ease: "power3.out", delay: 0.08 });
      }

      if (details) {
        gsap.fromTo(details, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: "power3.out", delay: 0.16 });
      }

      if (fields.length > 0) {
        gsap.fromTo(fields, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, ease: "power2.out", stagger: 0.045, delay: 0.08 });
      }
    }, rootRef);

    return () => context.revert();
  }, [guestId, isAuthenticated, isEditing, isRestoringSession]);

  if (!hasMounted || isRestoringSession) {
    return (
      <section className="vh-section py-20 pt-28 md:pt-32">
        <div className="vh-container">
          <div
            aria-busy="true"
            aria-live="polite"
            className="mx-auto w-full max-w-[1060px] space-y-5 bg-[#07070a] p-2 md:p-3"
            role="status"
          >
            <span className="sr-only">Loading your profile details.</span>
            <Skeleton className="h-10 w-56 rounded-full bg-white/10" />
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Skeleton className="h-[280px] rounded-2xl bg-white/8" />
              <Skeleton className="h-[280px] rounded-2xl bg-white/8" />
            </div>
            <Skeleton className="h-[320px] rounded-2xl bg-white/8" />
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated || !guest) {
    return (
      <section className="vh-section py-20 pt-28 md:pt-32">
        <div className="vh-container">
          <div className="mx-auto w-full max-w-[560px] space-y-4 bg-[#07070a] p-3 md:p-4">
            <Skeleton className="mx-auto h-8 w-48 rounded-full bg-white/10" />
            <Skeleton className="h-14 w-full rounded-xl bg-white/8" />
            <Skeleton className="h-14 w-full rounded-xl bg-white/8" />
          </div>
        </div>
      </section>
    );
  }

  const startEdit = () => {
    setName(guest.name);
    setEmail(guest.email);
    setPhone(guest.phone ?? "");
    setBirthDate(guest.birthDate ?? "");
    setNationality(guest.nationality ?? "");
    setFromLocation(guest.location ?? "");
    setGender(guest.gender ?? "");
    setDobPickerOpen(false);
    setError(null);
    setIsEditing(true);
  };

  const saveEdit = () => {
    const normalizedName = name.trim();
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedName) {
      setError("Name is required.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!isValidPhone(normalizedPhone, { optional: true })) {
      setError("Use a 10-digit mobile number. If it starts with 91, we trim it automatically.");
      return;
    }

    if (birthDate) {
      const dateValue = new Date(`${birthDate}T00:00:00`);
      const now = new Date();

      if (Number.isNaN(dateValue.getTime()) || dateValue > now) {
        setError("Born on date must be valid and not in the future.");
        return;
      }
    }

    updateGuestProfile({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone || null,
      birthDate: birthDate || null,
      location: fromLocation.trim() || null,
      nationality: nationality.trim() || null,
      gender: gender || null,
    });

    setIsEditing(false);
    setError(null);
  };

  const cancelEdit = () => {
    setDobPickerOpen(false);
    setIsEditing(false);
    setError(null);
  };

  return (
    <section ref={rootRef} className="vh-section relative overflow-x-hidden pt-24 pb-6 md:pt-28 md:pb-8" style={{ backgroundColor: "#07070a" }}>
      <GuestVerificationBanner />
      <div className="vh-container">
        <div className="relative mx-auto w-full max-w-[1060px] bg-[#07070a]">
          <header className="px-2 py-3 text-center md:px-3 md:py-4 vh-reveal" style={{ backgroundColor: "#07070a" }}>
            <p className="font-['Caveat'] text-xl leading-none md:text-2xl" style={{ color: theme.accent }}>
              Your signature guest identity
            </p>
            <h1 className="mt-1 whitespace-nowrap font-['Suez_One'] text-[15px] font-normal uppercase tracking-[0.1em] text-slate-100 sm:text-lg md:text-xl">
              Daily Social Passport
            </h1>
          </header>

          <div className="space-y-3 bg-[#07070a] px-1 py-2 md:space-y-4 md:px-2 md:py-3">
            <div className="grid items-stretch gap-3 bg-[#07070a] lg:grid-cols-[320px_1fr] lg:[&>*]:h-[440px]">
              <article
                data-gsap="hero"
                className="relative overflow-visible bg-[#07070a] vh-reveal vh-delay-2"
              >
                <div className="absolute -top-3 right-0 z-30">
                  <StickerTag
                    label="Verified Guest"
                    bg={theme.accentMuted}
                    text="#ffffff"
                    rotate="rotate-[8deg]"
                    className="rounded-[3px] border-2 border-[var(--vh-surface-2)] px-2 py-1 text-[9px] font-bold not-italic uppercase shadow-[0_3px_8px_rgba(0,0,0,0.22)]"
                  />
                </div>

                <ReflectiveCard
                  name={guest.name.toUpperCase()}
                  roleLabel="The Daily Passport"
                  idLabel={passportId}
                  backgroundMode="flat"
                  backgroundColor="#07070a"
                  overlayColor="rgba(0, 0, 0, 0.2)"
                  blurStrength={12}
                  glassDistortion={30}
                  metalness={1}
                  roughness={0.75}
                  displacementStrength={20}
                  noiseScale={1}
                  specularConstant={5}
                  grayscale={0.15}
                  color="#ffffff"
                  useCamera={false}
                  className="mx-auto h-[440px] w-full max-w-[320px] lg:h-full"
                />
              </article>

              <section
                data-gsap="side"
                className="relative h-full bg-[#07070a] vh-reveal vh-delay-3"
              >
                <div className="absolute -top-2 right-0 z-20">
                  <StickerTag
                    label="Event Gallery"
                    bg={theme.accentMuted}
                    text="#ffffff"
                    rotate="rotate-[10deg]"
                    className="rounded-[3px] border-2 border-[var(--vh-surface-2)] px-2 py-1 text-[9px] font-bold not-italic uppercase"
                  />
                </div>

                <div className="h-full min-h-0 flex-1">
                  <EventCards events={featuredEvents} accent={theme.accent} border={theme.border} />
                </div>
              </section>
            </div>

            <section data-gsap="details" className="vh-reveal vh-delay-4 px-1 py-2 md:px-2 md:py-3" style={{ backgroundColor: "#07070a" }}>
              <div className="relative mb-3">
                {/* <h3 className="text-center font-['Space_Grotesk'] text-base font-bold uppercase tracking-[0.14em] text-white/90">
                  Profile Screen
                </h3> */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <StickerTag
                    label="Premium Guest"
                    bg={theme.accentMuted}
                    text="#ffffff"
                    rotate="rotate-[10deg]"
                    className="rounded-[3px] border-2 border-[var(--vh-surface-2)] px-2 py-1 text-[9px] font-bold not-italic uppercase"
                  />
                </div>
              </div>

              {!isEditing ? (
                <>
                  <div className="grid gap-2.5 text-sm text-white/85 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { icon: <UserCircle2 className="h-3.5 w-3.5" />, label: "Full Name", value: guest.name || "Not set" },
                      { icon: <VenusAndMars className="h-3.5 w-3.5" />, label: "Gender", value: guest.gender || "Not set" },
                      { icon: <CalendarDays className="h-3.5 w-3.5" />, label: "Date Of Birth", value: guest.birthDate || "Not set" },
                      { icon: <Flag className="h-3.5 w-3.5" />, label: "Nationality", value: guest.nationality || "Not set" },
                      { icon: <Phone className="h-3.5 w-3.5" />, label: "Phone", value: guest.phone || "Not set" },
                      { icon: <Mail className="h-3.5 w-3.5" />, label: "Email", value: guest.email || "Not set" },
                    ].map((field, index) => (
                      <div key={field.label} className="rounded-lg border px-3 py-2.5 vh-field-enter" style={{ borderColor: theme.border, backgroundColor: theme.chip, animationDelay: `${index * 70}ms` }}>
                        <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
                          <span style={{ color: theme.accent }}>{field.icon}</span>
                          {field.label}
                        </p>
                        <p className="font-semibold text-white">{field.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-[1.6fr_1fr] gap-2">
                    <Button onClick={startEdit} className="rounded-lg text-white hover:opacity-90" style={{ backgroundColor: theme.accentMuted }}>
                      Edit Profile
                    </Button>
                    <Button
                      onClick={signOut}
                      variant="outline"
                      className="rounded-lg hover:bg-white/5"
                      style={{ borderColor: theme.border, color: theme.accent }}
                    >
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <div className="vh-field-enter" style={{ animationDelay: "120ms" }}>
                  <p className="mb-3 text-center font-['Caveat'] text-2xl leading-none" style={{ color: theme.accent }}>
                    Fine tune your daily passport details
                  </p>

                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    <label className="vh-field-enter block" style={{ animationDelay: "70ms" }}>
                      <span className="mb-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.12em] text-slate-200">
                        Full Name
                      </span>
                      <input
                        className="w-full rounded-md border bg-[#07070a] px-3 py-2 text-sm text-white outline-none transition-all duration-200 focus:-translate-y-0.5"
                        style={{ borderColor: theme.border }}
                        onChange={(e) => setName(e.target.value)}
                        type="text"
                        value={name}
                        placeholder="Your name"
                      />
                    </label>

                    <label className="vh-field-enter block" style={{ animationDelay: "110ms" }}>
                      <span className="mb-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.12em] text-slate-200">
                        Email
                      </span>
                      <input
                        className="w-full rounded-md border bg-[#07070a] px-3 py-2 text-sm text-white outline-none transition-all duration-200 focus:-translate-y-0.5"
                        style={{ borderColor: theme.border }}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        value={email}
                        placeholder="your@email.com"
                      />
                    </label>

                    <label className="vh-field-enter block" style={{ animationDelay: "150ms" }}>
                      <span className="mb-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.12em] text-slate-200">
                        Gender
                      </span>
                      <Select onValueChange={(value) => setGender(value)} value={gender || undefined}>
                        <SelectTrigger className="bg-[#07070a]" style={{ borderColor: theme.border }}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Non-binary">Non-binary</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>

                    <label className="vh-field-enter block" style={{ animationDelay: "190ms" }}>
                      <span className="mb-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.12em] text-slate-200">
                        Date Of Birth
                      </span>
                      <Popover onOpenChange={setDobPickerOpen} open={dobPickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            className="flex h-[42px] w-full items-center justify-between rounded-md border bg-[#07070a] px-3 text-left text-sm text-white outline-none"
                            style={{ borderColor: theme.border }}
                            type="button"
                          >
                            <span>{formatDobDate(birthDate)}</span>
                            <ChevronDown className="h-4 w-4 text-white/65" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="z-[220] w-auto border-white/10 bg-[#10111a] p-2">
                          <Calendar
                            captionLayout="dropdown"
                            className="vh-calendar-dark vh-calendar-balanced rounded-[16px]"
                            disabled={{ after: new Date() }}
                            fromYear={1900}
                            mode="single"
                            onSelect={(nextDate) => {
                              if (!nextDate) {
                                return;
                              }

                              setBirthDate(toInputDateString(nextDate));
                              setDobPickerOpen(false);
                            }}
                            selected={parseDateString(birthDate)}
                            toYear={new Date().getFullYear()}
                          />
                        </PopoverContent>
                      </Popover>
                    </label>

                    <label className="vh-field-enter block" style={{ animationDelay: "230ms" }}>
                      <span className="mb-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.12em] text-slate-200">
                        Nationality
                      </span>
                      <input
                        className="w-full rounded-md border bg-[#07070a] px-3 py-2 text-sm text-white outline-none transition-all duration-200 focus:-translate-y-0.5"
                        style={{ borderColor: theme.border }}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder="Your nationality"
                        type="text"
                        value={nationality}
                      />
                    </label>

                    <label className="vh-field-enter block" style={{ animationDelay: "310ms" }}>
                      <span className="mb-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.12em] text-slate-200">
                        Phone
                      </span>
                      <input
                        className="w-full rounded-md border bg-[#07070a] px-3 py-2 text-sm text-white outline-none transition-all duration-200 focus:-translate-y-0.5"
                        style={{ borderColor: theme.border }}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Optional"
                        type="tel"
                        value={phone}
                      />
                    </label>

                    <label className="vh-field-enter block" style={{ animationDelay: "390ms" }}>
                      <span className="mb-1 block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.12em] text-slate-200">
                        Location
                      </span>
                      <input
                        className="w-full rounded-md border bg-[#07070a] px-3 py-2 text-sm text-white outline-none transition-all duration-200 focus:-translate-y-0.5"
                        style={{ borderColor: theme.border }}
                        onChange={(e) => setFromLocation(e.target.value)}
                        placeholder="City, Country"
                        type="text"
                        value={fromLocation}
                      />
                    </label>
                  </div>

                {error ? (
                  <div className="mt-3 rounded-md border border-[var(--vh-pink)]/40 bg-[var(--vh-pink)]/10 px-3 py-2 text-xs text-[#FDECEC]">
                    {error}
                  </div>
                ) : null}

                <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-[1.6fr_1.2fr_1fr]">
                  <Button onClick={saveEdit} className="rounded-lg text-white hover:opacity-90" style={{ backgroundColor: theme.accent }}>
                    Save Profile
                  </Button>
                  <Button
                    onClick={() => openAuthModal("forgot-password")}
                    variant="outline"
                    className="rounded-lg border !bg-transparent text-[#d94a4a] transition-colors duration-200 hover:!bg-[#2a1212] hover:text-[#ff8c8c]"
                    style={{ borderColor: theme.border }}
                  >
                    Reset Password
                  </Button>
                  <Button
                    onClick={cancelEdit}
                    variant="outline"
                    className="rounded-lg border !bg-transparent text-white/90 transition-colors duration-200 hover:!bg-[#1a1a1a] hover:text-white"
                    style={{ borderColor: theme.border }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-[1.6fr_1fr] gap-2 sm:hidden">
                  <Button onClick={saveEdit} className="rounded-lg text-white hover:opacity-90" style={{ backgroundColor: theme.accent }}>
                    Save Profile
                  </Button>
                  <Button
                    onClick={cancelEdit}
                    variant="outline"
                    className="rounded-lg border !bg-transparent text-white/90 transition-colors duration-200 hover:!bg-[#1a1a1a] hover:text-white"
                    style={{ borderColor: theme.border }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="mt-2 flex justify-center sm:hidden">
                  <Button
                    onClick={() => openAuthModal("forgot-password")}
                    variant="outline"
                    className="rounded-lg border !bg-transparent px-6 text-[#d94a4a] transition-colors duration-200 hover:!bg-[#2a1212] hover:text-[#ff8c8c]"
                    style={{ borderColor: theme.border }}
                  >
                    Reset Password
                  </Button>
                </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
