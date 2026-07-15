"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Users, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";

import {
  BreakfastConfirmationDialog,
  BreakfastSkipDialog,
} from "@/components/breakfast/breakfast-confirmation-dialog";
import { BreakfastOrderForm } from "@/components/breakfast/breakfast-order-form";
import {
  BreakfastOrderSummary,
  formatBreakfastServiceDate,
} from "@/components/breakfast/breakfast-order-summary";
import {
  BreakfastErrorPanel,
  BreakfastLoadingPanel,
  BreakfastTerminalPanel,
} from "@/components/breakfast/breakfast-state-panel";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import {
  getPublicBreakfast,
  submitPublicBreakfast,
  type BreakfastBrand,
  type BreakfastLookupResponse,
  type BreakfastRoom,
  type BreakfastSubmitPayload,
  type BreakfastValidResponse,
} from "@/lib/breakfast-api";
import {
  buildBreakfastOrderReview,
  buildPreviewRooms,
  createBreakfastDraft,
  doesBreakfastLookupMatchPayload,
  getBreakfastErrorId,
  setBreakfastRoomIntent,
  validateBreakfastDraft,
  type BreakfastDraft,
  type BreakfastDraftErrors,
  type BreakfastOrderReview,
} from "@/lib/breakfast-order";

type BreakfastPageProps = {
  token: string;
  previewLabel?: string;
  simulateSubmit?: boolean;
  initialLookup?: BreakfastLookupResponse;
};

type LoadState = "loading" | "ready" | "error";
type ReceiptMode = "review" | "placed";

const EMPTY_DRAFT: BreakfastDraft = { rooms: [] };
const EMPTY_ERRORS: BreakfastDraftErrors = {};

const brandPresentation: Record<
  BreakfastBrand,
  { heading: string; description: string; logo: string; logoAlt: string; sticker: string | null }
> = {
  BUTEAK: {
    heading: "Buteak Suites Menu",
    description: "Choose complimentary breakfast for each guest in your stay.",
    logo: "/brands/buteak/logo.svg",
    logoAlt: "Buteak Suites",
    sticker: "COMPLIMENTARY",
  },
  TDS: {
    heading: "The Daily Social Breakfast Menu",
    description: "Choose complimentary breakfast for each guest in your stay.",
    logo: "/brands/tds/logo.png",
    logoAlt: "The Daily Social",
    sticker: null,
  },
};

export function getBreakfastGreeting(date = new Date()) {
  const hourPart = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kolkata",
  }).formatToParts(date).find((part) => part.type === "hour");
  const hour = Number(hourPart?.value ?? 0);

  if (hour < 12) return "GOOD MORNING";
  if (hour < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function BreakfastBrandHeader({ brand, previewLabel }: { brand?: BreakfastBrand; previewLabel?: string }) {
  const presentation = brand ? brandPresentation[brand] : null;
  const stickerLabel = brand === "TDS" ? getBreakfastGreeting() : presentation?.sticker;

  return (
    <header className="pb-8 pt-5 sm:pb-10 sm:pt-8">
      {previewLabel ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-white/14 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#f3c96b]">Design preview</p>
            <p className="mt-1 text-sm text-white/62">{previewLabel} - test order, nothing will be saved</p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center rounded-[10px] border border-white/15 px-4 text-sm font-bold text-white hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b]"
            href="/breakfast/preview"
          >
            All test links
          </Link>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-5">
        <div>
          {presentation ? (
            <Image
              alt={presentation.logoAlt}
              className="h-auto max-h-[76px] w-auto max-w-[132px] object-contain"
              height={brand === "BUTEAK" ? 76 : 64}
              priority
              src={presentation.logo}
              width={brand === "BUTEAK" ? 76 : 128}
            />
          ) : (
            <div aria-hidden="true" className="inline-flex size-14 items-center justify-center rounded-full border border-white/16 bg-white/[0.04] text-[#f3c96b]">
              <UtensilsCrossed className="size-6" />
            </div>
          )}
        </div>
        {presentation && stickerLabel ? (
          <StickerTag
            bg="#FEF08A"
            className="mt-2 px-3 py-1.5 text-[10px] font-black not-italic tracking-[0.1em]"
            label={stickerLabel}
            rotate="rotate-[3deg]"
            text="#230f14"
          />
        ) : null}
      </div>

      <div className="mt-6 max-w-2xl">
        <h1 className="font-sectiontitle text-pretty text-[38px] leading-[1.02] text-white sm:text-[50px]">
          {presentation?.heading ?? "Breakfast Menu"}
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-base leading-7 text-white/66">
          {presentation?.description ?? "We are checking the breakfast details for your stay."}
        </p>
      </div>
    </header>
  );
}

function BreakfastStayContext({ response }: { response: BreakfastValidResponse }) {
  const roomLabel = response.rooms.length === 1 ? response.rooms[0].room_number : `${response.rooms.length} rooms`;

  return (
    <dl className="grid gap-4 border-y border-dashed border-white/16 py-5 sm:grid-cols-3">
      <div className="flex gap-3">
        <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f3c96b]" />
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-white/44">Stay</dt>
          <dd className="mt-1 font-bold text-white">{roomLabel}</dd>
        </div>
      </div>
      <div className="flex gap-3">
        <Users aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f3c96b]" />
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-white/44">Breakfast guests</dt>
          <dd className="mt-1 font-bold tabular-nums text-white">{response.total_adults}</dd>
        </div>
      </div>
      <div className="flex gap-3">
        <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f3c96b]" />
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-white/44">Breakfast date</dt>
          <dd className="mt-1 font-bold text-white">{formatBreakfastServiceDate(response.window.service_date)}</dd>
        </div>
      </div>
    </dl>
  );
}

