import { requestJson } from "@/lib/vibehouse-api";

export type StoreCatalogItem = {
  id: string;
  name: string;
  category: "COMMODITY" | "SERVICE" | "BORROWABLE" | "RETURNABLE";
  base_price: number;
  in_stock: boolean;
  available_stock: number | null;
};

export type CreateBookingOrderPayload = {
  property_id: string;
  checkin_date: string;
  checkout_date: string;
  rooms: Array<{
    room_type_id: string;
    quantity: number;
  }>;
  addons?: Array<{
    product_id: string;
    quantity: number;
  }>;
};

export type CreateBookingOrderResponse = {
  ezee_reservation_id: string;
  property_id: string;
  property_name: string;
  checkin_date: string;
  checkout_date: string;
  no_of_nights: number;
  total_guests: number;
  rooms: Array<{
    room_type_id: string;
    room_type_name: string;
    type: string;
    quantity: number;
    price_per_night: number;
    line_total: number;
  }>;
  addons: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  subtotal_rooms: number;
  subtotal_addons: number;
  grand_total: number;
  addon_order_id?: string | null;
  status: string;
};

export type CreateBookingPaymentOrderResponse = {
  razorpay_order_id: string;
  razorpay_key: string;
  amount: number;
  amount_paise: number;
  currency: string;
  payment_id: string;
  ezee_reservation_id: string;
  guest?: {
    email?: string | null;
  };
};

export type ColiveStayType = "solo" | "couple" | "remote";

export type CreateColiveQuotePayload = {
  property_id: string;
  room_type_id: string;
  move_in_date: string;
  duration_days: number;
  stay_type: ColiveStayType;
  addons: Array<{
    addon_id: string;
    quantity: number;
  }>;
  coupon_code?: string | null;
};

export type CreateColiveQuoteResponse = {
  quote_id: string;
  currency: string;
  charges: {
    room_subtotal: number;
    addon_subtotal: number;
    discount_total?: number;
    deposit_total?: number;
    tax_total?: number;
    grand_total: number;
  };
};

export type CreateColiveDraftBookingPayload = {
  quote_id: string;
  property_id: string;
  room_type_id: string;
  move_in_date: string;
  duration_days: number;
  stay_type: ColiveStayType;
  guest_details: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  addons: Array<{
    addon_id: string;
    quantity: number;
  }>;
  source: string;
  notes?: string | null;
};

export type CreateColiveDraftBookingResponse = {
  draft_booking_id: string;
  status: string;
  charges: {
    room_subtotal: number;
    addon_subtotal: number;
    tax_total?: number;
    grand_total: number;
  };
};

export type CreateColivePaymentOrderResponse = {
  payment_order_id?: string;
  razorpay_order_id: string;
  razorpay_key: string;
  amount: number;
  amount_paise: number;
  currency: string;
  draft_booking_id: string;
  booking_reference?: string;
  guest?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
};

export type VerifyColivePaymentResponse = {
  message: string;
  booking_id: string;
  booking_reference?: string;
  status: string;
  payment_id: string;
  total_paid: number;
  currency: string;
};

export type GuestBookingMineItem = {
  ezee_reservation_id: string;
  role: "PRIMARY" | "SECONDARY";
  status: string;
  room_type_name: string;
  room_number?: string | null;
  checkin_date: string;
  checkout_date: string;
  property_id: string;
  source?: string | null;
  total_slots?: number;
  kyc_completed_slots?: number;
};

export type LinkGuestBookingResponse = {
  message: string;
  access: {
    role: "PRIMARY" | "SECONDARY";
    status: string;
  };
  booking: {
    ezee_reservation_id: string;
    property_id: string;
    room_type_name: string;
    room_number?: string | null;
    checkin_date: string;
    checkout_date: string;
    no_of_guests?: number;
    source?: string | null;
    status: string;
  };
  slots: BookingSlotSummary[];
};

export type BookingSlotSummary = {
  slot_id: string;
  slot_number: number;
  label: string;
  guest_id: string | null;
  guest_name?: string | null;
  kyc_status: string;
  can_edit?: boolean;
};

export type BookingKycSlotsResponse = {
  ezee_reservation_id: string;
  total_slots: number;
  slots: BookingSlotSummary[];
};

export type BookingKycDetailResponse = {
  slot: BookingSlotSummary;
  kyc: {
    id: string;
    nationality_type: string;
    id_type: string;
    full_name: string;
    date_of_birth: string;
    id_number: string;
    permanent_address: string;
    contact_number: string;
    coming_from: string;
    going_to: string;
    purpose: string;
    front_image_url?: string | null;
    back_image_url?: string | null;
    ocr_name?: string | null;
    ocr_dob?: string | null;
    ocr_id_number?: string | null;
    ocr_address?: string | null;
    consent_given?: boolean;
    status: string;
    submitted_at?: string | null;
    submitted_by_guest_id?: string | null;
  } | null;
};

export type KycUploadUrlResponse = {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
};

export type KycOcrResponse = {
  ocr_name?: string | null;
  ocr_dob?: string | null;
  ocr_id_number?: string | null;
  ocr_address?: string | null;
  id_type_detected?: string | null;
  confidence?: Record<string, number>;
};

export type KycSubmitPayload = {
  nationality_type: string;
  id_type: string;
  full_name: string;
  date_of_birth: string;
  id_number: string;
  permanent_address: string;
  contact_number: string;
  coming_from: string;
  going_to: string;
  purpose: string;
  front_image_url?: string;
  back_image_url?: string;
  consent_given: boolean;
};

