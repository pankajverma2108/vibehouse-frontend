"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Minus, PackageCheck, PackagePlus, Plus, Sparkles, Ticket, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { StickySummary } from "@/components/guest/sticky-summary";
import { Button } from "@/components/ui/button";
import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { useGuestCatalog } from "@/hooks/use-guest-catalog";
import {
  addToCart,
  getBorrowMine,
  getCart,
  removeCartItem,
  requestBorrow,
  updateCartItem,
  type BorrowMineItem,
  type GuestBorrowableItem,
  type GuestCart,
  type GuestCatalogItem,
  type GuestServiceItem,
} from "@/lib/guest-experience-api";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { useGuestExperience } from "@/state/guest-experience-provider";

const DEFAULT_UNIT_CODE = "AUTO-UNIT";

type MarketplaceKind = "rentals" | "experiences" | "upgrades" | "essentials";

type CartableItem = {
  id: string;
  name: string;
  displayName: string;
  basePrice: number;
  inStock: boolean;
  availableStock: number | null;
  kind: Exclude<MarketplaceKind, "rentals">;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isUpgradeName(name: string) {
  const normalized = normalize(name);
  return normalized.includes("late checkout")
    || normalized.includes("late-checkout")
    || normalized.includes("early check-in")
    || normalized.includes("early checkin")
    || normalized.includes("early-checkin")
    || normalized.includes("stay extension")
    || normalized.includes("extension")
    || normalized.includes("extend");
}

function isExperienceName(name: string) {
  const normalized = normalize(name);
  return normalized.includes("experience")
    || normalized.includes("event")
    || normalized.includes("tour")
    || normalized.includes("social")
    || normalized.includes("breakfast")
    || normalized.includes("dinner");
}

function getDisplayName(name: string) {
  const normalized = normalize(name);

  if (normalized.includes("late checkout") || normalized.includes("late-checkout")) {
    return "Late checkout";
  }
  if (normalized.includes("early check-in") || normalized.includes("early checkin") || normalized.includes("early-checkin")) {
    return "Early check-in";
  }
  if (normalized.includes("extension") || normalized.includes("extend")) {
    return "Stay upgrade";
  }

  return name;
}

function toCartableFromCatalog(item: GuestCatalogItem): CartableItem | null {
  if (item.category === "BORROWABLE") {
    return null;
  }

  const kind: CartableItem["kind"] = isUpgradeName(item.name) ? "upgrades" : isExperienceName(item.name) ? "experiences" : "essentials";
  return {
    id: item.id,
    name: item.name,
    displayName: getDisplayName(item.name),
    basePrice: item.base_price,
    inStock: item.in_stock,
    availableStock: item.available_stock,
    kind,
  };
}

function toUpgradeFromService(item: GuestServiceItem): CartableItem | null {
  if (!isUpgradeName(item.name) || typeof item.base_price !== "number" || item.base_price <= 0) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    displayName: getDisplayName(item.name),
    basePrice: item.base_price,
    inStock: item.in_stock !== false,
    availableStock: item.available_stock ?? null,
    kind: "upgrades",
  };
}

function formatRentalStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStockLabel(item: CartableItem) {
  if (item.availableStock !== null) {
    return `${item.availableStock} available`;
  }

  return item.inStock ? "Available today" : "Ask the desk";
}

