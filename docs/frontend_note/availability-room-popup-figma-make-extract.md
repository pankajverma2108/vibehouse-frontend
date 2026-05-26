# Availability Section + Room Popup Code Extract (Figma Make Handoff)

This file is a direct extraction-focused handoff for the `id="availability"` section and room info popup from `components/marketing/property.tsx`, including referenced logic, UI components, data shape, and CSS tokens/classes.

## 1) Source files used

- `components/marketing/property.tsx`
- `app/globals.css`
- `components/ui/calendar.tsx`
- `components/ui/popover.tsx`
- `components/ui/button.tsx`
- `components/ui/skeleton.tsx`
- `components/shared/image-with-fallback.tsx`
- `lib/cx-api.ts`
- `lib/format-price.ts`
- `content/rooms.ts`

---

## 2) Core imports + types + helper logic (from property.tsx)

```tsx
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  CalendarDays,
  ChevronDown,
  Info,
  Minus,
  Plus,
  ShieldCheck,
  X,
  Wifi,
  Snowflake,
  Building2,
  Car,
  PawPrint,
  Waves,
  BatteryCharging,
  Smartphone,
  GlassWater,
  Camera,
  Briefcase,
  LampDesk,
  Lock,
  Droplets,
  BedDouble,
  Usb,
  Shirt,
  UtensilsCrossed,
} from "lucide-react";

import { toast } from "sonner";
import { buildBookingSignature, saveBookingDraft, type BookingDraftRoom } from "@/lib/booking-session";
import type { CxRoomCategory } from "@/lib/cx-api";
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
  bookingSummary,
  roomCategories,
  propertyOverview,
} from "@/content/rooms";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

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
```

---

## 3) Availability section UI components from property.tsx

### 3.1 DateRangePicker

```tsx
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
```

### 3.2 DesktopBookingSummary

```tsx
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
```

### 3.3 MobileStickySummary

```tsx
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
```

### 3.4 RoomCardSkeleton

```tsx
function RoomCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.03)]">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_188px]">
        <Skeleton className="h-[220px] w-full lg:h-full" />

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
```

---

## 4) Room info popup (clicked room modal) from property.tsx

```tsx
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
```

---

## 5) Main Availability section markup from property.tsx (`id="availability"`)

```tsx
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
```

---

## 6) State + effects + handlers that drive availability + popup

```tsx
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
    } catch (error) {
      if (!mounted || controller.signal.aborted) {
        return;
      }
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

const openRoomPopup = (roomKey: string) => {
  setActiveRoomKey(roomKey);
  setActiveRoomImageIndex(0);
};
```

---

## 7) Placement usage of mobile summary + popup in page return

```tsx
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
```

---

## 8) Referenced UI primitives

### 8.1 `components/ui/calendar.tsx`

```tsx
"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

function Calendar({
  className,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const mergedClassNames: React.ComponentProps<typeof DayPicker>["classNames"] = {
    ...props.classNames,
    root: cn("vh-calendar-dark", props.classNames?.root),
    months: cn("rdp-months", props.classNames?.months),
    month: cn("rdp-month", props.classNames?.month),
    month_caption: cn("rdp-month_caption", props.classNames?.month_caption),
    caption_label: cn("rdp-caption_label", props.classNames?.caption_label),
    nav: cn("rdp-nav", props.classNames?.nav),
    button_previous: cn("rdp-button_previous", props.classNames?.button_previous),
    button_next: cn("rdp-button_next", props.classNames?.button_next),
    month_grid: cn("rdp-month_grid", props.classNames?.month_grid),
    weekdays: cn("rdp-weekdays", props.classNames?.weekdays),
    weekday: cn("rdp-weekday", props.classNames?.weekday),
    week: cn("rdp-week", props.classNames?.week),
    day: cn("rdp-day", props.classNames?.day),
    day_button: cn("rdp-day_button", props.classNames?.day_button),
    selected: cn("rdp-selected", props.classNames?.selected),
    today: cn("rdp-today", props.classNames?.today),
    outside: cn("rdp-outside", props.classNames?.outside),
    disabled: cn("rdp-disabled", props.classNames?.disabled),
    range_start: cn("rdp-range_start", props.classNames?.range_start),
    range_middle: cn("rdp-range_middle", props.classNames?.range_middle),
    range_end: cn("rdp-range_end", props.classNames?.range_end),
  };

  return (
    <DayPicker
      className={cn("rounded-[18px] p-2", className)}
      classNames={mergedClassNames}
      {...props}
    />
  );
}

export { Calendar };
```

