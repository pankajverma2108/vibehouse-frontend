"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BedDouble,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Droplets,
  Info,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import gsap from "gsap";
import { toast } from "sonner";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { DateField } from "@/components/colive/colive-ui";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  locationMap,
  nearbyAttractions,
  propertyAmenities,
  propertyGallery,
  propertyGuidelines,
  propertyHero,
  propertyOverview,
  roomFaqs,
} from "@/content/rooms";
import { formatINRPlain } from "@/lib/format-price";
import { buildBookingSignature, saveBookingDraft, type BookingDraftRoom } from "@/lib/booking-session";
import type { CxRoomCategory } from "@/lib/cx-api";
import type { ColiveStayType } from "@/lib/colive-api";
import { formatColiveDate, getDefaultMoveInDate, toIsoDate } from "@/lib/colive-flow-state";
import { cn } from "@/lib/utils";

type RoomApiPayload = {
  categories?: unknown;
  property_id?: unknown;
  availability_source?: unknown;
  has_live_availability?: unknown;
  message?: unknown;
};

type AvailabilitySource = "catalog" | "ezee_live" | "live_provider" | "local_db_estimate" | "unknown";

type RoomCategory = CxRoomCategory;

const PROPERTY_ID = "60765";
const PROPERTY_NAME = "The Daily Social - Koramangala A";

const durationOptions = [1, 2, 3];
const stayTypeOptions: Array<{ value: ColiveStayType; label: string }> = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "remote", label: "Remote Worker" },
];

const coliveInclusions = ["WiFi", "Electricity", "Housekeeping", "Community events"];
const longStayBenefits = [
  { title: "Monthly pricing", copy: "Backend rates shown as monthly totals, not nightly math on the screen.", icon: CalendarDays },
  { title: "Work-friendly", copy: "WiFi, desks, lockers, and common areas built for daily rhythm.", icon: Briefcase },
  { title: "Social by default", copy: "Events and shared spaces keep the house energy alive.", icon: Users },
  { title: "No hidden costs", copy: "The checkout quote confirms rent, add-ons, taxes, and payable total.", icon: ShieldCheck },
];

const roomIconMap: Record<string, typeof Wifi> = {
  "Queen bed": BedDouble,
  "En-suite bathroom": Droplets,
  "Work desk": Briefcase,
  "Private bath": Droplets,
  "Personal locker": Lock,
  "Secure locker": Lock,
  Locker: Lock,
  WiFi: Wifi,
  Housekeeping: ShieldCheck,
};

function getRoomSelectionKey(room: RoomCategory): string {
  return room.roomTypeId?.trim() || room.slug;
}

function getColiveRoomOptionId(room: Pick<RoomCategory, "roomTypeId" | "slug" | "title">): string {
  const haystack = `${room.roomTypeId} ${room.slug} ${room.title}`.toLowerCase();

  if (haystack.includes("deluxe") || haystack.includes("queen") || haystack.includes("private")) {
    return "rt-ka-queen";
  }

  if (haystack.includes("6") && haystack.includes("female")) {
    return "rt-ka-6dorm-female";
  }

  if (haystack.includes("4") && haystack.includes("female")) {
    return "rt-ka-4dorm-female";
  }

  if (haystack.includes("6")) {
    return "rt-ka-6dorm";
  }

  return "rt-ka-4dorm";
}

function readCategories(payload: RoomApiPayload): RoomCategory[] {
  return Array.isArray(payload.categories) ? (payload.categories as RoomCategory[]) : [];
}

function readAvailabilitySource(payload: RoomApiPayload): AvailabilitySource | null {
  if (typeof payload.availability_source !== "string") {
    return null;
  }

  const normalized = payload.availability_source.trim().toLowerCase();
  return normalized === "catalog" ||
    normalized === "ezee_live" ||
    normalized === "live_provider" ||
    normalized === "local_db_estimate" ||
    normalized === "unknown"
    ? normalized
    : null;
}

function parseRoomsApiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function hasUnavailableRoomPrice(room: RoomCategory): boolean {
  return room.isPriceUnavailable === true || room.basePrice <= 0;
}

function addMonthsToIsoDate(value: string, months: number): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return toIsoDate(new Date());
  }

  date.setMonth(date.getMonth() + months);
  return toIsoDate(date);
}

function formatMonthlyPrice(room: RoomCategory): string {
  if (hasUnavailableRoomPrice(room)) {
    return "Pricing pending";
  }

  return `Rs. ${formatINRPlain(room.totalPrice || room.basePrice * 30)}`;
}

function formatRoomStatus(room: RoomCategory): string {
  if (room.inventoryState === "sold_out") {
    return "Sold out";
  }

  if (room.inventoryState === "limited") {
    return `Only ${room.availableCount} left`;
  }

  if (room.inventoryText) {
    return room.inventoryText;
  }

  return room.hasLiveAvailability ? "Available for monthly stay" : "Select move-in date";
}

function featureIcon(label: string) {
  return roomIconMap[label] ?? ShieldCheck;
}

function SectionTitle({ title, copy }: { title: string; copy?: string }) {
  return (
    <div className="text-center lg:text-left">
      <h2 className="vh-title text-[28px] leading-[1.08] text-white md:text-[34px]">{title}</h2>
      {copy ? <p className="mx-auto mt-3 max-w-[680px] text-sm leading-7 text-white/74 lg:mx-0 md:text-base">{copy}</p> : null}
    </div>
  );
}

