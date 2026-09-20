"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  BatteryCharging,
  BedDouble,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  Car,
  ChevronDown,
  ChevronRight,
  Clock3,
  Droplets,
  GlassWater,
  Info,
  LampDesk,
  Lock,
  Minus,
  PawPrint,
  Plus,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Shirt,
  UtensilsCrossed,
  Usb,
  Waves,
  Wifi,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { buildBookingSignature, saveBookingDraft, type BookingDraftRoom } from "@/lib/booking-session";
import type { CxRoomCategory } from "@/lib/cx-api";
import { loadCxRooms, type CxRoomsPayload } from "@/lib/cx-rooms-client";
import {
  buildSelectionSignature,
  consumeReviewResumeIntent,
  getPropertySelection,
  savePropertySelection,
  saveReviewResumeIntent,
} from "@/lib/property-selection-session";
import { cn } from "@/lib/utils";
import { formatINRPlain } from "@/lib/format-price";
import {
  homePageContent,
  upsellBentoItems,
} from "@/content/home";
import {
  bookingSummary,
  locationMap,
  nearbyAttractions,
  propertyAmenities,
  propertyGallery,
  propertyGuidelines,
  propertyHero,
  propertyOverview,
  roomFaqs,
} from "@/content/rooms";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { FadeIn } from "@/components/shared/motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Button as NeoPopButton } from "@/components/neopop";
import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { StickerTag } from "@/components/shared/sticker-tag";

const amenityIcons = {
  wifi: Wifi,
  snowflake: Snowflake,
  building: Building2,
  sparkles: ShieldCheck,
  car: Car,
  "paw-print": PawPrint,
  waves: Waves,
  "battery-charging": BatteryCharging,
  smartphone: Smartphone,
  "glass-water": GlassWater,
  camera: Camera,
  briefcase: Briefcase,
} as const;

const roomFeatureIcons: Record<string, typeof Wifi> = {
  "Privacy curtain": ShieldCheck,
  "Reading light": LampDesk,
  "USB charging": Usb,
  "Personal locker": Lock,
  "Women-only floor": ShieldCheck,
  "En-suite access": Droplets,
  "Secure locker": Lock,
  "Queen bed": BedDouble,
  "En-suite bathroom": Droplets,
  "Work desk": Briefcase,
  "Mini-fridge": GlassWater,
  AC: Snowflake,
  Locker: Lock,
  "Fresh linen": ShieldCheck,
  Housekeeping: ShieldCheck,
  "Private bath": Droplets,
};

type RoomCategory = CxRoomCategory;

type RoomApiPayload = Partial<CxRoomsPayload>;

type AvailabilitySource = "catalog" | "ezee_live" | "live_provider" | "local_db_estimate" | "unknown";

type CachedRoomPayload = {
  expiresAt: number;
  payload: RoomApiPayload;
};

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const AVAILABILITY_CACHE_TTL_MS = 60 * 1000;

function roomCacheKey(params: { propertyId?: string; checkin?: string; checkout?: string }) {
  const propertyPart = params.propertyId?.trim() || "default";
  const checkinPart = params.checkin?.trim() || "none";
  const checkoutPart = params.checkout?.trim() || "none";

  return `${propertyPart}::${checkinPart}::${checkoutPart}`;
}

function getRoomSelectionKey(room: RoomCategory): string {
  return room.roomTypeId?.trim() || room.slug;
}

function readCategories(payload: RoomApiPayload): RoomCategory[] {
  return Array.isArray(payload.categories) ? (payload.categories as RoomCategory[]) : [];
}

function readAvailabilitySource(payload: RoomApiPayload): AvailabilitySource | null {
  if (typeof payload.availability_source !== "string") {
    return null;
  }

  const normalized = payload.availability_source.trim().toLowerCase();

  if (
    normalized === "catalog" ||
    normalized === "ezee_live" ||
    normalized === "live_provider" ||
    normalized === "local_db_estimate" ||
    normalized === "unknown"
  ) {
    return normalized;
  }

  return null;
}

function readAvailabilityError(payload: RoomApiPayload): string | null {
  if (typeof payload.availability_error !== "string") {
    return null;
  }

  const message = payload.availability_error.trim();
  return message ? message : null;
}

