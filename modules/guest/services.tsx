"use client";

import { useMemo, useState } from "react";
import { ConciergeBell } from "lucide-react";
import { toast } from "sonner";

import { BentoCard } from "@/components/guest/bento-card";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { SectionBlock } from "@/components/guest/section-block";
import { Button } from "@/components/ui/button";
import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { useGuestCatalog } from "@/hooks/use-guest-catalog";
import { requestService } from "@/lib/guest-experience-api";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { useGuestExperience } from "@/state/guest-experience-provider";

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
      setActionError("Something went wrong while submitting request.");
      toast.error(message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <SectionBlock
      description="Need something during the stay? Send it straight to the property team."
      sticker={guestStickerTags.services}
      title="Services"
    >
      {loading ? <p className="text-sm text-white/70">Loading services...</p> : null}
      {error ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-rose-300">{error}</p>
          <Button className="h-8 rounded-[10px] px-3 text-xs" onClick={() => void reload()} type="button" variant="secondary">
            Retry
          </Button>
        </div>
      ) : null}
      {lastTicketMessage ? <p className="text-sm text-emerald-300">{lastTicketMessage}</p> : null}
      {actionError ? <p className="text-sm text-rose-300">{actionError}</p> : null}
      {!loading && (Array.isArray(data.services) ? data.services : []).length === 0 ? <p className="text-sm text-white/70">No services available right now.</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {(Array.isArray(data.services) ? data.services : []).map((service) => (
          <BentoCard
            key={service.id}
            description="Send the request now and keep the confirmation ticket for follow-up."
            icon={ConciergeBell}
            title={service.name}
          >
            <Button className="h-9 rounded-[12px]" disabled={submittingId === service.id} onClick={() => void onRequestService(service.id)} type="button">
              Request service
            </Button>
          </BentoCard>
        ))}
      </div>
    </SectionBlock>
  );
}
