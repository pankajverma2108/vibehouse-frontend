"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { StickySummary } from "@/components/guest/sticky-summary";
import { Button } from "@/components/ui/button";
import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { useGuestCatalog } from "@/hooks/use-guest-catalog";
import { addToCart, getCart, removeCartItem, updateCartItem, type GuestCart } from "@/lib/guest-experience-api";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { useGuestExperience } from "@/state/guest-experience-provider";

const DEFAULT_UNIT_CODE = "AUTO-UNIT";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

export function GuestAddons() {
  const { guest, isAuthenticated, openAuthModal } = useGuestAuth();
  const { selectedBookingId, setCartCount } = useGuestExperience();
  const activeBooking = useMemo(
    () => guest?.bookings?.find((booking) => booking.ezee_reservation_id === selectedBookingId) ?? null,
    [guest?.bookings, selectedBookingId],
  );
  const propertyId = activeBooking?.property_id ?? "";
  const { data, loading: catalogLoading, error: catalogError, reload } = useGuestCatalog(propertyId, Boolean(propertyId && selectedBookingId && isAuthenticated));
  const [cart, setCart] = useState<GuestCart | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const visibleCart = selectedBookingId && isAuthenticated ? cart : null;

  const addonItems = useMemo(
    () => (Array.isArray(data.addons) ? data.addons : []).filter((item) => item.category === "COMMODITY" || item.category === "RETURNABLE"),
    [data.addons],
  );

  const cartByProductId = useMemo(() => {
    const next = new Map<string, { itemId: string; quantity: number }>();
    for (const item of visibleCart?.items ?? []) {
      const current = next.get(item.product_id);
      if (current) {
        next.set(item.product_id, { itemId: current.itemId, quantity: current.quantity + item.quantity });
      } else {
        next.set(item.product_id, { itemId: item.id, quantity: item.quantity });
      }
    }
    return next;
  }, [visibleCart?.items]);

  useEffect(() => {
    setCartCount((visibleCart?.items ?? []).length);
  }, [setCartCount, visibleCart?.items]);

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
        setCartLoading(true);
        setCartError(null);
      }
    });

    void getCart(selectedBookingId, token)
      .then((nextCart) => {
        if (!cancelled) {
          setCart(nextCart);
          setCartCount((nextCart.items ?? []).length);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to load cart.";
          setCartError(message);
          const fallback = { order_id: null, items: [], total: 0 };
          setCart(fallback);
          setCartCount(fallback.items.length);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCartLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, selectedBookingId, setCartCount]);

  const requireBookingAndToken = () => {
    if (!selectedBookingId) {
      toast.error("No active booking found for add-ons.");
      return null;
    }

    if (!isAuthenticated) {
      openAuthModal("signin");
      return null;
    }

    const token = getStoredGuestToken();
    if (!token) {
      openAuthModal("signin");
      return null;
    }

    return { bookingId: selectedBookingId, token };
  };

  const onIncrement = async (productId: string, availableStock: number | null) => {
    const auth = requireBookingAndToken();
    if (!auth) {
      return;
    }

    const currentQty = cartByProductId.get(productId)?.quantity ?? 0;
    const nextQty = availableStock === null ? currentQty + 1 : Math.min(currentQty + 1, Math.max(availableStock, 0));
    if (nextQty === currentQty) {
      toast.message("Stock limit reached for this item.");
      return;
    }

    setMutatingId(productId);
    setMutationError(null);
    try {
      if (currentQty === 0) {
        const nextCart = await addToCart(auth.bookingId, { product_id: productId, quantity: 1, unit_code: DEFAULT_UNIT_CODE }, auth.token);
        setCart(nextCart);
        setCartCount((nextCart.items ?? []).length);
      } else {
        const cartItem = cartByProductId.get(productId);
        if (!cartItem) {
          return;
        }
        const nextCart = await updateCartItem(auth.bookingId, cartItem.itemId, { quantity: nextQty }, auth.token);
        setCart(nextCart);
        setCartCount((nextCart.items ?? []).length);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update cart.";
      setMutationError("Something went wrong while updating cart.");
      toast.error(message);
    } finally {
      setMutatingId(null);
    }
  };

  const onDecrement = async (productId: string) => {
    const auth = requireBookingAndToken();
    if (!auth) {
      return;
    }

    const cartItem = cartByProductId.get(productId);
    if (!cartItem) {
      return;
    }

    setMutatingId(productId);
    setMutationError(null);
    try {
      if (cartItem.quantity <= 1) {
        const nextCart = await removeCartItem(auth.bookingId, cartItem.itemId, auth.token);
        setCart(nextCart);
        setCartCount((nextCart.items ?? []).length);
      } else {
        const nextQuantity = Math.max(0, cartItem.quantity - 1);
        const nextCart = await updateCartItem(auth.bookingId, cartItem.itemId, { quantity: nextQuantity }, auth.token);
        setCart(nextCart);
        setCartCount((nextCart.items ?? []).length);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update cart.";
      setMutationError("Something went wrong while updating cart.");
      toast.error(message);
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SectionBlock
        description="Pick the extras you want now and keep everything together in one cart."
        sticker={guestStickerTags.addons}
        title="Add-ons"
      >
        {catalogLoading ? <p className="text-sm text-white/70">Loading add-ons...</p> : null}
        {catalogError ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-rose-300">{catalogError}</p>
            <Button className="h-8 rounded-[10px] px-3 text-xs" onClick={() => void reload()} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        ) : null}
        {cartError ? <p className="text-sm text-rose-300">{cartError}</p> : null}
        {mutationError ? <p className="text-sm text-rose-300">{mutationError}</p> : null}
        {!catalogLoading && addonItems.length === 0 ? <p className="text-sm text-white/70">No add-ons available right now.</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {addonItems.map((item) => {
            const cartEntry = cartByProductId.get(item.id);
            const quantity = cartEntry?.quantity ?? 0;
            const disabled = mutatingId === item.id || cartLoading || (!item.in_stock && item.available_stock !== null);
            return (
              <BentoCard
                key={item.id}
                description={`${formatCurrency(item.base_price)}${item.available_stock !== null ? ` / Stock ${item.available_stock}` : ""}`}
                icon={ShoppingBag}
                title={item.name}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.08em] text-white/55">In cart: {quantity}</div>
                  <div className="flex items-center gap-2">
                    <Button className="h-8 w-8 rounded-[10px] px-0" disabled={disabled || quantity <= 0} onClick={() => void onDecrement(item.id)} type="button">
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Button className="h-8 w-8 rounded-[10px] px-0" disabled={disabled} onClick={() => void onIncrement(item.id, item.available_stock)} type="button">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </BentoCard>
            );
          })}
        </div>
      </SectionBlock>
      <StickySummary
        items={[
          { label: "Add-ons", value: `${(visibleCart?.items ?? []).length} lines` },
          { label: "Borrow", value: "Check borrow tab" },
          { label: "Total", value: formatCurrency(visibleCart?.total ?? 0) },
        ]}
      />
    </div>
  );
}