function mergeRooms(current: BreakfastRoom[], changed: BreakfastRoom[]) {
  const changedById = new Map(changed.map((room) => [room.ezee_reservation_id, room]));
  return current.map((room) => changedById.get(room.ezee_reservation_id) ?? room);
}

function submitResponseCoversPayload(rooms: BreakfastRoom[], payload: BreakfastSubmitPayload) {
  const returnedRoomIds = new Set(rooms.map((room) => room.ezee_reservation_id));
  return payload.rooms.every((room) => returnedRoomIds.has(room.ezee_reservation_id));
}

function getRemainingRequirements(response: BreakfastValidResponse, errors: BreakfastDraftErrors) {
  const seen = new Set<string>();
  const requirements: string[] = [];

  for (const [key, message] of Object.entries(errors)) {
    if (key === "form") {
      if (!seen.has(message)) requirements.push(message);
      seen.add(message);
      continue;
    }
    const reservationId = key.split(":")[0];
    const room = response.rooms.find((item) => item.ezee_reservation_id === reservationId);
    const requirement = `${room ? `Room ${room.room_number}: ` : ""}${message}`;
    if (!seen.has(requirement)) requirements.push(requirement);
    seen.add(requirement);
  }

  return requirements;
}

function firstBreakfastError(errors: BreakfastDraftErrors) {
  return Object.keys(errors)[0] ?? "form";
}