function getLocalDate(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function toLocalDateString(date?: Date) {
  if (!date) {
    return "";
  }

  const localDate = new Date(date);
  localDate.setHours(12, 0, 0, 0);

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromDateString(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDisplayDate(value?: string): string {
  if (!value) {
    return "Select date";
  }

  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function syncAvailabilityQueryParams(params: {
  enabled: boolean;
  propertyId?: string;
  checkin?: string;
  checkout?: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  let hasChanges = false;

  const setParam = (key: string, value?: string) => {
    if (!value) {
      return;
    }

    if (url.searchParams.get(key) !== value) {
      url.searchParams.set(key, value);
      hasChanges = true;
    }
  };

  const removeParam = (key: string) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      hasChanges = true;
    }
  };

  if (params.enabled && params.checkin && params.checkout && params.checkout > params.checkin) {
    setParam("checkin", params.checkin);
    setParam("checkout", params.checkout);
    setParam("property_id", params.propertyId?.trim());
  } else {
    removeParam("checkin");
    removeParam("checkout");
  }

  if (!hasChanges) {
    return;
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

function hasUnavailableRoomPrice(room: RoomCategory): boolean {
  return room.isPriceUnavailable === true;
}

function formatRoomPrice(room: RoomCategory): string {
  return hasUnavailableRoomPrice(room) ? "Price unavailable" : `Rs. ${formatINRPlain(room.basePrice)}`;
}

function resolveNextRange(current: DateRange | undefined, nextValue: DateRange | undefined, selectedDay?: Date) {
  if (!selectedDay) {
    return nextValue;
  }

  if (current?.from && current?.to) {
    return {
      from: selectedDay,
      to: undefined,
    };
  }

  return nextValue;
}

function getNightCount(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) {
    return 1;
  }

  const start = new Date(`${checkIn}T12:00:00`).getTime();
  const end = new Date(`${checkOut}T12:00:00`).getTime();

  return Math.max(1, Math.round((end - start) / 86400000));
}

const ROOM_GST_RATE = 0.05;
const STANDARD_ADDON_GST_RATE = 0.18;

function getAddonTaxRate(title: string): number {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes("late checkout")) {
    return ROOM_GST_RATE;
  }
  return STANDARD_ADDON_GST_RATE;
}

function calculateWidgetTaxes(params: {
  roomTotal: number;
  addons: Array<{ title: string; quantity: number; unitPrice: number }>;
}) {
  const addonTotal = params.addons.reduce((sum, addon) => sum + addon.unitPrice * addon.quantity, 0);
  const roomTaxExact = params.roomTotal * ROOM_GST_RATE;
  const addonTaxExact = params.addons.reduce(
    (sum, addon) => sum + (addon.unitPrice * addon.quantity * getAddonTaxRate(addon.title)),
    0,
  );
  const taxes = roomTaxExact + addonTaxExact;
  const grandTotal = params.roomTotal + addonTotal + taxes;

  return {
    addonTotal,
    roomTaxExact,
    addonTaxExact,
    taxes,
    grandTotal,
  };
}

const bookingEssentials = [
  {
    id: "dinner",
    title: "Dinner",
    originalPrice: 385,
    price: 350,
    note: "per adult - per day",
    actionLabel: "Add",
    icon: UtensilsCrossed,
  },
  {
    id: "toilet-kit",
    title: "Toilet Kit",
    originalPrice: 141.9,
    price: 129,
    note: "per kit",
    actionLabel: "Add",
    icon: ShieldCheck,
  },
  {
    id: "bath-towel",
    title: "Bath Towel",
    originalPrice: 141.9,
    price: 129,
    note: "per towel",
    actionLabel: "Add",
    icon: Shirt,
  },
] as const;

const propertyAboutText = propertyOverview.join(" ");

function iconForLabel(label: string) {
  return roomFeatureIcons[label] ?? ShieldCheck;
}

function getRoomGallery(room: RoomCategory) {
  const sources = room.images && room.images.length > 0 ? room.images : [room.image];
  return Array.from(new Set(sources)).slice(0, 5);
}

function SectionTitle({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <h2 className={`text-2xl md:text-3xl font-bold tracking-tight text-white font-display ${className}`}>
      {title}
    </h2>
  );
}

function DateRangePicker({
  dateRange,
  onSelect,
  align = "right",
}: {
  dateRange: DateRange | undefined;
  onSelect: (value: DateRange | undefined, selectedDay?: Date) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [isDesktopCalendar, setIsDesktopCalendar] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const sync = (nextMatch: boolean) => setIsDesktopCalendar(nextMatch);

    sync(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => sync(event.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 border border-white/15 bg-[#171822] px-5 py-3 text-white shadow-[3px_3px_0px_#000000] hover:border-[var(--vh-pink)] transition-all md:w-auto font-body"
          type="button"
        >
          <div className="inline-flex min-w-0 items-center gap-3">
            <span className="inline-flex items-center justify-center text-[var(--vh-pink)]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="text-sm md:text-base font-bold tracking-[0.04em]">
              {formatDisplayDate(toLocalDateString(dateRange?.from))}
            </span>
            <span aria-hidden="true" className="text-white/40">&#8594;</span>
            <span className="text-sm md:text-base font-bold tracking-[0.04em]">
              {formatDisplayDate(toLocalDateString(dateRange?.to))}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-white/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align === "left" ? "start" : "end"}
        className={cn(
          "z-[200] w-fit border border-[#3D3D3D] bg-[#161616] p-3 shadow-[6px_6px_0px_#000000] rounded-none",
          isDesktopCalendar ? "max-w-[min(100vw-1rem,860px)]" : "max-w-[min(100vw-1rem,420px)]",
        )}
      >
        <Calendar
          className="vh-calendar-dark vh-calendar-balanced rounded-none"
          defaultMonth={dateRange?.from}
          mode="range"
          numberOfMonths={isDesktopCalendar ? 2 : 1}
          onSelect={(nextValue, selectedDay) => {
            onSelect(nextValue, selectedDay);

            if (nextValue?.from && nextValue?.to) {
              setOpen(false);
            }
          }}
          selected={dateRange}
          disabled={{ before: getLocalDate(0) }}
        />
      </PopoverContent>
    </Popover>
  );
}

function DesktopBookingSummary({
  checkIn,
  checkOut,
  continueError,
  essentials,
  essentialsTotal,
  isAgeConfirmed,
  isContinuing,
  onAgeConfirmChange,
  selectedCounts,
  roomCategoryList,
  onContinue,
}: {
  checkIn: string;
  checkOut: string;
  continueError?: string | null;
  essentials: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
  essentialsTotal: number;
  isAgeConfirmed: boolean;
  isContinuing?: boolean;
  onAgeConfirmChange: (value: boolean) => void;
  selectedCounts: Record<string, number>;
  roomCategoryList: RoomCategory[];
  onContinue: () => void;
}) {
  const nights = getNightCount(checkIn, checkOut);
  const selectedRooms = roomCategoryList.filter((room) => (selectedCounts[getRoomSelectionKey(room)] ?? 0) > 0);
  const roomTotal = selectedRooms.reduce(
    (sum, room) => sum + room.basePrice * (selectedCounts[getRoomSelectionKey(room)] ?? 0) * nights,
    0,
  );
  const selectedEssentials = essentials.filter((item) => item.quantity > 0);
  const { roomTaxExact, addonTaxExact, taxes, grandTotal } = calculateWidgetTaxes({
    roomTotal,
    addons: selectedEssentials,
  });
  const hasSelection = selectedRooms.length > 0;

  return (
    <aside className="hidden self-start lg:sticky lg:top-28 lg:block">
      <div className="border border-white/15 bg-[#171822] p-6 shadow-[4px_4px_0px_#000000] lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto font-body">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">{bookingSummary.title}</h2>

        <div className="mt-5 border border-white/10 bg-[#12131A] px-4 py-4 text-white">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Check In</p>
              <p className="mt-1 text-sm font-extrabold">{formatDisplayDate(checkIn)}</p>
            </div>
            <div className="bg-[var(--vh-pink)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[2px_2px_0px_#000000]">
              {nights} {nights === 1 ? "Night" : "Nights"}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Check Out</p>
              <p className="mt-1 text-sm font-extrabold">{formatDisplayDate(checkOut)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm text-white/80">
          {hasSelection ? (
            selectedRooms.map((room) => (
              <div key={getRoomSelectionKey(room)} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-white text-xs uppercase tracking-[0.04em]">{room.title}</p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Rs. {formatINRPlain(room.basePrice)} x {selectedCounts[getRoomSelectionKey(room)]} x {nights} {nights === 1 ? "night" : "nights"}
                  </p>
                </div>
                <p className="font-black text-white text-sm">
                  Rs. {formatINRPlain(room.basePrice * (selectedCounts[getRoomSelectionKey(room)] ?? 0) * nights)}
                </p>
              </div>
            ))
          ) : (
            <p className="border border-dashed border-white/15 bg-[#12131A] px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.08em] text-white/50">
              Add room(s) to see booking totals.
            </p>
          )}

          {essentials.filter((item) => item.quantity > 0).map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 border-t border-white/10 pt-3">
              <div>
                <p className="font-extrabold text-white text-xs uppercase tracking-[0.04em]">{item.title}</p>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Rs. {formatINRPlain(item.unitPrice)} x {item.quantity}
                </p>
              </div>
              <p className="font-black text-white text-sm">Rs. {formatINRPlain(item.unitPrice * item.quantity)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-white/10 pt-4 text-xs text-white/70 space-y-2">
          <div className="flex items-center justify-between">
            <p className="uppercase tracking-[0.08em]">Total room charges</p>
            <p className="font-bold text-white text-sm">Rs. {formatINRPlain(roomTotal)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="uppercase tracking-[0.08em]">Add-on charges</p>
            <p className="font-bold text-white text-sm">Rs. {formatINRPlain(essentialsTotal)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="group relative inline-flex items-center gap-1 uppercase tracking-[0.08em]">
              Total taxes
              <button
                aria-label="View tax breakdown"
                className="inline-flex items-center text-white/70 hover:text-white"
                type="button"
              >
                <Info className="h-3 w-3" />
              </button>
              <span className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-20 hidden min-w-[180px] border border-white/15 bg-[#12131A] px-2.5 py-2 text-[11px] leading-4 text-white/85 shadow-[4px_4px_0px_#000000] group-hover:block">
                <span className="block">Room tax - {formatINRPlain(roomTaxExact)}</span>
                <span className="mt-1 block">Add-on tax - {formatINRPlain(addonTaxExact)}</span>
              </span>
            </p>
            <p className="font-bold text-white text-sm">Rs. {formatINRPlain(taxes)}</p>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <p className="font-bold text-white uppercase tracking-[0.1em] text-sm">Total price</p>
            <p className="font-black text-xl text-[var(--vh-pink)]">Rs. {formatINRPlain(grandTotal)}</p>
          </div>
        </div>

        <div className="my-4 flex items-start gap-3 border-t border-white/10 pt-4">
          <input
            checked={isAgeConfirmed}
            className="mt-0.5 h-5 w-5 cursor-pointer rounded-none border border-white/20 bg-[#12131A] accent-[var(--vh-pink)] focus:ring-0"
            id="checked-checkbox-desktop"
            onChange={(event) => onAgeConfirmChange(event.target.checked)}
            type="checkbox"
          />
          <label htmlFor="checked-checkbox-desktop" className="cursor-pointer select-none text-xs leading-relaxed text-white/80">
            Yes, I confirm <span className="font-bold text-white">all guests are 18+ years old</span> and acknowledge the{" "}
            <Link className="text-[var(--vh-pink)] hover:underline" href="/policies/">
              Terms, Cancellation &amp; Property Policies.
            </Link>
          </label>
        </div>

        {continueError ? <p className="mt-3 text-xs font-bold text-[#EE4D37] uppercase tracking-[0.06em]">{continueError}</p> : null}
        <div className="mt-5">
          <NeoPopButton
            className="w-full font-body font-black uppercase tracking-[0.12em] text-sm"
            disabled={!isAgeConfirmed || !hasSelection || isContinuing}
            onClick={onContinue}
            size="lg"
            variant="primary"
          >
            {isContinuing ? "Reviewing..." : "Review Booking"}
          </NeoPopButton>
        </div>
      </div>
    </aside>
  );
}

function MobileStickySummary({
  checkIn,
  checkOut,
  continueError,
  essentials,
  essentialsTotal,
  isAgeConfirmed,
  isContinuing,
  onAgeConfirmChange,
  selectedCounts,
  roomCategoryList,
  onContinue,
}: {
  checkIn: string;
  checkOut: string;
  continueError?: string | null;
  essentials: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
  essentialsTotal: number;
  isAgeConfirmed: boolean;
  isContinuing?: boolean;
  onAgeConfirmChange: (value: boolean) => void;
  selectedCounts: Record<string, number>;
  roomCategoryList: RoomCategory[];
  onContinue: () => void;
}) {
  const [open, setOpen] = useState(false);
  const nights = getNightCount(checkIn, checkOut);
  const selectedRooms = roomCategoryList.filter((room) => (selectedCounts[getRoomSelectionKey(room)] ?? 0) > 0);
  const roomTotal = selectedRooms.reduce(
    (sum, room) => sum + room.basePrice * (selectedCounts[getRoomSelectionKey(room)] ?? 0) * nights,
    0,
  );
  const selectedEssentials = essentials.filter((item) => item.quantity > 0);
  const { taxes, grandTotal } = calculateWidgetTaxes({
    roomTotal,
    addons: selectedEssentials,
  });
  const hasSelection = selectedRooms.length > 0 || selectedEssentials.length > 0;
  const previewRoomWithPrice = roomCategoryList.find((room) => !hasUnavailableRoomPrice(room));
  const displayAmount = hasSelection ? grandTotal : previewRoomWithPrice?.basePrice ?? 0;
  const showUnavailablePricePreview = !hasSelection && !previewRoomWithPrice;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#3D3D3D] bg-[#121212] shadow-[0_-4px_20px_rgba(0,0,0,0.7)] font-body">
      <div className="overflow-hidden bg-[#121212]">
        {open && hasSelection ? (
          <div className="border-b border-[#3D3D3D] bg-[#161616] px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-white">Booking Summary</p>
              <button
                aria-label="Hide Summary"
                className="border border-[#3D3D3D] bg-[#121212] p-1.5 text-white/70 hover:text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/50">
              {nights} {nights === 1 ? "night" : "nights"} from {formatDisplayDate(checkIn)}
            </p>

            <div className="mt-3 max-h-[34vh] space-y-2.5 overflow-y-auto pr-1 text-xs text-white/80">
              {selectedRooms.map((room) => (
                <div key={getRoomSelectionKey(room)} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-white">
                      {room.title} x {selectedCounts[getRoomSelectionKey(room)]}
                    </p>
                    <p className="text-[10px] text-white/50">Rs. {formatINRPlain(room.basePrice)} / night</p>
                  </div>
                  <p className="font-black text-white">Rs. {formatINRPlain(room.basePrice * (selectedCounts[getRoomSelectionKey(room)] ?? 0) * nights)}</p>
                </div>
              ))}

              {selectedEssentials.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 border-t border-[#3D3D3D] pt-2">
                  <div>
                    <p className="font-extrabold text-white">
                      {item.title} x {item.quantity}
                    </p>
                    <p className="text-[10px] text-white/50">Rs. {formatINRPlain(item.unitPrice)} each</p>
                  </div>
                  <p className="font-black text-white">Rs. {formatINRPlain(item.unitPrice * item.quantity)}</p>
                </div>
              ))}

              <div className="border-t border-white/10 pt-2 text-[11px] space-y-1 text-white/60">
                <div className="flex items-center justify-between">
                  <p className="uppercase tracking-[0.06em]">Add-ons</p>
                  <p className="font-bold text-white">Rs. {formatINRPlain(essentialsTotal)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="uppercase tracking-[0.06em]">Total taxes</p>
                  <p className="font-bold text-white">Rs. {formatINRPlain(taxes)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between font-black text-sm text-[var(--vh-pink)] border-t border-white/10 pt-2">
                  <p className="uppercase tracking-[0.08em] text-white">Total price</p>
                  <p>Rs. {formatINRPlain(grandTotal)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-3 border-t border-white/10">
                <input
                  checked={isAgeConfirmed}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded-none border border-white/20 bg-[#12131A] accent-[var(--vh-pink)] focus:ring-0"
                  id="checked-checkbox-mobile"
                  onChange={(event) => onAgeConfirmChange(event.target.checked)}
                  type="checkbox"
                />
                <label htmlFor="checked-checkbox-mobile" className="cursor-pointer select-none text-[11px] leading-relaxed text-white/80">
                  Yes, I confirm <span className="font-bold text-white">all guests are 18+</span> and accept{" "}
                  <Link className="text-[var(--vh-pink)] hover:underline" href="/policies/">
                    booking terms &amp; policies.
                  </Link>
                </label>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-xl font-black text-white font-body">
              {showUnavailablePricePreview ? "Price unavailable" : `₹${formatINRPlain(displayAmount)}`}
            </p>
            {continueError ? <p className="mt-1 max-w-[200px] text-[10px] font-bold text-[#EE4D37] uppercase">{continueError}</p> : null}
            <button
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--vh-pink)] font-body"
              disabled={!hasSelection}
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              Price breakup
              <Info className="h-3 w-3" />
            </button>
          </div>
          <NeoPopButton
            className="min-w-[130px] px-4 py-2.5 text-xs font-body font-black uppercase tracking-[0.12em]"
            disabled={!hasSelection || isContinuing}
            onClick={onContinue}
            size="sm"
            variant="primary"
          >
            {isContinuing ? "Reviewing..." : "Review Booking"}
          </NeoPopButton>
        </div>
      </div>
    </div>
  );
}

function BuildYourStaySection() {
  return (
    <section id="build-your-stay" className="scroll-mt-28">
      <SectionTitle title={homePageContent.upsellTitle} />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {upsellBentoItems.map((item) => {
          return (
            <div
              key={item.id}
              className="relative border border-white/10 bg-[#171822] p-5 text-left shadow-[3px_3px_0px_#000000] hover:border-[var(--vh-pink)] transition-all"
            >
              <span className="inline-block bg-[var(--vh-pink)] text-white text-[10px] font-black uppercase tracking-[0.12em] px-2.5 py-0.5 font-body mb-3">
                {item.kicker}
              </span>

              <h3 className="text-base font-black uppercase text-white font-body tracking-[0.06em] mb-2">
                {item.title}
              </h3>

              <p className="text-xs leading-relaxed text-white/70 font-body">{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RoomCardSkeleton() {
  return (
    <article className="border border-[#3D3D3D] bg-[#161616] shadow-[3px_3px_0px_#000000] rounded-none">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_188px]">
        {/* Image skeleton */}
        <Skeleton className="h-[220px] w-full lg:h-full rounded-none bg-[#222222]" />
        
        {/* Content skeleton */}
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 rounded-none bg-[#222222]" />
            <Skeleton className="h-4 w-24 rounded-none bg-[#222222]" />
          </div>
          <Skeleton className="h-14 w-full rounded-none bg-[#222222]" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-none bg-[#222222]" />
            <Skeleton className="h-6 w-20 rounded-none bg-[#222222]" />
            <Skeleton className="h-6 w-16 rounded-none bg-[#222222]" />
          </div>
          <Skeleton className="h-4 w-32 rounded-none bg-[#222222]" />
        </div>
        
        {/* Price skeleton */}
        <div className="flex flex-col justify-between border-t border-[#3D3D3D] p-5 lg:border-l lg:border-t-0">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-none bg-[#222222]" />
            <Skeleton className="h-8 w-28 rounded-none bg-[#222222]" />
          </div>
          <Skeleton className="mt-5 h-10 w-full rounded-none bg-[#222222]" />
        </div>
      </div>
    </article>
  );
}

function RoomDetailsPopup({
  room,
  count,
  imageIndex,
  onClose,
  onImageChange,
  onIncrement,
  onDecrement,
}: {
  room: RoomCategory | null;
  count: number;
  imageIndex: number;
  onClose: () => void;
  onImageChange: (value: number) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  useEffect(() => {
    if (!room) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [room, onClose]);

  if (!room) {
    return null;
  }

  const gallery = getRoomGallery(room);
  const activeImage = gallery[imageIndex] ?? gallery[0];
  const detailItems = Array.from(new Set([...room.features, ...room.amenitiesLegend]));
  const isSoldOut = room.inventoryState === "sold_out";
  const isAvailabilityPending = !room.hasLiveAvailability || room.inventoryState === "unknown";
  const isPriceUnavailable = hasUnavailableRoomPrice(room);
  const canBook = room.hasLiveAvailability && !isSoldOut && !isPriceUnavailable;

  return (
    <div
      className="animate-vh-fade-in fixed inset-0 z-[80] overflow-y-auto bg-black/85 px-3 py-4 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-start justify-center lg:items-center">
        <div
          className="animate-vh-scale-in grid w-full max-w-5xl overflow-hidden border border-[#3D3D3D] bg-[#121212] shadow-[6px_6px_0px_#000000] rounded-none lg:max-h-[92vh] lg:grid-cols-[1.2fr_0.8fr]"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="border-b border-[#3D3D3D] p-4 lg:border-b-0 lg:border-r lg:p-6">
            <div className="overflow-hidden border border-[#3D3D3D] shadow-[3px_3px_0px_#000000]">
              <ImageWithFallback alt={room.title} className="h-[220px] w-full object-cover sm:h-[300px] md:h-[420px]" src={activeImage} />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {gallery.map((image, index) => (
                <button
                  key={image}
                  className={`overflow-hidden border ${index === imageIndex ? "border-[var(--vh-pink)] shadow-[2px_2px_0px_#000000]" : "border-white/10"}`}
                  onClick={() => onImageChange(index)}
                  type="button"
                >
                  <ImageWithFallback alt={`${room.title} ${index + 1}`} className="h-16 w-full object-cover" src={image} />
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 md:p-6 lg:max-h-[92vh] lg:overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-block bg-[var(--vh-pink)] text-white text-[10px] font-black uppercase tracking-[0.14em] px-2.5 py-0.5 font-body">
                  Room Details
                </span>
                <h3 className="mt-3 text-3xl font-bold text-white font-display tracking-tight">{room.title}</h3>
              </div>
              <button
                aria-label="Close"
                className="border border-white/15 bg-[#171822] p-2 text-white/70 hover:border-white hover:text-white shadow-[2px_2px_0px_#000000]"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-white/70 font-body">
              Clean, practical, and comfortable for city stays, with features that make the room work well for both rest and day-to-day use.
            </p>

            <div className="mt-6 border border-white/10 bg-[#171822] p-5 shadow-[3px_3px_0px_#000000]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50 font-body">Availability</p>
              <p className="mt-1 text-base font-extrabold text-[var(--vh-pink)] font-body">{room.inventoryText}</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-1 font-body">
                    <span className="text-3xl font-black text-white">{formatRoomPrice(room)}</span>
                    {!isPriceUnavailable ? <span className="text-xs text-white/50 uppercase font-bold">/ night</span> : null}
                  </div>
                  {room.inventoryState === "limited" && room.availableCount > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 bg-[#EE4D37]/15 border border-[#EE4D37]/40 px-2 py-0.5 text-[10px] font-bold text-[#EE4D37] uppercase font-body">
                      ⚡ Only {room.availableCount} left!
                    </p>
                  )}
                </div>
                {!canBook ? (
                  <div className="flex flex-col items-end gap-1">
                    {isPriceUnavailable ? (
                      <span className="border border-[var(--vh-pink)]/40 bg-[var(--vh-pink)]/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-[var(--vh-pink)] font-body">
                        Price unavailable
                      </span>
                    ) : isAvailabilityPending ? (
                      <span className="border border-[#3F6FD9]/40 bg-[#3F6FD9]/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#3F6FD9] font-body">
                        Select dates
                      </span>
                    ) : (
                      <span className="border border-[#EE4D37]/40 bg-[#EE4D37]/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#EE4D37] font-body">
                        SOLD OUT
                      </span>
                    )}
                  </div>
                ) : count === 0 ? (
                  <NeoPopButton
                    className="font-body font-black uppercase tracking-[0.12em] px-6"
                    onClick={onIncrement}
                    size="default"
                    variant="primary"
                  >
                    Add
                  </NeoPopButton>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Decrement Count"
                      className="flex h-9 w-9 items-center justify-center border border-white/15 bg-[#12131A] text-white shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all font-bold"
                      onClick={onDecrement}
                      type="button"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-base font-black text-white font-body">{count}</span>
                    <button
                      aria-label="Increment Count"
                      className="flex h-9 w-9 items-center justify-center border border-white/15 bg-[#12131A] text-white shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all font-bold disabled:opacity-40"
                      disabled={count >= room.availableCount}
                      onClick={onIncrement}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50 font-body">Room Amenities</p>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {detailItems.map((label, index) => {
                  const Icon = iconForLabel(label);

                  return (
                    <div key={`${label}-${index}`} className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.06em] text-white/80 font-body border border-white/10 bg-[#171822] p-2.5 shadow-[2px_2px_0px_#000000]">
                      <span className="flex h-7 w-7 items-center justify-center border border-white/10 bg-[#12131A] text-[var(--vh-pink)]">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type PropertyProps = {
  propertyId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAvailabilityEnabled?: boolean;
  initialRoomCategories?: RoomCategory[];
  initialRoomError?: string | null;
};

export function Property({
  propertyId,
  initialCheckIn,
  initialCheckOut,
  initialAvailabilityEnabled = false,
  initialRoomCategories = [],
  initialRoomError = null,
}: PropertyProps) {
  const router = useRouter();
  const { isAuthenticated, isRestoringSession, openAuthModal } = useGuestAuth();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({});
  const [activeRoomKey, setActiveRoomKey] = useState<string | null>(null);
  const [activeRoomImageIndex, setActiveRoomImageIndex] = useState(0);
  const [roomCategoryList, setRoomCategoryList] = useState<RoomCategory[]>(initialRoomCategories);
  const [roomError, setRoomError] = useState<string | null>(initialRoomError);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [resolvedPropertyId, setResolvedPropertyId] = useState(propertyId ?? "");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isRefreshingAvailability, setIsRefreshingAvailability] = useState(false);
  const [availabilityRequestedByUser, setAvailabilityRequestedByUser] = useState(initialAvailabilityEnabled);
  const [fetchVersion, setFetchVersion] = useState(0);
  const [selectedEssentials] = useState<Record<string, number>>({});
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const roomResponseCacheRef = useRef<Map<string, CachedRoomPayload>>(new Map());
  const didRestoreSelectionRef = useRef(false);
  const lastRestoreContextRef = useRef<string | null>(null);
  const lastSelectionSignatureRef = useRef<string | null>(null);
  const initialFrom = fromDateString(initialCheckIn);
  const initialTo = fromDateString(initialCheckOut);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = initialFrom ?? getLocalDate(0);
    const toCandidate = initialTo ?? getLocalDate(1);
    const to = toCandidate <= from ? addDays(from, 1) : toCandidate;

    return {
      from,
      to,
    };
  });

  const checkIn = toLocalDateString(dateRange?.from);
  const checkOut = toLocalDateString(dateRange?.to);
  const hasValidDateRange = Boolean(checkIn && checkOut && checkOut > checkIn);
  const showRoomSkeleton = isLoadingCatalog && roomCategoryList.length === 0;
  const activeRoom = roomCategoryList.find((room) => getRoomSelectionKey(room) === activeRoomKey) ?? null;
  const selectedRoomDrafts = useMemo<BookingDraftRoom[]>(
    () =>
      roomCategoryList
        .filter((room) => (selectedCounts[getRoomSelectionKey(room)] ?? 0) > 0)
        .map((room) => ({
          roomTypeId: room.roomTypeId,
          slug: room.slug,
          title: room.title,
          roomType: room.roomType,
          quantity: selectedCounts[getRoomSelectionKey(room)] ?? 0,
          basePrice: room.basePrice,
          totalPrice: room.totalPrice,
          availableCount: room.availableCount,
          guestText: room.guestText,
          image: room.image,
          amenities: [...room.features, ...room.amenitiesLegend],
        })),
    [roomCategoryList, selectedCounts],
  );
  const selectedEssentialDrafts = useMemo(
    () =>
      bookingEssentials
        .map((item) => ({
          id: item.id,
          title: item.title,
          quantity: selectedEssentials[item.id] ?? 0,
          unitPrice: item.price,
        }))
        .filter((item) => item.quantity > 0),
    [selectedEssentials],
  );
  const essentialsTotal = useMemo(
    () => selectedEssentialDrafts.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [selectedEssentialDrafts],
  );

  const applyRoomCategories = useCallback((nextCategories: RoomCategory[], notifyOnAdjustment = false) => {
    setRoomCategoryList(nextCategories);
    const allowed = new Map(
      nextCategories.map((room) => [
        getRoomSelectionKey(room),
        room.hasLiveAvailability && room.inventoryState !== "sold_out" && !hasUnavailableRoomPrice(room)
          ? Math.max(0, room.availableCount)
          : 0,
      ]),
    );
    let shouldNotifyAdjustment = false;
    setSelectedCounts((current) => {
      const nextSelection = Object.fromEntries(
        Object.entries(current)
          .map<[string, number]>(([roomKey, quantity]) => [roomKey, Math.min(quantity, allowed.get(roomKey) ?? 0)])
          .filter((entry): entry is [string, number] => entry[1] > 0),
      );
      const previousUnits = Object.values(current).reduce((sum, value) => sum + value, 0);
      const nextUnits = Object.values(nextSelection).reduce((sum, value) => sum + value, 0);
      shouldNotifyAdjustment = notifyOnAdjustment && previousUnits > nextUnits;
      return nextSelection;
    });

    if (shouldNotifyAdjustment) {
      toast.warning("Selection updated", {
        description: "Some rooms were adjusted to match current live availability.",
      });
    }
  }, []);

  const fetchRoomsPayload = useCallback(async (params: {
    checkin?: string;
    checkout?: string;
    signal?: AbortSignal;
  }): Promise<RoomApiPayload> => {
    const cacheKey = roomCacheKey({
      propertyId: resolvedPropertyId,
      checkin: params.checkin,
      checkout: params.checkout,
    });
    const now = Date.now();
    const cached = roomResponseCacheRef.current.get(cacheKey);
    const isAvailabilityRequest = Boolean(params.checkin && params.checkout);

    if (cached && cached.expiresAt > now) {
      const cachedSource = readAvailabilitySource(cached.payload);
      if (!(isAvailabilityRequest && cachedSource === "local_db_estimate")) {
        return cached.payload;
      }

      roomResponseCacheRef.current.delete(cacheKey);
    }

    const safePayload = await loadCxRooms({
      propertyId: resolvedPropertyId,
      checkin: params.checkin,
      checkout: params.checkout,
      signal: params.signal,
    });
    const availabilitySource = readAvailabilitySource(safePayload);
    const shouldCache = !isAvailabilityRequest || availabilitySource !== "local_db_estimate";

    if (shouldCache) {
      const ttl = isAvailabilityRequest ? AVAILABILITY_CACHE_TTL_MS : CATALOG_CACHE_TTL_MS;

      roomResponseCacheRef.current.set(cacheKey, {
        payload: safePayload,
        expiresAt: now + ttl,
      });
    } else {
      roomResponseCacheRef.current.delete(cacheKey);
    }

    return safePayload;
  }, [resolvedPropertyId]);

  const retryRooms = useCallback(() => {
    roomResponseCacheRef.current.clear();
    setFetchVersion((current) => current + 1);
  }, []);

  const updateCount = (roomKey: string, nextValue: number) => {
    const room = roomCategoryList.find((item) => getRoomSelectionKey(item) === roomKey);
    const isBookable = room?.hasLiveAvailability && room.inventoryState !== "sold_out" && !hasUnavailableRoomPrice(room);
    const maxCount = isBookable ? Math.max(0, room?.availableCount ?? 0) : 0;

    setSelectedCounts((current) => ({
      ...current,
      [roomKey]: Math.min(maxCount, Math.max(0, nextValue)),
    }));
  };

  const handleRangeChange = (nextValue: DateRange | undefined, selectedDay?: Date) => {
    setDateRange((current) => {
      const resolvedRange = resolveNextRange(current, nextValue, selectedDay);
      if (!resolvedRange?.from) {
        return current;
      }

      if (resolvedRange.to && resolvedRange.to > resolvedRange.from) {
        setAvailabilityRequestedByUser(true);
      }

      if (resolvedRange.to && resolvedRange.to <= resolvedRange.from) {
        setAvailabilityRequestedByUser(true);
        return {
          from: resolvedRange.from,
          to: addDays(resolvedRange.from, 1),
        };
      }

      return resolvedRange;
    });
  };

  // NOTE: We intentionally do NOT auto-elevate availabilityRequestedByUser on mount.
  // Per BE handoff (be-response-booking-engine-2026-04-23.md Bug #3):
  //   - On mount: call only /guest/booking/rooms (catalog, no dates) to show "Starting from ₹X"
  //   - Only call /availability after the user explicitly confirms a valid date range via the calendar
  // The SSR page (app/property/page.tsx) already handles the case where URL params include
  // valid dates — in that case initialAvailabilityEnabled=true is passed and the availability
  // fetch fires correctly. The auto-elevate was causing a spurious availability call on direct nav.

  useEffect(() => {
    if (availabilityRequestedByUser && hasValidDateRange) {
      return;
    }

    let mounted = true;
    const controller = new AbortController();

    async function loadCatalog() {
      setIsLoadingCatalog(true);
      setRoomError(null);

      try {
        const payload = await fetchRoomsPayload({ signal: controller.signal });

        if (!mounted) {
          return;
        }

        const nextError = readAvailabilityError(payload);
        const nextCategories = readCategories(payload);
        const nextPropertyId = typeof payload.property_id === "string" ? payload.property_id.trim() : "";
        if (nextPropertyId && nextPropertyId !== resolvedPropertyId) {
          setResolvedPropertyId(nextPropertyId);
        }

        setRoomError(nextError);
        applyRoomCategories(nextCategories);
      } catch (error) {
        if (!mounted || controller.signal.aborted) {
          return;
        }

        setRoomError(error instanceof Error ? error.message : "Unable to load rooms right now.");
        applyRoomCategories([]);
      } finally {
        if (mounted) {
          setIsLoadingCatalog(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [
    applyRoomCategories,
    availabilityRequestedByUser,
    fetchRoomsPayload,
    fetchVersion,
    hasValidDateRange,
    resolvedPropertyId,
  ]);

  useEffect(() => {
    if (!availabilityRequestedByUser || !hasValidDateRange) {
      return;
    }

    let mounted = true;
    const controller = new AbortController();

    async function loadAvailability() {
      setIsRefreshingAvailability(true);
      setRoomError(null);

      try {
        const payload = await fetchRoomsPayload({
          checkin: checkIn,
          checkout: checkOut,
          signal: controller.signal,
        });

        if (!mounted) {
          return;
        }

        const nextError = readAvailabilityError(payload);
        const nextCategories = readCategories(payload);
        const nextPropertyId = typeof payload.property_id === "string" ? payload.property_id.trim() : "";
        if (nextPropertyId && nextPropertyId !== resolvedPropertyId) {
          setResolvedPropertyId(nextPropertyId);
        }

        setRoomError(nextError);
        applyRoomCategories(nextCategories);
        // Note: local_db_estimate is handled silently — no banner shown.
      } catch (error) {
        if (!mounted || controller.signal.aborted) {
          return;
        }
        setRoomError(error instanceof Error ? error.message : "Unable to load live availability right now.");
        applyRoomCategories([]);
      } finally {
        if (mounted) {
          setIsRefreshingAvailability(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [
    availabilityRequestedByUser,
    applyRoomCategories,
    checkIn,
    checkOut,
    fetchRoomsPayload,
    fetchVersion,
    hasValidDateRange,
    resolvedPropertyId,
  ]);

  useEffect(() => {
    syncAvailabilityQueryParams({
      enabled: availabilityRequestedByUser,
      propertyId: resolvedPropertyId,
      checkin: checkIn,
      checkout: checkOut,
    });
  }, [availabilityRequestedByUser, checkIn, checkOut, resolvedPropertyId]);

  useEffect(() => {
    if (!resolvedPropertyId || !checkIn || !checkOut) {
      return;
    }

    const contextKey = `${resolvedPropertyId}`;
    if (lastRestoreContextRef.current === contextKey) {
      return;
    }
    lastRestoreContextRef.current = contextKey;

    // Restore room selections for the same property, regardless of date changes
    const stored = getPropertySelection("nightly");
    if (!stored || stored.propertyId !== resolvedPropertyId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      // Always restore room selections when returning to the same property
      setSelectedCounts(stored.selectedCounts);
      setIsAgeConfirmed(stored.isAgeConfirmed);
      didRestoreSelectionRef.current = true;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [resolvedPropertyId, checkIn, checkOut]);

  useEffect(() => {
    if (!didRestoreSelectionRef.current || roomCategoryList.length === 0) {
      return;
    }
    didRestoreSelectionRef.current = false;
    applyRoomCategories(roomCategoryList, true);
  }, [applyRoomCategories, roomCategoryList]);

  useEffect(() => {
    if (!resolvedPropertyId || !checkIn || !checkOut) {
      return;
    }

    const signature = buildSelectionSignature({
      source: "nightly",
      propertyId: resolvedPropertyId,
      checkin: checkIn,
      checkout: checkOut,
      selectedCounts,
    });
    const persistenceSignature = `${signature}::${isAgeConfirmed ? "1" : "0"}`;
    if (lastSelectionSignatureRef.current === persistenceSignature) {
      return;
    }
    lastSelectionSignatureRef.current = persistenceSignature;

    const saveTimer = window.setTimeout(() => {
      savePropertySelection({
        source: "nightly",
        propertyId: resolvedPropertyId,
        checkin: checkIn,
        checkout: checkOut,
        selectedCounts,
        isAgeConfirmed,
        signature,
      });
    }, 150);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [resolvedPropertyId, checkIn, checkOut, selectedCounts, isAgeConfirmed]);

  // Sync error state: keep it simple — no user-visible banners for availability errors.
  // The loading standard says: skeletons only, no text-based loading/error states.

  useEffect(() => {
    if (!isAuthenticated || !resolvedPropertyId || !checkIn || !checkOut || selectedRoomDrafts.length === 0) {
      return;
    }

    const intent = consumeReviewResumeIntent("nightly");
    if (
      !intent ||
      intent.propertyId !== resolvedPropertyId ||
      intent.checkin !== checkIn ||
      intent.checkout !== checkOut
    ) {
      return;
    }

    const signature = buildSelectionSignature({
      source: "nightly",
      propertyId: resolvedPropertyId,
      checkin: checkIn,
      checkout: checkOut,
      selectedCounts,
    });
    if (intent.signature !== signature) {
      return;
    }

    router.push("/bookingreview");
  }, [isAuthenticated, resolvedPropertyId, checkIn, checkOut, selectedRoomDrafts.length, selectedCounts, router]);

  const openRoomPopup = (roomKey: string) => {
    setActiveRoomKey(roomKey);
    setActiveRoomImageIndex(0);
  };

  const continueToCheckout = () => {
    setContinueError(null);
    if (!resolvedPropertyId) {
      setContinueError("Property context is missing. Refresh and try again.");
      return;
    }


    if (!hasValidDateRange || !checkIn || !checkOut || selectedRoomDrafts.length === 0) {
      setContinueError("Pick your dates and rooms to continue.");
      return;
    }



    const hasInvalidSelection = selectedRoomDrafts.some((draftRoom) => {
      const room = roomCategoryList.find((item) => item.roomTypeId === draftRoom.roomTypeId || item.slug === draftRoom.slug);
      return !room || !room.hasLiveAvailability || room.inventoryState === "sold_out" || hasUnavailableRoomPrice(room);
    });

    if (hasInvalidSelection) {
      setContinueError("Please review your room selection and try again.");
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

    const signature = buildBookingSignature({
      propertyId: resolvedPropertyId,
      checkinDate: checkIn,
      checkoutDate: checkOut,
      rooms: selectedRoomDrafts.map((room) => ({
        roomTypeId: room.roomTypeId,
        quantity: room.quantity,
      })),
      addons: [],
    });

    saveBookingDraft({
      propertyId: resolvedPropertyId,
      checkinDate: checkIn,
      checkoutDate: checkOut,
      rooms: selectedRoomDrafts,
      addons: [],
      signature,
      createdAt: Date.now(),
    });

    if (!isAuthenticated) {
      saveReviewResumeIntent({
        source: "nightly",
        propertyId: resolvedPropertyId,
        checkin: checkIn,
        checkout: checkOut,
        signature: buildSelectionSignature({
          source: "nightly",
          propertyId: resolvedPropertyId,
          checkin: checkIn,
          checkout: checkOut,
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

  return (
    <>
      <section className="bg-[#0A0A0E] pt-28 md:pt-36 pb-12 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--vh-pink)] mb-3 font-body flex items-center justify-center gap-1.5">
              <span>◉</span> THE FLAGSHIP HOSTEL
            </p>
            <h1 className="leading-tight">
              <span className="font-display font-bold text-4xl md:text-6xl lg:text-7xl text-white tracking-tight">
                VIBEHOUSE
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-[760px] text-sm md:text-base leading-relaxed text-white/70 font-body">
              {propertyHero.blurb}
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="overflow-hidden border border-white/15 shadow-[4px_4px_0px_#000000]">
                <ImageWithFallback
                  alt={propertyGallery[0].alt}
                  className="h-[340px] w-full object-cover md:h-[480px]"
                  src={propertyGallery[0].src}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:col-span-5">
              {propertyGallery.slice(1).map((image) => (
                <div key={image.src} className="overflow-hidden border border-white/15 shadow-[3px_3px_0px_#000000]">
                  <ImageWithFallback alt={image.alt} className="h-[164px] w-full object-cover md:h-[234px]" src={image.src} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0A0A0E] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 pb-4 md:space-y-16 lg:pb-0">
            <section id="about" className="scroll-mt-28">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start border border-white/15 bg-[#171822] p-6 md:p-8 shadow-[4px_4px_0px_#000000]">
                <div>
                  <SectionTitle title="About" />
                  <p className={`mt-3 text-sm leading-relaxed text-white/75 font-body ${aboutExpanded ? "" : "line-clamp-2"}`}>
                    {propertyAboutText}
                  </p>
                  <button
                    className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--vh-pink)] hover:underline font-body"
                    onClick={() => setAboutExpanded((value) => !value)}
                    type="button"
                  >
                    {aboutExpanded ? "View Less" : "View More"}
                  </button>
                </div>
                <div className="hidden lg:block lg:sticky lg:top-28">
                  <NeoPopButton asChild className="w-full font-body font-black uppercase tracking-[0.12em]" size="lg" variant="primary">
                    <Link href="#availability">View rooms</Link>
                  </NeoPopButton>
                </div>
              </div>
            </section>

            <section id="amenities">
              <div>
                <SectionTitle title="Amenities" />
                <p className="mt-2 max-w-[640px] text-sm text-white/70 font-body">
                  The good stuff that keeps the stay easy, social, and very hard to complain about.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {propertyAmenities.map((amenity, index) => {
                  const Icon = amenityIcons[amenity.icon as keyof typeof amenityIcons] ?? ShieldCheck;

                  return (
                    <div key={`${amenity.label}-${index}`} className="border border-white/10 bg-[#171822] p-4 text-center shadow-[2px_2px_0px_#000000] hover:border-[var(--vh-pink)] transition-all">
                      <span className="inline-flex h-10 w-10 items-center justify-center text-[var(--vh-pink)]">
                        <Icon className="h-6 w-6" />
                      </span>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-white/90 font-body">{amenity.label}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section id="availability" className="scroll-mt-28">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-center lg:text-left">
                      <SectionTitle className="text-left" title="Availability" />
                      <p className="mx-auto mt-2 max-w-[640px] text-sm leading-6 text-slate-300 lg:mx-0">
                        Pick your perch for tonight. We&apos;ll keep the vibe ready.
                      </p>
                    </div>
                    <div className="w-full max-w-[420px] md:w-fit md:min-w-[336px]">
                      <DateRangePicker align="left" dateRange={dateRange} onSelect={handleRangeChange} />
                    </div>
                  </div>
                {/* Skeleton overlay while refreshing availability — no banners, no loading text */}
                {/* sr-only accessibility announcement for live region */}
                <span aria-live="polite" className="sr-only" role="status">
                  {isRefreshingAvailability ? "Refreshing live availability." : ""}
                </span>
                <div className="space-y-5">
                {showRoomSkeleton || (isRefreshingAvailability && roomCategoryList.length === 0) ? (
                  <>
                    <RoomCardSkeleton />
                    <RoomCardSkeleton />
                  </>
                ) : roomError ? (
                  <div className="rounded-[20px] border border-dashed border-white/18 bg-white/5 p-6 text-center">
                    <p className="mt-1 text-base font-semibold text-white">Rooms did not load</p>
                    <p className="mt-2 text-sm text-white/75">{roomError}</p>
                    <Button className="vh-cta-button mt-5" onClick={retryRooms} type="button">
                      Retry rooms
                    </Button>
                  </div>
                ) : roomCategoryList.length === 0 ? (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 text-center">
                    <Image
                      alt="No room availability"
                      className="mx-auto h-56 w-56 object-contain"
                      height={224}
                      src={encodeURI("/design-guidelines/Property Page/hospital-reception.svg")}
                      width={224}
                    />
                    <p className="mt-4 text-base font-semibold text-white">No room types are currently available for this property.</p>
                    <p className="mt-2 text-sm text-white/75">Please retry or contact support at hello@vibehouse.co.</p>
                  </div>
                ) : (
                  roomCategoryList.map((room) => {
                    const roomKey = getRoomSelectionKey(room);
                    const count = selectedCounts[roomKey] ?? 0;
                    const featureLabels = Array.from(new Set([...room.features, ...room.amenitiesLegend]));
                    const roomGallery = getRoomGallery(room);
                    const isSoldOut = room.inventoryState === "sold_out";
                    const isLimited = room.inventoryState === "limited";
                    const isAvailabilityPending = !room.hasLiveAvailability || room.inventoryState === "unknown";
                    const isPriceUnavailable = hasUnavailableRoomPrice(room);
                    const canBook = room.hasLiveAvailability && !isSoldOut && !isPriceUnavailable;

                    return (
                      <article
                        key={roomKey}
                        className="border border-white/15 bg-[#171822] shadow-[4px_4px_0px_#000000] transition-all hover:border-[var(--vh-pink)]"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_200px]">
                          <div className="border-b border-white/10 lg:border-b-0 lg:border-r">
                            <button className="group block w-full text-left" onClick={() => openRoomPopup(roomKey)} type="button">
                              <ImageWithFallback
                                alt={room.title}
                                className="h-[180px] w-full object-cover transition duration-300 group-hover:scale-[1.02] lg:h-[180px]"
                                src={roomGallery[0] ?? room.image}
                              />
                            </button>
                            <div className="grid grid-cols-3 gap-1 p-1.5 bg-[#12131A] border-t border-white/10">
                              {roomGallery.slice(0, 3).map((galleryImage, index) => (
                                <button
                                  key={`${roomKey}-thumb-${index}`}
                                  className="overflow-hidden border border-white/10 hover:border-[var(--vh-pink)]"
                                  onClick={() => {
                                    openRoomPopup(roomKey);
                                    setActiveRoomImageIndex(index);
                                  }}
                                  type="button"
                                >
                                  <ImageWithFallback alt={`${room.title} ${index + 1}`} className="h-14 w-full object-cover" src={galleryImage} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3 p-5 font-body">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <button className="text-left" onClick={() => openRoomPopup(roomKey)} type="button">
                                <h3 className="text-xl font-extrabold uppercase tracking-[0.06em] text-white hover:text-[var(--vh-pink)] transition-colors">
                                  {room.title}
                                </h3>
                              </button>
                            </div>

                            <p className="text-xs leading-relaxed text-white/70">
                              Designed for practical, easy stays with the essentials that matter most for sleep, work, and daily comfort.
                            </p>

                            <div className="flex flex-wrap gap-1.5">
                              {featureLabels.map((label, index) => (
                                <span
                                  key={`${label}-${index}`}
                                  className="inline-flex items-center border border-white/10 bg-[#12131A] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/80"
                                  title={label}
                                >
                                  {label}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center justify-between gap-4 pt-1">
                              {isSoldOut ? (
                                <span className="inline-flex items-center gap-1.5 border border-[#EE4D37]/40 bg-[#EE4D37]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[#EE4D37]">
                                  Sold out for selected dates
                                </span>
                              ) : isPriceUnavailable ? (
                                <span className="inline-flex items-center gap-1.5 border border-[var(--vh-pink)]/40 bg-[var(--vh-pink)]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[var(--vh-pink)]">
                                  Price unavailable. Retry shortly.
                                </span>
                              ) : isAvailabilityPending ? (
                                <span className="inline-flex items-center gap-1.5 border border-[#3F6FD9]/40 bg-[#3F6FD9]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[#3F6FD9]">
                                  Select dates to view live availability
                                </span>
                              ) : isLimited ? (
                                <span className="inline-flex items-center gap-1.5 border border-[#EE4D37]/40 bg-[#EE4D37]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[#EE4D37]">
                                  ⚡ Only {room.availableCount} {room.availableCount === 1 ? "bed" : "beds"} left
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 border border-[#3BFFAD]/40 bg-[#3BFFAD]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[#3BFFAD]">
                                  ● {room.inventoryText}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col justify-between border-t border-[#3D3D3D] p-5 lg:border-l lg:border-t-0 font-body">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                                {room.hasLiveAvailability ? "Live price / night" : "From / night"}
                              </p>
                              <p className="mt-1 text-3xl font-black text-white">{formatRoomPrice(room)}</p>
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-2">
                              {!canBook ? (
                                <button
                                  className="w-full border border-[#3D3D3D] bg-[#222222] py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white/40 cursor-not-allowed"
                                  disabled
                                  type="button"
                                >
                                  {isSoldOut ? "Sold out" : isPriceUnavailable ? "Unavailable" : "Check dates"}
                                </button>
                              ) : count === 0 ? (
                                <NeoPopButton
                                  className="w-full font-body font-black uppercase tracking-[0.12em]"
                                  onClick={() => updateCount(roomKey, 1)}
                                  size="sm"
                                  variant="primary"
                                >
                                  Add
                                </NeoPopButton>
                              ) : (
                                <div className="ml-auto flex items-center gap-2">
                                  <button
                                    aria-label="Decrement Count"
                                    className="flex h-9 w-9 items-center justify-center border border-[#3D3D3D] bg-[#121212] text-white shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all font-bold"
                                    onClick={() => updateCount(roomKey, count - 1)}
                                    type="button"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-black text-white">{count}</span>
                                  <button
                                    aria-label="Increment Count"
                                    className="flex h-9 w-9 items-center justify-center border border-[#3D3D3D] bg-[#121212] text-white shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition-all font-bold disabled:opacity-40"
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
                  })
                )}
                </div>

                </div>
                <DesktopBookingSummary
                  checkIn={checkIn}
                  checkOut={checkOut}
                  continueError={continueError}
                  essentials={selectedEssentialDrafts}
                  essentialsTotal={essentialsTotal}
                  isAgeConfirmed={isAgeConfirmed}
                  isContinuing={isContinuing}
                  onContinue={continueToCheckout}
                  onAgeConfirmChange={setIsAgeConfirmed}
                  selectedCounts={selectedCounts}
                  roomCategoryList={roomCategoryList}
                />
              </div>
            </section>

            <BuildYourStaySection />

            <section id="guidelines">
              <SectionTitle title="Guidelines" />
              <div className="mt-6 max-w-4xl">
                <div className="mb-4 flex flex-wrap justify-between gap-x-4 gap-y-2 border border-white/15 bg-[#171822] p-4 text-white font-body shadow-[2px_2px_0px_#000000]">
                  <div className="flex min-w-[180px] items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-[var(--vh-pink)]" />
                    <span className="text-xs uppercase tracking-[0.06em]">
                      Check in:
                      <strong className="ml-1 text-white font-black">{propertyGuidelines.checkIn}</strong>
                    </span>
                  </div>
                  <div className="flex min-w-[180px] items-center gap-3">
                    <Clock3 className="h-5 w-5 text-[var(--vh-pink)]" />
                    <span className="text-xs uppercase tracking-[0.06em]">
                      Check out:
                      <strong className="ml-1 text-white font-black">{propertyGuidelines.checkOut}</strong>
                    </span>
                  </div>
                </div>

                <Accordion className="space-y-2" defaultValue={["general-guidelines"]} type="multiple">
                  <AccordionItem className="border border-white/10 bg-[#171822] px-4 shadow-[2px_2px_0px_#000000] font-body" value="general-guidelines">
                    <AccordionTrigger className="text-sm font-extrabold uppercase tracking-[0.06em] text-white">General guidelines</AccordionTrigger>
                    <AccordionContent className="space-y-2 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/70 font-body">
                      {propertyGuidelines.summary.map((item) => (
                        <p key={item}>● {item}</p>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  {propertyGuidelines.sections.map((section, index) => (
                    <AccordionItem
                      key={section.title}
                      className="border border-white/10 bg-[#171822] px-4 shadow-[2px_2px_0px_#000000] font-body"
                      value={`guideline-${index}`}
                    >
                      <AccordionTrigger className="text-sm font-extrabold uppercase tracking-[0.06em] text-white">{section.title}</AccordionTrigger>
                      <AccordionContent className="space-y-2 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/70 font-body">
                        {section.content.map((item) => (
                          <p key={item}>● {item}</p>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>

            <section id="faq">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                <div>
                  <SectionTitle title="Frequently Asked Questions" />
                  <Accordion className="mt-6 space-y-3" defaultValue={["faq-0"]} type="multiple">
                    {roomFaqs.map((faq, index) => (
                      <AccordionItem
                        key={faq.question}
                        className="border border-white/10 bg-[#171822] px-4 shadow-[2px_2px_0px_#000000] font-body"
                        value={`faq-${index}`}
                      >
                        <AccordionTrigger className="text-sm font-extrabold uppercase tracking-[0.06em] text-white">{faq.question}</AccordionTrigger>
                        <AccordionContent className="border-t border-white/10 pt-4 text-xs leading-relaxed text-white/70 font-body">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <div className="space-y-6">
                  <section>
                    <SectionTitle title="Location" />
                    <div className="mt-6 overflow-hidden border border-white/15 shadow-[4px_4px_0px_#000000]">
                      <iframe
                        className="h-[300px] w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={locationMap.embedUrl}
                        title={locationMap.title}
                      />
                    </div>
                    <Link
                      className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--vh-pink)] hover:underline font-body"
                      href={propertyHero.mapsHref}
                      target="_blank"
                    >
                      Open in Maps
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </section>

                  <section>
                    <SectionTitle title="Nearby" />
                    <div className="mt-6 space-y-3 border border-white/15 bg-[#171822] p-5 shadow-[3px_3px_0px_#000000]">
                      {nearbyAttractions.map((place) => (
                        <div key={place.name} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0 font-body">
                          <div>
                            <p className="font-extrabold uppercase tracking-[0.04em] text-white text-xs">{place.name}</p>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">{place.type}</p>
                          </div>
                          <span className="border border-white/10 bg-[#12131A] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--vh-pink)]">
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

      <MobileStickySummary
        checkIn={checkIn}
        checkOut={checkOut}
        continueError={continueError}
        essentials={selectedEssentialDrafts}
        essentialsTotal={essentialsTotal}
        isAgeConfirmed={isAgeConfirmed}
        isContinuing={isContinuing}
        onContinue={continueToCheckout}
        onAgeConfirmChange={setIsAgeConfirmed}
        selectedCounts={selectedCounts}
        roomCategoryList={roomCategoryList}
      />
      <RoomDetailsPopup
        count={activeRoom ? selectedCounts[getRoomSelectionKey(activeRoom)] ?? 0 : 0}
        imageIndex={activeRoomImageIndex}
        onClose={() => setActiveRoomKey(null)}
        onDecrement={() => activeRoom && updateCount(getRoomSelectionKey(activeRoom), (selectedCounts[getRoomSelectionKey(activeRoom)] ?? 0) - 1)}
        onImageChange={setActiveRoomImageIndex}
        onIncrement={() => activeRoom && updateCount(getRoomSelectionKey(activeRoom), (selectedCounts[getRoomSelectionKey(activeRoom)] ?? 0) + 1)}
        room={activeRoom}
      />
    </>
  );
}