### 8.2 `components/ui/popover.tsx`

```tsx
"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  align = "center",
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          "z-[120] origin-(--radix-popover-content-transform-origin) rounded-xl border shadow-xl outline-hidden",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
```

### 8.3 `components/ui/button.tsx`

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

### 8.4 `components/ui/skeleton.tsx`

```tsx
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-white/10", className)} {...props} />;
}

export { Skeleton };
```

### 8.5 `components/shared/image-with-fallback.tsx`

```tsx
"use client";
/* eslint-disable @next/next/no-img-element */

import type { ImgHTMLAttributes } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const ERROR_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4=";

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement>;

export function ImageWithFallback({
  alt,
  className,
  src,
  ...props
}: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  return (
    <img
      {...props}
      alt={alt}
      className={cn(className)}
      decoding={props.decoding ?? "async"}
      loading={props.loading ?? "lazy"}
      onError={() => setDidError(true)}
      src={didError ? ERROR_IMAGE : src}
    />
  );
}
```

---

## 9) Currency formatter reference

```ts
const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(amount: number): string {
  return INR_FORMATTER.format(Number.isFinite(amount) ? amount : 0);
}

export function formatINRPlain(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}
```

---

## 10) Data model + seeded data used by availability cards

### 10.1 Room type shape (`lib/cx-api.ts`)

```ts
export type CxRoomCategory = {
  roomTypeId: string;
  slug: string;
  title: string;
  shortTitle: string;
  image: string;
  images?: string[];
  roomType: string;
  inventoryState: InventoryState;
  hasLiveAvailability: boolean;
  guestText: string;
  basePrice: number;
  isPriceUnavailable?: boolean;
  totalPrice: number;
  availableCount: number;
  totalCount: number;
  inventoryText: string;
  features: string[];
  amenitiesLegend: string[];
};
```

### 10.2 Seeded fallback categories + summary text (`content/rooms.ts`)

```ts
export const roomCategories: CxRoomCategory[] = [
  {
    roomTypeId: "mixed-4-bed",
    roomType: "4-Bed Mixed Dorm",
    slug: "mixed-4-bed",
    title: "Bed in 4-Bed Mixed Dorm",
    shortTitle: "4-Bed Mixed Dorm",
    image: "/images/rooms/room-1.jpg",
    images: ["/images/rooms/room-1.jpg", "/images/rooms/room-2.jpg", "/images/rooms/room-3.webp"],
    inventoryState: "unknown",
    hasLiveAvailability: false,
    guestText: "x 1 Guest",
    basePrice: 599,
    totalPrice: 599,
    availableCount: 7,
    totalCount: 7,
    inventoryText: "07 beds available",
    features: ["Privacy curtain", "Reading light", "USB charging", "Personal locker"],
    amenitiesLegend: ["AC", "Locker", "Fresh linen", "Housekeeping"],
  },
  {
    roomTypeId: "female-4-bed",
    roomType: "4-Bed Female Dorm",
    slug: "female-4-bed",
    title: "Bed in 4-Bed Female Dorm",
    shortTitle: "4-Bed Female Dorm",
    image: "/images/rooms/room-2.jpg",
    images: ["/images/rooms/room-2.jpg", "/images/rooms/room-3.webp", "/images/rooms/room-4.jpg"],
    inventoryState: "unknown",
    hasLiveAvailability: false,
    guestText: "x 1 Guest",
    basePrice: 599,
    totalPrice: 599,
    availableCount: 5,
    totalCount: 5,
    inventoryText: "05 beds available",
    features: ["Women-only floor", "En-suite access", "Reading light", "Secure locker"],
    amenitiesLegend: ["AC", "Locker", "Fresh linen", "Housekeeping"],
  },
  {
    roomTypeId: "private-room",
    roomType: "Private Room",
    slug: "private-room",
    title: "Private Room",
    shortTitle: "Private Room",
    image: "/images/rooms/room-4.jpg",
    images: ["/images/rooms/room-4.jpg", "/images/rooms/room-1.jpg", "/images/rooms/room-3.webp"],
    inventoryState: "unknown",
    hasLiveAvailability: false,
    guestText: "x 2 Guests",
    basePrice: 1299,
    totalPrice: 1299,
    availableCount: 3,
    totalCount: 3,
    inventoryText: "03 rooms left",
    features: ["Queen bed", "En-suite bathroom", "Work desk", "Mini-fridge"],
    amenitiesLegend: ["AC", "Private bath", "Fresh linen", "Housekeeping"],
  },
];

export const bookingSummary = {
  title: "Summary",
  note: "Select dates to review category availability and continue with your preferred stay option.",
  highlights: [
    "Check-in at 1:00 PM",
    "Check-out at 10:00 AM",
    "Direct support from the property team",
  ],
  policiesNote:
    "By continuing, you confirm that all guests meet the property's stay requirements and agree to the booking and guideline policies.",
};
```