function MarketplaceCard({
  item,
  quantity,
  disabled,
  onDecrease,
  onIncrease,
}: {
  item: CartableItem;
  quantity: number;
  disabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const sticker = item.kind === "upgrades" ? "Popular" : item.kind === "experiences" ? "Guest Favorite" : "Recommended";

  return (
    <article className="group flex h-full flex-col rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--vh-pink)]/55">
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-[10px] font-black uppercase text-[#f9cb37]">{sticker}</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-[var(--vh-pink)]/30 bg-[rgba(198,40,40,0.12)] text-white">
          {item.kind === "upgrades" ? <Sparkles className="h-5 w-5" /> : item.kind === "experiences" ? <Ticket className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}
        </span>
      </div>
      <div className="mt-5 flex flex-1 flex-col">
        <h3 className="font-sectiontitle text-[22px] leading-7 text-white">{item.displayName}</h3>
        <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">{getStockLabel(item)}</p>
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div>
            <p className="text-[11px] font-bold uppercase text-white/52">Price</p>
            <p className="mt-1 text-xl font-black text-white">{formatCurrency(item.basePrice)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="h-9 w-9 rounded-[4px] border border-white/15 bg-white/8 px-0 text-white hover:bg-white/12" disabled={disabled || quantity <= 0} onClick={onDecrease} type="button" variant="secondary">
              <Minus className="h-4 w-4" />
              <span className="sr-only">Remove one {item.displayName}</span>
            </Button>
            <span className="min-w-7 text-center text-sm font-black text-white">{quantity}</span>
            <Button className="h-9 w-9 rounded-[4px] bg-[var(--vh-pink)] px-0 text-white hover:bg-[var(--vh-pink-soft)]" disabled={disabled} onClick={onIncrease} type="button">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add one {item.displayName}</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function RentalCard({
  item,
  disabled,
  onRequest,
}: {
  item: GuestBorrowableItem;
  disabled: boolean;
  onRequest: () => void;
}) {
  return (
    <article className="group flex h-full flex-col rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--vh-pink)]/55">
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-[10px] font-black uppercase text-[#f9cb37]">Available Today</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-[var(--vh-pink)]/30 bg-[rgba(198,40,40,0.12)] text-white">
          <PackagePlus className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 flex flex-1 flex-col">
        <h3 className="font-sectiontitle text-[22px] leading-7 text-white">{item.name}</h3>
        <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">Ready from the property desk, subject to live availability.</p>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
          <span className="text-xs font-bold uppercase text-white/52">{item.available} of {item.total} ready</span>
          <Button className="h-9 rounded-[4px] bg-[var(--vh-pink)] px-4 font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]" disabled={disabled || item.available <= 0} onClick={onRequest} type="button">
            Request
          </Button>
        </div>
      </div>
    </article>
  );
}

export function GuestAddons() {
  const { guest, isAuthenticated, openAuthModal } = useGuestAuth();
  const { selectedBookingId, setCartCount, setBorrowCount, paymentSyncTick } = useGuestExperience();
  const activeBooking = useMemo(
    () => guest?.bookings?.find((booking) => booking.ezee_reservation_id === selectedBookingId) ?? null,
    [guest?.bookings, selectedBookingId],
  );
  const propertyId = activeBooking?.property_id ?? "";
  const { data, loading: catalogLoading, error: catalogError, reload } = useGuestCatalog(propertyId, Boolean(propertyId && selectedBookingId && isAuthenticated));
  const [cart, setCart] = useState<GuestCart | null>(null);
  const [mine, setMine] = useState<BorrowMineItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [rentalsLoading, setRentalsLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [rentalsError, setRentalsError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [rentalSubmittingId, setRentalSubmittingId] = useState<string | null>(null);
  const [returnDraftIds, setReturnDraftIds] = useState<Record<string, boolean>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [rentalActionError, setRentalActionError] = useState<string | null>(null);
  const visibleCart = selectedBookingId && isAuthenticated ? cart : null;
  const visibleMine = useMemo(() => (selectedBookingId && isAuthenticated ? mine : []), [isAuthenticated, mine, selectedBookingId]);

  const marketplaceItems = useMemo(() => {
    const deduped = new Map<string, CartableItem>();

    for (const item of Array.isArray(data.addons) ? data.addons : []) {
      const next = toCartableFromCatalog(item);
      if (next) {
        deduped.set(next.id, next);
      }
    }

    for (const item of Array.isArray(data.services) ? data.services : []) {
      const next = toUpgradeFromService(item);
      if (next && !deduped.has(next.id)) {
        deduped.set(next.id, next);
      }
    }

    return Array.from(deduped.values());
  }, [data.addons, data.services]);

  const groupedItems = useMemo(() => ({
    essentials: marketplaceItems.filter((item) => item.kind === "essentials"),
    experiences: marketplaceItems.filter((item) => item.kind === "experiences"),
    upgrades: marketplaceItems.filter((item) => item.kind === "upgrades"),
  }), [marketplaceItems]);

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

  const activeRentalCount = useMemo(
    () => visibleMine.filter((item) => item.status === "CHECKED_OUT" || item.status === "OVERDUE").length,
    [visibleMine],
  );

  useEffect(() => {
    setCartCount((visibleCart?.items ?? []).length);
  }, [setCartCount, visibleCart?.items]);

  useEffect(() => {
    setBorrowCount(activeRentalCount);
  }, [activeRentalCount, setBorrowCount]);

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
        setRentalsLoading(true);
        setCartError(null);
        setRentalsError(null);
      }
    });

    void Promise.all([getCart(selectedBookingId, token), getBorrowMine(selectedBookingId, token)])
      .then(([nextCart, nextMine]) => {
        if (!cancelled) {
          setCart(nextCart);
          setMine(Array.isArray(nextMine) ? nextMine : []);
          setCartCount((nextCart.items ?? []).length);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to load add-on state.";
          setCartError(message);
          setRentalsError(message);
          const fallback = { order_id: null, items: [], total: 0 };
          setCart(fallback);
          setMine([]);
          setCartCount(fallback.items.length);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCartLoading(false);
          setRentalsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, paymentSyncTick, selectedBookingId, setCartCount]);

  const requireBookingAndToken = (context: string) => {
    if (!selectedBookingId) {
      toast.error(`No active booking found for ${context}.`);
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
    const auth = requireBookingAndToken("add-ons");
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
          toast.error("Cart item was not found. Refresh and try again.");
          return;
        }
        const nextCart = await updateCartItem(auth.bookingId, cartItem.itemId, { quantity: nextQty }, auth.token);
        setCart(nextCart);
        setCartCount((nextCart.items ?? []).length);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update cart.";
      setMutationError("Something went wrong while updating the cart.");
      toast.error(message);
    } finally {
      setMutatingId(null);
    }
  };

  const onDecrement = async (productId: string) => {
    const auth = requireBookingAndToken("add-ons");
    if (!auth) {
      return;
    }

    const cartItem = cartByProductId.get(productId);
    if (!cartItem) {
      toast.error("Cart item was not found. Refresh and try again.");
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
      setMutationError("Something went wrong while updating the cart.");
      toast.error(message);
    } finally {
      setMutatingId(null);
    }
  };

  const onRentalRequest = async (productId: string) => {
    const auth = requireBookingAndToken("rentals");
    if (!auth) {
      return;
    }

    setRentalSubmittingId(productId);
    setRentalActionError(null);
    try {
      await requestBorrow(auth.bookingId, { product_id: productId }, auth.token);
      const refreshed = await getBorrowMine(auth.bookingId, auth.token);
      setMine(Array.isArray(refreshed) ? refreshed : []);
      toast.success("Rental request submitted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to request this item.";
      setRentalActionError("Something went wrong while requesting this rental.");
      toast.error(message);
    } finally {
      setRentalSubmittingId(null);
    }
  };

  const onReturnUiAction = (rentalId: string) => {
    setReturnDraftIds((current) => ({ ...current, [rentalId]: true }));
    toast.message("Return noted. Staff verification is required.");
  };

  const renderCartSection = (id: string, title: string, description: string, items: CartableItem[]) => (
    <section className="scroll-mt-28 space-y-4" id={id}>
      <div>
        <p className="text-[11px] font-black uppercase text-[#f9cb37]">{items.length > 0 ? "Available Today" : "Ask the desk"}</p>
        <h3 className="mt-2 font-sectiontitle text-[26px] leading-tight text-white">{title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#cbd5e1]">{description}</p>
      </div>
      {items.length === 0 ? <p className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4 text-sm text-white/70">Nothing is available in this section right now.</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const cartEntry = cartByProductId.get(item.id);
          const quantity = cartEntry?.quantity ?? 0;
          const disabled = mutatingId === item.id || cartLoading || (!item.inStock && item.availableStock !== null);

          return (
            <MarketplaceCard
              disabled={disabled}
              item={item}
              key={item.id}
              onDecrease={() => void onDecrement(item.id)}
              onIncrease={() => void onIncrement(item.id, item.availableStock)}
              quantity={quantity}
            />
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="grid gap-6 pb-10 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] md:pb-12">
      <div className="space-y-9">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-7">
            <p className="text-[11px] font-black uppercase text-[#f9cb37]">Guest Marketplace</p>
            <h1 className="mt-3 font-sectiontitle text-[36px] leading-tight text-white md:text-[52px]">Add comfort without leaving the stay flow.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#cbd5e1] md:text-base">
              Rentals, experiences, upgrades, and essentials stay organized here and settle through the same guest checkout.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BentoCard description="Paid items stay in your cart until checkout." icon={WalletCards} sticker={{ label: "Transparent", bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" }} title="One cart" />
            <BentoCard description="Desk-issued items show active status after the team confirms them." icon={PackageCheck} sticker={{ label: "Included", bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[1deg]" }} title="Rental tracking" />
          </div>
        </section>

        <SectionBlock
          description="Browse by intent. Every action keeps the same booking, auth, cart, and desk-state handling."
          sticker={guestStickerTags.addons}
          title="Add-Ons"
        >
          {catalogLoading || cartLoading || rentalsLoading ? <p className="text-sm text-white/70">Loading guest marketplace...</p> : null}
          {catalogError ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-rose-300">{catalogError}</p>
              <Button className="h-8 rounded-[4px] px-3 text-xs" onClick={() => void reload()} type="button" variant="secondary">
                Retry
              </Button>
            </div>
          ) : null}
          {cartError ? <p className="text-sm text-rose-300">{cartError}</p> : null}
          {rentalsError && rentalsError !== cartError ? <p className="text-sm text-rose-300">{rentalsError}</p> : null}
          {mutationError ? <p className="text-sm text-rose-300">{mutationError}</p> : null}
          {rentalActionError ? <p className="text-sm text-rose-300">{rentalActionError}</p> : null}

          <div className="space-y-10">
            <section className="scroll-mt-28 space-y-4" id="rentals">
              <div>
                <p className="text-[11px] font-black uppercase text-[#f9cb37]">Available Today</p>
                <h3 className="mt-2 font-sectiontitle text-[26px] leading-tight text-white">Rentals</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#cbd5e1]">Adapters, daily-use gear, and stay essentials from the property desk.</p>
              </div>
              {(Array.isArray(data.borrowables) ? data.borrowables : []).length === 0 ? <p className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4 text-sm text-white/70">No rentals are available right now.</p> : null}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(Array.isArray(data.borrowables) ? data.borrowables : []).map((item) => (
                  <RentalCard
                    disabled={rentalSubmittingId === item.id || rentalsLoading}
                    item={item}
                    key={item.id}
                    onRequest={() => void onRentalRequest(item.id)}
                  />
                ))}
              </div>
            </section>

            {renderCartSection("experiences", "Experiences", "Food, social, and stay moments that make the visit feel less transactional.", groupedItems.experiences)}
            {renderCartSection("upgrades", "Upgrades", "Time and comfort upgrades for days when your schedule needs a little more room.", groupedItems.upgrades)}
            {renderCartSection("essentials", "Essentials", "Snacks, practical comforts, and the little extras guests usually remember too late.", groupedItems.essentials)}

            <section className="scroll-mt-28 space-y-4" id="active-rentals">
              <div>
                <p className="text-[11px] font-black uppercase text-[#f9cb37]">Stay Ledger</p>
                <h3 className="mt-2 font-sectiontitle text-[26px] leading-tight text-white">Active Rentals</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#cbd5e1]">Track items still with you and mark returns for staff verification.</p>
              </div>
              {visibleMine.length === 0 ? <p className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4 text-sm text-white/70">No active rentals yet.</p> : null}
              <div className="grid gap-4 md:grid-cols-2">
                {visibleMine.map((item) => (
                  <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4" key={item.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="truncate font-sectiontitle text-xl text-white">{item.product_name}</h4>
                        <p className="mt-1 text-sm text-[#cbd5e1]">{formatRentalStatus(item.status)}</p>
                      </div>
                      <BadgeCheck className="h-5 w-5 shrink-0 text-[#f9cb37]" />
                    </div>
                    <Button
                      className="mt-4 h-9 rounded-[4px] bg-white/10 px-4 font-black uppercase text-white hover:bg-white/15"
                      disabled={item.status !== "CHECKED_OUT" && item.status !== "OVERDUE"}
                      onClick={() => onReturnUiAction(item.id)}
                      type="button"
                      variant="secondary"
                    >
                      {returnDraftIds[item.id] ? "Return noted" : "Mark return"}
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </SectionBlock>
      </div>

      <StickySummary
        ctaLabel="Review checkout"
        items={[
          { label: "Add-ons", value: `${(visibleCart?.items ?? []).length} lines` },
          { label: "Rentals", value: `${activeRentalCount} active` },
          { label: "Total", value: formatCurrency(visibleCart?.total ?? 0) },
        ]}
      />
    </div>
  );
}
