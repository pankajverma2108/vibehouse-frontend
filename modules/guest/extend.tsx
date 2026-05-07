"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarPlus, Moon } from "lucide-react";
import { toast } from "sonner";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { Button } from "@/components/ui/button";
import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { useGuestCatalog } from "@/hooks/use-guest-catalog";
import { addToCart, getCart, type GuestCart, type GuestCatalogItem } from "@/lib/guest-experience-api";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { useGuestExperience } from "@/state/guest-experience-provider";

const DEFAULT_UNIT_CODE = "AUTO-UNIT";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function findServiceByKeyword(services: GuestCatalogItem[], keyword: string): GuestCatalogItem | null {
  const normalized = keyword.trim().toLowerCase();
  return services.find((item) => item.name.toLowerCase().includes(normalized) || item.id.toLowerCase().includes(normalized)) ?? null;
}

function isRelevantExtendService(item: GuestCatalogItem): boolean {
  if (item.category !== "SERVICE" || item.base_price <= 0) {
    return false;
  }

  const normalized = `${item.name} ${item.id}`.toLowerCase();
  return normalized.includes("late checkout")
    || normalized.includes("late-checkout")
    || normalized.includes("early check-in")
    || normalized.includes("early checkin")
    || normalized.includes("early-checkin")
    || normalized.includes("extend stay")
    || normalized.includes("stay extension")
    || normalized.includes("extension");
}

export function GuestExtend() {
  const { guest, isAuthenticated, openAuthModal } = useGuestAuth();
  const { selectedBookingId, setCartCount } = useGuestExperience();
  const activeBooking = useMemo(
    () => guest?.bookings?.find((booking) => booking.ezee_reservation_id === selectedBookingId) ?? null,
    [guest?.bookings, selectedBookingId],
  );
  const propertyId = activeBooking?.property_id ?? "";
  const { data, loading, error, reload } = useGuestCatalog(propertyId, Boolean(propertyId && selectedBookingId && isAuthenticated));
  const [cart, setCart] = useState<GuestCart | null>(null);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const visibleCart = selectedBookingId && isAuthenticated ? cart : null;

  const paidServices = useMemo(() => (Array.isArray(data.addons) ? data.addons : []).filter(isRelevantExtendService), [data.addons]);
  const extendService = useMemo(() => findServiceByKeyword(paidServices, "extend"), [paidServices]);
  const lateCheckoutService = useMemo(() => findServiceByKeyword(paidServices, "late"), [paidServices]);
  const earlyCheckinService = useMemo(() => findServiceByKeyword(paidServices, "early"), [paidServices]);

  useEffect(() => {
    if (!selectedBookingId || !isAuthenticated) {
      return;
    }

    const token = getStoredGuestToken();
    if (!token) {
      return;
    }

    let cancelled = false;
    void getCart(selectedBookingId, token)
      .then((nextCart) => {
        if (!cancelled) {
          setCart(nextCart);
          setCartCount((nextCart.items ?? []).length);
          setCartError(null);
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
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, selectedBookingId, setCartCount]);

  useEffect(() => {
    setCartCount((visibleCart?.items ?? []).length);
  }, [setCartCount, visibleCart?.items]);

  const onAddService = async (service: GuestCatalogItem | null, key: string) => {
    if (!service) {
      toast.message("This option is not open right now.");
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

    setMutatingKey(key);
    setActionError(null);
    try {
      const nextCart = await addToCart(
        selectedBookingId,
        { product_id: service.id, quantity: 1, unit_code: DEFAULT_UNIT_CODE },
        token,
      );
      setCart(nextCart);
      setCartCount((nextCart.items ?? []).length);
      toast.success(`${service.name} added to cart.`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to add this service.";
      setActionError("Something went wrong while adding service.");
      toast.error(message);
    } finally {
      setMutatingKey(null);
    }
  };

  return (
    <SectionBlock
      description="Need a little more time? Choose the stay extension that fits the day."
      sticker={guestStickerTags.extend}
      title="Extend stay"
    >
      {loading ? <p className="text-sm text-white/70">Loading extension services...</p> : null}
      {error ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-rose-300">{error}</p>
          <Button className="h-8 rounded-[10px] px-3 text-xs" onClick={() => void reload()} type="button" variant="secondary">
            Retry
          </Button>
        </div>
      ) : null}
      {cartError ? <p className="text-sm text-rose-300">{cartError}</p> : null}
      {actionError ? <p className="text-sm text-rose-300">{actionError}</p> : null}
      {!loading && paidServices.length === 0 ? <p className="text-sm text-white/70">More time options are not open right now.</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <BentoCard
          description={extendService ? `From ${formatCurrency(extendService.base_price)}` : "Ask the desk if this can be opened for your stay."}
          icon={CalendarPlus}
          title="Extend stay"
        >
          <Button className="h-9 rounded-[12px]" disabled={mutatingKey === "extend"} onClick={() => void onAddService(extendService, "extend")} type="button">
            Add to cart
          </Button>
        </BentoCard>
        <BentoCard
          description={lateCheckoutService ? `From ${formatCurrency(lateCheckoutService.base_price)}` : "A later checkout may still be possible today."}
          icon={Moon}
          title="Late checkout"
        >
          <Button className="h-9 rounded-[12px]" disabled={mutatingKey === "late"} onClick={() => void onAddService(lateCheckoutService, "late")} type="button">
            Add to cart
          </Button>
        </BentoCard>
        <BentoCard
          description={earlyCheckinService ? `From ${formatCurrency(earlyCheckinService.base_price)}` : "Perfect for the next visit when you plan an early arrival."}
          icon={CalendarClock}
          title="Early check-in"
        >
          <Button className="h-9 rounded-[12px]" disabled={mutatingKey === "early"} onClick={() => void onAddService(earlyCheckinService, "early")} type="button">
            Add to cart
          </Button>
        </BentoCard>
      </div>
    </SectionBlock>
  );
}
