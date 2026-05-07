import { requestJson } from "@/lib/vibehouse-api";

export type GuestCatalogItem = {
  id: string;
  name: string;
  category: "COMMODITY" | "SERVICE" | "BORROWABLE" | "RETURNABLE";
  base_price: number;
  in_stock: boolean;
  available_stock: number | null;
};

export type GuestServiceItem = {
  id: string;
  name: string;
  code?: string;
  category?: string;
  base_price?: number;
  in_stock?: boolean;
  available_stock?: number | null;
};

export type GuestBorrowableItem = {
  id: string;
  name: string;
  available: number;
  total: number;
};

export type GuestCartItem = {
  id: string;
  product_id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_code?: string;
};

export type GuestCart = {
  order_id: string | null;
  phase?: string;
  items: GuestCartItem[];
  total: number;
};

export type AddToCartPayload = {
  product_id: string;
  quantity: number;
  unit_code: string;
};

export type UpdateCartItemPayload = {
  quantity: number;
};

export type BorrowMineItem = {
  id: string;
  product_name: string;
  status: string;
  checked_out_at: string | null;
  returned_at: string | null;
};

export type RequestBorrowPayload = {
  product_id: string;
  expected_duration_hours?: number;
};

export type RequestServicePayload = {
  product_id: string;
  notes?: string;
};

export type CheckoutCartResponse = {
  message: string;
  order_id: string;
  payment_id?: string;
  total: number;
  items_count: number;
};

export type CreatePaymentOrderPayload = {
  ezee_reservation_id: string;
};

export type CreatePaymentOrderResponse = {
  razorpay_order_id: string;
  razorpay_key: string;
  amount: number;
  amount_paise: number;
  currency: string;
  payment_id: string;
  order_id?: string;
  guest?: {
    email?: string | null;
  };
};

export type VerifyPaymentPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type VerifyPaymentResponse = {
  message: string;
  payment_id: string;
  order_id?: string;
  total: number;
  items_count?: number;
};

export type FailPaymentPayload = {
  razorpay_order_id: string;
};

export type FailPaymentResponse = {
  message: string;
  payment_id: string;
  razorpay_order_id: string;
};

export type GuestDashboardBooking = {
  ezee_reservation_id: string;
  role: "PRIMARY" | "SECONDARY";
  status: string;
  room_type_name: string;
  room_number?: string | null;
  checkin_date: string;
  checkout_date: string;
  property_id: string;
  property_name?: string | null;
  door_passcode?: string | null;
  lock_status?: string | null;
};

function withPropertyId(path: string, propertyId: string): string {
  return `${path}?property_id=${encodeURIComponent(propertyId.trim())}`;
}

export async function getCatalog(propertyId: string): Promise<GuestCatalogItem[]> {
  return requestJson<GuestCatalogItem[]>(withPropertyId("/guest/store/catalog", propertyId), { method: "GET" });
}

export async function getServices(propertyId: string): Promise<GuestServiceItem[]> {
  return requestJson<GuestServiceItem[]>(withPropertyId("/guest/store/services", propertyId), { method: "GET" });
}

export async function getBorrowables(propertyId: string): Promise<GuestBorrowableItem[]> {
  return requestJson<GuestBorrowableItem[]>(withPropertyId("/guest/store/borrowables", propertyId), { method: "GET" });
}

export async function getCart(eri: string, token: string): Promise<GuestCart> {
  return requestJson<GuestCart>(`/guest/store/cart/${encodeURIComponent(eri)}`, { method: "GET", token });
}

export async function addToCart(eri: string, payload: AddToCartPayload, token: string): Promise<GuestCart> {
  return requestJson<GuestCart>(`/guest/store/cart/${encodeURIComponent(eri)}/add`, { method: "POST", body: payload, token });
}

export async function updateCartItem(eri: string, itemId: string, payload: UpdateCartItemPayload, token: string): Promise<GuestCart> {
  return requestJson<GuestCart>(`/guest/store/cart/${encodeURIComponent(eri)}/item/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: payload,
    token,
  });
}

export async function removeCartItem(eri: string, itemId: string, token: string): Promise<GuestCart> {
  return requestJson<GuestCart>(`/guest/store/cart/${encodeURIComponent(eri)}/item/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    token,
  });
}

export async function getBorrowMine(eri: string, token: string): Promise<BorrowMineItem[]> {
  return requestJson<BorrowMineItem[]>(`/guest/store/${encodeURIComponent(eri)}/borrowable/mine`, { method: "GET", token });
}

export async function requestBorrow(eri: string, payload: RequestBorrowPayload, token: string): Promise<{ message: string; checkout_id: string }> {
  return requestJson<{ message: string; checkout_id: string }>(`/guest/store/${encodeURIComponent(eri)}/borrowable/request`, {
    method: "POST",
    body: payload,
    token,
  });
}

export async function requestService(eri: string, payload: RequestServicePayload, token: string): Promise<{ message: string; ticket_id: string; service_name: string }> {
  return requestJson<{ message: string; ticket_id: string; service_name: string }>(`/guest/store/${encodeURIComponent(eri)}/service/request`, {
    method: "POST",
    body: payload,
    token,
  });
}

export async function checkoutCart(eri: string, token: string): Promise<CheckoutCartResponse> {
  return requestJson<CheckoutCartResponse>(`/guest/store/cart/${encodeURIComponent(eri)}/checkout`, { method: "POST", token });
}

export async function createPaymentOrder(payload: CreatePaymentOrderPayload, token: string): Promise<CreatePaymentOrderResponse> {
  return requestJson<CreatePaymentOrderResponse>("/payment/create-order", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function verifyPayment(payload: VerifyPaymentPayload, token: string): Promise<VerifyPaymentResponse> {
  return requestJson<VerifyPaymentResponse>("/payment/verify", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function failPayment(payload: FailPaymentPayload, token: string): Promise<FailPaymentResponse> {
  return requestJson<FailPaymentResponse>("/payment/fail", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function getGuestBookings(token: string): Promise<GuestDashboardBooking[]> {
  return requestJson<GuestDashboardBooking[]>("/guest/booking/mine", {
    method: "GET",
    token,
  });
}
