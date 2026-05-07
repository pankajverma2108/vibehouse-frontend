export type BookingDraftRoom = {
  roomTypeId: string;
  slug: string;
  title: string;
  roomType: string;
  quantity: number;
  basePrice: number;
  totalPrice: number;
  availableCount: number;
  guestText: string;
  image?: string;
  amenities: string[];
};

export type BookingDraftAddon = {
  productId: string;
  name: string;
  category: "COMMODITY" | "SERVICE" | "RETURNABLE";
  quantity: number;
  unitPrice: number;
  inStock: boolean;
};

export type BookingDraft = {
  propertyId: string;
  checkinDate: string;
  checkoutDate: string;
  rooms: BookingDraftRoom[];
  addons: BookingDraftAddon[];
  signature: string;
  createdAt: number;
  source?: "nightly" | "colive";
  colive?: {
    propertyId: string;
    moveInDate: string;
    durationMonths: number;
    stayType: "solo" | "couple" | "remote";
    propertyName?: string;
  };
};

export type BookingReviewGuest = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  coupon: string;
  acceptedTerms: boolean;
  additionalGuests: Array<{
    name: string;
    phone: string;
  }>;
};

export type PendingBookingSnapshot = {
  signature: string;
  order: {
    ezeeReservationId: string;
    propertyId: string;
    propertyName: string;
    checkinDate: string;
    checkoutDate: string;
    totalGuests: number;
    noOfNights: number;
    subtotalRooms: number;
    subtotalAddons: number;
    grandTotal: number;
    addonOrderId: string | null;
    status: string;
  };
};

export type ConfirmedBookingSnapshot = {
  ezeeReservationId: string;
  propertyId: string;
  propertyName: string;
  roomTypeName: string;
  roomSummary: string;
  checkinDate: string;
  checkoutDate: string;
  amountPaid: number;
  paymentId: string;
  noOfNights?: number;
  totalGuests?: number;
  status?: string;
  addonOrderId?: string | null;
  primaryGuest?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  additionalGuests?: Array<{
    name: string;
    phone: string;
  }>;
  rooms?: Array<{
    roomTypeId: string;
    roomTypeName: string;
    type: string;
    quantity: number;
    pricePerNight: number;
    lineTotal: number;
  }>;
  addons?: Array<{
    productId: string;
    productName: string;
    category: "COMMODITY" | "SERVICE" | "RETURNABLE";
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  pricing?: {
    subtotalRooms: number;
    subtotalAddons: number;
    taxes: number;
    grandTotal: number;
  };
  createdAt: number;
};

const BOOKING_DRAFT_KEY = "vh_booking_draft";
const CONFIRMED_BOOKING_PREFIX = "vh_confirmed_booking:";

type StoredBookingState = {
  draft: BookingDraft;
  pendingOrder?: PendingBookingSnapshot | null;
  review?: {
    signature: string;
    guest: BookingReviewGuest;
  } | null;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function buildBookingSignature(draft: {
  propertyId: string;
  checkinDate: string;
  checkoutDate: string;
  rooms: Array<{ roomTypeId: string; quantity: number }>;
  addons: Array<{ productId: string; quantity: number }>;
}): string {
  const rooms = [...draft.rooms]
    .filter((room) => room.quantity > 0)
    .sort((left, right) => left.roomTypeId.localeCompare(right.roomTypeId))
    .map((room) => `${room.roomTypeId}:${room.quantity}`)
    .join("|");

  const addons = [...draft.addons]
    .filter((addon) => addon.quantity > 0)
    .sort((left, right) => left.productId.localeCompare(right.productId))
    .map((addon) => `${addon.productId}:${addon.quantity}`)
    .join("|");

  return [draft.propertyId, draft.checkinDate, draft.checkoutDate, rooms, addons].join("::");
}

export function getStoredBookingState(): StoredBookingState | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(BOOKING_DRAFT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredBookingState>;
    if (!parsed?.draft) {
      return null;
    }

    return {
      draft: parsed.draft as BookingDraft,
      pendingOrder: parsed.pendingOrder ?? null,
      review: parsed.review ?? null,
    };
  } catch {
    return null;
  }
}

export function saveBookingDraft(draft: BookingDraft): void {
  if (!isBrowser()) {
    return;
  }

  const current = getStoredBookingState();
  const nextState: StoredBookingState = {
    draft,
    pendingOrder: current?.pendingOrder?.signature === draft.signature ? current.pendingOrder : null,
    review: current?.review?.signature === draft.signature ? current.review : null,
  };

  window.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(nextState));
}

export function savePendingBookingOrder(snapshot: PendingBookingSnapshot): void {
  if (!isBrowser()) {
    return;
  }

  const current = getStoredBookingState();
  if (!current?.draft) {
    return;
  }

  const nextState: StoredBookingState = {
    draft: current.draft,
    pendingOrder: snapshot,
    review: current.review ?? null,
  };

  window.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(nextState));
}

export function clearPendingBookingOrder(): void {
  if (!isBrowser()) {
    return;
  }

  const current = getStoredBookingState();
  if (!current?.draft) {
    return;
  }

  const nextState: StoredBookingState = {
    draft: current.draft,
    pendingOrder: null,
    review: current.review ?? null,
  };

  window.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(nextState));
}

export function saveBookingReviewGuest(signature: string, guest: BookingReviewGuest): void {
  if (!isBrowser()) {
    return;
  }

  const current = getStoredBookingState();
  if (!current?.draft || current.draft.signature !== signature) {
    return;
  }

  const nextState: StoredBookingState = {
    draft: current.draft,
    pendingOrder: current.pendingOrder ?? null,
    review: {
      signature,
      guest,
    },
  };

  window.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(nextState));
}

export function clearBookingDraft(): void {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);
}

export function saveConfirmedBookingSnapshot(snapshot: ConfirmedBookingSnapshot): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(`${CONFIRMED_BOOKING_PREFIX}${snapshot.ezeeReservationId}`, JSON.stringify(snapshot));
}

export function getConfirmedBookingSnapshot(ezeeReservationId: string): ConfirmedBookingSnapshot | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(`${CONFIRMED_BOOKING_PREFIX}${ezeeReservationId}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ConfirmedBookingSnapshot;
  } catch {
    return null;
  }
}
