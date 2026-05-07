"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { StickySummary } from "@/components/guest/sticky-summary";
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
          name: "Vibe House",
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SectionBlock
        description="Review paid extras, settle the total, and finish the stay when you are ready."
        sticker={guestStickerTags.checkout}
        title="Checkout summary"
      >
        {loading ? <p className="text-sm text-white/70">Loading checkout state...</p> : null}
        {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}
        {paymentError ? <p className="text-sm text-rose-300">{paymentError}</p> : null}
        {!selectedBookingId ? <p className="text-sm text-white/70">No active booking selected yet.</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <BentoCard description="Move from review to payment in one smooth flow." icon={ClipboardCheck} title="Actions">
            <div className="space-y-3">
              <p className="text-sm text-white/75">{checkoutStatus}</p>
              <Button className="h-10 rounded-[12px]" disabled={isPaying || loading || !selectedBookingId} onClick={() => void openPaymentFlow()} type="button">
                {isPaying ? "Processing..." : "Continue to payment"}
              </Button>
            </div>
          </BentoCard>
          <BentoCard description="A clean read of what is currently sitting in your checkout total." icon={ReceiptText} title="Totals">
            <div className="space-y-2 text-sm text-white/75">
              <p>Cart lines: {(visibleCart?.items ?? []).length}</p>
              <p>Borrow active: {activeBorrowCount}</p>
              <p className="text-white">Cart total: {formatCurrency(visibleCart?.total ?? 0)}</p>
            </div>
          </BentoCard>
        </div>
      </SectionBlock>
      <StickySummary
        ctaLabel={isPaying ? "Processing..." : "Pay now"}
        items={[
          { label: "Add-ons", value: `${(visibleCart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0)} selected` },
          { label: "Borrow", value: `${activeBorrowCount} active` },
          { label: "Total", value: formatCurrency(visibleCart?.total ?? 0) },
        ]}
        title="Checkout preview"
      />
    </div>
  );
}