---

## 11) CSS tokens and classes used by availability + popup (from `app/globals.css`)

### 11.1 Tokens

```css
:root {
  --font-geologica: "Geologica", "Segoe UI", sans-serif;
  --font-suez: "Suez One", "Trebuchet MS", sans-serif;
  --vh-bg: #07070a;
  --vh-surface-2: #12161d;
  --vh-section-a: #07070a;
  --vh-section-b: #07070a;
  --vh-hot: #ff4c30;
  --vh-pink: #c62828;
  --vh-pink-soft: #8e1b1b;
  --vh-cyan: #3a5f84;
  --vh-amber: #d7a64a;
  --vh-panel-strong: rgba(15, 16, 26, 0.92);
  --vh-chip: rgba(255, 255, 255, 0.06);
  --vh-shadow-lg: 0 24px 60px rgba(0, 0, 0, 0.28);
}
```

### 11.2 Layout + title + chip + CTA + animations

```css
.vh-container {
  @apply mx-auto w-full max-w-screen-xl px-4 md:px-6;
}

.vh-section {
  @apply py-6 md:py-8;
  background-color: var(--vh-section-a);
}

.vh-section-alt {
  background-color: var(--vh-section-b);
}

.vh-title {
  @apply uppercase tracking-[-1.2px] leading-tight text-3xl md:text-4xl;
  font-family: var(--font-suez);
  font-weight: 400;
}

.vh-chip {
  @apply inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/72;
  background: var(--vh-chip);
}

.vh-cta-button {
  @apply inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] bg-[var(--vh-pink)] px-6 py-3 text-center text-[18px] font-bold uppercase leading-7 text-white transition-all outline-none hover:bg-[#8e1b1b] focus-visible:ring-[3px] focus-visible:ring-white/30;
  font-family: var(--font-geologica);
  box-shadow: 4px 4px 0 0 rgba(128, 128, 128, 0.5);
  letter-spacing: 0.9px;
}

.animate-vh-fade-in {
  animation: vh-fade-in 180ms ease-out;
}

.animate-vh-scale-in {
  animation: vh-scale-in 180ms ease-out;
}
```

### 11.3 Calendar skin classes (`vh-calendar-dark`, `vh-calendar-balanced`)