export async function getStoreCatalog(propertyId?: string): Promise<StoreCatalogItem[]> {
  const normalizedPropertyId = propertyId?.trim();
  const path = normalizedPropertyId
    ? `/guest/store/catalog?property_id=${encodeURIComponent(normalizedPropertyId)}`
    : "/guest/store/catalog";

  return requestJson<StoreCatalogItem[]>(path, { method: "GET" });
}

export async function createGuestBookingOrder(
  token: string,
  payload: CreateBookingOrderPayload,
): Promise<CreateBookingOrderResponse> {
  return requestJson<CreateBookingOrderResponse>("/guest/booking/create-order", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function createColiveQuote(
  token: string,
  payload: CreateColiveQuotePayload,
): Promise<CreateColiveQuoteResponse> {
  return requestJson<CreateColiveQuoteResponse>("/guest/colive/quote", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function createColiveDraftBooking(
  token: string,
  payload: CreateColiveDraftBookingPayload,
): Promise<CreateColiveDraftBookingResponse> {
  return requestJson<CreateColiveDraftBookingResponse>("/guest/colive/draft-booking", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function createColivePaymentOrder(
  token: string,
  payload: {
    draft_booking_id: string;
    grand_total: number;
    currency: string;
  },
): Promise<CreateColivePaymentOrderResponse> {
  return requestJson<CreateColivePaymentOrderResponse>("/payment/create-colive-order", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function verifyColivePayment(
  token: string,
  payload: {
    draft_booking_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
): Promise<VerifyColivePaymentResponse> {
  return requestJson<VerifyColivePaymentResponse>("/payment/verify-colive", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function createBookingPaymentOrder(
  token: string,
  payload: {
    ezee_reservation_id: string;
    grand_total: number;
    addon_order_id?: string;
  },
): Promise<CreateBookingPaymentOrderResponse> {
  return requestJson<CreateBookingPaymentOrderResponse>("/payment/create-booking-order", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function verifyBookingPayment(
  token: string,
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
): Promise<{
  message: string;
  payment_id: string;
  order_id?: string;
  total: number;
}> {
  return requestJson("/payment/verify", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function failBookingPayment(
  token: string,
  razorpayOrderId: string,
): Promise<{
  message: string;
  payment_id: string;
  razorpay_order_id: string;
}> {
  return requestJson("/payment/fail", {
    method: "POST",
    body: { razorpay_order_id: razorpayOrderId },
    token,
  });
}

export async function getGuestBookings(token: string): Promise<GuestBookingMineItem[]> {
  return requestJson<GuestBookingMineItem[]>("/guest/booking/mine", {
    method: "GET",
    token,
  });
}

export async function linkGuestBooking(token: string, ezeeReservationId: string): Promise<LinkGuestBookingResponse> {
  return requestJson<LinkGuestBookingResponse>("/guest/booking/link", {
    method: "POST",
    body: { ezee_reservation_id: ezeeReservationId },
    token,
  });
}

export async function getBookingKycSlots(token: string, ezeeReservationId: string): Promise<BookingKycSlotsResponse> {
  return requestJson<BookingKycSlotsResponse>(`/guest/kyc/${encodeURIComponent(ezeeReservationId)}/slots`, {
    method: "GET",
    token,
  });
}

export async function getBookingKycDetail(
  token: string,
  ezeeReservationId: string,
  slotId: string,
): Promise<BookingKycDetailResponse> {
  return requestJson<BookingKycDetailResponse>(
    `/guest/kyc/${encodeURIComponent(ezeeReservationId)}/slots/${encodeURIComponent(slotId)}`,
    {
      method: "GET",
      token,
    },
  );
}

export async function addBookingKycSlot(
  token: string,
  ezeeReservationId: string,
): Promise<BookingSlotSummary> {
  return requestJson<BookingSlotSummary>(`/guest/kyc/${encodeURIComponent(ezeeReservationId)}/slots/add`, {
    method: "POST",
    token,
  });
}

export async function deleteBookingKycSlot(
  token: string,
  ezeeReservationId: string,
  slotId: string,
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/guest/kyc/${encodeURIComponent(ezeeReservationId)}/slots/${encodeURIComponent(slotId)}`,
    {
      method: "DELETE",
      token,
    },
  );
}

export async function getBookingKycUploadUrl(
  token: string,
  ezeeReservationId: string,
  payload: {
    file_name: string;
    content_type: string;
  },
): Promise<KycUploadUrlResponse> {
  return requestJson<KycUploadUrlResponse>(`/guest/kyc/${encodeURIComponent(ezeeReservationId)}/upload-url`, {
    method: "POST",
    body: payload,
    token,
  });
}

export async function uploadFileToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Document upload failed. Please try again.");
  }
}

export async function runBookingKycOcr(
  token: string,
  ezeeReservationId: string,
  slotId: string,
  payload: {
    front_image_key: string;
    back_image_key?: string;
  },
): Promise<KycOcrResponse> {
  return requestJson<KycOcrResponse>(
    `/guest/kyc/${encodeURIComponent(ezeeReservationId)}/slots/${encodeURIComponent(slotId)}/ocr`,
    {
      method: "POST",
      body: payload,
      token,
    },
  );
}

export async function submitBookingKyc(
  token: string,
  ezeeReservationId: string,
  slotId: string,
  payload: KycSubmitPayload,
): Promise<{
  message: string;
  kyc_id: string;
  slot_id: string;
  status: string;
  full_name: string;
}> {
  return requestJson(
    `/guest/kyc/${encodeURIComponent(ezeeReservationId)}/slots/${encodeURIComponent(slotId)}/submit`,
    {
      method: "POST",
      body: payload,
      token,
    },
  );
}
