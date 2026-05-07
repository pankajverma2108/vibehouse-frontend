"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BedSingle,
  Droplets,
  GlassWater,
  Info,
  KeyRound,
  Minus,
  PartyPopper,
  Plus,
  PlusCircle,
  Shirt,
  Sparkles,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StickerTag } from "@/components/shared/sticker-tag";
import {
  createBookingPaymentOrder,
  createColiveDraftBooking,
  createColivePaymentOrder,
  createColiveQuote,
  createGuestBookingOrder,
  failBookingPayment,
  getStoreCatalog,
  type StoreCatalogItem,
  verifyColivePayment,
  verifyBookingPayment,
} from "@/lib/booking-api";
import {
  clearBookingDraft,
  clearPendingBookingOrder,
  type BookingDraft,
  getStoredBookingState,
  saveBookingDraft,
  saveBookingReviewGuest,
  saveConfirmedBookingSnapshot,
  savePendingBookingOrder,
  type BookingReviewGuest,
} from "@/lib/booking-session";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";
import { getColivePropertyAddons } from "@/lib/colive-api";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/guest-form-validation";
import { propertyGuidelines, propertyHero } from "@/content/rooms";
import { toast } from "sonner";

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

type ReviewTab = "guest" | "addons";

type GuestFormErrors = Partial<Record<"firstName" | "lastName" | "email" | "phone" | "acceptedTerms", string>>;
type CouponRule = {
  code: string;
  description: string;
  discountPercent: number;
  minGuests?: number;
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const PROMO_CODES = [
  { code: "WORKATION", description: "Flat 15% off on workation plans", discountPercent: 15 },
  { code: "GROUP10", description: "Flat 10% off on group bookings (7+ adults)", discountPercent: 10, minGuests: 7 },
  { code: "NEWSIGNUP", description: "New user signup 5% off", discountPercent: 5 },
] satisfies CouponRule[];

const POLICY_SECTIONS = [
  {
    id: "general-policy",
    label: "General policy",
    content: propertyGuidelines.summary,
  },
  {
    id: "cancellation-policy",
    label: "Cancellation policy",
    content: [
      "Cancel up to 7 days before check-in for a full refund.",
      "Cancellations 4 to 7 days before arrival may be partially refundable.",
      "Bookings cancelled within 4 days of arrival are non-refundable.",
    ],
  },
  {
    id: "commune-policy",
    label: "Commune policy",
    content: [
      "Please respect quiet hours, dorm etiquette, and shared common areas.",
      "Outside visitors are subject to front-desk approval and property timing rules.",
      "Management may refuse service for behavior that affects guest safety or comfort.",
    ],
  },
  {
    id: "privacy-policy",
    label: "Privacy policy",
    content: [
      "Guest contact details are used for booking communication and operational support.",
      "ID and KYC details are completed later in the pre-arrival flow, before check-in.",
    ],
  },
  {
    id: "terms-policy",
    label: "Terms",
    content: [
      "Booking remains subject to property policy, availability revalidation, and payment success.",
      "By continuing, you confirm that all guests meet the stay requirements for this property.",
    ],
  },
];

const ROOM_GST_RATE = 0.05;
const STANDARD_ADDON_GST_RATE = 0.18;
const ADDON_PROPERTY_ID = "60765";

function normalizeCouponCode(value?: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

function calculateCouponDiscount(coupon: CouponRule | null, roomSubtotal: number): number {
  if (!coupon || roomSubtotal <= 0) {
    return 0;
  }

  return Math.min(roomSubtotal, roomSubtotal * (coupon.discountPercent / 100));
}

async function validateCouponCode(params: {
  couponCode: string;
  totalGuests: number;
  roomSubtotal: number;
}): Promise<{ coupon: CouponRule | null; message: string | null }> {
  // This stays async so the client contract matches a future coupon validation API.
  const normalizedCouponCode = normalizeCouponCode(params.couponCode);
  if (!normalizedCouponCode) {
    return {
      coupon: null,
      message: "Enter a coupon code to apply the offer.",
    };
  }

  const matchedCoupon = PROMO_CODES.find((coupon) => coupon.code === normalizedCouponCode);
  if (!matchedCoupon) {
    return {
      coupon: null,
      message: "That coupon is not available for this booking.",
    };
  }

  if (matchedCoupon.minGuests && params.totalGuests < matchedCoupon.minGuests) {
    return {
      coupon: null,
      message: `${matchedCoupon.code} unlocks on bookings for ${matchedCoupon.minGuests}+ guests.`,
    };
  }

  if (params.roomSubtotal <= 0) {
    return {
      coupon: null,
      message: "Add a room selection before applying a coupon.",
    };
  }

  return {
    coupon: matchedCoupon,
    message: `${matchedCoupon.code} applied to this booking.`,
  };
}

function getAddonTaxLabel(addon: { name: string; category: "COMMODITY" | "SERVICE" | "RETURNABLE" }): string {
  const normalized = addon.name.trim().toLowerCase();
  if (normalized.includes("laundry") || normalized.includes("towel")) {
    return "Laundry";
  }
  if (addon.category === "RETURNABLE" || normalized.includes("lock") || normalized.includes("blanket") || normalized.includes("mattress")) {
    return "Rental items";
  }
  return "Toiletries / goods";
}

function calculatePricingBreakdown(params: {
  roomSubtotal: number;
  activeAddons: Array<{
    name: string;
    category: "COMMODITY" | "SERVICE" | "RETURNABLE";
    unitPrice: number;
    quantity: number;
  }>;
  couponDiscount: number;
}) {
  // Pricing stays derived from one source so the summary and payment payload stay in sync.
  const addonSubtotal = params.activeAddons.reduce((sum, addon) => sum + addon.unitPrice * addon.quantity, 0);
  const roomTaxExact = params.roomSubtotal * ROOM_GST_RATE;
  const addonTaxExact = params.activeAddons.reduce(
    (sum, addon) => sum + (addon.unitPrice * addon.quantity * STANDARD_ADDON_GST_RATE),
    0,
  );
  const taxesExact = roomTaxExact + addonTaxExact;
  const discountedRoomSubtotal = Math.max(0, params.roomSubtotal - params.couponDiscount);
  const totalCharges = discountedRoomSubtotal + addonSubtotal;
  const grandTotal = totalCharges + taxesExact;
  const addonTaxBreakdown = params.activeAddons.reduce<Record<string, number>>((summary, addon) => {
    const nextKey = getAddonTaxLabel(addon);
    summary[nextKey] = (summary[nextKey] ?? 0) + (addon.unitPrice * addon.quantity * STANDARD_ADDON_GST_RATE);
    return summary;
  }, {});

  return {
    addonSubtotal,
    couponDiscount: Math.max(0, params.couponDiscount),
    discountedRoomSubtotal,
    roomTaxExact,
    addonTaxExact,
    addonTaxBreakdown,
    totalCharges,
    taxesExact,
    taxes: taxesExact,
    grandTotal,
  };
}

function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay checkout is only available in the browser."));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT_URL}"]`);

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateLabel(value?: string | null): string {
  if (!value) {
    return "TBA";
  }

  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getNightCount(checkIn?: string | null, checkOut?: string | null): number {
  if (!checkIn || !checkOut) {
    return 1;
  }

  const start = new Date(`${checkIn.slice(0, 10)}T12:00:00`).getTime();
  const end = new Date(`${checkOut.slice(0, 10)}T12:00:00`).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 1;
  }

  return Math.max(1, Math.round((end - start) / 86400000));
}

function isColiveDraft(draft: BookingDraft | null): draft is BookingDraft & { colive: NonNullable<BookingDraft["colive"]> } {
  return Boolean(draft?.source === "colive" && draft.colive);
}

function getColiveDurationDays(durationMonths: number): number {
  return Math.min(730, Math.max(30, Math.round(durationMonths * 30)));
}

function getColiveRoomOptionId(room: { roomTypeId: string; slug?: string; title: string; roomType?: string }): string {
  const haystack = `${room.roomTypeId} ${room.slug ?? ""} ${room.title} ${room.roomType ?? ""}`.toLowerCase();

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

function splitGuestName(name?: string | null): Pick<BookingReviewGuest, "firstName" | "lastName"> {
  const clean = (name || "").trim();
  if (!clean) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = clean.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

function isSingleQuantityService(item: Pick<StoreCatalogItem, "id" | "name" | "category">): boolean {
  if (item.category !== "SERVICE") {
    return false;
  }

  const normalizedId = item.id.trim().toLowerCase();
  const normalizedName = item.name.trim().toLowerCase();

  return normalizedId.includes("early-checkin")
    || normalizedId.includes("late-checkout")
    || normalizedName === "early check-in"
    || normalizedName === "late checkout";
}

function getTotalGuestCount(draft: BookingDraft | null): number {
  if (!draft) {
    return 1;
  }

  const total = draft.rooms.reduce((sum, room) => {
    const match = room.guestText.match(/(\d+)/);
    const guestsPerRoom = match ? Number(match[1]) : 1;
    return sum + guestsPerRoom * room.quantity;
  }, 0);

  return Math.max(1, total);
}

function createInitialGuestForm(draft: BookingDraft | null, stored?: BookingReviewGuest | null, guest?: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): BookingReviewGuest {
  if (stored && draft) {
    const additionalGuestCount = Math.max(0, getTotalGuestCount(draft) - 1);
    return {
      ...stored,
      additionalGuests: Array.from({ length: additionalGuestCount }, (_, index) => stored.additionalGuests[index] ?? { name: "", phone: "" }),
    };
  }

  const names = splitGuestName(guest?.name);

  return {
    firstName: names.firstName,
    lastName: names.lastName,
    email: guest?.email || "",
    phone: guest?.phone || "",
    coupon: "",
    acceptedTerms: true,
    additionalGuests: Array.from({ length: Math.max(0, getTotalGuestCount(draft) - 1) }, () => ({ name: "", phone: "" })),
  };
}

function mergeGuestIdentityIntoForm(
  current: BookingReviewGuest,
  guest?: { name?: string | null; email?: string | null; phone?: string | null } | null,
): BookingReviewGuest {
  if (!guest) {
    return current;
  }

  const names = splitGuestName(guest.name);
  const normalizedGuestEmail = normalizeEmail(guest.email ?? "");
  const normalizedGuestPhone = normalizePhone(guest.phone ?? "");

  return {
    ...current,
    firstName: current.firstName.trim() || names.firstName,
    lastName: current.lastName.trim() || names.lastName,
    email: current.email.trim() || normalizedGuestEmail,
    phone: current.phone.trim() || normalizedGuestPhone,
  };
}

function validateGuestForm(form: BookingReviewGuest): GuestFormErrors {
  const errors: GuestFormErrors = {};

  if (!form.firstName.trim()) {
    errors.firstName = "First name is required.";
  }

  if (!form.lastName.trim()) {
    errors.lastName = "Last name is required.";
  }

  const normalizedEmail = normalizeEmail(form.email);
  if (!normalizedEmail) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(normalizedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  const normalizedPhone = normalizePhone(form.phone);
  if (!normalizedPhone) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhone(normalizedPhone)) {
    errors.phone = "Enter a valid phone number.";
  }

  if (!form.acceptedTerms) {
    errors.acceptedTerms = "Please confirm all guests are above 18 and accept the policies.";
  }

  return errors;
}

function addonPresentation(name: string) {
  const value = name.toLowerCase();

  if (value.includes("water")) {
    return {
      icon: GlassWater,
      frameClassName: "bg-[linear-gradient(135deg,#0ea5e9,#22d3ee_55%,#ecfeff)] text-[#032b3b] shadow-[0_14px_24px_rgba(34,211,238,0.22)]",
    };
  }

  if (value.includes("towel") || value.includes("laundry")) {
    return {
      icon: Shirt,
      frameClassName: "bg-[linear-gradient(135deg,#f59e0b,#fcd34d_55%,#fff7ed)] text-[#5b2100] shadow-[0_14px_24px_rgba(245,158,11,0.24)]",
    };
  }

  if (value.includes("toilet")) {
    return {
      icon: Droplets,
      frameClassName: "bg-[linear-gradient(135deg,#38bdf8,#818cf8_55%,#eef2ff)] text-[#1e1b4b] shadow-[0_14px_24px_rgba(99,102,241,0.24)]",
    };
  }

  if (value.includes("lock")) {
    return {
      icon: KeyRound,
      frameClassName: "bg-[linear-gradient(135deg,#f97316,#fb7185_55%,#fff1f2)] text-[#431407] shadow-[0_14px_24px_rgba(249,115,22,0.24)]",
    };
  }

  if (value.includes("check")) {
    return {
      icon: Sparkles,
      frameClassName: "bg-[linear-gradient(135deg,#c084fc,#f472b6_55%,#fdf2f8)] text-[#4a044e] shadow-[0_14px_24px_rgba(244,114,182,0.24)]",
    };
  }

  if (value.includes("blanket") || value.includes("mattress") || value.includes("bunk") || value.includes("upgrade")) {
    return {
      icon: BedSingle,
      frameClassName: "bg-[linear-gradient(135deg,#34d399,#22c55e_55%,#ecfdf5)] text-[#052e16] shadow-[0_14px_24px_rgba(34,197,94,0.22)]",
    };
  }

  if (value.includes("storage") || value.includes("stay")) {
    return {
      icon: ShoppingBag,
      frameClassName: "bg-[linear-gradient(135deg,#60a5fa,#2dd4bf_55%,#f0fdfa)] text-[#082f49] shadow-[0_14px_24px_rgba(45,212,191,0.22)]",
    };
  }

  return {
    icon: PartyPopper,
    frameClassName: "bg-[linear-gradient(135deg,#fb7185,#facc15_55%,#fff7ed)] text-[#4a044e] shadow-[0_14px_24px_rgba(251,113,133,0.22)]",
  };
}

function isStockTrackedCategory(category: StoreCatalogItem["category"]): boolean {
  return category === "COMMODITY" || category === "RETURNABLE";
}

function isStoreCatalogItem(value: unknown): value is StoreCatalogItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string"
    && typeof candidate.name === "string"
    && (candidate.category === "COMMODITY" || candidate.category === "SERVICE" || candidate.category === "BORROWABLE" || candidate.category === "RETURNABLE")
    && typeof candidate.base_price === "number"
    && Number.isFinite(candidate.base_price)
    && typeof candidate.in_stock === "boolean"
    && (candidate.available_stock === null || typeof candidate.available_stock === "number");
}

function hasKnownStockLimit(item: StoreCatalogItem): boolean {
  return isStockTrackedCategory(item.category) && item.available_stock !== null;
}

function isItemDisabled(item: StoreCatalogItem): boolean {
  if (!isStockTrackedCategory(item.category)) {
    return false;
  }

  if (!item.in_stock) {
    return true;
  }

  return hasKnownStockLimit(item) ? (item.available_stock ?? 0) <= 0 : false;
}

function tabButtonClasses(isActive: boolean, isComplete: boolean) {
  if (isActive || isComplete) {
    return "bg-[#c62828] text-white shadow-[4px_4px_0px_rgba(0,0,0,0.45)] outline outline-1 outline-black";
  }

  return "bg-white/5 text-white/45 outline outline-1 outline-white/20";
}

export function BookingCheckoutPage() {
  const router = useRouter();
  const { guest, isAuthenticated, openAuthModal, updateGuestProfile } = useGuestAuth();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [activeTab, setActiveTab] = useState<ReviewTab>("guest");
  const [guestForm, setGuestForm] = useState<BookingReviewGuest | null>(null);
  const [guestErrors, setGuestErrors] = useState<GuestFormErrors>({});
  const [catalog, setCatalog] = useState<StoreCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [, setCatalogError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponRule | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [inventoryMessageById, setInventoryMessageById] = useState<Record<string, string>>({});
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [, setFlowStage] = useState<
    "idle" | "creating-order" | "creating-payment-order" | "opening-razorpay" | "verifying-payment" | "confirmed" | "failed"
  >("idle");
  const paymentHandledRef = useRef(false);
  const hydratedGuestRef = useRef(false);
  const resumePaymentAfterAuthRef = useRef(false);
  const draftIsColive = isColiveDraft(draft);
  const coliveAddonPropertyId = draftIsColive ? draft.colive.propertyId : null;
  const coliveAddonDurationMonths = draftIsColive ? draft.colive.durationMonths : null;

  useEffect(() => {
    const stored = getStoredBookingState();
    if (!stored?.draft) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setDraft(stored.draft);
      setGuestForm(createInitialGuestForm(stored.draft, stored.review?.guest ?? null));
      hydratedGuestRef.current = true;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!draft || !guest || hydratedGuestRef.current === false) {
      return;
    }

    setGuestForm((current) => {
      if (current) {
        return mergeGuestIdentityIntoForm(current, guest);
      }

      return createInitialGuestForm(draft, null, guest);
    });
  }, [draft, guest]);

  useEffect(() => {
    if (!draft || !guestForm) {
      return;
    }

    saveBookingReviewGuest(draft.signature, guestForm);
  }, [draft, guestForm]);

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);

      try {
        const response = coliveAddonPropertyId && coliveAddonDurationMonths
          ? await getColivePropertyAddons({
              propertyId: coliveAddonPropertyId,
              durationMonths: coliveAddonDurationMonths,
            }).then((payload) =>
              (Array.isArray(payload.addons) ? payload.addons : [])
                .filter((addon) => addon.is_available !== false)
                .map<StoreCatalogItem>((addon) => ({
                  id: addon.addon_id,
                  name: addon.name,
                  category: "SERVICE",
                  base_price: addon.unit_price ?? 0,
                  in_stock: addon.is_available !== false,
                  available_stock: addon.max_quantity ?? null,
                })),
            )
          : await getStoreCatalog(ADDON_PROPERTY_ID);
        if (cancelled) {
          return;
        }

        // The API has returned non-array payloads before, so filtering only starts after a strict array guard.
        const nextCatalog = (Array.isArray(response) ? response : [])
          .filter(isStoreCatalogItem)
          .filter((item) => item.category !== "BORROWABLE");
        setCatalog(nextCatalog);

        setDraft((current) => {
          if (!current) {
            return current;
          }

          const mappedAddons = nextCatalog
            .map((item) => {
              const existing = current.addons.find((addon) => addon.productId === item.id);
              const maxQuantity = hasKnownStockLimit(item)
                ? Math.max(0, item.available_stock ?? 0)
                : Number.MAX_SAFE_INTEGER;
              return {
                productId: item.id,
                name: item.name,
                category: item.category === "SERVICE" ? "SERVICE" as const : item.category === "RETURNABLE" ? "RETURNABLE" as const : "COMMODITY" as const,
                quantity: existing ? Math.min(existing.quantity, maxQuantity) : 0,
                unitPrice: item.base_price,
                inStock: item.in_stock,
              };
            })
            .filter((addon) => addon.quantity > 0);

          const nextDraft: BookingDraft = {
            ...current,
            addons: mappedAddons,
          };

          saveBookingDraft(nextDraft);
          return nextDraft;
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load booking add-ons", error);
        setCatalog([]);
        setCatalogError("fallback-empty");
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [coliveAddonDurationMonths, coliveAddonPropertyId, draft?.propertyId, draft?.source]);

  useEffect(() => {
    if (!showMobileSummary) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showMobileSummary]);

  const nights = useMemo(() => getNightCount(draft?.checkinDate, draft?.checkoutDate), [draft?.checkinDate, draft?.checkoutDate]);
  const isColiveBooking = isColiveDraft(draft);
  const stayUnitCount = isColiveBooking ? draft.colive.durationMonths : nights;
  const stayUnitLabel = isColiveBooking ? (stayUnitCount === 1 ? "month" : "months") : (nights === 1 ? "night" : "nights");
  const totalGuests = useMemo(() => getTotalGuestCount(draft), [draft]);
  const roomSubtotal = useMemo(
    () => (draft?.rooms ?? []).reduce((sum, room) => sum + room.basePrice * room.quantity * (isColiveDraft(draft) ? draft.colive.durationMonths : nights), 0),
    [draft, nights],
  );
  const activeAddons = useMemo(() => (draft?.addons ?? []).filter((addon) => addon.quantity > 0), [draft?.addons]);
  const couponDiscount = useMemo(() => calculateCouponDiscount(appliedCoupon, roomSubtotal), [appliedCoupon, roomSubtotal]);
  const pricingBreakdown = useMemo(
    () => calculatePricingBreakdown({ roomSubtotal, activeAddons, couponDiscount }),
    [activeAddons, couponDiscount, roomSubtotal],
  );
  const addonSubtotal = pricingBreakdown.addonSubtotal;
  const discountedRoomSubtotal = pricingBreakdown.discountedRoomSubtotal;
  const roomTaxExact = pricingBreakdown.roomTaxExact;
  const addonTaxExact = pricingBreakdown.addonTaxExact;
  const addonTaxBreakdown = pricingBreakdown.addonTaxBreakdown;
  const totalCharges = pricingBreakdown.totalCharges;
  const taxes = pricingBreakdown.taxes;
  const estimatedGrandTotal = pricingBreakdown.grandTotal;
  const commodityItems = useMemo(
    () => catalog.filter((item) => item.category === "COMMODITY" || item.category === "RETURNABLE"),
    [catalog],
  );
  const serviceItems = useMemo(() => catalog.filter((item) => item.category === "SERVICE"), [catalog]);
  const updateGuestField = useCallback(<K extends keyof BookingReviewGuest>(field: K, value: BookingReviewGuest[K]) => {
    setGuestForm((current) => (current ? { ...current, [field]: value } : current));
    setGuestErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  const handleCouponInputChange = useCallback((value: string) => {
    const normalizedValue = normalizeCouponCode(value);
    updateGuestField("coupon", normalizedValue);

    if (appliedCoupon?.code && appliedCoupon.code !== normalizedValue) {
      setAppliedCoupon(null);
      setCouponMessage(null);
    }
  }, [appliedCoupon, updateGuestField]);

  const applyCoupon = useCallback(async () => {
    if (!guestForm) {
      return;
    }

    setIsApplyingCoupon(true);

    try {
      // Coupon validation is isolated here so API wiring can replace the mock rules without changing the pricing UI.
      const result = await validateCouponCode({
        couponCode: guestForm.coupon,
        totalGuests,
        roomSubtotal,
      });

      if (!result.coupon) {
        setAppliedCoupon(null);
        setCouponMessage(result.message);
        return;
      }

      setAppliedCoupon(result.coupon);
      setCouponMessage(result.message);
    } catch (error) {
      console.error("Failed to validate coupon", error);
      setAppliedCoupon(null);
      setCouponMessage("Unable to validate that coupon right now.");
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [guestForm, roomSubtotal, totalGuests]);

  const updateAdditionalGuest = useCallback((index: number, field: "name" | "phone", value: string) => {
    setGuestForm((current) => {
      if (!current) {
        return current;
      }

      const nextGuests = [...current.additionalGuests];
      nextGuests[index] = {
        ...nextGuests[index],
        [field]: value,
      };

      return {
        ...current,
        additionalGuests: nextGuests,
      };
    });
  }, []);

  const setAddonQuantity = useCallback((productId: string, quantity: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const item = catalog.find((catalogItem) => catalogItem.id === productId);
      if (!item) {
        return current;
      }

      const maxQuantity = isSingleQuantityService(item) ? 1 : Number.POSITIVE_INFINITY;
      const clampedQuantity = Math.max(0, Math.min(quantity, maxQuantity));
      const nextAddons = [...current.addons];
      const existingIndex = nextAddons.findIndex((addon) => addon.productId === productId);

      if (clampedQuantity === 0) {
        if (existingIndex >= 0) {
          nextAddons.splice(existingIndex, 1);
        }
      } else {
        const nextAddon = {
          productId: item.id,
          name: item.name,
          category: item.category === "SERVICE" ? "SERVICE" as const : item.category === "RETURNABLE" ? "RETURNABLE" as const : "COMMODITY" as const,
          quantity: clampedQuantity,
          unitPrice: item.base_price,
          inStock: item.in_stock,
        };

        if (existingIndex >= 0) {
          nextAddons[existingIndex] = nextAddon;
        } else {
          nextAddons.push(nextAddon);
        }
      }

      const nextDraft: BookingDraft = {
        ...current,
        addons: nextAddons,
      };

      saveBookingDraft(nextDraft);
      return nextDraft;
    });
  }, [catalog]);

  useEffect(() => {
    if (!draft) {
      return;
    }

    draft.addons.forEach((addon) => {
      const item = catalog.find((catalogItem) => catalogItem.id === addon.productId);
      if (item && isSingleQuantityService(item) && addon.quantity > 1) {
        setAddonQuantity(item.id, 1);
      }
    });
  }, [catalog, draft, setAddonQuantity]);

  const incrementAddon = useCallback((item: StoreCatalogItem) => {
    const currentQuantity = draft?.addons.find((addon) => addon.productId === item.id)?.quantity ?? 0;

    if (isSingleQuantityService(item) && currentQuantity >= 1) {
      setInventoryMessageById((current) => ({
        ...current,
        [item.id]: "Only 1 per booking",
      }));
      return;
    }

    if (hasKnownStockLimit(item)) {
      const available = Math.max(0, item.available_stock ?? 0);

      if (!item.in_stock || available <= 0) {
        setInventoryMessageById((current) => ({
          ...current,
          [item.id]: "Avail at property",
        }));
        return;
      }

      if (currentQuantity >= available) {
        setInventoryMessageById((current) => ({
          ...current,
          [item.id]: `Only ${available} available`,
        }));
        return;
      }
    }

    setInventoryMessageById((current) => ({
      ...current,
      [item.id]: "",
    }));
    setAddonQuantity(item.id, currentQuantity + 1);
  }, [draft?.addons, setAddonQuantity]);

  const decrementAddon = useCallback((item: StoreCatalogItem) => {
    const currentQuantity = draft?.addons.find((addon) => addon.productId === item.id)?.quantity ?? 0;
    setInventoryMessageById((current) => ({
      ...current,
      [item.id]: "",
    }));
    setAddonQuantity(item.id, Math.max(0, currentQuantity - 1));
  }, [draft?.addons, setAddonQuantity]);

  const validateAndStoreGuestDetails = useCallback(() => {
    if (!guestForm) {
      return false;
    }

    const errors = validateGuestForm(guestForm);
    setGuestErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Complete the guest details before continuing.");
      return false;
    }

    updateGuestProfile({
      name: `${guestForm.firstName} ${guestForm.lastName}`.trim(),
      email: normalizeEmail(guestForm.email),
      phone: normalizePhone(guestForm.phone) || null,
    });

    return true;
  }, [guestForm, updateGuestProfile]);

  const openAddonsTab = useCallback(() => {
    if (!validateAndStoreGuestDetails()) {
      return;
    }

    setActiveTab("addons");
  }, [validateAndStoreGuestDetails]);

  const handleTabClick = useCallback((tab: ReviewTab) => {
    if (tab === "guest") {
      setActiveTab("guest");
      return;
    }

    if (tab === "addons") {
      openAddonsTab();
      return;
    }
  }, [openAddonsTab]);

  const handlePayment = useCallback(async () => {
    if (!draft || !guestForm) {
      return;
    }

    const token = getStoredGuestToken();
    if (!token || !isAuthenticated) {
      resumePaymentAfterAuthRef.current = true;
      openAuthModal("signin");
      return;
    }

    resumePaymentAfterAuthRef.current = false;

    setIsPaying(true);
    setFlowStage("creating-order");

    try {
      const activeRooms = draft.rooms.filter((room) => room.quantity > 0);
      const selectedAddons = draft.addons.filter((addon) => addon.quantity > 0);

      if (isColiveDraft(draft)) {
        if (activeRooms.length !== 1 || activeRooms[0]?.quantity !== 1) {
          toast.error("Select one Colive room for this checkout.");
          setFlowStage("failed");
          return;
        }

        const activeRoom = activeRooms[0];
        const coliveRoomTypeId = getColiveRoomOptionId(activeRoom);
        const selectedColiveAddons = selectedAddons.map((addon) => ({
          addon_id: addon.productId,
          quantity: addon.quantity,
        }));
        const durationDays = getColiveDurationDays(draft.colive.durationMonths);

        const quote = await createColiveQuote(token, {
          property_id: draft.colive.propertyId,
          room_type_id: coliveRoomTypeId,
          move_in_date: draft.colive.moveInDate,
          duration_days: durationDays,
          stay_type: draft.colive.stayType,
          addons: selectedColiveAddons,
          coupon_code: guestForm.coupon || null,
        });

        const coliveDraft = await createColiveDraftBooking(token, {
          quote_id: quote.quote_id,
          property_id: draft.colive.propertyId,
          room_type_id: coliveRoomTypeId,
          move_in_date: draft.colive.moveInDate,
          duration_days: durationDays,
          stay_type: draft.colive.stayType,
          guest_details: {
            first_name: guestForm.firstName.trim(),
            last_name: guestForm.lastName.trim(),
            email: normalizeEmail(guestForm.email),
            phone: normalizePhone(guestForm.phone),
          },
          addons: selectedColiveAddons,
          source: "web_colive_property_page",
          notes: "Shared booking review checkout for Colive monthly flow.",
        });

        setFlowStage("creating-payment-order");
        const paymentOrder = await createColivePaymentOrder(token, {
          draft_booking_id: coliveDraft.draft_booking_id,
          grand_total: coliveDraft.charges.grand_total,
          currency: quote.currency,
        });

        setFlowStage("opening-razorpay");
        await loadRazorpayCheckout();

        if (!window.Razorpay) {
          throw new Error("Razorpay checkout did not initialise correctly.");
        }

        const Razorpay = window.Razorpay;
        paymentHandledRef.current = false;

        await new Promise<void>((resolve, reject) => {
          const markFailed = (message: string) => {
            if (paymentHandledRef.current) {
              return;
            }

            paymentHandledRef.current = true;
            setFlowStage("failed");
            reject(new Error(message));
          };

          const razorpay = new Razorpay({
            key: paymentOrder.razorpay_key,
            amount: paymentOrder.amount_paise,
            currency: paymentOrder.currency,
            order_id: paymentOrder.razorpay_order_id,
            name: "The Daily Social",
            description: `${draft.colive.propertyName || propertyHero.title} Colive booking`,
            prefill: {
              name: `${guestForm.firstName} ${guestForm.lastName}`.trim(),
              email: normalizeEmail(guestForm.email),
              contact: normalizePhone(guestForm.phone),
            },
            theme: {
              color: "#c62828",
            },
            notes: {
              draft_booking_id: coliveDraft.draft_booking_id,
              property_id: draft.colive.propertyId,
              duration_days: String(durationDays),
            },
            modal: {
              ondismiss: () => {
                markFailed("Payment was cancelled before confirmation.");
              },
            },
            handler: async (response: RazorpaySuccessResponse) => {
              if (paymentHandledRef.current) {
                return;
              }

              paymentHandledRef.current = true;
              setFlowStage("verifying-payment");

              try {
                const verification = await verifyColivePayment(token, {
                  draft_booking_id: coliveDraft.draft_booking_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });

                clearBookingDraft();
                setFlowStage("confirmed");
                toast.success("Payment successful! Redirecting to My Bookings...");
                router.push(`/bookings?fresh=${encodeURIComponent(verification.booking_reference || verification.booking_id)}`);
                resolve();
              } catch (error) {
                console.error("Failed to verify Colive payment", error);
                setFlowStage("failed");
                toast.error("Payment verification is still pending. Please check My Bookings in a moment.");
                reject(error instanceof Error ? error : new Error("Colive payment verification failed."));
              }
            },
          });

          razorpay.on("payment.failed", () => {
            toast.error("Razorpay reported a payment failure. Please try again.");
            markFailed("Razorpay reported a payment failure. Please try again.");
          });

          razorpay.open();
        });
        return;
      }

      const storedState = getStoredBookingState();
      const pendingSnapshot = storedState?.pendingOrder?.signature === draft.signature ? storedState.pendingOrder : null;

      const orderSummary = pendingSnapshot
        ? {
            ezee_reservation_id: pendingSnapshot.order.ezeeReservationId,
            property_id: pendingSnapshot.order.propertyId,
            property_name: pendingSnapshot.order.propertyName,
            checkin_date: pendingSnapshot.order.checkinDate,
            checkout_date: pendingSnapshot.order.checkoutDate,
            total_guests: pendingSnapshot.order.totalGuests,
            no_of_nights: pendingSnapshot.order.noOfNights,
            rooms: [],
            addons: [],
            subtotal_rooms: pendingSnapshot.order.subtotalRooms,
            subtotal_addons: pendingSnapshot.order.subtotalAddons,
            grand_total: pendingSnapshot.order.grandTotal,
            addon_order_id: pendingSnapshot.order.addonOrderId,
            status: pendingSnapshot.order.status,
          }
        : await createGuestBookingOrder(token, {
            // Keep the payload backend-safe: only send normalized booking primitives and applied add-ons.
            property_id: draft.propertyId,
            checkin_date: draft.checkinDate,
            checkout_date: draft.checkoutDate,
            rooms: activeRooms.map((room) => ({
              room_type_id: room.roomTypeId,
              quantity: room.quantity,
            })),
            addons: selectedAddons.map((addon) => ({
              product_id: addon.productId,
              quantity: addon.quantity,
            })),
          });

      savePendingBookingOrder({
        signature: draft.signature,
        order: {
          ezeeReservationId: orderSummary.ezee_reservation_id,
          propertyId: orderSummary.property_id,
          propertyName: orderSummary.property_name,
          checkinDate: orderSummary.checkin_date,
          checkoutDate: orderSummary.checkout_date,
          totalGuests: orderSummary.total_guests,
          noOfNights: orderSummary.no_of_nights,
          subtotalRooms: orderSummary.subtotal_rooms,
          subtotalAddons: orderSummary.subtotal_addons,
          grandTotal: orderSummary.grand_total,
          addonOrderId: orderSummary.addon_order_id ?? null,
          status: orderSummary.status,
        },
      });

      setFlowStage("creating-payment-order");
      const payableGrandTotal = Math.max(0, Math.round(estimatedGrandTotal));
      const paymentOrder = await createBookingPaymentOrder(token, {
        ezee_reservation_id: orderSummary.ezee_reservation_id,
        grand_total: payableGrandTotal,
        ...(orderSummary.addon_order_id ? { addon_order_id: orderSummary.addon_order_id } : {}),
      });

      setFlowStage("opening-razorpay");
      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout did not initialise correctly.");
      }

      const Razorpay = window.Razorpay;
      paymentHandledRef.current = false;

      await new Promise<void>((resolve, reject) => {
        const markFailed = async (message: string) => {
          if (paymentHandledRef.current) {
            return;
          }

          paymentHandledRef.current = true;
          setFlowStage("failed");

          try {
            await failBookingPayment(token, paymentOrder.razorpay_order_id);
          } catch (error) {
            console.error("Failed to roll back booking payment", error);
          }

          clearPendingBookingOrder();
          reject(new Error(message));
        };

        const razorpay = new Razorpay({
          key: paymentOrder.razorpay_key,
          amount: paymentOrder.amount_paise,
          currency: paymentOrder.currency,
          order_id: paymentOrder.razorpay_order_id,
          name: "The Daily Social",
          description: `${orderSummary.property_name} booking`,
          prefill: {
            name: `${guestForm.firstName} ${guestForm.lastName}`.trim(),
            email: guestForm.email,
            contact: guestForm.phone,
          },
          theme: {
            color: "#c62828",
          },
          notes: {
            ezee_reservation_id: orderSummary.ezee_reservation_id,
            property_id: orderSummary.property_id,
            guests: String(totalGuests),
          },
          modal: {
            ondismiss: () => {
              void markFailed("Payment was cancelled before confirmation.");
            },
          },
          handler: async (response: RazorpaySuccessResponse) => {
            if (paymentHandledRef.current) {
              return;
            }

            paymentHandledRef.current = true;
            setFlowStage("verifying-payment");

            try {
              const verification = await verifyBookingPayment(token, response);
              clearPendingBookingOrder();
              clearBookingDraft();
              const confirmedRooms = Array.isArray(orderSummary.rooms) ? orderSummary.rooms : [];
              const confirmedAddons = Array.isArray(orderSummary.addons) ? orderSummary.addons : [];
              saveConfirmedBookingSnapshot({
                ezeeReservationId: orderSummary.ezee_reservation_id,
                propertyId: orderSummary.property_id,
                propertyName: orderSummary.property_name || propertyHero.title,
                roomTypeName: draft.rooms.map((room) => room.title).join(", "),
                roomSummary: draft.rooms
                  .filter((room) => room.quantity > 0)
                  .map((room) => `${room.title} x${room.quantity}`)
                  .join(", "),
                checkinDate: orderSummary.checkin_date,
                checkoutDate: orderSummary.checkout_date,
                amountPaid: verification.total,
                paymentId: verification.payment_id,
                noOfNights: orderSummary.no_of_nights,
                totalGuests: orderSummary.total_guests,
                status: "CONFIRMED",
                addonOrderId: orderSummary.addon_order_id ?? null,
                primaryGuest: {
                  firstName: guestForm.firstName,
                  lastName: guestForm.lastName,
                  email: normalizeEmail(guestForm.email),
                  phone: normalizePhone(guestForm.phone),
                },
                additionalGuests: guestForm.additionalGuests,
                rooms: confirmedRooms.map((room) => ({
                  roomTypeId: room.room_type_id,
                  roomTypeName: room.room_type_name,
                  type: room.type,
                  quantity: room.quantity,
                  pricePerNight: room.price_per_night,
                  lineTotal: room.line_total,
                })),
                addons: confirmedAddons.map((addon) => ({
                  productId: addon.product_id,
                  productName: addon.product_name,
                  category: draft.addons.find((draftAddon) => draftAddon.productId === addon.product_id)?.category ?? "SERVICE",
                  quantity: addon.quantity,
                  unitPrice: addon.unit_price,
                  lineTotal: addon.line_total,
                })),
                pricing: {
                  subtotalRooms: orderSummary.subtotal_rooms,
                  subtotalAddons: orderSummary.subtotal_addons,
                  taxes,
                  grandTotal: verification.total,
                },
                createdAt: Date.now(),
              });
              setFlowStage("confirmed");
              toast.success("Payment successful! Redirecting to My Bookings...");
              router.push(`/bookings?fresh=${encodeURIComponent(orderSummary.ezee_reservation_id)}`);
              resolve();
            } catch (error) {
              clearPendingBookingOrder();
              console.error("Failed to verify booking payment", error);
              setFlowStage("failed");
              toast.error("Payment verification is still pending. Please check My Bookings in a moment.");
              reject(error instanceof Error ? error : new Error("Payment verification failed."));
            }
          },
        });

        razorpay.on("payment.failed", () => {
          toast.error("Razorpay reported a payment failure. Please try again.");
          void markFailed("Razorpay reported a payment failure. Please try again.");
        });

        razorpay.open();
      });
    } catch (error) {
      setFlowStage("failed");
      console.error("Failed to start booking checkout", error);
      toast.error("Unable to start checkout right now. Please try again.");
    } finally {
      setIsPaying(false);
    }
  }, [draft, estimatedGrandTotal, guestForm, isAuthenticated, openAuthModal, router, taxes, totalGuests]);

  useEffect(() => {
    if (!isAuthenticated || !resumePaymentAfterAuthRef.current) {
      return;
    }

    resumePaymentAfterAuthRef.current = false;
    void handlePayment();
  }, [handlePayment, isAuthenticated]);

  const openPaymentFlow = useCallback(() => {
    if (!validateAndStoreGuestDetails()) {
      return;
    }

    setActiveTab("addons");
    void handlePayment();
  }, [handlePayment, validateAndStoreGuestDetails]);

  if (!draft || !guestForm) {
    const returnToPropertyHref = getDefaultPropertyDestinationHref(draft?.propertyId);

    return (
      <section className="vh-section min-h-screen pt-28 md:pt-32">
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 lg:px-10">
          <div className="rounded-[28px] border border-white/12 bg-[rgba(15,16,26,0.92)] p-8 text-center shadow-[var(--vh-shadow-lg)]">
            <h1 className="text-3xl font-bold uppercase tracking-[-0.04em] text-white">No active booking draft</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/70">
              Pick your dates and room selection on the property page first, then come back here to review the booking.
            </p>
            <Button asChild className="mt-6 rounded-full px-6">
              <Link href={returnToPropertyHref}>
                Return to property
                <ArrowLeft className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const bookingSummaryDesktop = (
    <aside className="relative hidden self-start lg:sticky lg:top-28 lg:block">
      <div className="rounded-[22px] border border-dashed border-[rgba(255,255,255,0.28)] bg-[#07070a] shadow-[0_20px_45px_rgba(0,0,0,0.24)]">
        <div className="p-6">
          <h2 className="font-sectiontitle text-[22px] text-white">Booking details</h2>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-4">
            <div>
              <p className="font-caption text-white/55">{isColiveBooking ? "Move-in" : "Check-in"}</p>
              <p className="font-subtitle mt-1 text-white">{formatDateLabel(draft.checkinDate)}</p>
              <p className="text-[11px] text-white/48">{isColiveBooking ? "monthly stay" : `from ${propertyGuidelines.checkIn}`}</p>
            </div>
            <div className="rounded bg-[#f9cb37] px-2 py-1 text-[10px] font-bold uppercase text-black">
              {stayUnitCount} {stayUnitLabel}
            </div>
            <div className="text-right">
              <p className="font-caption text-white/55">{isColiveBooking ? "Until" : "Check-out"}</p>
              <p className="font-subtitle mt-1 text-white">{formatDateLabel(draft.checkoutDate)}</p>
              <p className="text-[11px] text-white/48">{isColiveBooking ? "backend quote before payment" : `by ${propertyGuidelines.checkOut}`}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
            <div>
              <p className="font-bodyfocus text-[18px] text-white">{draft.colive?.propertyName || propertyHero.title}</p>
              <p className="font-caption text-white/48">{isColiveBooking ? "Koramangala, Bengaluru" : propertyHero.location}</p>
            </div>
            {draft.rooms.map((room) => (
              <div key={room.roomTypeId} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-body text-sm text-white/92">{room.title}</p>
                  <p className="text-xs text-white/48">
                    {formatCurrency(room.basePrice)} x {room.quantity} x {stayUnitCount} {stayUnitLabel}
                  </p>
                </div>
                <p className="font-body text-sm text-white">{formatCurrency(room.basePrice * room.quantity * stayUnitCount)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm text-white/82">
            <div className="flex items-center justify-between">
              <p className="font-body">Room charges</p>
              <p className="font-body text-white">{formatCurrency(roomSubtotal)}</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body">Coupon deduction</p>
                {appliedCoupon ? <p className="font-caption text-[#f9cb37]">{appliedCoupon.code}</p> : null}
              </div>
              <p className="font-body text-[#05DF72]">- {formatCurrency(couponDiscount)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-body">Total room charges</p>
              <p className="font-body text-white">{formatCurrency(discountedRoomSubtotal)}</p>
            </div>
            <div className="space-y-3 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <p className="font-body">Add-ons</p>
                <p className="font-caption text-white/48">{activeAddons.length === 0 ? "None" : `${activeAddons.length} selected`}</p>
              </div>
              {activeAddons.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-white/12 bg-black/20 px-3 py-3 text-xs text-white/55">
                  No extras added yet.
                </p>
              ) : (
                activeAddons.map((addon) => (
                  <div key={addon.productId} className="flex items-start justify-between gap-3 rounded-[12px] border border-white/10 bg-black/20 px-3 py-3">
                    <div>
                      <p className="font-body text-sm text-white/92">{addon.name}</p>
                      <p className="text-xs text-white/48">
                        {formatCurrency(addon.unitPrice)} x {addon.quantity}
                      </p>
                    </div>
                    <p className="font-body text-sm text-white">{formatCurrency(addon.unitPrice * addon.quantity)}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <p className="font-body">Total extra charges</p>
              <p className="font-body text-white">{formatCurrency(addonSubtotal)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-body">Total charges</p>
              <p className="font-body text-white">{formatCurrency(totalCharges)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-body inline-flex items-center gap-1">
                Taxes
                <span className="group relative inline-flex">
                  <Info className="h-3.5 w-3.5 text-white/45" />
                  <span className="pointer-events-none absolute left-0 top-[calc(100%+8px)] hidden min-w-[220px] rounded-md border border-white/15 bg-[#10111a] px-3 py-2 text-[11px] leading-4 text-white/85 shadow-[0_10px_28px_rgba(0,0,0,0.35)] group-hover:block">
                    <span className="block">Room GST - {formatCurrency(roomTaxExact)}</span>
                    {Object.entries(addonTaxBreakdown).map(([label, value]) => (
                      <span key={label} className="mt-1 block">
                        {label} GST - {formatCurrency(value)}
                      </span>
                    ))}
                    {addonTaxExact <= 0 ? <span className="mt-1 block">Add-ons GST - {formatCurrency(0)}</span> : null}
                  </span>
                </span>
              </p>
              <p className="font-body text-white">{formatCurrency(taxes)}</p>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-4">
              <p className="font-sectiontitle text-lg text-white">Final total price</p>
              <p className="font-bodyfocus text-[28px] text-white">{formatCurrency(estimatedGrandTotal)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4">
          {activeTab === "guest" ? (
            <button
              className="vh-cta-button w-full justify-center text-base"
              onClick={openAddonsTab}
              type="button"
            >
              Continue to add-ons
            </button>
          ) : (
            <button
              className="vh-cta-button w-full justify-center text-base disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPaying}
              onClick={openPaymentFlow}
              type="button"
            >
              {isPaying ? "Opening Razorpay..." : "Continue to payment"}
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  const reviewTabs = [
    { key: "guest" as const, label: "Guest details", icon: User },
    { key: "addons" as const, label: "Add to your stay", icon: PlusCircle },
  ];

  const eventCta = (
    <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#fb7185,#f59e0b_52%,#fde68a)] text-[#2f1100] shadow-[0_14px_30px_rgba(249,115,22,0.26)]">
          <PartyPopper className="h-8 w-8" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f7c948]">Events</p>
              <h2 className="mt-2 font-sectiontitle text-[22px] text-white md:text-[24px]">Step out after check-in.</h2>
            </div>
            <StickerTag label="After hours" bg="#3b82f6" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" text="#ffffff" rotate="rotate-[-8deg]" />
          </div>
          <p className="mt-3 font-body text-sm leading-6 text-white/72">
            Keep this booking compact, then jump into the event lineup for live music, mixers, and rooftop scenes.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link className="vh-cta-button w-full justify-center sm:w-auto" href="/events">
              Explore events
            </Link>
            <Link className="inline-flex items-center justify-center rounded-[14px] border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-white/10 sm:w-auto" href="/events?tab=rsvp">
              RSVP board
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07070a] pb-28 text-white lg:pb-12">
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-8 pt-20 md:px-6 md:pb-12 md:pt-24">
        <div className="bg-[#07070a] px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8">
          <div className="relative space-y-4 sm:space-y-5">
            <div className="space-y-4 sm:space-y-5">
              <div>
                <h1 className="vh-title mt-3 max-w-4xl text-center text-[28px] leading-[1.04] text-white sm:mt-4 md:text-[42px] lg:text-[56px]">
                  Lock the bunk. Add the fun.
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mb-10 mt-8 flex max-w-[760px] items-center justify-center">
          <div className="grid w-full items-start gap-3" style={{ gridTemplateColumns: `repeat(${reviewTabs.length}, minmax(0, 1fr))` }}>
            {reviewTabs.map((tab, index) => {
              const isActive = activeTab === tab.key;
              const isComplete = tab.key === "guest" && activeTab !== "guest";
              const Icon = tab.icon;

              return (
                <div key={tab.key} className="relative flex flex-col items-center gap-3">
                  {index < reviewTabs.length - 1 ? (
                    <div className={`absolute left-[calc(50%+28px)] top-6 hidden h-[2px] w-[calc(100%-56px)] md:block ${activeTab !== "guest" && index === 0 ? "bg-[#c62828]" : "bg-white/10"}`} />
                  ) : null}
                  <button
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-[14px] ${tabButtonClasses(isActive, isComplete)}`}
                    onClick={() => handleTabClick(tab.key)}
                    type="button"
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                  <div className="flex flex-col items-center gap-2">
                    <p className={`text-center text-[11px] font-bold uppercase tracking-[0.08em] ${isActive || isComplete ? "text-white" : "text-white/45"}`}>
                      {tab.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6">
            {activeTab === "guest" ? (
              <>
                <div className="overflow-hidden rounded-[22px] border border-dashed border-[rgba(255,255,255,0.28)] bg-[#07070a] shadow-[0_20px_45px_rgba(0,0,0,0.24)]">
                  <div className="p-6 md:p-8">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-sectiontitle text-[22px] text-white md:text-[24px]">Guest details</h2>
                      </div>
                      <StickerTag label="Your Identity, Jefe!" bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" text="#111111" rotate="rotate-[6deg]" />
                      {!isAuthenticated ? (
                        <button
                          className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/82"
                          onClick={() => openAuthModal("signin")}
                          type="button"
                        >
                          Sign in
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-white/60">First name *</span>
                        <input
                          autoComplete="given-name"
                          className={`w-full rounded-[14px] border bg-black/30 px-4 py-4 text-base text-white outline-none ${guestErrors.firstName ? "border-[#ff2e62]" : "border-white/10 focus:border-[#c62828]"}`}
                          onChange={(event) => updateGuestField("firstName", event.target.value)}
                          value={guestForm.firstName}
                        />
                        {guestErrors.firstName ? <span className="mt-2 block text-xs text-[#ff2e62]">{guestErrors.firstName}</span> : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-white/60">Last name *</span>
                        <input
                          autoComplete="family-name"
                          className={`w-full rounded-[14px] border bg-black/30 px-4 py-4 text-base text-white outline-none ${guestErrors.lastName ? "border-[#ff2e62]" : "border-white/10 focus:border-[#c62828]"}`}
                          onChange={(event) => updateGuestField("lastName", event.target.value)}
                          value={guestForm.lastName}
                        />
                        {guestErrors.lastName ? <span className="mt-2 block text-xs text-[#ff2e62]">{guestErrors.lastName}</span> : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-white/60">Email *</span>
                        <input
                          autoComplete="email"
                          className={`w-full rounded-[14px] border bg-black/30 px-4 py-4 text-base text-white outline-none ${guestErrors.email ? "border-[#ff2e62]" : "border-white/10 focus:border-[#c62828]"}`}
                          onChange={(event) => updateGuestField("email", normalizeEmail(event.target.value))}
                          type="email"
                          value={guestForm.email}
                        />
                        <span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-white/40">
                          {guestErrors.email || "Confirmation email will be sent here"}
                        </span>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-white/60">Phone number *</span>
                        <input
                          autoComplete="tel"
                          className={`w-full rounded-[14px] border bg-black/30 px-4 py-4 text-base text-white outline-none ${guestErrors.phone ? "border-[#ff2e62]" : "border-white/10 focus:border-[#c62828]"}`}
                          inputMode="tel"
                          onChange={(event) => updateGuestField("phone", normalizePhone(event.target.value))}
                          placeholder="Enter phone number"
                          type="tel"
                          value={guestForm.phone}
                        />
                        <span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-white/40">
                          {guestErrors.phone || "Helps us reach you if needed"}
                        </span>
                      </label>
                    </div>

                    {guestForm.additionalGuests.length > 0 ? (
                      <div className="mt-6 rounded-[14px] border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">Other guest details</p>
                            <p className="text-xs uppercase tracking-[0.12em] text-white/45">
                              Optional for {guestForm.additionalGuests.length} {guestForm.additionalGuests.length === 1 ? "guest" : "guests"}
                            </p>
                          </div>
                          <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/55">
                            Optional
                          </div>
                        </div>

                        <div className="mt-4 space-y-4">
                          {guestForm.additionalGuests.map((additionalGuest, index) => (
                            <div key={`additional-guest-${index}`} className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4">
                              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/72">Guest {index + 2}</p>
                              <div className="mt-3 grid gap-4 md:grid-cols-2">
                                <label className="block">
                                  <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">Full name</span>
                                  <input
                                    className="w-full rounded-[12px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]"
                                    onChange={(event) => updateAdditionalGuest(index, "name", event.target.value)}
                                    value={additionalGuest.name}
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">Phone number</span>
                                  <input
                                    className="w-full rounded-[12px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#00f0ff]"
                                    inputMode="tel"
                                    onChange={(event) => updateAdditionalGuest(index, "phone", normalizePhone(event.target.value))}
                                    type="tel"
                                    value={additionalGuest.phone}
                                  />
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className={`mt-6 rounded-[14px] border p-4 ${guestErrors.acceptedTerms ? "border-[#e30613]" : "border-[rgba(198,40,40,0.2)]"}`}>
                      <label className="flex items-start gap-3">
                        <input
                          checked={guestForm.acceptedTerms}
                          className="mt-1 h-4 w-4 accent-[#c62828]"
                          onChange={(event) => updateGuestField("acceptedTerms", event.target.checked)}
                          type="checkbox"
                        />
                        <span className="text-sm leading-6 text-white/80">
                          Yes, I confirm <span className="font-bold text-white">all the guests are above 18 year old</span> and I acknowledge and accept the{" "}
                          <Link className="text-[#00f0ff] hover:underline" href="/policies">
                            Terms of Booking Conditions, Cancellation Policy &amp; Property Policy.
                          </Link>
                        </span>
                      </label>
                      {guestErrors.acceptedTerms ? <span className="mt-2 block text-xs text-[#ff2e62]">{guestErrors.acceptedTerms}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[22px] border border-dashed border-[rgba(255,255,255,0.28)] bg-[#07070a] shadow-[0_20px_45px_rgba(0,0,0,0.24)]">
                  <div className="p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="font-sectiontitle text-[22px] text-white md:text-[24px]">Coupon codes</h2>
                      <StickerTag label="Unlock rewards" bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" text="#111111" rotate="rotate-[6deg]" />
                    </div>
                    <div className="mt-5 flex gap-3">
                      <input
                        className="flex-1 rounded-[14px] border border-white/10 bg-black/30 px-4 py-4 text-base text-white outline-none focus:border-white/25"
                        onChange={(event) => handleCouponInputChange(event.target.value)}
                        placeholder="Have a coupon code?"
                        value={guestForm.coupon}
                      />
                      <button
                        className="rounded-[12px] border border-white/15 bg-white/5 px-5 text-sm font-bold uppercase tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isApplyingCoupon}
                        onClick={() => void applyCoupon()}
                        type="button"
                      >
                        {isApplyingCoupon ? "Applying..." : "Apply"}
                      </button>
                    </div>
                    {couponMessage ? (
                      <p className={`mt-3 text-sm ${appliedCoupon ? "text-[#05DF72]" : "text-white/60"}`}>{couponMessage}</p>
                    ) : null}

                    <div className="mt-5 space-y-3">
                      {PROMO_CODES.map((coupon) => (
                        <button
                          key={coupon.code}
                          className={`block w-full rounded-[14px] border p-4 text-left ${guestForm.coupon === coupon.code ? "border-white/25 bg-white/5" : "border-white/10 bg-black/20"}`}
                          onClick={() => handleCouponInputChange(coupon.code)}
                          type="button"
                        >
                          <p className="font-bodyfocus text-base text-white">{coupon.code}</p>
                          <p className="mt-1 font-body text-sm text-white/82">{coupon.description}</p>
                          <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/40">
                            {coupon.minGuests ? `${coupon.minGuests}+ guests required` : `${coupon.discountPercent}% off room charges`}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[22px] border border-dashed border-[rgba(255,255,255,0.28)] bg-[#07070a] shadow-[0_20px_45px_rgba(0,0,0,0.24)]">
                  <div className="p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="font-sectiontitle text-[22px] text-white md:text-[24px]">Booking policies</h2>
                      <StickerTag label="Read the rules" bg="#dc2626" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" text="#ffffff" rotate="rotate-[6deg]" />
                    </div>
                    <div className="mt-4">
                      <Accordion defaultValue={["general-policy"]} type="multiple">
                        {POLICY_SECTIONS.map((policy) => (
                          <AccordionItem key={policy.id} className="border-b border-white/5" value={policy.id}>
                            <AccordionTrigger className="text-base font-medium text-white/80">{policy.label}</AccordionTrigger>
                            <AccordionContent className="space-y-2 text-sm leading-6">
                              {policy.content.map((line) => (
                                <p key={line}>- {line}</p>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === "addons" ? (
              <>
                <div className="overflow-hidden rounded-[22px] border border-dashed border-[rgba(255,255,255,0.28)] bg-[#07070a] shadow-[0_20px_45px_rgba(0,0,0,0.24)]">
                  <div className="p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="font-sectiontitle text-[22px] text-white md:text-[24px]">Add essentials</h2>
                      <StickerTag label="Level up" bg="#ec4899" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" text="#ffffff" rotate="rotate-[10deg]" />
                    </div>

                    {catalogLoading ? (
                      <div aria-busy="true" aria-live="polite" className="mt-5 space-y-3" role="status">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={`catalog-loading-${index}`} className="flex items-center justify-between rounded-[14px] border border-white/10 bg-black/20 px-4 py-4">
                            <div className="flex min-w-0 items-center gap-4">
                              <Skeleton className="h-12 w-12 rounded-[14px] bg-white/10" />
                              <div className="min-w-0 space-y-2">
                                <Skeleton className="h-4 w-44 bg-white/10" />
                                <Skeleton className="h-3 w-28 bg-white/10" />
                              </div>
                            </div>
                            <Skeleton className="h-9 w-20 rounded-[10px] bg-white/10" />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {!catalogLoading && commodityItems.length === 0 ? (
                      <div className="mt-5 rounded-[14px] border border-dashed border-white/12 bg-black/20 px-4 py-5 text-sm text-white/70">
                        No essentials are available right now.
                      </div>
                    ) : null}

                    <div className="mt-5 divide-y divide-white/5">
                      {commodityItems.map((item) => {
                        const { icon: Icon, frameClassName } = addonPresentation(item.name);
                        const quantity = draft.addons.find((addon) => addon.productId === item.id)?.quantity ?? 0;
                        const disabled = isItemDisabled(item);
                        const helperMessage = inventoryMessageById[item.id] || (!item.in_stock ? "Available at property" : "");

                        return (
                          <div key={item.id} className={`flex items-center justify-between gap-4 py-4 ${disabled ? "opacity-55" : ""}`}>
                            <div className="flex min-w-0 items-center gap-4">
                              <div className={`flex h-14 w-14 items-center justify-center rounded-[18px] ${frameClassName}`}>
                                <Icon className="h-7 w-7" strokeWidth={2.1} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bodyfocus text-[18px] text-white">{item.name}</p>
                                <p className="font-body text-sm text-white/78">{formatCurrency(item.base_price)}</p>
                                {item.category === "RETURNABLE" ? (
                                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/55">Issued for stay, collected later</p>
                                ) : null}
                                {helperMessage ? <p className="mt-1 text-xs uppercase tracking-[0.08em] text-white/55">{helperMessage}</p> : null}
                              </div>
                            </div>

                            {quantity > 0 ? (
                              <div className="flex items-center gap-3 rounded-[10px] border border-white/10 bg-black/40 px-2 py-1">
                                <button className="flex h-8 w-8 items-center justify-center rounded-[8px] text-white hover:bg-white/5" onClick={() => decrementAddon(item)} type="button">
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-4 text-center text-base font-bold text-white">{quantity}</span>
                                <button className="flex h-8 w-8 items-center justify-center rounded-[8px] text-white hover:bg-white/5" onClick={() => incrementAddon(item)} type="button">
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="rounded-[10px] border border-white/15 bg-white/5 px-5 py-2 text-sm font-bold uppercase tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/40"
                                disabled={disabled}
                                onClick={() => incrementAddon(item)}
                                type="button"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {eventCta}

                <div className="overflow-hidden rounded-[22px] border border-dashed border-[rgba(255,255,255,0.28)] bg-[#07070a] shadow-[0_20px_45px_rgba(0,0,0,0.24)]">
                  <div className="p-6 md:p-8">
                    <h2 className="font-sectiontitle text-[22px] text-white md:text-[24px]">Add to your stay</h2>

                    {!catalogLoading && serviceItems.length === 0 ? (
                      <div className="mt-5 rounded-[14px] border border-dashed border-white/12 bg-black/20 px-4 py-5 text-sm text-white/70">
                        No stay upgrades are available right now.
                      </div>
                    ) : null}

                    <div className="mt-5 divide-y divide-white/5">
                      {serviceItems.map((item) => {
                        const { icon: Icon, frameClassName } = addonPresentation(item.name);
                        const quantity = draft.addons.find((addon) => addon.productId === item.id)?.quantity ?? 0;
                        const singleQuantity = isSingleQuantityService(item);
                        const helperMessage = inventoryMessageById[item.id] || (singleQuantity ? "Only 1 per booking" : "");

                        return (
                          <div key={item.id} className="flex items-center justify-between gap-4 py-4">
                            <div className="flex min-w-0 items-center gap-4">
                              <div className={`flex h-14 w-14 items-center justify-center rounded-[18px] ${frameClassName}`}>
                                <Icon className="h-7 w-7" strokeWidth={2.1} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bodyfocus text-[18px] text-white">{item.name}</p>
                                <p className="font-body text-sm text-white/78">
                                  {item.base_price > 0 ? `Starts at ${formatCurrency(item.base_price)}` : "Included on request"}
                                </p>
                                {helperMessage ? (
                                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-white/55">{helperMessage}</p>
                                ) : null}
                              </div>
                            </div>

                            {quantity > 0 ? (
                              <div className="flex items-center gap-3 rounded-[10px] border border-white/10 bg-black/40 px-2 py-1">
                                <button className="flex h-8 w-8 items-center justify-center rounded-[8px] text-white hover:bg-white/5" onClick={() => decrementAddon(item)} type="button">
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-4 text-center text-base font-bold text-white">{quantity}</span>
                                <button
                                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent"
                                  disabled={singleQuantity && quantity >= 1}
                                  onClick={() => incrementAddon(item)}
                                  type="button"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="rounded-[10px] border border-white/15 bg-white/5 px-5 py-2 text-sm font-bold uppercase tracking-[0.08em] text-white"
                                onClick={() => incrementAddon(item)}
                                type="button"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {bookingSummaryDesktop}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[rgba(17,17,17,0.96)] backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xl font-bold text-white">{formatCurrency(estimatedGrandTotal)}</p>
            <button className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-white/72" onClick={() => setShowMobileSummary(true)} type="button">
              Price breakup
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>

          {activeTab === "guest" ? (
            <button className="vh-cta-button px-5 py-3 text-sm" onClick={openAddonsTab} type="button">
              Continue
            </button>
          ) : (
            <button
              className="vh-cta-button px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPaying}
              onClick={openPaymentFlow}
              type="button"
            >
              {isPaying ? "Opening..." : "Pay now"}
            </button>
          )}
        </div>
      </div>

      <div className={`fixed inset-0 z-[60] transition ${showMobileSummary ? "pointer-events-auto bg-black/80" : "pointer-events-none bg-transparent"}`}>
        <div className={`absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-[28px] border-t border-white/10 bg-[#07070a] transition-transform duration-300 ${showMobileSummary ? "translate-y-0" : "translate-y-full"}`}>
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-lg font-bold uppercase text-white">Booking details</p>
              <p className="text-xs uppercase tracking-[0.12em] text-white/45">Review the current price breakup</p>
            </div>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white" onClick={() => setShowMobileSummary(false)} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[14px] border border-white/10 bg-white/5 px-4 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">{isColiveBooking ? "Move-in" : "Check-in"}</p>
                <p className="mt-1 text-base font-bold text-white">{formatDateLabel(draft.checkinDate)}</p>
                <p className="text-[10px] text-white/40">{isColiveBooking ? "monthly stay" : `from ${propertyGuidelines.checkIn}`}</p>
              </div>
              <div className="rounded bg-[#f9cb37] px-2 py-1 text-[10px] font-bold uppercase text-black">
                {stayUnitCount} {stayUnitLabel}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">{isColiveBooking ? "Until" : "Check-out"}</p>
                <p className="mt-1 text-base font-bold text-white">{formatDateLabel(draft.checkoutDate)}</p>
                <p className="text-[10px] text-white/40">{isColiveBooking ? "backend quote before payment" : `by ${propertyGuidelines.checkOut}`}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[14px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-base font-bold text-white">{draft.colive?.propertyName || propertyHero.title}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/45">{isColiveBooking ? "Koramangala, Bengaluru" : propertyHero.location}</p>
              </div>
              {draft.rooms.map((room) => (
                <div key={room.roomTypeId} className="flex items-start justify-between gap-3 rounded-[14px] border border-white/10 bg-white/5 px-4 py-4">
                  <div>
                    <p className="font-semibold text-white">{room.title}</p>
                    <p className="text-xs text-white/55">
                      {formatCurrency(room.basePrice)} x {room.quantity} x {stayUnitCount} {stayUnitLabel}
                    </p>
                  </div>
                  <p className="font-semibold text-white">{formatCurrency(room.basePrice * room.quantity * stayUnitCount)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-[14px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/82">
              <div className="flex items-center justify-between">
                <p>Room charges</p>
                <p className="font-bold text-white">{formatCurrency(roomSubtotal)}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p>Coupon deduction</p>
                  {appliedCoupon ? <p className="text-[11px] uppercase tracking-[0.12em] text-[#f9cb37]">{appliedCoupon.code}</p> : null}
                </div>
                <p className="font-bold text-[#05DF72]">- {formatCurrency(couponDiscount)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p>Total room charges</p>
                <p className="font-bold text-white">{formatCurrency(discountedRoomSubtotal)}</p>
              </div>
              <div className="space-y-3 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <p>Add-ons</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/45">{activeAddons.length === 0 ? "None" : `${activeAddons.length} selected`}</p>
                </div>
                {activeAddons.length === 0 ? (
                  <p className="rounded-[12px] border border-dashed border-white/12 bg-black/20 px-3 py-3 text-xs text-white/55">
                    No extras added yet.
                  </p>
                ) : (
                  activeAddons.map((addon) => (
                    <div key={addon.productId} className="flex items-start justify-between gap-3 rounded-[12px] border border-white/10 bg-black/20 px-3 py-3">
                      <div>
                        <p className="font-semibold text-white">{addon.name}</p>
                        <p className="text-xs text-white/55">
                          {formatCurrency(addon.unitPrice)} x {addon.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-white">{formatCurrency(addon.unitPrice * addon.quantity)}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <p>Total extra charges</p>
                <p className="font-bold text-white">{formatCurrency(addonSubtotal)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p>Total charges</p>
                <p className="font-bold text-white">{formatCurrency(totalCharges)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p>Taxes</p>
                <p className="font-bold text-white">{formatCurrency(taxes)}</p>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-4">
                <p className="text-lg font-bold uppercase text-white">Final total price</p>
                <p className="text-[28px] font-bold text-white">{formatCurrency(estimatedGrandTotal)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