```css
.vh-calendar-dark.rdp-root {
  --rdp-accent-color: #c62828;
  --rdp-accent-background-color: #c62828;
  --rdp-day_button-border-radius: 0;
  --rdp-day_button-border: 1px solid #232636;
  --rdp-selected-border: 1px solid transparent;
  --rdp-disabled-opacity: 0.3;
  --rdp-outside-opacity: 0.35;
  --rdp-today-color: #f8ff7a;
  --rdp-range_middle-background-color: #1b2436;
  --rdp-range_middle-color: #ffffff;
  --rdp-range_start-color: #ffffff;
  --rdp-range_end-color: #ffffff;
  --rdp-nav-height: 34px;
  color: #ffffff;
  background: #10111a;
}

.vh-calendar-dark .rdp-months { justify-content: center; gap: 0.55rem; }
.vh-calendar-dark .rdp-month { position: relative; width: 100%; }
.vh-calendar-dark .rdp-month_caption {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 30px;
  pointer-events: auto;
  z-index: 1;
  color: #ffffff;
  font-size: 1.24rem;
  font-weight: 700;
  text-transform: uppercase;
}
.vh-calendar-dark .rdp-dropdowns,
.vh-calendar-dark .rdp-caption_dropdowns {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.vh-calendar-dark .rdp-dropdown,
.vh-calendar-dark .rdp-dropdown_root select {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: #11121b;
  color: #ffffff;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.22rem 1.4rem 0.22rem 0.5rem;
  cursor: pointer;
}
.vh-calendar-dark .rdp-caption_label { color: #ffffff; font-weight: 800; letter-spacing: 0.02em; }
.vh-calendar-dark .rdp-nav {
  position: absolute;
  top: 8px;
  right: 0;
  left: 0;
  height: 24px;
  display: flex;
  align-items: flex-start;
  pointer-events: none;
  z-index: 2;
}
.vh-calendar-dark .rdp-weekday {
  color: rgba(147, 173, 216, 0.8);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}
.vh-calendar-dark .rdp-button_previous,
.vh-calendar-dark .rdp-button_next {
  position: absolute;
  top: 0;
  z-index: 30;
  pointer-events: auto;
  display: inline-flex;
  height: 24px;
  width: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  color: #c62828;
  background: transparent;
  border: 0;
  padding: 0;
}
.vh-calendar-dark .rdp-button_previous { left: 0; }
.vh-calendar-dark .rdp-button_next { right: 0; }
.vh-calendar-dark .rdp-chevron { fill: #c62828; }
.vh-calendar-dark .rdp-month_grid { border-collapse: separate; border-spacing: 1px; table-layout: fixed; width: 100%; }
.vh-calendar-dark .rdp-weekdays,
.vh-calendar-dark .rdp-week { width: 100%; }
.vh-calendar-dark .rdp-weekday,
.vh-calendar-dark .rdp-day { width: calc(100% / 7); text-align: center; }
.vh-calendar-dark .rdp-day { color: rgba(255, 255, 255, 0.86); }
.vh-calendar-dark .rdp-day_button {
  height: 40px;
  width: 100%;
  max-width: none;
  font-size: 1.1rem;
  background: #161722;
}
.vh-calendar-dark .rdp-day_button:hover:not(:disabled) { background: rgba(198, 40, 40, 0.24); }
.vh-calendar-dark .rdp-range_middle .rdp-day_button { background: rgba(58, 95, 132, 0.26); }
.vh-calendar-dark .rdp-selected .rdp-day_button,
.vh-calendar-dark .rdp-range_start .rdp-day_button,
.vh-calendar-dark .rdp-range_end .rdp-day_button {
  background: #c62828;
  border-color: #c62828;
}
.vh-calendar-dark .rdp-disabled { color: rgba(255, 255, 255, 0.22); }
.vh-calendar-dark .rdp-outside { color: rgba(255, 255, 255, 0.28); }
.vh-calendar-dark .rdp-today .rdp-day_button {
  border: 2px solid #f8ff7a;
  box-shadow: inset 0 0 0 1px rgba(9, 19, 41, 0.75);
}

.vh-calendar-balanced .rdp-month { width: auto; }
.vh-calendar-balanced .rdp-month_grid,
.vh-calendar-balanced .rdp-weekdays,
.vh-calendar-balanced .rdp-week {
  width: auto;
  table-layout: auto;
}
.vh-calendar-balanced .rdp-weekday,
.vh-calendar-balanced .rdp-day {
  width: auto;
  min-width: 2.35rem;
}
.vh-calendar-balanced .rdp-day_button {
  width: 2.35rem;
  min-width: 2.35rem;
}

@media (min-width: 768px) {
  .vh-calendar-dark .rdp-months { gap: 0.7rem; }
  .vh-calendar-balanced .rdp-weekday,
  .vh-calendar-balanced .rdp-day { min-width: 3rem; }
  .vh-calendar-balanced .rdp-day_button { width: 3rem; min-width: 3rem; }
}
```

---

## 12) Notes for Figma Make parity

- This UI is Tailwind utility-heavy with custom tokens from `globals.css`.
- Colors in logic are intentionally mixed:
  - Brand tokens: `--vh-pink`, `--vh-cyan`, `--vh-amber`, `--vh-hot`.
  - Literal accents in pills: `#00d1ff`, `#c62828`, `#39ff14`, `#facc15`.
  - DO NOT CONSIDER THESE COLORS, HAVE IT THEMED AS WE HAVE OUR APP. IN FOGMA MAKE. PROJECT NAMED COOKING APP.
- Date range picker behavior includes:
  - responsive 1-month / 2-month calendar,
  - closes popover after valid range selection,
  - prevents past date selection.
- Room popup supports:
  - body scroll lock,
  - click outside to close,
  - ESC close,
  - image gallery + thumbnails,
  - availability/price status states,
  - quantity controls.
- Availability section behavior includes:
  - catalog load first,
  - live availability refresh on valid date selection,
  - cache with TTL,
  - skeleton and empty states,
  - desktop sticky summary and mobile sticky summary.
