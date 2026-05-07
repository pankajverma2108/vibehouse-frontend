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
  roomCategories,
  roomFaqs,
} from "@/content/rooms";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { FadeIn } from "@/components/shared/motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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

type RoomApiPayload = {
  categories?: unknown;
  property_id?: unknown;
  mode?: unknown;
  availability_source?: unknown;
  has_live_availability?: unknown;
  availability_error?: unknown;
  message?: unknown;
};

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

function parseRoomsApiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : fallback;
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
  return <h2 className={`vh-title text-center text-[26px] leading-[1.12] text-white lg:text-left md:text-[30px] ${className}`}>{title}</h2>;
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
          className="flex w-full items-center justify-center gap-3 rounded-full border border-[var(--vh-pink)] bg-[#10111a] px-4 py-3 text-center text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)] md:w-auto"
          type="button"
        >
          <div className="inline-flex min-w-0 items-center gap-3">
            <span className="inline-flex items-center justify-center text-[var(--vh-cyan)]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold md:text-lg">
              {formatDisplayDate(toLocalDateString(dateRange?.from))}
            </span>
            <span aria-hidden="true">&#8594;</span>
            <span className="text-base font-semibold md:text-lg">
              {formatDisplayDate(toLocalDateString(dateRange?.to))}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-white/70 ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align === "left" ? "start" : "end"}
        className={cn(
          "z-[200] w-fit border-white/12 bg-[#10111a] p-2",
          isDesktopCalendar ? "max-w-[min(100vw-1rem,860px)]" : "max-w-[min(100vw-1rem,420px)]",
        )}
      >
        <Calendar
          className="vh-calendar-dark vh-calendar-balanced rounded-[20px]"
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
  essentials,
  essentialsTotal,
  isAgeConfirmed,
  onAgeConfirmChange,
  selectedCounts,
  roomCategoryList,
  onContinue,
}: {
  checkIn: string;
  checkOut: string;
  essentials: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
  essentialsTotal: number;
  isAgeConfirmed: boolean;
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
      <div className="rounded-[26px] border border-white/12 bg-[var(--vh-panel-strong)] p-5 shadow-[var(--vh-shadow-lg)] lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <h2 className="vh-title text-3xl text-white">{bookingSummary.title}</h2>

        <div className="mt-5 rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 text-white">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">Check In</p>
              <p className="mt-1 text-sm font-semibold">{formatDisplayDate(checkIn)}</p>
            </div>
            <div className="rounded-full bg-[var(--vh-amber)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-900">
              {nights} {nights === 1 ? "Night" : "Nights"}
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">Check Out</p>
              <p className="mt-1 text-sm font-semibold">{formatDisplayDate(checkOut)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm text-white/82">
          {hasSelection ? (
            selectedRooms.map((room) => (
              <div key={getRoomSelectionKey(room)} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{room.title}</p>
                  <p className="text-xs text-white/55">
                    Rs. {formatINRPlain(room.basePrice)} x {selectedCounts[getRoomSelectionKey(room)]} x {nights} {nights === 1 ? "night" : "nights"}
                  </p>
                </div>
                <p className="font-semibold text-white">
                  Rs. {formatINRPlain(room.basePrice * (selectedCounts[getRoomSelectionKey(room)] ?? 0) * nights)}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-[16px] border border-dashed border-white/12 bg-white/5 px-3 py-3 text-center text-sm font-semibold text-white/76">
              Add room(s) to see booking totals.
            </p>
          )}

          {essentials.filter((item) => item.quantity > 0).map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 border-t border-white/10 pt-3">
              <div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="text-xs text-white/55">
                  Rs. {formatINRPlain(item.unitPrice)} x {item.quantity}
                </p>
              </div>
              <p className="font-semibold text-white">Rs. {formatINRPlain(item.unitPrice * item.quantity)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-white/10 pt-4 text-sm text-white/82">
          <div className="flex items-center justify-between">
            <p>Total room charges</p>
            <p className="font-semibold text-white">Rs. {formatINRPlain(roomTotal)}</p>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p>Add-on charges</p>
            <p className="font-semibold text-white">Rs. {formatINRPlain(essentialsTotal)}</p>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="group relative inline-flex items-center gap-1">
              Total taxes
              <button
                aria-label="View tax breakdown"
                className="inline-flex items-center text-white/75 hover:text-white"
                type="button"
              >
                <Info className="h-3 w-3" />
              </button>
              <span className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-20 hidden min-w-[180px] rounded-md border border-white/15 bg-[#10111a] px-2.5 py-2 text-[11px] leading-4 text-white/85 shadow-[0_10px_28px_rgba(0,0,0,0.35)] group-hover:block">
                <span className="block">Room tax - {formatINRPlain(roomTaxExact)}</span>
                <span className="mt-1 block">Add-on tax - {formatINRPlain(addonTaxExact)}</span>
              </span>
            </p>
            <p className="font-semibold text-white">Rs. {formatINRPlain(taxes)}</p>
          </div>
          <div className="mt-3 flex items-center justify-between text-base">
            <p className="font-semibold text-white">Total price</p>
            <p className="font-bold text-[var(--vh-amber)]">Rs. {formatINRPlain(grandTotal)}</p>
          </div>
        </div>

        <div className="my-4 flex items-start">
          <input
            checked={isAgeConfirmed}
            className="mt-1 h-10 w-10 cursor-pointer rounded border-gray-300 bg-gray-100 p-2 text-blue-600 align-top focus:ring-blue-500"
            id="checked-checkbox-desktop"
            onChange={(event) => onAgeConfirmChange(event.target.checked)}
            type="checkbox"
          />
          <span className="cursor-pointer select-none px-2 text-sm font-poppins text-[#ffffff]">
            Yes, I confirm <span className="font-bold">all the guests are above 18 year old</span> and I acknowledge and accept the{" "}
            <Link className="text-blue-400" href="/policies/">
              Terms of Booking Conditions, Cancellation Policy &amp; Property Policy.
            </Link>
          </span>
        </div>

        <Button className="vh-cta-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-55" disabled={!isAgeConfirmed || !hasSelection} onClick={onContinue} type="button">
          Review Booking
        </Button>
      </div>
    </aside>
  );
}

function MobileStickySummary({
  checkIn,
  checkOut,
  essentials,
  essentialsTotal,
  isAgeConfirmed,
  onAgeConfirmChange,
  selectedCounts,
  roomCategoryList,
  onContinue,
}: {
  checkIn: string;
  checkOut: string;
  essentials: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
  essentialsTotal: number;
  isAgeConfirmed: boolean;
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
    <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
      <div className="overflow-hidden rounded-[22px] border border-white/12 bg-[var(--vh-panel-strong)] shadow-[var(--vh-shadow-lg)] backdrop-blur-xl">
        {open && hasSelection ? (
          <div className="animate-vh-fade-in border-b border-white/10 px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-white">Booking Summary</p>
              <button
                aria-label="Hide Summary"
                className="rounded-full border border-white/12 p-2 text-white/72"
                onClick={() => setOpen(false)}
                type="button"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-white/58">
              {nights} {nights === 1 ? "night" : "nights"} starting from {formatDisplayDate(checkIn)}
            </p>

            <div className="mt-3 max-h-[34vh] space-y-3 overflow-y-auto pr-1 text-sm text-white/84">
              {selectedRooms.map((room) => (
                <div key={getRoomSelectionKey(room)} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {room.title} x {selectedCounts[getRoomSelectionKey(room)]}
                    </p>
                    <p className="text-xs text-white/58">Rs. {formatINRPlain(room.basePrice)} / night</p>
                  </div>
                  <p className="font-semibold text-white">Rs. {formatINRPlain(room.basePrice * (selectedCounts[getRoomSelectionKey(room)] ?? 0) * nights)}</p>
                </div>
              ))}

              {selectedEssentials.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 border-t border-white/10 pt-3">
                  <div>
                    <p className="font-semibold text-white">
                      {item.title} x {item.quantity}
                    </p>
                    <p className="text-xs text-white/58">Rs. {formatINRPlain(item.unitPrice)} each</p>
                  </div>
                  <p className="font-semibold text-white">Rs. {formatINRPlain(item.unitPrice * item.quantity)}</p>
                </div>
              ))}

              <div className="border-t border-dashed border-white/15 pt-3">
                <div className="flex items-center justify-between">
                  <p>Add-ons</p>
                  <p>Rs. {formatINRPlain(essentialsTotal)}</p>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p>Total taxes</p>
                  <p>Rs. {formatINRPlain(taxes)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between font-semibold text-white">
                  <p>Total price</p>
                  <p>Rs. {formatINRPlain(grandTotal)}</p>
                </div>
              </div>

              <div className="flex items-start pt-2">
                <input
                  checked={isAgeConfirmed}
                  className="mt-1 h-8 w-8 cursor-pointer rounded border-gray-300 bg-gray-100 p-1 text-blue-600 align-top focus:ring-blue-500"
                  id="checked-checkbox-mobile"
                  onChange={(event) => onAgeConfirmChange(event.target.checked)}
                  type="checkbox"
                />
                <span className="cursor-pointer select-none px-2 text-xs text-white/88">
                  Yes, I confirm <span className="font-bold">all guests are above 18 years old</span> and accept{" "}
                  <Link className="text-blue-400" href="/policies/">
                    booking terms and policies.
                  </Link>
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-2xl font-semibold text-white">
              {showUnavailablePricePreview ? "Price unavailable" : `₹${formatINRPlain(displayAmount)}`}
            </p>
            <button
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#46B2FF]"
              disabled={!hasSelection}
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              Price breakup
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button className="vh-cta-button h-10 min-w-[128px] px-3 py-2 text-xs sm:px-4 sm:text-sm disabled:cursor-not-allowed disabled:opacity-55" disabled={!hasSelection} onClick={onContinue} type="button">
            Review Booking
          </Button>
        </div>
      </div>
    </div>
  );
}

function BuildYourStaySection() {
  const toneStyles = {
    pink: { accent: "#c62828", sticker: "#FEF08A", text: "#0f172a" },
    blue: { accent: "#00d1ff", sticker: "#00d1ff", text: "#0f172a" },
    green: { accent: "#39ff14", sticker: "#39ff14", text: "#0f172a" },
  } as const;

  return (
    <section id="build-your-stay" className="scroll-mt-28">
      <SectionTitle title={homePageContent.upsellTitle} />
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {upsellBentoItems.map((item, index) => {
          const tone = toneStyles[item.tone];

          return (
            <div
              key={item.id}
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
                <h3 className="text-lg font-bold uppercase text-white font-['Geologica']">{item.title}</h3>
              </div>

              <p className="text-sm leading-6 text-white/80">{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RoomCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.03)]">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_188px]">
        {/* Image skeleton */}
        <Skeleton className="h-[220px] w-full lg:h-full" />
        
        {/* Content skeleton */}
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-14 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        
        {/* Price skeleton */}
        <div className="flex flex-col justify-between border-t border-white/10 p-5 lg:border-l lg:border-t-0">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="mt-5 h-10 w-full rounded-full" />
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
      className="animate-vh-fade-in fixed inset-0 z-[80] overflow-y-auto bg-[rgba(5,8,14,0.78)] px-3 py-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-start justify-center lg:items-center">
        <div
          className="animate-vh-scale-in grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/12 bg-[var(--vh-panel-strong)] shadow-[var(--vh-shadow-lg)] lg:max-h-[92vh] lg:grid-cols-[1.2fr_0.8fr]"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r lg:p-6">
            <div className="overflow-hidden rounded-[22px]">
              <ImageWithFallback alt={room.title} className="h-[220px] w-full object-cover sm:h-[300px] md:h-[420px]" src={activeImage} />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {gallery.map((image, index) => (
                <button
                  key={image}
                  className={`overflow-hidden rounded-[16px] border ${index === imageIndex ? "border-[var(--vh-pink)]" : "border-white/10"}`}
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
              <p className="vh-chip w-fit">Room Details</p>
              <h3 className="mt-4 text-3xl font-bold text-white">{room.title}</h3>
            </div>
            <button
              aria-label="Close"
              className="rounded-full border border-white/10 p-2 text-white/65 hover:border-white/25 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-6 text-sm leading-7 text-white/80">
            Clean, practical, and comfortable for city stays, with features that make the room work well for both rest and day-to-day use.
          </p>

          <div className="mt-6 rounded-[18px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">Availability</p>
            <p className="mt-2 text-lg font-semibold text-[var(--vh-amber)]">{room.inventoryText}</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{formatRoomPrice(room)}</span>
                  {!isPriceUnavailable ? <span className="text-xs text-white/55">/ night</span> : null}
                </div>
                {room.inventoryState === "limited" && room.availableCount > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[rgba(255,204,102,0.12)] px-2 py-0.5 text-[10px] font-bold text-[var(--vh-amber)]">
                    ⚡ Only {room.availableCount} left!
                  </p>
                )}
              </div>
              {!canBook ? (
                <div className="flex flex-col items-end gap-1">
                  {isPriceUnavailable ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(250,204,21,0.34)] bg-[rgba(250,204,21,0.12)] px-3 py-1.5 text-sm font-black uppercase tracking-[0.1em] text-[var(--vh-amber)]">
                      Price unavailable
                    </span>
                  ) : isAvailabilityPending ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,209,255,0.34)] bg-[rgba(0,209,255,0.12)] px-3 py-1.5 text-sm font-black uppercase tracking-[0.1em] text-[var(--vh-cyan)]">
                      Select dates
                    </span>
                  ) : (
                    <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full border border-[rgba(255,76,48,0.4)] bg-[rgba(255,76,48,0.12)] px-3 py-1.5 text-sm font-black uppercase tracking-[0.1em] text-[var(--vh-hot)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--vh-hot)]" />
                      SOLD OUT
                    </span>
                  )}
                </div>
              ) : count === 0 ? (
                <Button className="h-10 rounded-full px-5" onClick={onIncrement} type="button">
                  Add
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Decrement Count"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--vh-surface-2)]"
                    onClick={onDecrement}
                    type="button"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-4 text-center text-sm font-semibold text-white">{count}</span>
                  <button
                    aria-label="Increment Count"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--vh-surface-2)] disabled:cursor-not-allowed disabled:opacity-45"
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
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">Room Amenities</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailItems.map((label, index) => {
                const Icon = iconForLabel(label);

                return (
                  <div key={`${label}-${index}`} className="flex items-center gap-3 text-sm text-white/84">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--vh-cyan)]">
                      <Icon className="h-4 w-4" />
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
};

export function Property({
  propertyId,
  initialCheckIn,
  initialCheckOut,
  initialAvailabilityEnabled = false,
  initialRoomCategories = roomCategories,
}: PropertyProps) {
  const router = useRouter();
  const { isAuthenticated, isRestoringSession, openAuthModal } = useGuestAuth();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({});
  const [activeRoomKey, setActiveRoomKey] = useState<string | null>(null);
  const [activeRoomImageIndex, setActiveRoomImageIndex] = useState(0);
  const [roomCategoryList, setRoomCategoryList] = useState<RoomCategory[]>(
    initialRoomCategories.length > 0 ? initialRoomCategories : roomCategories,
  );
  const [resolvedPropertyId, setResolvedPropertyId] = useState(propertyId ?? "");
  const [availabilitySource, setAvailabilitySource] = useState<AvailabilitySource | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isRefreshingAvailability, setIsRefreshingAvailability] = useState(false);
  const [availabilityRequestedByUser, setAvailabilityRequestedByUser] = useState(initialAvailabilityEnabled);
  const [selectedEssentials] = useState<Record<string, number>>({});
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [resumeReviewAfterAuth, setResumeReviewAfterAuth] = useState(false);
  const roomResponseCacheRef = useRef<Map<string, CachedRoomPayload>>(new Map());
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

  const applyRoomCategories = useCallback((nextCategories: RoomCategory[]) => {
    setRoomCategoryList(nextCategories);
    setSelectedCounts((current) => {
      const allowed = new Map(
        nextCategories.map((room) => [
          getRoomSelectionKey(room),
          room.hasLiveAvailability && room.inventoryState !== "sold_out" && !hasUnavailableRoomPrice(room)
            ? Math.max(0, room.availableCount)
            : 0,
        ]),
      );

      return Object.fromEntries(
        Object.entries(current)
          .map<[string, number]>(([roomKey, quantity]) => [roomKey, Math.min(quantity, allowed.get(roomKey) ?? 0)])
          .filter((entry): entry is [string, number] => entry[1] > 0),
      );
    });
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

    const query = new URLSearchParams();
    if (resolvedPropertyId) {
      query.set("property_id", resolvedPropertyId);
    }
    if (params.checkin && params.checkout) {
      query.set("checkin", params.checkin);
      query.set("checkout", params.checkout);
    }

    const url = query.size > 0 ? `/api/cx/rooms?${query.toString()}` : "/api/cx/rooms";
    const response = await fetch(url, {
      cache: "no-store",
      signal: params.signal,
    });

    const payload = (await response.json().catch(() => null)) as RoomApiPayload | null;

    if (!response.ok) {
      throw new Error(parseRoomsApiError(payload, "Unable to load rooms right now."));
    }

    const safePayload = payload ?? {};
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

      try {
        const payload = await fetchRoomsPayload({ signal: controller.signal });

        if (!mounted) {
          return;
        }

        const nextCategories = readCategories(payload);
        const nextPropertyId = typeof payload.property_id === "string" ? payload.property_id.trim() : "";
        const nextAvailabilitySource = readAvailabilitySource(payload);

        if (nextPropertyId && nextPropertyId !== resolvedPropertyId) {
          setResolvedPropertyId(nextPropertyId);
        }

        setAvailabilitySource(nextAvailabilitySource);

        if (nextCategories.length > 0) {
          applyRoomCategories(nextCategories);
        }
      } catch (error) {
        if (!mounted || controller.signal.aborted) {
          return;
        }

        setRoomCategoryList((current) => (current.length > 0 ? current : roomCategories));
        toast.error("Room catalog unavailable", {
          description: error instanceof Error ? error.message : "Please retry in a few seconds.",
        });
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

      try {
        const payload = await fetchRoomsPayload({
          checkin: checkIn,
          checkout: checkOut,
          signal: controller.signal,
        });

        if (!mounted) {
          return;
        }

        const nextCategories = readCategories(payload);
        const nextPropertyId = typeof payload.property_id === "string" ? payload.property_id.trim() : "";
        const nextAvailabilitySource = readAvailabilitySource(payload);

        if (nextPropertyId && nextPropertyId !== resolvedPropertyId) {
          setResolvedPropertyId(nextPropertyId);
        }

        if (nextCategories.length > 0) {
          applyRoomCategories(nextCategories);
        }

        setAvailabilitySource(nextAvailabilitySource);
        // Note: local_db_estimate is handled silently — no banner shown.
      } catch (error) {
        if (!mounted || controller.signal.aborted) {
          return;
        }
        // Silently fail: keep the existing room list visible, just log a toast.
        toast.error("Live availability sync failed", {
          description: error instanceof Error ? error.message : "Please retry in a few seconds.",
        });
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

  // Sync error state: keep it simple — no user-visible banners for availability errors.
  // The loading standard says: skeletons only, no text-based loading/error states.

  useEffect(() => {
    if (!resumeReviewAfterAuth || !isAuthenticated) {
      return;
    }

    setResumeReviewAfterAuth(false);
    router.push("/bookingreview");
  }, [isAuthenticated, resumeReviewAfterAuth, router]);

  const openRoomPopup = (roomKey: string) => {
    setActiveRoomKey(roomKey);
    setActiveRoomImageIndex(0);
  };

  const continueToCheckout = () => {
    if (!resolvedPropertyId) {
      toast.error("Checkout blocked", {
        description: "Property context is missing. Refresh and try again.",
      });
      return;
    }

    if (!hasValidDateRange || !checkIn || !checkOut || selectedRoomDrafts.length === 0) {
      toast.error("Select at least one room", {
        description: "Pick your dates and rooms to continue to checkout.",
      });
      return;
    }


    if (availabilitySource === "local_db_estimate") {
      // local_db_estimate means eZee is down but we have DB estimates — allow the flow to
      // continue with a toast warning rather than hard-blocking checkout.
      toast.warning("Estimated pricing", {
        description: "Live rates are temporarily unavailable. Shown prices are estimates from our DB.",
      });
    }

    const hasInvalidSelection = selectedRoomDrafts.some((draftRoom) => {
      const room = roomCategoryList.find((item) => item.roomTypeId === draftRoom.roomTypeId || item.slug === draftRoom.slug);
      return !room || !room.hasLiveAvailability || room.inventoryState === "sold_out" || hasUnavailableRoomPrice(room);
    });

    if (hasInvalidSelection) {
      toast.error("Room availability changed", {
        description: "Please review your room selection and try again.",
      });
      return;
    }

    if (!isAgeConfirmed) {
      toast.error("Please confirm guest age", {
        description: "You must confirm all guests are above 18 to continue.",
      });
      return;
    }

    if (isRestoringSession) {
      toast.info("Restoring your session", {
        description: "Please wait a moment, then try Review Booking again.",
      });
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

    toast.success("Room selection saved", {
      description: "Taking you to review booking.",
    });

    if (!isAuthenticated) {
      setResumeReviewAfterAuth(true);
      openAuthModal("signin");
      return;
    }

    router.push("/bookingreview");
  };

  return (
    <>
      <section className="vh-section pt-28 md:pt-32">
        <div className="vh-container">
          <FadeIn className="mb-8 text-center">
            <h1 className="leading-none">
              <span className="vh-retro-sign-flat text-[2.2rem] md:text-[4.2rem] lg:text-[5rem]">
                THE D<span className="vh-flicker">A</span>ILY SO<span className="vh-flicker" style={{ animationDelay: "0.6s" }}>C</span>IA<span className="vh-flicker" style={{ animationDelay: "1.2s" }}>L</span>
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-[760px] text-base leading-7 text-white/78 md:text-lg">
              {propertyHero.blurb}
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="overflow-hidden rounded-[18px]">
                <ImageWithFallback
                  alt={propertyGallery[0].alt}
                  className="h-[340px] w-full object-cover md:h-[500px]"
                  src={propertyGallery[0].src}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:col-span-5">
              {propertyGallery.slice(1).map((image) => (
                <div key={image.src} className="overflow-hidden rounded-[18px]">
                  <ImageWithFallback alt={image.alt} className="h-[162px] w-full object-cover md:h-[242px]" src={image.src} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="vh-section vh-section-alt">
        <div className="vh-container">
          <div className="space-y-8 pb-4 md:space-y-10 lg:pb-0">
            <section id="about" className="scroll-mt-28">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                <div>
                  <SectionTitle title="About" />
                  {/* <p className="mt-3 text-[15px] font-medium leading-7 text-white/84 md:text-base">
                    The Hosteller BAM Coorg is where misty mornings, fresh brews, and good chaos settle into a comfortable rhythm.
                  </p> */}
                  <p className={`mt-3 text-[15px] leading-7 text-white/82 md:text-base ${aboutExpanded ? "" : "line-clamp-2"}`}>
                    {propertyAboutText}
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
                    <Link href="#availability">View rooms</Link>
                  </Button>
                </div>
              </div>
            </section>

            <section id="amenities">
              <div>
                <SectionTitle title="Amenities" />
                <p className="mt-2 max-w-[640px] text-[15px] font-medium leading-7 text-white/84 md:text-base">
                  The good stuff that keeps the stay easy, social, and very hard to complain about.
                </p>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-4 sm:gap-5 lg:grid-cols-12 lg:gap-2">
                  {propertyAmenities.map((amenity, index) => {
                    const Icon = amenityIcons[amenity.icon as keyof typeof amenityIcons] ?? ShieldCheck;
                    const colorIndex = index % 3;
                    const colors = ["var(--vh-pink)", "var(--vh-cyan)", "var(--vh-amber)"];

                    return (
                      <div key={`${amenity.label}-${index}`} className="text-center">
                        <span className="inline-flex h-12 w-12 items-center justify-center" style={{ color: colors[colorIndex] }}>
                          <Icon className="h-9 w-9" />
                        </span>
                        <p className="mt-2 text-xs font-medium leading-5 text-white/82 lg:text-sm">{amenity.label}</p>
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
                    <p className="mt-2 text-sm text-white/75">Please retry or contact support at thedailysocial01@gmail.com.</p>
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
                        className="overflow-hidden rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.03)]"
                        style={{ backgroundColor: "#10111a" }}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_188px]">
                          <div className="border-b border-white/10 lg:border-b-0 lg:border-r">
                            <button className="group block w-full text-left" onClick={() => openRoomPopup(roomKey)} type="button">
                              <ImageWithFallback
                                alt={room.title}
                                className="h-[180px] w-full object-cover transition duration-300 group-hover:scale-[1.03] lg:h-[170px]"
                                src={roomGallery[0] ?? room.image}
                              />
                            </button>
                            <div className="grid grid-cols-3 gap-1 p-1.5">
                              {roomGallery.slice(0, 3).map((galleryImage, index) => (
                                <button
                                  key={`${roomKey}-thumb-${index}`}
                                  className="overflow-hidden rounded-[8px] border border-white/10"
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

                          <div className="space-y-1 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <button className="text-left" onClick={() => openRoomPopup(roomKey)} type="button">
                                <h3 className="text-xl font-semibold text-white hover:text-[var(--vh-cyan)] font-['Geologica']">{room.title}</h3>
                              </button>
                            </div>

                            <p className="text-sm leading-7 text-white/78">
                              Designed for practical, easy stays with the essentials that matter most for sleep, work, and daily comfort.
                            </p>

                            <div className="flex flex-wrap gap-1">
                              {featureLabels.map((label, index) => {
                                const colorIndex = index % 4;
                                const colors = ["#00d1ff", "#c62828", "#39ff14", "#facc15"];

                                return (
                                  <span
                                    key={`${label}-${index}`}
                                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs"
                                    title={label}
                                    style={{ color: colors[colorIndex] }}
                                  >
                                    <span className="text-white/70">{label}</span>
                                  </span>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between gap-4">
                              {isSoldOut ? (
                                <p className="text-sm font-semibold text-[var(--vh-hot)]">Sold out for selected dates</p>
                              ) : isPriceUnavailable ? (
                                <p className="text-sm font-semibold text-[var(--vh-amber)]">Price unavailable. Retry shortly.</p>
                              ) : isAvailabilityPending ? (
                                <p className="text-sm font-semibold text-[var(--vh-cyan)]">Select dates to view live availability</p>
                              ) : isLimited ? (
                                <p className="text-sm font-semibold text-[var(--vh-hot)]">
                                  Only {room.availableCount} {room.availableCount === 1 ? "bed" : "beds"} left
                                </p>
                              ) : (
                                <p className="text-sm font-semibold text-white/80">{room.inventoryText}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col justify-between border-t border-white/10 p-5 lg:border-l lg:border-t-0">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                                {room.hasLiveAvailability ? "Live price / night" : "From / night"}
                              </p>
                              <p className="mt-2 text-3xl font-bold text-[#c62828]">{formatRoomPrice(room)}</p>
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-2">
                              {!canBook ? (
                                <Button className="w-full rounded-full" disabled type="button">
                                  {isSoldOut ? "Sold out" : isPriceUnavailable ? "Unavailable" : "Check dates"}
                                </Button>
                              ) : count === 0 ? (
                                <Button className="w-full rounded-full" onClick={() => updateCount(roomKey, 1)} type="button">
                                  Add
                                </Button>
                              ) : (
                                <div className="ml-auto flex items-center gap-2">
                                  <button
                                    aria-label="Decrement Count"
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--vh-surface-2)]"
                                    onClick={() => updateCount(roomKey, count - 1)}
                                    type="button"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-4 text-center text-sm font-semibold text-white">{count}</span>
                                  <button
                                    aria-label="Increment Count"
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
                  })
                )}
                </div>

                </div>
                <DesktopBookingSummary
                  checkIn={checkIn}
                  checkOut={checkOut}
                  essentials={selectedEssentialDrafts}
                  essentialsTotal={essentialsTotal}
                  isAgeConfirmed={isAgeConfirmed}
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
                <div className="mb-3 flex flex-wrap justify-between gap-x-4 gap-y-2 rounded-[16px] bg-white/6 p-3 text-white/84">
                  <div className="flex min-w-[180px] items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-[var(--vh-cyan)]" />
                    <span>
                      Check in:
                      <strong className="ml-1 text-white">{propertyGuidelines.checkIn}</strong>
                    </span>
                  </div>
                  <div className="flex min-w-[180px] items-center gap-3">
                    <Clock3 className="h-5 w-5 text-[var(--vh-cyan)]" />
                    <span>
                      Check out:
                      <strong className="ml-1 text-white">{propertyGuidelines.checkOut}</strong>
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
                    <AccordionItem
                      key={section.title}
                      className="overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4"
                      value={`guideline-${index}`}
                    >
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

            <section id="faq">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                <div>
                  <SectionTitle title="Frequently Asked Questions" />
                  <Accordion className="mt-6 space-y-4" defaultValue={["faq-0"]} type="multiple">
                    {roomFaqs.map((faq, index) => (
                      <AccordionItem
                        key={faq.question}
                        className="overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4"
                        value={`faq-${index}`}
                      >
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
                      <iframe
                        className="h-[300px] w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={locationMap.embedUrl}
                        title={locationMap.title}
                      />
                    </div>
                    <Link
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--vh-cyan)] hover:text-white"
                      href={propertyHero.mapsHref}
                      target="_blank"
                    >
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

      <MobileStickySummary
        checkIn={checkIn}
        checkOut={checkOut}
        essentials={selectedEssentialDrafts}
        essentialsTotal={essentialsTotal}
        isAgeConfirmed={isAgeConfirmed}
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
