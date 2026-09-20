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
  Check,
  ChevronRight,
  Clock3,
  Droplets,
  Info,
  Lock,
  Minus,
  Percent,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  Utensils,
  Users,
  Wifi,
} from "lucide-react";
import gsap from "gsap";
import { toast } from "sonner";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { DateField } from "@/components/colive/colive-ui";
import { Button as NeoPopButton } from "@/components/neopop/button";
import { ElevatedCard, SelectableCard } from "@/components/neopop/card";
import { Badge, Skeleton, Token } from "@/components/neopop/status";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { buildBookingSignature, saveBookingDraft, type BookingDraftAddon, type BookingDraftRoom } from "@/lib/booking-session";
import type { CxRoomCategory } from "@/lib/cx-api";
import { loadCxRooms, type CxRoomsPayload } from "@/lib/cx-rooms-client";
import type { ColiveStayType } from "@/lib/colive-api";
import { formatColiveDate, getDefaultMoveInDate, toIsoDate } from "@/lib/colive-flow-state";
import { usePropertyId } from "@/hooks/use-property-id";
import {
  buildSelectionSignature,
  consumeReviewResumeIntent,
  getPropertySelection,
  savePropertySelection,
  saveReviewResumeIntent,
} from "@/lib/property-selection-session";
import { getPropertyName } from "@/lib/property-resolver";
import { cn } from "@/lib/utils";

type RoomApiPayload = Partial<CxRoomsPayload>;
type RoomCategory = CxRoomCategory;

const durationTiers = [
  { months: 1, label: "1 Month", subtitle: "Flexible Stay", badge: "Standard" },
  { months: 2, label: "2 Months", subtitle: "Extended Vibe", badge: "Popular" },
  { months: 3, label: "3 Months", subtitle: "Nomad Quarter", badge: "Save 5%" },
  { months: 6, label: "6 Months", subtitle: "Resident Pass", badge: "Save 10%" },
];

const stayTypeOptions: Array<{ value: ColiveStayType; label: string; desc: string }> = [
  { value: "solo", label: "Solo Nomad", desc: "Single bed / room" },
  { value: "couple", label: "Couple", desc: "Private queen suite" },
  { value: "remote", label: "Remote Worker", desc: "Desk & quiet zone" },
];

interface ColiveAddonItem {
  id: string;
  title: string;
  monthlyPrice: number;
  description: string;
  icon: typeof Briefcase;
}

const coliveAddonCatalog: ColiveAddonItem[] = [
  {
    id: "dedicated-desk",
    title: "Dedicated Workstation",
    monthlyPrice: 2500,
    description: "Ergonomic chair, dual power outlets & gigabit LAN line",
    icon: Briefcase,
  },
  {
    id: "meal-plan",
    title: "Chef's Daily Meal Pass",
    monthlyPrice: 6000,
    description: "Wholesome breakfast & dinner by house chef (Mon-Sat)",
    icon: Utensils,
  },
  {
    id: "laundry-pack",
    title: "Laundry & Linen Care",
    monthlyPrice: 1500,
    description: "Weekly linen refresh & 15kg wash-and-fold allowance",
    icon: Sparkles,
  },
];

const coliveInclusions = ["WiFi 300Mbps", "Electricity", "Housekeeping", "Community events"];

const longStayBenefits = [
  { title: "Monthly Pricing", copy: "Backend rates shown as monthly totals, never nightly math multiplied on the fly.", icon: CalendarDays },
  { title: "Built for Work", copy: "300Mbps mesh WiFi, ergonomic desks, lockers, and shared creator zones.", icon: Briefcase },
  { title: "Community First", copy: "Curated weekly mixers, supper clubs, and live jam sessions in the common hall.", icon: Users },
  { title: "Transparent Billing", copy: "Digital quote itemizes rent, add-ons, taxes, and deposit with zero hidden fees.", icon: ShieldCheck },
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

function readCategories(payload: RoomApiPayload): RoomCategory[] {
  return Array.isArray(payload.categories) ? (payload.categories as RoomCategory[]) : [];
}

function readAvailabilityError(payload: RoomApiPayload): string | null {
  if (typeof payload.availability_error !== "string") {
    return null;
  }
  const message = payload.availability_error.trim();
  return message ? message : null;
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

function formatRoomStatus(room: RoomCategory): { text: string; variant: "green" | "red" | "yellow" } {
  if (room.inventoryState === "sold_out") {
    return { text: "Sold out", variant: "red" };
  }
  if (room.inventoryState === "limited") {
    return { text: `Only ${room.availableCount} left`, variant: "yellow" };
  }
  if (room.inventoryText) {
    return { text: room.inventoryText, variant: "green" };
  }
  return room.hasLiveAvailability
    ? { text: "Available for monthly stay", variant: "green" }
    : { text: "Select move-in date", variant: "yellow" };
}

function featureIcon(label: string) {
  return roomIconMap[label] ?? ShieldCheck;
}

function SectionTitle({ title, kicker, copy }: { title: string; kicker?: string; copy?: string }) {
  return (
    <div className="text-center lg:text-left font-['Gilroy',sans-serif]">
      {kicker ? (
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--vh-pink)] flex items-center justify-center lg:justify-start gap-1.5">
          <span>◉</span> {kicker}
        </p>
      ) : null}
      <h2 className="font-display text-[28px] leading-[1.08] text-white tracking-tight md:text-[34px]">{title}</h2>
      {copy ? <p className="mx-auto mt-3 max-w-[680px] text-sm leading-7 text-white/70 lg:mx-0 md:text-base">{copy}</p> : null}
    </div>
  );
}

