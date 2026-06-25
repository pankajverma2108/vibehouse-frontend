"use client";

import { useMemo, useState } from "react";
import { Bath, BellRing, ConciergeBell, DoorOpen, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { useGuestCatalog } from "@/hooks/use-guest-catalog";
import { requestService, type GuestServiceItem } from "@/lib/guest-experience-api";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { cn } from "@/lib/utils";
import { useGuestExperience } from "@/state/guest-experience-provider";

function isLostFoundService(service: GuestServiceItem) {
  const normalized = `${service.code ?? ""} ${service.id} ${service.name}`.toLowerCase();
  return normalized.includes("lost") || normalized.includes("found");
}

function getServiceIcon(service: GuestServiceItem) {
  const normalized = `${service.code ?? ""} ${service.id} ${service.name}`.toLowerCase();

  if (normalized.includes("housekeep") || normalized.includes("clean") || normalized.includes("linen") || normalized.includes("towel")) {
    return Sparkles;
  }
  if (normalized.includes("maintenance") || normalized.includes("repair") || normalized.includes("fix")) {
    return Wrench;
  }
  if (normalized.includes("bath") || normalized.includes("toilet") || normalized.includes("water")) {
    return Bath;
  }
  if (normalized.includes("door") || normalized.includes("access") || normalized.includes("key")) {
    return DoorOpen;
  }

  return ConciergeBell;
}

function getServiceMeta(service: GuestServiceItem) {
  if (typeof service.base_price === "number" && service.base_price > 0) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(service.base_price);
  }

  return "Included with stay";
}

export function GuestServices() {
  const { guest, isAuthenticated, openAuthModal } = useGuestAuth();
  const { selectedBookingId } = useGuestExperience();
  const activeBooking = useMemo(
    () => guest?.bookings?.find((booking) => booking.ezee_reservation_id === selectedBookingId) ?? null,
    [guest?.bookings, selectedBookingId],
  );
  const propertyId = activeBooking?.property_id ?? "";
  const { data, loading, error, reload } = useGuestCatalog(propertyId, Boolean(propertyId && selectedBookingId && isAuthenticated));
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [lastTicketMessage, setLastTicketMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const primaryCtaClass = "vh-cta-button h-9 rounded-[4px] px-4 text-[11px]";

  const serviceItems = useMemo(
    () => (Array.isArray(data.services) ? data.services : []).filter((service) => !isLostFoundService(service)),
    [data.services],
  );

  const onRequestService = async (productId: string) => {
    if (!selectedBookingId) {
      toast.error("No active booking found for service request.");
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

    setSubmittingId(productId);
    setLastTicketMessage(null);
    setActionError(null);
    try {
      const response = await requestService(selectedBookingId, { product_id: productId }, token);
      const message = `${response.service_name} requested. Ticket: ${response.ticket_id}`;
      setLastTicketMessage(message);
      toast.success(response.message);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to submit service request.";
      setActionError("Something went wrong while submitting the request.");
      toast.error(message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-10 md:pb-12">
      {/* SECTION: Services Hero */}
      <section className="grid gap-5 pt-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" id="services-hero-section">
        <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-7" id="services-hero-card">
          <div className="flex items-start justify-end">
            <StickerTag bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-black not-italic uppercase" label="Concierge Desk" rotate="rotate-[-2deg]" text="#111111" />
          </div>
          <h1 className="mt-3 font-sectiontitle text-[36px] leading-tight text-white md:text-[52px]">Service, without the lobby wait.</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <BentoCard description="Requests are tied to your active booking so the desk sees the stay context." icon={BellRing} sticker={{ label: "Recommended", bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" }} title="Booking-aware" />
          <BentoCard description="Most essentials start here: cleaning, room help, access, and practical support." icon={ConciergeBell} sticker={{ label: "Available Today", bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[1deg]" }} title="Stay support" />
        </div>
      </section>

      {/* SECTION: Concierge Services */}
      <SectionBlock
        description="Choose what you need and the team will handle it as a service ticket."
        sticker={guestStickerTags.services}
        title="Concierge Services"
      >
        {loading ? <p className="text-sm text-white/70">Loading services...</p> : null}
        {error ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-rose-300">{error}</p>
            <Button className="vh-cta-button h-8 rounded-[4px] bg-white px-3 text-xs text-[#07070a] hover:bg-white/90" onClick={() => void reload()} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        ) : null}
        {lastTicketMessage ? <p className="text-sm text-emerald-300">{lastTicketMessage}</p> : null}
        {actionError ? <p className="text-sm text-rose-300">{actionError}</p> : null}
        {!loading && serviceItems.length === 0 ? <p className="text-sm text-white/70">No concierge services are available right now.</p> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {serviceItems.map((service, index) => {
            const Icon = getServiceIcon(service);
            const available = service.in_stock !== false;

            return (
              <article
                className={cn(
                  "group rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--vh-pink)]/55",
                  !available && "opacity-70",
                )}
                key={service.id}
                id={`service-card-${service.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-[var(--vh-pink)]/30 bg-[rgba(198,40,40,0.12)] text-[#f9cb37]">
                    <Icon className="h-5 w-5" />
                  </span>
                  {available ? (
                    index % 2 === 0 ? (
                      <StickerTag bg="#f9cb37" className="px-3 py-1 text-[10px] font-black not-italic uppercase" label="Guest Favorite" rotate="rotate-[-2deg]" text="#111111" />
                    ) : (
                      <StickerTag bg="#3a5f84" className="px-3 py-1 text-[10px] font-black not-italic uppercase" label="Available Today" rotate="rotate-[1deg]" text="#ffffff" />
                    )
                  ) : (
                    <StickerTag bg="#2f3239" className="px-3 py-1 text-[10px] font-black not-italic uppercase" label="Ask Desk" rotate="rotate-[1deg]" text="#ffffff" />
                  )}
                </div>
                <h3 className="mt-5 font-sectiontitle text-[22px] leading-7 text-white">{service.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">Ticketed concierge request with desk follow-up.</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <span className="text-xs font-bold uppercase text-white/52">{getServiceMeta(service)}</span>
                  <Button className={primaryCtaClass} disabled={!available} loading={submittingId === service.id} loadingText="Sending request" onClick={() => void onRequestService(service.id)} type="button">
                    Request
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </SectionBlock>
    </div>
  );
}
