import { requestJson } from "@/lib/vibehouse-api";

export type ColiveStayType = "solo" | "couple" | "remote";

export type ColiveSearchPayload = {
  location_id?: string;
  location_slug: string;
  move_in_date: string;
  duration_months: number;
  stay_type: ColiveStayType;
  guest_count?: number;
  selected_plan_id?: string | null;
  currency?: "INR";
};

export type ColiveSearchProperty = {
  property_id: string;
  slug?: string;
  name: string;
  city_label?: string;
  microcopy?: string;
  hero_image_url?: string;
  price_from_monthly?: number | null;
  strike_price_from_monthly?: number | null;
  rating?: number | null;
  rating_label?: string | null;
  primary_tag?: string | null;
  secondary_tag?: string | null;
  amenities?: string[];
  inventory_state?: "available" | "limited" | "sold_out" | string;
  inventory_message?: string | null;
  recommended_for?: ColiveStayType[];
};

export type ColiveSearchResponse = {
  search_id?: string;
  location?: {
    id?: string;
    slug?: string;
    label?: string;
  };
  move_in_date?: string;
  duration_months?: number;
  stay_type?: ColiveStayType;
  properties?: ColiveSearchProperty[];
};

export type ColivePropertyRoom = {
  room_type_id: string;
  slug?: string;
  name: string;
  description?: string;
  monthly_price?: number | null;
  strike_monthly_price?: number | null;
  available_units?: number | null;
  inventory_message?: string | null;
  feature_points?: string[];
  max_guests?: number | null;
  recommended_for?: ColiveStayType[];
  thumbnail_url?: string | null;
};

export type ColivePropertyDetail = {
  property_id: string;
  slug?: string;
  name: string;
  city_label?: string;
  headline?: string;
  subheadline?: string;
  description?: string;
  hero_gallery?: {
    main_image_url?: string | null;
    supporting_image_urls?: string[];
    gallery_count?: number;
  };
  tags?: {
    primary?: string | null;
    secondary?: string | null;
  };
  benefits?: Array<{
    id?: string;
    icon?: string;
    title: string;
    description?: string;
  }>;
  room_options?: ColivePropertyRoom[];
  stories?: Array<{
    id?: string;
    name: string;
    occupation?: string | null;
    quote: string;
    duration?: string | null;
    stay_type?: ColiveStayType | string;
  }>;
  pricing_defaults?: {
    move_in_date?: string;
    duration_months?: number;
    stay_type?: ColiveStayType;
  };
  checkout_notes?: string[];
};

export type ColiveAddon = {
  addon_id: string;
  slug?: string;
  name: string;
  description?: string;
  pricing_model?: "per_month" | "one_time" | string;
  unit_price?: number | null;
  currency?: string;
  max_quantity?: number | null;
  default_quantity?: number | null;
  is_available?: boolean;
  availability_message?: string | null;
  category?: string;
  icon_hint?: string | null;
};

export type ColiveAddonsResponse = {
  property_id: string;
  addons?: ColiveAddon[];
};

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
  expires_at?: string | null;
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

export async function searchColiveInventory(payload: ColiveSearchPayload): Promise<ColiveSearchResponse> {
  return requestJson<ColiveSearchResponse>("/guest/colive/search", {
    method: "POST",
    body: payload,
  });
}

export async function getColivePropertyDetail(params: {
  propertyId: string;
  moveInDate: string;
  durationMonths: number;
  stayType: ColiveStayType;
}): Promise<ColivePropertyDetail> {
  const query = new URLSearchParams({
    move_in_date: params.moveInDate,
    duration_months: String(params.durationMonths),
    stay_type: params.stayType,
  });

  return requestJson<ColivePropertyDetail>(
    `/guest/colive/properties/${encodeURIComponent(params.propertyId)}?${query.toString()}`,
    { method: "GET" },
  );
}

export async function getColivePropertyAddons(params: {
  propertyId: string;
  durationMonths: number;
}): Promise<ColiveAddonsResponse> {
  const query = new URLSearchParams({
    duration_months: String(params.durationMonths),
  });

  return requestJson<ColiveAddonsResponse>(
    `/guest/colive/properties/${encodeURIComponent(params.propertyId)}/addons?${query.toString()}`,
    { method: "GET" },
  );
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