export function ColiveFlow({ initialLocation }: { initialLocation?: string } = {}) {
  void initialLocation;
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { isAuthenticated, isRestoringSession, openAuthModal } = useGuestAuth();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [moveIn, setMoveIn] = useState(getDefaultMoveInDate);
  const [duration, setDuration] = useState(1);
  const [stayType, setStayType] = useState<ColiveStayType>("solo");
  const [rooms, setRooms] = useState<RoomCategory[]>([]);
  const [availabilitySource, setAvailabilitySource] = useState<AvailabilitySource | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({});
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const resumeReviewAfterAuthRef = useRef(false);
  const checkoutDate = useMemo(() => addMonthsToIsoDate(moveIn, duration), [duration, moveIn]);
  const aboutText = propertyOverview.join(" ");

  const selectedRoomDrafts = useMemo<BookingDraftRoom[]>(
    () =>
      rooms
        .filter((room) => (selectedCounts[getRoomSelectionKey(room)] ?? 0) > 0)
        .map((room) => ({
          roomTypeId: getColiveRoomOptionId(room),
          slug: room.slug,
          title: room.title,
          roomType: room.roomType,
          quantity: selectedCounts[getRoomSelectionKey(room)] ?? 0,
          basePrice: room.totalPrice || room.basePrice * 30,
          totalPrice: room.totalPrice || room.basePrice * 30,
          availableCount: room.availableCount,
          guestText: room.guestText,
          image: room.image,
          amenities: [...room.features, ...room.amenitiesLegend],
        })),
    [rooms, selectedCounts],
  );

  const selectedRoomTotal = useMemo(
    () => selectedRoomDrafts.reduce((sum, room) => sum + room.basePrice * room.quantity * duration, 0),
    [duration, selectedRoomDrafts],
  );

  const selectedRoomCount = selectedRoomDrafts.reduce((sum, room) => sum + room.quantity, 0);

  const loadRooms = useCallback(async () => {
    setRoomError(null);
    setIsRefreshingRooms((current) => rooms.length > 0 || current);
    setIsLoadingRooms((current) => rooms.length === 0 || current);

    try {
      const query = new URLSearchParams({
        property_id: PROPERTY_ID,
        checkin: moveIn,
        checkout: checkoutDate,
      });
      const response = await fetch(`/api/cx/rooms?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as RoomApiPayload | null;

      if (!response.ok) {
        throw new Error(parseRoomsApiError(payload, "Unable to load Colive rooms right now."));
      }

      const nextRooms = readCategories(payload ?? {});
      setRooms(nextRooms);
      setAvailabilitySource(readAvailabilitySource(payload ?? {}) ?? null);
      setSelectedCounts((current) => {
        const allowed = new Map(
          nextRooms.map((room) => [
            getRoomSelectionKey(room),
            room.inventoryState !== "sold_out" && !hasUnavailableRoomPrice(room) ? Math.max(0, room.availableCount) : 0,
          ]),
        );

        return Object.fromEntries(
          Object.entries(current)
            .map<[string, number]>(([key, value]) => [key, Math.min(value, allowed.get(key) ?? 0)])
            .filter((entry): entry is [string, number] => entry[1] > 0),
        );
      });
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "Unable to load Colive rooms right now.");
    } finally {
      setIsLoadingRooms(false);
      setIsRefreshingRooms(false);
    }
  }, [checkoutDate, moveIn, rooms.length]);

  useLayoutEffect(() => {
    if (!rootRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-colive-reveal]",
        { opacity: 0, y: 18, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: 0.65, ease: "power3.out", stagger: 0.06 },
      );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const controller = window.setTimeout(() => {
      void loadRooms();
    }, 0);

    return () => {
      window.clearTimeout(controller);
    };
  }, [loadRooms]);

  useEffect(() => {
    if (!resumeReviewAfterAuthRef.current || !isAuthenticated) {
      return;
    }

    resumeReviewAfterAuthRef.current = false;
    router.push("/bookingreview");
  }, [isAuthenticated, router]);

  const updateCount = (roomKey: string, nextValue: number) => {
    const room = rooms.find((item) => getRoomSelectionKey(item) === roomKey);
    const maxCount = room && room.inventoryState !== "sold_out" && !hasUnavailableRoomPrice(room) ? Math.max(0, room.availableCount) : 0;

    const clampedValue = Math.min(maxCount, Math.max(0, nextValue));
    setSelectedCounts(clampedValue > 0 ? { [roomKey]: 1 } : {});
  };

  const continueToCheckout = () => {
    if (selectedRoomDrafts.length === 0) {
      toast.error("Select at least one Colive room.");
      return;
    }

    if (!isAgeConfirmed) {
      toast.error("Please confirm guest age before checkout.");
      return;
    }

    if (isRestoringSession) {
      toast.info("Restoring your session", {
        description: "Please wait a moment, then try Review Booking again.",
      });
      return;
    }

    if (availabilitySource === "local_db_estimate") {
      toast.warning("Estimated availability", {
        description: "Live availability is temporarily estimated. Checkout quote will revalidate before payment.",
      });
    }

    const signature = buildBookingSignature({
      propertyId: PROPERTY_ID,
      checkinDate: moveIn,
      checkoutDate,
      rooms: selectedRoomDrafts.map((room) => ({ roomTypeId: room.roomTypeId, quantity: room.quantity })),
      addons: [],
    });

    saveBookingDraft({
      propertyId: PROPERTY_ID,
      checkinDate: moveIn,
      checkoutDate,
      rooms: selectedRoomDrafts,
      addons: [],
      signature,
      createdAt: Date.now(),
      source: "colive",
      colive: {
        propertyId: PROPERTY_ID,
        propertyName: PROPERTY_NAME,
        moveInDate: moveIn,
        durationMonths: duration,
        stayType,
      },
    });

    toast.success("Colive stay saved", {
      description: "Taking you to review booking.",
    });

    if (!isAuthenticated) {
      resumeReviewAfterAuthRef.current = true;
      openAuthModal("signin");
      return;
    }

    router.push("/bookingreview");
  };

  const canContinue = selectedRoomDrafts.length > 0 && isAgeConfirmed;

  return (
    <div ref={rootRef} className="min-h-screen bg-[#07070a] pb-28 text-white lg:pb-16">
      <section className="vh-section pt-28 md:pt-32" data-colive-reveal>
        <div className="vh-container">
          <div className="mb-8 text-center">
            <div className="mb-5 flex justify-center">
              <StickerTag label="Colive" bg="#f9cb37" className="px-4 py-2 text-[12px] font-black uppercase tracking-[0.16em]" text="#111111" rotate="rotate-[-5deg]" />
            </div>
            <h1 className="leading-none">
              <span className="vh-retro-sign-flat text-[2.2rem] md:text-[4.2rem] lg:text-[5rem]">
                STAY LONGER. LIVE BETTER.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-[760px] text-base leading-7 text-white/78 md:text-lg">
              {PROPERTY_NAME} as a monthly home base. Same property flow, same booking checkout, Colive rates and availability revalidated by backend.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="overflow-hidden rounded-[18px]">
                <Image
                  alt={propertyGallery[0].alt}
                  className="h-[340px] w-full object-cover md:h-[500px]"
                  height={800}
                  priority
                  src={propertyGallery[0].src}
                  width={1200}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:col-span-5">
              {propertyGallery.slice(1).map((image) => (
                <div key={image.src} className="overflow-hidden rounded-[18px]">
                  <Image alt={image.alt} className="h-[162px] w-full object-cover md:h-[242px]" height={500} src={image.src} width={600} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <div className="space-y-10">
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start" data-colive-reveal>
              <div>
                <SectionTitle title="About this Colive" />
                <p className={cn("mt-3 text-[15px] leading-7 text-white/82 md:text-base", aboutExpanded ? "" : "line-clamp-2")}>
                  {aboutText}
                </p>
                <button
                  className="mt-2 text-sm font-semibold underline transition-colors duration-200 hover:text-[var(--vh-cyan)]"
                  onClick={() => setAboutExpanded((value) => !value)}
                  type="button"
                >
                  {aboutExpanded ? "View Less" : "View More"}
                </button>
              </div>
              <div className="hidden lg:block lg:sticky lg:top-28">
                <Button asChild className="vh-cta-button h-12 w-full whitespace-nowrap px-4 text-sm sm:text-base">
                  <Link href="#colive-rooms">View monthly rooms</Link>
                </Button>
              </div>
            </section>

            <section data-colive-reveal>
              <SectionTitle title="Monthly essentials" copy="The good stuff that keeps a longer stay easy, social, and very hard to complain about." />
              <div className="mt-5 grid grid-cols-4 gap-4 sm:gap-5 lg:grid-cols-12 lg:gap-2">
                {propertyAmenities.map((amenity, index) => {
                  const colorIndex = index % 3;
                  const colors = ["var(--vh-pink)", "var(--vh-cyan)", "var(--vh-amber)"];
                  return (
                    <div key={`${amenity.label}-${index}`} className="text-center">
                      <span className="inline-flex h-12 w-12 items-center justify-center" style={{ color: colors[colorIndex] }}>
                        <Sparkles className="h-9 w-9" />
                      </span>
                      <p className="mt-2 text-xs font-medium leading-5 text-white/82 lg:text-sm">{amenity.label}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-colive-reveal>
              {longStayBenefits.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-[18px] border border-dashed border-white/18 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1 hover:border-white/30">
                    <Icon className="h-6 w-6 text-[var(--vh-amber)]" />
                    <h3 className="mt-4 font-suez text-2xl text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/70">{item.copy}</p>
                  </article>
                );
              })}
            </section>

            <section id="colive-rooms" className="scroll-mt-28" data-colive-reveal>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <SectionTitle title="Monthly rooms" copy="All five room types come from the property backend. Prices are monthly and checkout will re-quote before payment." />
                    <div className="grid w-full gap-3 md:w-[420px]">
                      <DateField label="Move-in date" onChange={setMoveIn} value={moveIn} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label>
                          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Duration</span>
                          <span className="mt-2 flex h-12 items-center rounded-[10px] border border-white/10 bg-[#212121] px-4">
                            <select
                              className="w-full bg-transparent text-sm text-white outline-none"
                              onChange={(event) => setDuration(Number(event.target.value))}
                              value={duration}
                            >
                              {durationOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option} {option === 1 ? "month" : "months"}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="h-4 w-4 text-white/55" />
                          </span>
                        </label>
                        <label>
                          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Stay type</span>
                          <span className="mt-2 flex h-12 items-center rounded-[10px] border border-white/10 bg-[#212121] px-4">
                            <select
                              className="w-full bg-transparent text-sm text-white outline-none"
                              onChange={(event) => setStayType(event.target.value as ColiveStayType)}
                              value={stayType}
                            >
                              {stayTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="h-4 w-4 text-white/55" />
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <span aria-live="polite" className="sr-only" role="status">
                    {isRefreshingRooms ? "Refreshing Colive room availability." : ""}
                  </span>

                  {isLoadingRooms ? (
                    <div className="space-y-5">
                      <Skeleton className="h-[250px] rounded-[18px] bg-white/10" />
                      <Skeleton className="h-[250px] rounded-[18px] bg-white/10" />
                    </div>
                  ) : null}

                  {!isLoadingRooms && roomError ? (
                    <div className="rounded-[20px] border border-dashed border-white/18 bg-white/5 p-6 text-center">
                      <p className="font-suez text-2xl text-white">Rooms did not load</p>
                      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-white/70">{roomError}</p>
                      <Button className="vh-cta-button mt-5" onClick={() => void loadRooms()} type="button">
                        Retry rooms
                      </Button>
                    </div>
                  ) : null}

                  {!isLoadingRooms && !roomError && rooms.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-white/18 bg-white/5 p-6 text-center">
                      <p className="font-suez text-2xl text-white">No Colive rooms available</p>
                      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-white/70">
                        The backend returned an empty room list for this move-in date.
                      </p>
                    </div>
                  ) : null}

                  <div className={cn("space-y-5", isRefreshingRooms ? "opacity-70" : "")}>
                    {rooms.map((room) => {
                      const roomKey = getRoomSelectionKey(room);
                      const count = selectedCounts[roomKey] ?? 0;
                      const featureLabels = Array.from(new Set([...room.features, ...room.amenitiesLegend, ...coliveInclusions]));
                      const isSoldOut = room.inventoryState === "sold_out";
                      const isPriceUnavailable = hasUnavailableRoomPrice(room);
                      const canBook = !isSoldOut && !isPriceUnavailable && room.availableCount > 0;

                      return (
                        <article
                          key={roomKey}
                          className="overflow-hidden rounded-[18px] border border-white/10 bg-[#10111a] transition duration-300 hover:-translate-y-1 hover:border-white/20"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_198px]">
                            <div className="border-b border-white/10 lg:border-b-0 lg:border-r">
                              <Image alt={room.title} className="h-[180px] w-full object-cover lg:h-full" height={420} src={room.image} width={520} />
                            </div>
                            <div className="space-y-4 p-5">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <h3 className="font-['Geologica'] text-xl font-semibold text-white">{room.title}</h3>
                                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/45">{room.guestText}</p>
                                </div>
                                <StickerTag
                                  label={room.roomType === "PRIVATE" ? "Private" : "Dorm"}
                                  bg={room.roomType === "PRIVATE" ? "#00d1ff" : "#f9cb37"}
                                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]"
                                  text={room.roomType === "PRIVATE" ? "#071014" : "#111111"}
                                  rotate="rotate-[5deg]"
                                />
                              </div>
                              <p className="text-sm leading-7 text-white/78">
                                Monthly stay with room availability synced for {formatColiveDate(moveIn)} to {formatColiveDate(checkoutDate)}.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {featureLabels.slice(0, 7).map((label) => {
                                  const Icon = featureIcon(label);
                                  return (
                                    <span key={label} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/72">
                                      <Icon className="h-3.5 w-3.5 text-[var(--vh-amber)]" />
                                      {label}
                                    </span>
                                  );
                                })}
                              </div>
                              <p className="text-sm font-semibold text-[var(--vh-cyan)]">{formatRoomStatus(room)}</p>
                            </div>
                            <div className="flex flex-col justify-between border-t border-white/10 p-5 lg:border-l lg:border-t-0">
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">Monthly price</p>
                                <p className="mt-2 text-3xl font-bold text-[#c62828]">{formatMonthlyPrice(room)}</p>
                                {!isPriceUnavailable ? <p className="mt-1 text-xs text-white/45">Backend total for 30 nights</p> : null}
                              </div>

                              <div className="mt-5 flex items-center justify-end gap-2">
                                {!canBook ? (
                                  <Button className="w-full rounded-full" disabled type="button">
                                    {isSoldOut ? "Sold out" : "Unavailable"}
                                  </Button>
                                ) : count === 0 ? (
                                  <Button className="w-full rounded-full" onClick={() => updateCount(roomKey, 1)} type="button">
                                    Add
                                  </Button>
                                ) : (
                                  <div className="ml-auto flex items-center gap-2">
                                    <button
                                      aria-label="Remove room"
                                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--vh-surface-2)]"
                                      onClick={() => updateCount(roomKey, count - 1)}
                                      type="button"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-5 text-center text-sm font-semibold text-white">{count}</span>
                                    <button
                                      aria-label="Add room"
                                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--vh-surface-2)] disabled:cursor-not-allowed disabled:opacity-45"
                                      disabled={count >= room.availableCount}
                                      onClick={() => updateCount(roomKey, count + 1)}
                                      type="button"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <aside className="hidden self-start lg:sticky lg:top-28 lg:block">
                  <div className="rounded-[26px] border border-dashed border-white/24 bg-[var(--vh-panel-strong)] p-5 shadow-[var(--vh-shadow-lg)]">
                    <h2 className="vh-title text-3xl text-white">Monthly summary</h2>
                    <div className="mt-5 rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 text-white">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">Move in</p>
                          <p className="mt-1 text-sm font-semibold">{formatColiveDate(moveIn)}</p>
                        </div>
                        <div className="rounded-full bg-[var(--vh-amber)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-900">
                          {duration} mo
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">Until</p>
                          <p className="mt-1 text-sm font-semibold">{formatColiveDate(checkoutDate)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm text-white/82">
                      {selectedRoomDrafts.length === 0 ? (
                        <p className="rounded-[16px] border border-dashed border-white/12 bg-white/5 px-3 py-3 text-center text-sm font-semibold text-white/76">
                          Add a monthly room to see booking totals.
                        </p>
                      ) : (
                        selectedRoomDrafts.map((room) => (
                          <div key={room.roomTypeId} className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">{room.title}</p>
                              <p className="text-xs text-white/55">
                                Rs. {formatINRPlain(room.basePrice)} x {room.quantity} x {duration} mo
                              </p>
                            </div>
                            <p className="font-semibold text-white">Rs. {formatINRPlain(room.basePrice * room.quantity * duration)}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-5 border-t border-white/10 pt-4 text-sm text-white/82">
                      <div className="flex items-center justify-between">
                        <p>Total room charges</p>
                        <p className="font-semibold text-white">Rs. {formatINRPlain(selectedRoomTotal)}</p>
                      </div>
                      <p className="mt-3 rounded-[14px] border border-dashed border-white/14 bg-black/20 px-3 py-3 text-xs leading-5 text-white/60">
                        Checkout will call Colive quote before payment, so backend remains the final source of truth.
                      </p>
                    </div>

                    <div className="my-4 flex items-start">
                      <input
                        checked={isAgeConfirmed}
                        className="mt-1 h-10 w-10 cursor-pointer rounded border-gray-300 bg-gray-100 p-2 text-blue-600 align-top focus:ring-blue-500"
                        id="colive-age-confirm-desktop"
                        onChange={(event) => setIsAgeConfirmed(event.target.checked)}
                        type="checkbox"
                      />
                      <span className="cursor-pointer select-none px-2 text-sm font-poppins text-white">
                        Yes, I confirm <span className="font-bold">all the guests are above 18 years old</span> and accept the{" "}
                        <Link className="text-blue-400" href="/policies/">
                          booking terms and policies.
                        </Link>
                      </span>
                    </div>

                    <Button className="vh-cta-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-55" disabled={!canContinue} onClick={continueToCheckout} type="button">
                      Review Booking
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </aside>
              </div>
            </section>

            <section data-colive-reveal>
              <SectionTitle title="Guidelines" />
              <div className="mt-6 max-w-4xl">
                <div className="mb-3 flex flex-wrap justify-between gap-x-4 gap-y-2 rounded-[16px] bg-white/6 p-3 text-white/84">
                  <div className="flex min-w-[180px] items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-[var(--vh-cyan)]" />
                    <span>
                      Move in:
                      <strong className="ml-1 text-white">{propertyGuidelines.checkIn}</strong>
                    </span>
                  </div>
                  <div className="flex min-w-[180px] items-center gap-3">
                    <Clock3 className="h-5 w-5 text-[var(--vh-cyan)]" />
                    <span>
                      Monthly review:
                      <strong className="ml-1 text-white">Backend quote before payment</strong>
                    </span>
                  </div>
                </div>

                <Accordion className="space-y-2" defaultValue={["general-guidelines"]} type="multiple">
                  <AccordionItem className="overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4" value="general-guidelines">
                    <AccordionTrigger className="text-base">General guidelines</AccordionTrigger>
                    <AccordionContent className="space-y-2 border-t border-white/10 pt-2 text-sm leading-6">
                      {propertyGuidelines.summary.map((item) => (
                        <p key={item}>- {item}</p>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  {propertyGuidelines.sections.map((section, index) => (
                    <AccordionItem key={section.title} className="overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4" value={`guideline-${index}`}>
                      <AccordionTrigger className="text-base">{section.title}</AccordionTrigger>
                      <AccordionContent className="space-y-2 border-t border-white/10 pt-2 text-sm leading-6">
                        {section.content.map((item) => (
                          <p key={item}>- {item}</p>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>

            <section data-colive-reveal>
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                <div>
                  <SectionTitle title="Frequently Asked Questions" />
                  <Accordion className="mt-6 space-y-4" defaultValue={["faq-0"]} type="multiple">
                    {roomFaqs.map((faq, index) => (
                      <AccordionItem key={faq.question} className="overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4" value={`faq-${index}`}>
                        <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
                        <AccordionContent className="border-t border-white/10 pt-4 text-sm leading-7">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <div className="space-y-6">
                  <section>
                    <SectionTitle title="Location" />
                    <div className="mt-6 overflow-hidden rounded-[18px]">
                      <iframe className="h-[300px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={locationMap.embedUrl} title={locationMap.title} />
                    </div>
                    <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--vh-cyan)] hover:text-white" href={propertyHero.mapsHref} target="_blank">
                      Open in Maps
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </section>

                  <section>
                    <SectionTitle title="Nearby" />
                    <div className="mt-6 space-y-3">
                      {nearbyAttractions.map((place) => (
                        <div key={place.name} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                          <div>
                            <p className="font-semibold text-white">{place.name}</p>
                            <p className="text-xs uppercase tracking-[0.14em] text-white/48">{place.type}</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/72">
                            {place.travel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
        <div className="overflow-hidden rounded-[22px] border border-white/12 bg-[var(--vh-panel-strong)] shadow-[var(--vh-shadow-lg)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <div>
              <p className="text-xl font-bold text-white">Rs. {formatINRPlain(selectedRoomTotal)}</p>
              <button className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-white/72" type="button">
                {selectedRoomCount} room{selectedRoomCount === 1 ? "" : "s"} / {duration} mo
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button className="vh-cta-button px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-55" disabled={!canContinue} onClick={continueToCheckout} type="button">
              Review
            </Button>
          </div>
          <label className="flex items-start gap-2 border-t border-white/10 px-4 py-3 text-xs leading-5 text-white/72">
            <input checked={isAgeConfirmed} className="mt-1" onChange={(event) => setIsAgeConfirmed(event.target.checked)} type="checkbox" />
            <span>All guests are above 18 and accept booking terms.</span>
          </label>
        </div>
      </div>
    </div>
  );
}
