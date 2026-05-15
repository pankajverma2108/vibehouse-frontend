"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, PackageCheck, ReceiptText, ShoppingBag, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { Button } from "@/components/ui/button";
import {
  checkoutCart,
  createPaymentOrder,
  failPayment,
  getBorrowMine,
  getCart,
  verifyPayment,
  type BorrowMineItem,
  type GuestCart,
} from "@/lib/guest-experience-api";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { useGuestExperience } from "@/state/guest-experience-provider";

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, callback: (response: unknown) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Payment UI is available only in browser."));
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load payment UI.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load payment UI."));
    document.body.appendChild(script);
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function formatRentalStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function GuestCheckout() {
  const { selectedBookingId, setCartCount, setBorrowCount, markPaymentCompleted } = useGuestExperience();
  const { isAuthenticated, openAuthModal } = useGuestAuth();
  const [cart, setCart] = useState<GuestCart | null>(null);
  const [mine, setMine] = useState<BorrowMineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<string>("Ready");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const visibleCart = selectedBookingId && isAuthenticated ? cart : null;
  const visibleMine = useMemo(() => (selectedBookingId && isAuthenticated ? mine : []), [isAuthenticated, mine, selectedBookingId]);

  const activeBorrowCount = useMemo(
    () => visibleMine.filter((item) => item.status === "CHECKED_OUT" || item.status === "OVERDUE").length,
    [visibleMine],
  );

  const fetchCheckoutState = async (bookingId: string, token: string) => {
    return Promise.all([getCart(bookingId, token), getBorrowMine(bookingId, token)]);
  };

  const refreshState = async (bookingId: string, token: string) => {
    const [nextCart, nextMine] = await fetchCheckoutState(bookingId, token);
    setCart(nextCart);
    setMine(Array.isArray(nextMine) ? nextMine : []);
  };

  useEffect(() => {
    setCartCount((visibleCart?.items ?? []).length);
  }, [setCartCount, visibleCart?.items]);

  useEffect(() => {
    setBorrowCount(activeBorrowCount);
  }, [activeBorrowCount, setBorrowCount]);

  useEffect(() => {
    if (!selectedBookingId || !isAuthenticated) {
      return;
    }
    const token = getStoredGuestToken();
    if (!token) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setLoadError(null);
      }
    });

    void fetchCheckoutState(selectedBookingId, token)
      .then(([nextCart, nextMine]) => {
        if (!cancelled) {
          setCart(nextCart);
          setMine(Array.isArray(nextMine) ? nextMine : []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to load checkout state.";
          setLoadError(message);
          setCart({ order_id: null, items: [], total: 0 });
          setMine([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, selectedBookingId]);

  const openPaymentFlow = async () => {
    if (isPaying) {
      return;
    }
    if (!selectedBookingId) {
      toast.error("No active booking found.");
      return;
    }
    if (!isAuthenticated) {
      openAuthModal("signin");
      return;
    }
    const token = getStoredGuestToken();
    if (!token) {
      openAuthModal("signin");
      return;
    }

    setIsPaying(true);
    setPaymentError(null);
    setCheckoutStatus("Preparing checkout...");
    try {
      await checkoutCart(selectedBookingId, token);
      await refreshState(selectedBookingId, token);
      markPaymentCompleted();
      setCheckoutStatus("Creating payment order...");
      const order = await createPaymentOrder({ ezee_reservation_id: selectedBookingId }, token);

      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error("Payment UI failed to initialize.");
      }

      await new Promise<void>((resolve, reject) => {
        const Razorpay = window.Razorpay as RazorpayConstructor;
        const instance = new Razorpay({
          key: order.razorpay_key,
          order_id: order.razorpay_order_id,
          amount: order.amount_paise,
          currency: order.currency,
          name: "The Daily Social",
          description: "Guest checkout",
          prefill: {
            email: order.guest?.email ?? "",
          },
          handler: async (response: RazorpaySuccessResponse) => {
            try {
              setCheckoutStatus("Verifying payment...");
              await verifyPayment(
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                token,
              );
              await refreshState(selectedBookingId, token);
              markPaymentCompleted();
              setCheckoutStatus("Payment confirmed.");
              toast.success("Payment captured and checkout completed.");
              resolve();
            } catch (verifyError) {
              const message = verifyError instanceof Error ? verifyError.message : "Payment verification failed.";
              reject(new Error(message));
            }
          },
          modal: {
            ondismiss: async () => {
              try {
                await failPayment({ razorpay_order_id: order.razorpay_order_id }, token);
                setCheckoutStatus("Payment cancelled. Retry available.");
                toast.message("Payment cancelled. You can retry.");
                await refreshState(selectedBookingId, token);
                markPaymentCompleted();
                resolve();
              } catch (failError) {
                const message = failError instanceof Error ? failError.message : "Unable to mark payment failure.";
                reject(new Error(message));
              }
            },
          },
        });

        instance.on("payment.failed", async () => {
          try {
            await failPayment({ razorpay_order_id: order.razorpay_order_id }, token);
          } finally {
            setCheckoutStatus("Payment failed. Retry available.");
            toast.error("Payment failed. Please retry.");
            try {
              await refreshState(selectedBookingId, token);
            } catch (refreshError) {
              const message = refreshError instanceof Error ? refreshError.message : "Unable to refresh checkout state.";
              setPaymentError("Something went wrong while refreshing checkout.");
              toast.error(message);
            }
            markPaymentCompleted();
            resolve();
          }
        });

        instance.open();
      });
    } catch (flowError) {
      const message = flowError instanceof Error ? flowError.message : "Unable to complete checkout.";
      setCheckoutStatus(message);
      setPaymentError("Something went wrong during checkout.");
      toast.error(message);
    } finally {
      setIsPaying(false);
    }
  };

  const cartItems = visibleCart?.items ?? [];
  const selectedQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="grid gap-6 pb-10 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] md:pb-12">
      <div className="space-y-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-7">
            <p className="text-[11px] font-black uppercase text-[#f9cb37]">Stay Ledger</p>
            <h1 className="mt-3 font-sectiontitle text-[36px] leading-tight text-white md:text-[52px]">Settle the extras cleanly.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#cbd5e1] md:text-base">
              Review paid add-ons, active rentals, and the amount pending on this stay.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BentoCard description="Cart checkout, payment order creation, and Razorpay verification stay in one flow." icon={WalletCards} sticker={{ label: "Secure", bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" }} title="Payment ready" />
            <BentoCard description="Desk-issued items stay visible here so return status is not hidden." icon={PackageCheck} sticker={{ label: "Active", bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[1deg]" }} title="Rental status" />
          </div>
        </section>

        <SectionBlock
          description="Confirm the current stay charges before continuing to payment."
          sticker={guestStickerTags.checkout}
          title="Checkout Summary"
        >
          {loading ? <p className="text-sm text-white/70">Loading checkout state...</p> : null}
          {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}
          {paymentError ? <p className="text-sm text-rose-300">{paymentError}</p> : null}
          {!selectedBookingId ? <p className="text-sm text-white/70">No active booking selected yet.</p> : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
            <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase text-[#f9cb37]">Add-ons</p>
                  <h3 className="mt-2 font-sectiontitle text-[24px] leading-8 text-white">Cart Items</h3>
                </div>
                <ShoppingBag className="h-5 w-5 text-[#f9cb37]" />
              </div>
              <div className="mt-5 space-y-3">
                {cartItems.length === 0 ? <p className="text-sm text-white/65">No paid add-ons are waiting in the cart.</p> : null}
                {cartItems.map((item) => (
                  <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3" key={item.id}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{item.name}</p>
                      <p className="mt-0.5 text-xs text-white/52">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-black text-white">{formatCurrency(item.total_price)}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase text-[#f9cb37]">Desk items</p>
                  <h3 className="mt-2 font-sectiontitle text-[24px] leading-8 text-white">Rentals</h3>
                </div>
                <ReceiptText className="h-5 w-5 text-[#f9cb37]" />
              </div>
              <div className="mt-5 space-y-3">
                {visibleMine.length === 0 ? <p className="text-sm text-white/65">No active rental items on this stay.</p> : null}
                {visibleMine.slice(0, 4).map((item) => (
                  <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3" key={item.id}>
                    <p className="min-w-0 truncate text-sm font-bold text-white">{item.product_name}</p>
                    <p className="shrink-0 text-xs font-bold uppercase text-white/52">{formatRentalStatus(item.status)}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </SectionBlock>
      </div>

      <aside className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4 shadow-[0_22px_56px_rgba(0,0,0,0.36)] backdrop-blur lg:sticky lg:top-28 lg:self-start">
        <h3 className="font-sectiontitle text-[22px] leading-7 text-white">Checkout Preview</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-1 py-2">
            <span className="text-xs font-bold uppercase text-[#94a3b8]">Add-ons</span>
            <span className="text-sm font-black text-white">{selectedQuantity} selected</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-1 py-2">
            <span className="text-xs font-bold uppercase text-[#94a3b8]">Rentals</span>
            <span className="text-sm font-black text-white">{activeBorrowCount} active</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-1 py-2">
            <span className="text-xs font-bold uppercase text-[#94a3b8]">Total</span>
            <span className="text-sm font-black text-white">{formatCurrency(visibleCart?.total ?? 0)}</span>
          </div>
        </div>
        <div className="mt-4 rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-3 text-sm leading-6 text-white/72">
          {checkoutStatus}
        </div>
        <Button className="mt-4 h-11 w-full rounded-[4px] bg-[var(--vh-pink)] font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]" disabled={isPaying || loading || !selectedBookingId} onClick={() => void openPaymentFlow()} type="button">
          <ClipboardCheck className="mr-2 h-4 w-4" />
          {isPaying ? "Processing..." : "Continue to payment"}
        </Button>
      </aside>
    </div>
  );
}