export function ColiveFlow({ initialLocation }: { initialLocation?: string } = {}) {
  void initialLocation;
  const router = useRouter();
  const propertyId = usePropertyId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { isAuthenticated, isRestoringSession, openAuthModal } = useGuestAuth();

  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [moveIn, setMoveIn] = useState(getDefaultMoveInDate);
  const [duration, setDuration] = useState(1);
  const [stayType, setStayType] = useState<ColiveStayType>("solo");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<RoomCategory[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({});
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);

  const didRestoreSelectionRef = useRef(false);
  const lastRestoreContextRef = useRef<string | null>(null);
  const lastSelectionSignatureRef = useRef<string | null>(null);
  const checkoutDate = useMemo(() => addMonthsToIsoDate(moveIn, duration), [duration, moveIn]);
  const aboutText = propertyOverview.join(" ");

  const selectedRoomDrafts = useMemo<BookingDraftRoom[]>(
    () =>
      rooms
        .filter((room) => (selectedCounts[getRoomSelectionKey(room)] ?? 0) > 0)
        .map((room) => ({
          roomTypeId: room.roomTypeId,
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

  const rawRoomSubtotal = useMemo(
    () => selectedRoomDrafts.reduce((sum, room) => sum + room.basePrice * room.quantity * duration, 0),
    [duration, selectedRoomDrafts],
  );

  const addonSubtotal = useMemo(
    () =>
      selectedAddons.reduce((sum, addonId) => {
        const item = coliveAddonCatalog.find((a) => a.id === addonId);
        return sum + (item ? item.monthlyPrice * duration : 0);
      }, 0),
    [duration, selectedAddons],
  );

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return Math.round((rawRoomSubtotal * appliedCoupon.discountPercent) / 100);
  }, [appliedCoupon, rawRoomSubtotal]);

  const selectedRoomTotal = useMemo(
    () => Math.max(0, rawRoomSubtotal + addonSubtotal - discountAmount),
    [rawRoomSubtotal, addonSubtotal, discountAmount],
  );

  const selectedRoomCount = selectedRoomDrafts.reduce((sum, room) => sum + room.quantity, 0);

  const loadRooms = useCallback(async () => {
    setRoomError(null);
    setIsRefreshingRooms((current) => rooms.length > 0 || current);
    setIsLoadingRooms((current) => rooms.length === 0 || current);

    try {
      const safePayload = await loadCxRooms({
        propertyId,
        checkin: moveIn,
        checkout: checkoutDate,
      });
      const nextError = readAvailabilityError(safePayload);
      const nextRooms = readCategories(safePayload);

      setRooms(nextError ? [] : nextRooms);
      setRoomError(nextError);
      setSelectedCounts((current) => {
        const allowed = new Map(
          (nextError ? [] : nextRooms).map((room) => [
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
      setRooms([]);
      setRoomError(error instanceof Error ? error.message : "Unable to load Colive rooms right now.");
    } finally {
      setIsLoadingRooms(false);
      setIsRefreshingRooms(false);
    }
  }, [checkoutDate, moveIn, rooms.length, propertyId]);

  useLayoutEffect(() => {
    if (!rootRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-colive-reveal]",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.05 },
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
    if (!isAuthenticated || selectedRoomDrafts.length === 0) {
      return;
    }

    const intent = consumeReviewResumeIntent("colive");
    if (!intent || intent.propertyId !== propertyId || intent.checkin !== moveIn || intent.checkout !== checkoutDate) {
      return;
    }
    const signature = buildSelectionSignature({
      source: "colive",
      propertyId,
      checkin: moveIn,
      checkout: checkoutDate,
      selectedCounts,
    });
    if (intent.signature !== signature) {
      return;
    }

    router.push("/bookingreview");
  }, [isAuthenticated, selectedRoomDrafts.length, selectedCounts, moveIn, checkoutDate, propertyId, router]);

  useEffect(() => {
    const contextKey = `${propertyId}::${moveIn}::${checkoutDate}`;
    if (lastRestoreContextRef.current === contextKey) {
      return;
    }
    lastRestoreContextRef.current = contextKey;

    const stored = getPropertySelection("colive");
    if (!stored || stored.propertyId !== propertyId || stored.checkin !== moveIn || stored.checkout !== checkoutDate) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setSelectedCounts(stored.selectedCounts);
      setIsAgeConfirmed(stored.isAgeConfirmed);
      didRestoreSelectionRef.current = true;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [moveIn, checkoutDate, propertyId]);

  useEffect(() => {
    if (!didRestoreSelectionRef.current || rooms.length === 0) {
      return;
    }
    didRestoreSelectionRef.current = false;
    const allowed = new Map(
      rooms.map((room) => [
        getRoomSelectionKey(room),
        room.inventoryState !== "sold_out" && !hasUnavailableRoomPrice(room) ? Math.max(0, room.availableCount) : 0,
      ]),
    );
    let shouldNotifyAdjustment = false;
    setSelectedCounts((current) => {
      const next = Object.fromEntries(
        Object.entries(current)
          .map(([key, value]) => [key, Math.min(value, allowed.get(key) ?? 0)] as const)
          .filter((entry): entry is [string, number] => entry[1] > 0),
      );
      const before = Object.values(current).reduce((sum, value) => sum + value, 0);
      const after = Object.values(next).reduce((sum, value) => sum + value, 0);
      shouldNotifyAdjustment = before > after;
      return next;
    });

    if (shouldNotifyAdjustment) {
      toast.warning("Selection updated", {
        description: "Some rooms were adjusted to match current live availability.",
      });
    }
  }, [rooms]);

  useEffect(() => {
    const signature = buildSelectionSignature({
      source: "colive",
      propertyId,
      checkin: moveIn,
      checkout: checkoutDate,
      selectedCounts,
    });
    const persistenceSignature = `${signature}::${isAgeConfirmed ? "1" : "0"}`;
    if (lastSelectionSignatureRef.current === persistenceSignature) {
      return;
    }
    lastSelectionSignatureRef.current = persistenceSignature;

    const saveTimer = window.setTimeout(() => {
      savePropertySelection({
        source: "colive",
        propertyId,
        checkin: moveIn,
        checkout: checkoutDate,
        selectedCounts,
        isAgeConfirmed,
        signature,
      });
    }, 150);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [moveIn, checkoutDate, selectedCounts, isAgeConfirmed, propertyId]);

  const updateCount = (roomKey: string, nextValue: number) => {
    const room = rooms.find((item) => getRoomSelectionKey(item) === roomKey);
    const maxCount = room && room.inventoryState !== "sold_out" && !hasUnavailableRoomPrice(room) ? Math.max(0, room.availableCount) : 0;

    const clampedValue = Math.min(maxCount, Math.max(0, nextValue));
    setSelectedCounts(clampedValue > 0 ? { [roomKey]: 1 } : {});
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId],
    );
  };

  const handleApplyCoupon = () => {
    setCouponError(null);
    const normalized = couponCode.trim().toUpperCase();
    if (!normalized) {
      setCouponError("Enter a coupon code.");
      return;
    }

    if (normalized === "VIBECOLIVE" || normalized === "NOMAD10" || normalized === "LONGSTAY10") {
      setAppliedCoupon({ code: normalized, discountPercent: 10 });
      toast.success("Coupon applied!", {
        description: `10% discount applied on monthly room charges.`,
      });
    } else {
      setCouponError("Invalid coupon code. Try 'VIBECOLIVE'");
    }
  };

  const continueToCheckout = () => {
    setContinueError(null);

    if (selectedRoomDrafts.length === 0) {
      setContinueError("Select at least one Colive room.");
      return;
    }

    if (!isAgeConfirmed) {
      setContinueError("Confirm that all guests are above 18 to continue.");
      return;
    }

    if (isRestoringSession) {
      setContinueError("Please wait while your session is restored, then try again.");
      return;
    }

    const addonDraftItems: BookingDraftAddon[] = selectedAddons.map((addonId) => {
      const meta = coliveAddonCatalog.find((a) => a.id === addonId);
      return {
        productId: addonId,
        name: meta?.title || addonId,
        category: "SERVICE" as const,
        quantity: 1,
        unitPrice: (meta?.monthlyPrice || 0) * duration,
        inStock: true,
      };
    });

    const signature = buildBookingSignature({
      propertyId,
      checkinDate: moveIn,
      checkoutDate,
      rooms: selectedRoomDrafts.map((room) => ({ roomTypeId: room.roomTypeId, quantity: room.quantity })),
      addons: addonDraftItems.map((addon) => ({ productId: addon.productId, quantity: addon.quantity })),
    });

    saveBookingDraft({
      propertyId,
      checkinDate: moveIn,
      checkoutDate,
      rooms: selectedRoomDrafts,
      addons: addonDraftItems,
      signature,
      createdAt: Date.now(),
      source: "colive",
      colive: {
        propertyId,
        propertyName: getPropertyName(propertyId),
        moveInDate: moveIn,
        durationMonths: duration,
        stayType,
      },
    });

    if (!isAuthenticated) {
      saveReviewResumeIntent({
        source: "colive",
        propertyId,
        checkin: moveIn,
        checkout: checkoutDate,
        signature: buildSelectionSignature({
          source: "colive",
          propertyId,
          checkin: moveIn,
          checkout: checkoutDate,
          selectedCounts,
        }),
      });
      setIsContinuing(false);
      openAuthModal("signin");
      return;
    }

    setIsContinuing(true);
    router.push("/bookingreview");
  };

  const canContinue = selectedRoomDrafts.length > 0 && isAgeConfirmed;

  return (
    <div ref={rootRef} className="min-h-screen bg-[#0D0D0D] pb-28 text-white lg:pb-16 font-['Gilroy',sans-serif]">
      {/* Hero Section */}
      <section className="pt-28 md:pt-32" data-colive-reveal>
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <div className="mb-10 text-center">
            <div className="mb-4 flex justify-center">
              <Token variant="yellow" label="LONG-STAY & COLIVING" />
            </div>
            <h1 className="font-display text-4xl leading-[1.0] text-white tracking-tight uppercase md:text-6xl lg:text-7xl">
              STAY LONGER. LIVE BETTER.
            </h1>
            <p className="mx-auto mt-4 max-w-[760px] text-base leading-7 text-white/70 md:text-lg">
              {getPropertyName(propertyId)} as your monthly home base. Flexible durations, high-speed workstations,
              community events, and transparent digital quotes.
            </p>
          </div>

          {/* Media Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="overflow-hidden rounded-none border border-[#3D3D3D] shadow-[4px_4px_0px_#000000]">
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
              {propertyGallery.slice(1, 3).map((image) => (
                <div key={image.src} className="overflow-hidden rounded-none border border-[#3D3D3D] shadow-[4px_4px_0px_#000000]">
                  <Image alt={image.alt} className="h-[162px] w-full object-cover md:h-[242px]" height={500} src={image.src} width={600} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <section className="mt-14">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6 space-y-14">
          {/* About Section */}
          <section className="grid grid-cols-1 gap-6 border border-white/10 bg-[#171822] p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center shadow-[4px_4px_0px_#000000]" data-colive-reveal>
            <div>
              <SectionTitle kicker="COMMUNITY LIVING" title="About this Colive" />
              <p className={cn("mt-3 text-[15px] leading-7 text-white/75 md:text-base", aboutExpanded ? "" : "line-clamp-2")}>
                {aboutText}
              </p>
              <button
                className="mt-2 text-sm font-extrabold uppercase tracking-wider text-[var(--vh-pink)] hover:underline"
                onClick={() => setAboutExpanded((value) => !value)}
                type="button"
              >
                {aboutExpanded ? "View Less" : "View More"}
              </button>
            </div>
            <div className="hidden lg:flex lg:justify-end">
              <NeoPopButton variant="secondary" asChild>
                <Link href="#colive-rooms">Browse Rooms</Link>
              </NeoPopButton>
            </div>
          </section>

          {/* Monthly Essentials */}
          <section data-colive-reveal>
            <SectionTitle kicker="ALL-INCLUSIVE AMENITIES" title="Monthly Essentials" copy="Included with every room tier. No maintenance fees or hidden surprises." />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
              {propertyAmenities.map((amenity, index) => (
                <div
                  key={`${amenity.label}-${index}`}
                  className="flex items-center gap-3 border border-white/10 bg-[#171822] p-4 rounded-none shadow-[2px_2px_0px_#000000]"
                >
                  <Sparkles className="h-5 w-5 text-[var(--vh-pink)] shrink-0" />
                  <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">{amenity.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Long Stay Benefits Grid */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-colive-reveal>
            {longStayBenefits.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-none border border-white/10 bg-[#171822] p-6 shadow-[3px_3px_0px_#000000] transition-transform hover:-translate-y-1"
                >
                  <Icon className="h-6 w-6 text-[var(--vh-pink)]" />
                  <h3 className="mt-4 font-display text-2xl text-white tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/70">{item.copy}</p>
                </article>
              );
            })}
          </section>

          {/* Colive Configuration Engine & Rooms */}
          <section id="colive-rooms" className="scroll-mt-28" data-colive-reveal>
            {/* Step 1: Duration & Stay Type Bar */}
            <div className="mb-8 border border-white/15 bg-[#171822] p-6 shadow-[4px_4px_0px_#000000]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--vh-pink)]">CONFIGURATION ENGINE</p>
                  <h2 className="mt-1 font-display text-3xl text-white tracking-tight">Select Stay Duration & Profile</h2>
                </div>
                <div className="w-full lg:w-64">
                  <DateField label="Move-in Date" onChange={setMoveIn} value={moveIn} />
                </div>
              </div>

              {/* Duration Tiers */}
              <div className="mt-6">
                <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">Choose Duration Tier</span>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {durationTiers.map((tier) => {
                    const isSelected = duration === tier.months;
                    return (
                      <button
                        key={tier.months}
                        type="button"
                        onClick={() => setDuration(tier.months)}
                        className={cn(
                          "relative p-4 text-left rounded-none border-2 transition-all select-none",
                          isSelected
                            ? "border-[var(--vh-pink)] bg-[var(--vh-pink)]/10 shadow-[4px_4px_0px_var(--vh-pink)]"
                            : "border-white/10 bg-[#12131A] shadow-[3px_3px_0px_#000000] hover:border-white/30",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-xl font-bold text-white">{tier.label}</span>
                          <span
                            className={cn(
                              "text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5",
                              isSelected ? "bg-[var(--vh-pink)] text-white shadow-[2px_2px_0px_#000000]" : "bg-white/10 text-white/60",
                            )}
                          >
                            {tier.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-white/60">{tier.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stay Profile Options */}
              <div className="mt-6 border-t border-white/10 pt-5">
                <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">Stay Profile</span>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {stayTypeOptions.map((opt) => {
                    const isSelected = stayType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStayType(opt.value)}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-none border-2 transition-all select-none text-left",
                          isSelected
                            ? "border-[var(--vh-pink)] bg-[var(--vh-pink)]/10 shadow-[3px_3px_0px_var(--vh-pink)]"
                            : "border-white/10 bg-[#12131A] shadow-[2px_2px_0px_#000000] hover:border-white/30",
                        )}
                      >
                        <div>
                          <p className="text-sm font-bold text-white">{opt.label}</p>
                          <p className="text-xs text-white/60">{opt.desc}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-[var(--vh-pink)] shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 2: Rooms & Digital Receipt Layout */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_370px] xl:grid-cols-[minmax(0,1fr)_400px]">
              {/* Left Column: Rooms & Addons */}
              <div className="space-y-6">
                <div>
                  <SectionTitle kicker="AVAILABLE INVENTORY" title="Monthly Rooms" copy="Prices reflect full 30-day billing intervals with real-time backend room verification." />
                </div>

                <span aria-live="polite" className="sr-only" role="status">
                  {isRefreshingRooms ? "Refreshing Colive room availability." : ""}
                </span>

                {isLoadingRooms ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[220px] w-full" />
                    <Skeleton className="h-[220px] w-full" />
                  </div>
                ) : null}

                {!isLoadingRooms && roomError ? (
                  <div className="rounded-none border border-[#EE4D37] bg-[#161616] p-6 text-center shadow-[4px_4px_0px_#000000]">
                    <p className="font-display text-2xl text-white">Rooms Did Not Load</p>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/70">{roomError}</p>
                    <div className="mt-5 flex justify-center">
                      <NeoPopButton variant="secondary" onClick={() => void loadRooms()}>
                        Retry Room Search
                      </NeoPopButton>
                    </div>
                  </div>
                ) : null}

                {!isLoadingRooms && !roomError && rooms.length === 0 ? (
                  <div className="rounded-none border border-[#3D3D3D] bg-[#161616] p-6 text-center shadow-[4px_4px_0px_#000000]">
                    <p className="font-display text-2xl text-white">No Monthly Rooms Available</p>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/70">
                      There are no available spaces matching this move-in date. Try selecting another start date above.
                    </p>
                  </div>
                ) : null}

                {/* Rooms List */}
                <div className={cn("space-y-5", isRefreshingRooms ? "opacity-60" : "")}>
                  {rooms.map((room) => {
                    const roomKey = getRoomSelectionKey(room);
                    const count = selectedCounts[roomKey] ?? 0;
                    const isSelected = count > 0;
                    const featureLabels = Array.from(new Set([...room.features, ...room.amenitiesLegend, ...coliveInclusions]));
                    const isSoldOut = room.inventoryState === "sold_out";
                    const isPriceUnavailable = hasUnavailableRoomPrice(room);
                    const canBook = !isSoldOut && !isPriceUnavailable && room.availableCount > 0;
                    const statusInfo = formatRoomStatus(room);

                    return (
                      <article
                        key={roomKey}
                        className={cn(
                          "overflow-hidden rounded-none border-2 bg-[#171822] transition-all shadow-[4px_4px_0px_#000000]",
                          isSelected ? "border-[var(--vh-pink)]" : "border-white/10 hover:border-white/30",
                        )}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_200px]">
                          {/* Thumbnail */}
                          <div className="relative border-b border-white/10 lg:border-b-0 lg:border-r">
                            <Image alt={room.title} className="h-[200px] w-full object-cover lg:h-full" height={420} src={room.image} width={520} />
                            <div className="absolute top-2 left-2">
                              <Token
                                variant={room.roomType === "PRIVATE" ? "blue" : "crimson"}
                                label={room.roomType === "PRIVATE" ? "PRIVATE SUITE" : "COMMUNITY DORM"}
                              />
                            </div>
                          </div>

                          {/* Details */}
                          <div className="space-y-3 p-5">
                            <div>
                              <h3 className="font-display text-2xl text-white tracking-tight">{room.title}</h3>
                              <p className="mt-0.5 text-xs font-extrabold uppercase tracking-wider text-white/50">{room.guestText}</p>
                            </div>

                            <p className="text-xs leading-5 text-white/70">
                              Monthly residency synced for {formatColiveDate(moveIn)} to {formatColiveDate(checkoutDate)}.
                            </p>

                            {/* Amenity Chips */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {featureLabels.slice(0, 5).map((label) => {
                                const Icon = featureIcon(label);
                                return (
                                  <span key={label} className="inline-flex items-center gap-1 border border-white/10 bg-[#12131A] px-2 py-0.5 text-[11px] text-white/80">
                                    <Icon className="h-3 w-3 text-[var(--vh-pink)]" />
                                    {label}
                                  </span>
                                );
                              })}
                            </div>

                            <div className="pt-2">
                              <Token variant={statusInfo.variant} label={statusInfo.text} />
                            </div>
                          </div>

                          {/* Pricing & Selection */}
                          <div className="flex flex-col justify-between border-t border-white/10 p-5 lg:border-l lg:border-t-0 bg-[#12131A]">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/50">Monthly Rent</span>
                              <p className="mt-1 font-display text-3xl font-bold text-white">{formatMonthlyPrice(room)}</p>
                              {!isPriceUnavailable && (
                                <p className="text-[11px] text-white/50">x {duration} {duration === 1 ? "month" : "months"}</p>
                              )}
                            </div>

                            <div className="mt-5">
                              {!canBook ? (
                                <div className="border border-white/10 bg-[#171822] py-2 text-center text-xs font-bold uppercase tracking-wider text-white/40">
                                  {isSoldOut ? "Sold Out" : "Unavailable"}
                                </div>
                              ) : count === 0 ? (
                                <NeoPopButton variant="primary" fullWidth size="default" onClick={() => updateCount(roomKey, 1)}>
                                  Select Room
                                </NeoPopButton>
                              ) : (
                                <div className="flex items-center justify-between border border-[var(--vh-pink)] bg-[#171822] p-1">
                                  <button
                                    type="button"
                                    onClick={() => updateCount(roomKey, count - 1)}
                                    className="flex h-8 w-8 items-center justify-center border border-white/10 bg-[#12131A] text-white hover:bg-[#252525]"
                                    aria-label="Remove room"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="font-display text-lg font-bold text-white px-2">{count} Selected</span>
                                  <button
                                    type="button"
                                    disabled={count >= room.availableCount}
                                    onClick={() => updateCount(roomKey, count + 1)}
                                    className="flex h-8 w-8 items-center justify-center border border-white/10 bg-[#12131A] text-white hover:bg-[#252525] disabled:opacity-40"
                                    aria-label="Add more"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
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

                {/* Coliving Addons Selector */}
                <div className="mt-8 border border-white/15 bg-[#171822] p-6 shadow-[4px_4px_0px_#000000]">
                  <SectionTitle
                    kicker="CUSTOMIZE YOUR RESIDENCY"
                    title="Coliving Addons & Upgrades"
                    copy="Optional enhancements to supercharge your productive monthly stay."
                  />
                  <div className="mt-4 space-y-3">
                    {coliveAddonCatalog.map((addon) => {
                      const isToggled = selectedAddons.includes(addon.id);
                      const Icon = addon.icon;
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => toggleAddon(addon.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-none border-2 text-left transition-all select-none",
                            isToggled
                              ? "border-[var(--np-green)] bg-[#121F17] shadow-[3px_3px_0px_var(--np-green)]"
                              : "border-white/10 bg-[#12131A] hover:border-white/30",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("p-2 border", isToggled ? "border-[var(--np-green)] text-[var(--np-green)]" : "border-white/10 text-white/60")}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{addon.title}</p>
                              <p className="text-xs text-white/60 leading-5">{addon.description}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <span className="font-display text-base font-bold text-white">+₹{formatINRPlain(addon.monthlyPrice)}</span>
                            <span className="block text-[10px] uppercase text-white/50">/ month</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Digital Receipt Summary Card */}
              <aside className="hidden self-start lg:sticky lg:top-28 lg:block">
                <div className="rounded-none border-2 border-white/15 bg-[#171822] p-6 shadow-[6px_6px_0px_#000000]">
                  {/* Receipt Header */}
                  <div className="flex items-start justify-between border-b border-dashed border-white/15 pb-4">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--vh-pink)]">DIGITAL RECEIPT</p>
                      <h2 className="mt-1 font-display text-2xl text-white tracking-tight">Coliving Quote</h2>
                    </div>
                    <span className="border border-white/10 bg-[#12131A] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
                      {duration} mo stay
                    </span>
                  </div>

                  {/* Dates Box */}
                  <div className="mt-4 border border-white/10 bg-[#12131A] p-3 text-xs">
                    <div className="flex justify-between items-center text-white/70">
                      <span>MOVE-IN</span>
                      <span className="font-bold text-white">{formatColiveDate(moveIn)}</span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-white/70">
                      <span>UNTIL</span>
                      <span className="font-bold text-white">{formatColiveDate(checkoutDate)}</span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-white/70">
                      <span>PROFILE</span>
                      <span className="font-bold uppercase text-[var(--vh-pink)]">{stayType}</span>
                    </div>
                  </div>

                  {/* Itemized charges */}
                  <div className="mt-5 space-y-3 border-t border-dashed border-white/15 pt-4 text-xs">
                    {selectedRoomDrafts.length === 0 ? (
                      <p className="border border-white/10 bg-[#12131A] p-4 text-center text-white/60">
                        Select a room tier above to generate your itemized monthly receipt.
                      </p>
                    ) : (
                      selectedRoomDrafts.map((room) => (
                        <div key={room.roomTypeId} className="flex justify-between items-start text-white/80">
                          <div>
                            <p className="font-semibold text-white">{room.title}</p>
                            <p className="text-[11px] text-white/50">
                              ₹{formatINRPlain(room.basePrice)} x {room.quantity} x {duration} mo
                            </p>
                          </div>
                          <p className="font-mono font-semibold text-white">₹{formatINRPlain(room.basePrice * room.quantity * duration)}</p>
                        </div>
                      ))
                    )}

                    {/* Addons line item */}
                    {selectedAddons.map((addonId) => {
                      const item = coliveAddonCatalog.find((a) => a.id === addonId);
                      if (!item) return null;
                      return (
                        <div key={addonId} className="flex justify-between items-center text-white/80">
                          <div>
                            <p className="font-semibold text-white">{item.title}</p>
                            <p className="text-[11px] text-white/50">₹{formatINRPlain(item.monthlyPrice)} x {duration} mo</p>
                          </div>
                          <p className="font-mono font-semibold text-white">₹{formatINRPlain(item.monthlyPrice * duration)}</p>
                        </div>
                      );
                    })}

                    {/* Discount line item */}
                    {appliedCoupon && discountAmount > 0 ? (
                      <div className="flex justify-between items-center text-[var(--np-green)]">
                        <div>
                          <p className="font-semibold">Discount ({appliedCoupon.code})</p>
                          <p className="text-[11px] opacity-80">{appliedCoupon.discountPercent}% off room charges</p>
                        </div>
                        <p className="font-mono font-semibold">-₹{formatINRPlain(discountAmount)}</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Coupon Code Section */}
                  <div className="mt-5 border-t border-dashed border-white/15 pt-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/60">Promo Code</span>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="e.g. VIBECOLIVE"
                        className="h-9 w-full rounded-none border border-white/10 bg-[#12131A] px-3 text-xs uppercase font-mono text-white outline-none focus:border-[var(--vh-pink)]"
                      />
                      <NeoPopButton variant="secondary" size="sm" onClick={handleApplyCoupon}>
                        Apply
                      </NeoPopButton>
                    </div>
                    {couponError && <p className="mt-1.5 text-[11px] text-[#EE4D37]">{couponError}</p>}
                    {appliedCoupon && (
                      <p className="mt-1.5 text-[11px] text-[var(--np-green)]">
                        Code {appliedCoupon.code} active (-{appliedCoupon.discountPercent}%)
                      </p>
                    )}
                  </div>

                  {/* Total & Deposit */}
                  <div className="mt-5 border-t-2 border-dashed border-white/15 pt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs uppercase tracking-wider text-white/70">Estimated Total</span>
                      <span className="font-display text-3xl font-bold text-[var(--vh-pink)]">
                        ₹{formatINRPlain(selectedRoomTotal)}
                      </span>
                    </div>
                    <div className="mt-2 border border-white/10 bg-[#12131A] p-2.5 text-[11px] leading-5 text-white/60">
                      <Info className="inline h-3.5 w-3.5 mr-1 text-[var(--vh-pink)]" />
                      Refundable 1-month security deposit confirmed at backend checkout review.
                    </div>
                  </div>

                  {/* Age Confirmation Checkbox */}
                  <div className="my-5 flex items-start gap-3">
                    <input
                      id="colive-age-confirm-desktop"
                      type="checkbox"
                      checked={isAgeConfirmed}
                      onChange={(e) => setIsAgeConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-none border border-white/15 bg-[#12131A] accent-[var(--vh-pink)] cursor-pointer"
                    />
                    <label htmlFor="colive-age-confirm-desktop" className="text-xs text-white/80 cursor-pointer select-none leading-5">
                      I confirm all guests are <strong className="text-white">18+ years of age</strong> and accept the{" "}
                      <Link href="/policies" className="text-[var(--vh-pink)] underline">
                        terms & coliving rules
                      </Link>.
                    </label>
                  </div>

                  {continueError ? <p className="mb-4 text-xs font-semibold text-[#EE4D37]">{continueError}</p> : null}

                  {/* Review CTA */}
                  <NeoPopButton
                    variant="primary"
                    fullWidth
                    size="lg"
                    disabled={!canContinue}
                    loading={isContinuing}
                    onClick={continueToCheckout}
                  >
                    Review Booking
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </NeoPopButton>
                </div>
              </aside>
            </div>
          </section>

          {/* Guidelines Accordion */}
          <section data-colive-reveal>
            <SectionTitle kicker="HOUSE RULES" title="Coliving Guidelines" />
            <div className="mt-6 max-w-4xl space-y-3">
              <div className="flex flex-wrap gap-4 border border-white/10 bg-[#171822] p-4 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[var(--vh-pink)]" />
                  <span>Check-in Window: <strong className="text-white">{propertyGuidelines.checkIn}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[var(--vh-pink)]" />
                  <span>Quiet Hours: <strong className="text-white">11:00 PM – 8:00 AM</strong></span>
                </div>
              </div>

              <Accordion className="space-y-2" defaultValue={["general-guidelines"]} type="multiple">
                <AccordionItem className="rounded-none border border-white/10 bg-[#171822] px-4" value="general-guidelines">
                  <AccordionTrigger className="text-sm font-bold uppercase tracking-wider text-white">General Guidelines</AccordionTrigger>
                  <AccordionContent className="border-t border-white/10 pt-3 text-xs leading-6 text-white/70">
                    {propertyGuidelines.summary.map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {propertyGuidelines.sections.map((section, index) => (
                  <AccordionItem key={section.title} className="rounded-none border border-white/10 bg-[#171822] px-4" value={`guideline-${index}`}>
                    <AccordionTrigger className="text-sm font-bold uppercase tracking-wider text-white">{section.title}</AccordionTrigger>
                    <AccordionContent className="border-t border-white/10 pt-3 text-xs leading-6 text-white/70">
                      {section.content.map((item) => (
                        <p key={item}>• {item}</p>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* FAQs & Neighborhood */}
          <section data-colive-reveal>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              {/* FAQs */}
              <div>
                <SectionTitle kicker="FREQUENT QUESTIONS" title="Coliving FAQs" />
                <Accordion className="mt-6 space-y-3" defaultValue={["faq-0"]} type="multiple">
                  {roomFaqs.map((faq, index) => (
                    <AccordionItem key={faq.question} className="rounded-none border border-white/10 bg-[#171822] px-4" value={`faq-${index}`}>
                      <AccordionTrigger className="text-sm font-semibold text-white">{faq.question}</AccordionTrigger>
                      <AccordionContent className="border-t border-white/10 pt-3 text-xs leading-6 text-white/70">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Neighborhood & Map */}
              <div className="space-y-6">
                <div>
                  <SectionTitle kicker="SURROUNDINGS" title="Location & Access" />
                  <div className="mt-6 overflow-hidden rounded-none border border-white/15 shadow-[4px_4px_0px_#000000]">
                    <iframe className="h-[280px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={locationMap.embedUrl} title={locationMap.title} />
                  </div>
                  <Link className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--vh-pink)] hover:underline" href={propertyHero.mapsHref} target="_blank">
                    Open in Google Maps
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="border border-white/15 bg-[#171822] p-4 shadow-[3px_3px_0px_#000000]">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--vh-pink)]">Nearby Spots</p>
                  <div className="mt-3 space-y-2.5">
                    {nearbyAttractions.map((place) => (
                      <div key={place.name} className="flex items-center justify-between border-b border-white/10 pb-2 last:border-b-0 last:pb-0 text-xs">
                        <div>
                          <span className="font-semibold text-white">{place.name}</span>
                          <span className="block text-[10px] uppercase text-white/50">{place.type}</span>
                        </div>
                        <span className="border border-white/10 bg-[#12131A] px-2 py-0.5 text-[10px] font-bold uppercase text-white/80">
                          {place.travel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* Mobile Sticky Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-white/15 bg-[#12131A]/95 p-4 backdrop-blur-xl shadow-[0px_-4px_16px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/50">Est. Total</span>
            <p className="font-display text-xl font-bold text-[var(--vh-pink)]">₹{formatINRPlain(selectedRoomTotal)}</p>
            <span className="text-[11px] text-white/70">
              {selectedRoomCount} room{selectedRoomCount === 1 ? "" : "s"} • {duration} mo
            </span>
          </div>
          <NeoPopButton
            variant="primary"
            size="default"
            disabled={!canContinue}
            loading={isContinuing}
            onClick={continueToCheckout}
          >
            Review
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </NeoPopButton>
        </div>
        <div className="mt-2 flex items-center gap-2 pt-2 border-t border-white/10">
          <input
            type="checkbox"
            id="colive-age-mobile"
            checked={isAgeConfirmed}
            onChange={(e) => setIsAgeConfirmed(e.target.checked)}
            className="h-3.5 w-3.5 rounded-none border-white/15 accent-[var(--vh-pink)] cursor-pointer"
          />
          <label htmlFor="colive-age-mobile" className="text-[10px] text-white/70 select-none">
            All guests are 18+ and accept terms.
          </label>
        </div>
      </div>
    </div>
  );
}