export function BreakfastPage({ token, previewLabel, simulateSubmit = false, initialLookup }: BreakfastPageProps) {
  const [loadState, setLoadState] = useState<LoadState>(initialLookup ? "ready" : "loading");
  const [lookup, setLookup] = useState<BreakfastLookupResponse | null>(initialLookup ?? null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<BreakfastDraft>(() =>
    initialLookup?.link_state === "valid" ? createBreakfastDraft(initialLookup) : EMPTY_DRAFT,
  );
  const [errors, setErrors] = useState<BreakfastDraftErrors>(EMPTY_ERRORS);
  const [editing, setEditing] = useState(() =>
    initialLookup?.link_state === "valid" ? !initialLookup.rooms.every((room) => room.order_status !== null) : true,
  );
  const [pending, setPending] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptMode, setReceiptMode] = useState<ReceiptMode>("review");
  const [review, setReview] = useState<BreakfastOrderReview | null>(null);
  const [skipReservationId, setSkipReservationId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ reservationId: string; sequence: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  const validLookup = lookup?.link_state === "valid" ? lookup : null;
  const validation = useMemo(
    () => validLookup ? validateBreakfastDraft(draft, validLookup) : { ok: false, errors: EMPTY_ERRORS, payload: null },
    [draft, validLookup],
  );
  const remainingRequirements = useMemo(
    () => validLookup ? getRemainingRequirements(validLookup, validation.errors) : [],
    [validLookup, validation.errors],
  );

  const applyLookup = useCallback((next: BreakfastLookupResponse, preserveDraft = false) => {
    setLookup(next);
    setLoadState("ready");
    setLoadError("");
    if (next.link_state === "valid" && !preserveDraft) {
      setDraft(createBreakfastDraft(next));
      setErrors(EMPTY_ERRORS);
      setEditing(!next.rooms.every((room) => room.order_status !== null));
    }
  }, []);

  const loadBreakfast = useCallback(async (preserveDraft = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (!preserveDraft) setLoadState("loading");

    try {
      const result = await getPublicBreakfast(token, controller.signal);
      if (!result.ok) {
        if (!preserveDraft) {
          setLoadState("error");
          setLoadError(result.message);
        }
        return null;
      }
      applyLookup(result.data, preserveDraft);
      return result.data;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      if (!preserveDraft) {
        setLoadState("error");
        setLoadError("We couldn't load the breakfast service. Try again.");
      }
      return null;
    }
  }, [applyLookup, token]);

  useEffect(() => {
    if (initialLookup) return;
    const timer = window.setTimeout(() => void loadBreakfast(), 0);
    return () => {
      window.clearTimeout(timer);
      controllerRef.current?.abort();
    };
  }, [initialLookup, loadBreakfast]);

  useEffect(() => {
    if (!editing || pending || !validLookup || JSON.stringify(draft) === JSON.stringify(createBreakfastDraft(validLookup))) return;
    const preventExit = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventExit);
    return () => window.removeEventListener("beforeunload", preventExit);
  }, [draft, editing, pending, validLookup]);

  const focusError = useCallback((fieldErrors: BreakfastDraftErrors, response?: BreakfastValidResponse) => {
    const errorKey = firstBreakfastError(fieldErrors);
    const reservationId = errorKey.split(":")[0];
    if (response?.rooms.some((room) => room.ezee_reservation_id === reservationId)) {
      setFocusRequest((current) => ({ reservationId, sequence: (current?.sequence ?? 0) + 1 }));
    }
    window.requestAnimationFrame(() => {
      const target = document.getElementById(getBreakfastErrorId(errorKey));
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: "auto", block: "center" });
    });
  }, []);

  const applyMutationError = useCallback(async (
    response: BreakfastValidResponse,
    submittedDraft: BreakfastDraft,
    result: Extract<Awaited<ReturnType<typeof submitPublicBreakfast>>, { ok: false }>,
  ) => {
    setReceiptOpen(false);
    setEditing(true);

    if (result.data?.link_state) {
      setLookup({ link_state: result.data.link_state, brand: response.brand });
      setAnnouncement("This breakfast link is no longer available.");
      return;
    }

    if (result.data?.error === "window_frozen") {
      setLookup({ ...response, window: result.data.window ?? { ...response.window, state: "frozen" } });
      setEditing(false);
      setAnnouncement("Breakfast ordering is now read-only.");
      return;
    }

    if (result.data?.error === "slot_full") {
      let refreshedResponse: BreakfastValidResponse = {
        ...response,
        slots: result.data.slots ?? response.slots,
      };
      const refreshed = await getPublicBreakfast(token);
      if (refreshed.ok) {
        if (refreshed.data.link_state !== "valid") {
          setLookup(refreshed.data);
          setEditing(false);
          setAnnouncement("This breakfast link is no longer available.");
          return;
        }
        refreshedResponse = refreshed.data;
      }
      setLookup(refreshedResponse);
      const refreshedValidation = validateBreakfastDraft(submittedDraft, refreshedResponse);
      const nextErrors = {
        ...refreshedValidation.errors,
        form: "A selected slot just filled up. Your other choices are still here; choose another time.",
      };
      setErrors(nextErrors);
      setAnnouncement(nextErrors.form);
      focusError(nextErrors, refreshedResponse);
      return;
    }

    setErrors({ form: result.message });
    setAnnouncement(result.message);
  }, [focusError, token]);

  const handleReview = useCallback(() => {
    if (!validLookup || pending) return;
    const currentValidation = validateBreakfastDraft(draft, validLookup);
    if (!currentValidation.ok || !currentValidation.payload) {
      setErrors(currentValidation.errors);
      focusError(currentValidation.errors, validLookup);
      return;
    }

    setErrors(EMPTY_ERRORS);
    setReview(buildBreakfastOrderReview(validLookup, currentValidation.payload));
    setReceiptMode("review");
    setReceiptOpen(true);
    setAnnouncement("Review your order before confirming.");
  }, [draft, focusError, pending, validLookup]);

  const handleConfirm = useCallback(async () => {
    if (!validLookup || !review || pending) return;

    const submittedDraft = draft;
    const payload: BreakfastSubmitPayload = review.payload;
    setPending(true);

    try {
      let canonical: BreakfastValidResponse;

      const reconcileSubmission = async () => {
        const refreshed = await getPublicBreakfast(token);
        if (refreshed.ok && refreshed.data.link_state === "valid") {
          const sameServiceDate = refreshed.data.window.service_date === validLookup.window.service_date;
          if (sameServiceDate && doesBreakfastLookupMatchPayload(refreshed.data, payload)) {
            return refreshed.data;
          }
          applyLookup(refreshed.data, sameServiceDate);
        } else if (refreshed.ok) {
          applyLookup(refreshed.data);
        }

        setReceiptOpen(false);
        setEditing(true);
        const message = "We couldn't verify that the order was placed. Your choices are still here; review them before trying again.";
        setErrors({ form: message });
        setAnnouncement(message);
        return null;
      };

      if (simulateSubmit) {
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        canonical = { ...validLookup, rooms: buildPreviewRooms(validLookup, payload.rooms) };
      } else {
        const result = await submitPublicBreakfast(token, payload);
        if (!result.ok) {
          if (result.retryable) {
            const reconciled = await reconcileSubmission();
            if (!reconciled) return;
            canonical = reconciled;
          } else {
            await applyMutationError(validLookup, submittedDraft, result);
            return;
          }
        } else {
          const candidate = { ...validLookup, rooms: mergeRooms(validLookup.rooms, result.data.rooms) };
          if (submitResponseCoversPayload(result.data.rooms, payload) && doesBreakfastLookupMatchPayload(candidate, payload)) {
            canonical = candidate;
          } else {
            const reconciled = await reconcileSubmission();
            if (!reconciled) return;
            canonical = reconciled;
          }
        }
      }

      setLookup(canonical);
      setDraft(createBreakfastDraft(canonical));
      setReview(buildBreakfastOrderReview(canonical, payload));
      setErrors(EMPTY_ERRORS);
      setEditing(false);
      setReceiptMode("placed");
      setReceiptOpen(true);
      setAnnouncement(simulateSubmit ? "Sample order completed. Nothing was saved." : "Breakfast order placed.");
    } finally {
      setPending(false);
    }
  }, [applyLookup, applyMutationError, draft, pending, review, simulateSubmit, token, validLookup]);

  const handleSkip = useCallback(() => {
    if (!validLookup || !skipReservationId) return;
    const room = validLookup.rooms.find((item) => item.ezee_reservation_id === skipReservationId);
    if (!room) return;
    setDraft((current) => setBreakfastRoomIntent(current, room, "SKIP"));
    setErrors(EMPTY_ERRORS);
    setSkipReservationId(null);
    setAnnouncement(`Breakfast for Room ${room.room_number} will be skipped. Confirm your order to save it.`);
  }, [skipReservationId, validLookup]);

  const handleDraftChange = useCallback((update: SetStateAction<BreakfastDraft>) => {
    setDraft(update);
    setErrors(EMPTY_ERRORS);
  }, []);

  const handleEdit = useCallback(() => {
    if (!validLookup) return;
    setDraft(createBreakfastDraft(validLookup));
    setErrors(EMPTY_ERRORS);
    setEditing(true);
    setReceiptOpen(false);
    setReceiptMode("review");
    setAnnouncement("Breakfast choices are ready to edit.");
  }, [validLookup]);

  const handleReviewEdit = useCallback(() => {
    setErrors(EMPTY_ERRORS);
    setEditing(true);
    setReceiptOpen(false);
    setAnnouncement("Your choices are ready to edit.");
  }, []);

  const brand = lookup?.brand;
  const summaryRooms = validLookup?.rooms.filter((room) => room.order_status) ?? [];
  const skipRoom = validLookup?.rooms.find((room) => room.ezee_reservation_id === skipReservationId);

  return (
    <main className="relative min-h-[100dvh] overflow-x-clip bg-[#07070a] text-white" style={{ colorScheme: "dark" }}>
      <a className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[260] focus:not-sr-only focus:rounded-[10px] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-[#07070a]" href="#breakfast-content">
        Skip to breakfast content
      </a>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(198,40,40,0.14),transparent_34%),radial-gradient(circle_at_90%_8%,rgba(215,166,74,0.08),transparent_25%)]" />
      <div className="relative mx-auto w-full max-w-[860px] px-4 pb-12 sm:px-6 sm:pb-16">
        <BreakfastBrandHeader brand={brand} previewLabel={previewLabel} />
        <div id="breakfast-content" tabIndex={-1}>
          {loadState === "loading" ? <BreakfastLoadingPanel /> : null}
          {loadState === "error" ? <BreakfastErrorPanel message={loadError} onRetry={() => void loadBreakfast()} /> : null}
          {loadState === "ready" && lookup && lookup.link_state !== "valid" ? <BreakfastTerminalPanel response={lookup} /> : null}

          {validLookup ? (
            <div className="space-y-8">
              <BreakfastStayContext response={validLookup} />
              {validLookup.window.state === "frozen" ? (
                <section className="border-l-2 border-[#f3c96b] bg-[#f3c96b]/8 px-4 py-4" role="status">
                  <p className="font-bold text-amber-50">Breakfast ordering is closed.</p>
                  <p className="mt-1 text-sm leading-6 text-white/66">
                    Ordering for {formatBreakfastServiceDate(validLookup.window.service_date)} opens at {validLookup.window.opens_at_ist}.
                  </p>
                </section>
              ) : null}

              {!editing && summaryRooms.length > 0 ? (
                <BreakfastOrderSummary
                  actions={validLookup.window.state === "open" ? (
                    <Button
                      className="h-12 rounded-[12px] bg-[var(--vh-pink)] px-5 font-bold text-white hover:bg-[var(--vh-pink-soft)]"
                      onClick={handleEdit}
                      type="button"
                    >
                      Edit Order
                    </Button>
                  ) : undefined}
                  menu={validLookup.menu}
                  note={validLookup.window.state === "open"
                    ? "You can change these choices while breakfast ordering is open."
                    : `Ordering opens at ${validLookup.window.opens_at_ist}.`}
                  rooms={summaryRooms}
                  serviceDate={validLookup.window.service_date}
                  slots={validLookup.slots}
                />
              ) : null}

              {editing && validLookup.window.state === "open" ? (
                <BreakfastOrderForm
                  draft={draft}
                  errors={errors}
                  initialReservationId={focusRequest?.reservationId}
                  key={`breakfast-order-form-${focusRequest?.sequence ?? 0}`}
                  onReview={handleReview}
                  onSkipRoom={setSkipReservationId}
                  pending={pending}
                  remainingRequirements={remainingRequirements}
                  response={validLookup}
                  setDraft={handleDraftChange}
                  validationErrors={validation.errors}
                />
              ) : null}

              {validLookup.window.state === "frozen" && summaryRooms.length === 0 ? (
                <section className="border-y border-dashed border-white/16 py-8">
                  <h2 className="font-sectiontitle text-[28px] text-white">No breakfast order yet</h2>
                  <p className="mt-2 text-sm leading-6 text-white/64">Return when breakfast ordering opens.</p>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <p aria-live="polite" className="sr-only" role="status">{announcement}</p>

      {validLookup ? (
        <>
          {receiptMode === "review" ? (
            <BreakfastConfirmationDialog
              canEdit={validLookup.window.state === "open"}
              mode="review"
              onConfirm={() => void handleConfirm()}
              onEdit={handleReviewEdit}
              onOpenChange={setReceiptOpen}
              open={receiptOpen}
              pending={pending}
              review={review}
              serviceDate={validLookup.window.service_date}
              simulated={simulateSubmit}
            />
          ) : (
            <BreakfastConfirmationDialog
              canEdit={validLookup.window.state === "open"}
              mode="placed"
              onEdit={handleEdit}
              onOpenChange={setReceiptOpen}
              open={receiptOpen}
              pending={pending}
              review={review}
              serviceDate={validLookup.window.service_date}
              simulated={simulateSubmit}
            />
          )}
          <BreakfastSkipDialog
            onConfirm={handleSkip}
            onOpenChange={(open) => { if (!open) setSkipReservationId(null); }}
            open={Boolean(skipRoom)}
            pending={false}
            roomNumber={skipRoom?.room_number ?? ""}
          />
        </>
      ) : null}
    </main>
  );
}
