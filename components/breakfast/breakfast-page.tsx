"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Users, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BreakfastConfirmationDialog, BreakfastSkipDialog } from "@/components/breakfast/breakfast-confirmation-dialog";
import { BreakfastOrderForm } from "@/components/breakfast/breakfast-order-form";
import { BreakfastOrderSummary, formatBreakfastServiceDate } from "@/components/breakfast/breakfast-order-summary";
import { BreakfastErrorPanel, BreakfastLoadingPanel, BreakfastTerminalPanel } from "@/components/breakfast/breakfast-state-panel";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import {
  getPublicBreakfast,
  submitPublicBreakfast,
  type BreakfastBrand,
  type BreakfastLookupResponse,
  type BreakfastRoom,
  type BreakfastValidResponse,
} from "@/lib/breakfast-api";
import { buildPreviewRooms, createBreakfastDraft, getBreakfastErrorId, validateBreakfastDraft, type BreakfastDraft, type BreakfastDraftErrors } from "@/lib/breakfast-order";

type BreakfastPageProps = { token: string; previewLabel?: string; simulateSubmit?: boolean; initialLookup?: BreakfastLookupResponse };
type LoadState = "loading" | "ready" | "error";

const EMPTY_DRAFT: BreakfastDraft = { rooms: [] };
const EMPTY_ERRORS: BreakfastDraftErrors = {};

const brandPresentation: Record<BreakfastBrand, { heading: string; description: string; logo: string; logoAlt: string; sticker: string }> = {
  BUTEAK: { heading: "Buteak Suites Menu", description: "Choose complimentary breakfast for each guest in your stay.", logo: "/brands/buteak/logo.svg", logoAlt: "Buteak Suites", sticker: "COMPLIMENTARY" },
  TDS: { heading: "The Daily Social Breakfast Menu", description: "Choose complimentary breakfast for each guest in your stay.", logo: "/brands/tds/logo.png", logoAlt: "The Daily Social", sticker: "GOOD MORNING" },
};

function BreakfastBrandHeader({ brand, previewLabel }: { brand?: BreakfastBrand; previewLabel?: string }) {
  const presentation = brand ? brandPresentation[brand] : null;
  return <header className="pb-8 pt-5 sm:pb-10 sm:pt-8">{previewLabel ? <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-white/14 pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#f3c96b]">Design preview</p><p className="mt-1 text-sm text-white/62">{previewLabel} · Submit is simulated</p></div><Link className="inline-flex min-h-11 items-center rounded-[10px] border border-white/15 px-4 text-sm font-bold text-white hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b]" href="/breakfast/preview">All test links</Link></div> : null}<div className="flex items-start justify-between gap-5"><div>{presentation ? <Image alt={presentation.logoAlt} className="h-auto max-h-[76px] w-auto max-w-[132px] object-contain" height={brand === "BUTEAK" ? 76 : 64} priority src={presentation.logo} width={brand === "BUTEAK" ? 76 : 128} /> : <div aria-hidden="true" className="inline-flex size-14 items-center justify-center rounded-full border border-white/16 bg-white/[0.04] text-[#f3c96b]"><UtensilsCrossed className="size-6" /></div>}</div>{presentation ? <StickerTag bg="#FEF08A" className="mt-2 px-3 py-1.5 text-[10px] font-black not-italic tracking-[0.1em]" label={presentation.sticker} rotate="rotate-[3deg]" text="#230f14" /> : null}</div><div className="mt-6 max-w-2xl"><h1 className="font-sectiontitle text-pretty text-[38px] leading-[1.02] text-white sm:text-[50px]">{presentation?.heading ?? "Breakfast Menu"}</h1><p className="mt-3 max-w-xl text-pretty text-base leading-7 text-white/66">{presentation?.description ?? "We are checking the breakfast details for your stay."}</p></div></header>;
}

function BreakfastStayContext({ response }: { response: BreakfastValidResponse }) {
  const roomLabel = response.rooms.length === 1 ? response.rooms[0].room_number : `${response.rooms.length} rooms`;
  return <dl className="grid gap-4 border-y border-dashed border-white/16 py-5 sm:grid-cols-3"><div className="flex gap-3"><MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f3c96b]" /><div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-white/44">Stay</dt><dd className="mt-1 font-bold text-white">{roomLabel}</dd></div></div><div className="flex gap-3"><Users aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f3c96b]" /><div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-white/44">Eligible adults</dt><dd className="mt-1 font-bold tabular-nums text-white">{response.total_adults}</dd></div></div><div className="flex gap-3"><CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f3c96b]" /><div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-white/44">Breakfast date</dt><dd className="mt-1 font-bold text-white">{formatBreakfastServiceDate(response.window.service_date)}</dd></div></div></dl>;
}

function mergeRooms(current: BreakfastRoom[], changed: BreakfastRoom[]) {
  const changedById = new Map(changed.map((room) => [room.ezee_reservation_id, room]));
  return current.map((room) => changedById.get(room.ezee_reservation_id) ?? room);
}

export function BreakfastPage({ token, previewLabel, simulateSubmit = false, initialLookup }: BreakfastPageProps) {
  const [loadState, setLoadState] = useState<LoadState>(initialLookup ? "ready" : "loading");
  const [lookup, setLookup] = useState<BreakfastLookupResponse | null>(initialLookup ?? null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<BreakfastDraft>(() => initialLookup?.link_state === "valid" ? createBreakfastDraft(initialLookup) : EMPTY_DRAFT);
  const [errors, setErrors] = useState<BreakfastDraftErrors>(EMPTY_ERRORS);
  const [editing, setEditing] = useState(() => initialLookup?.link_state === "valid" ? !initialLookup.rooms.some((room) => room.order_status) : true);
  const [pending, setPending] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmedRooms, setConfirmedRooms] = useState<BreakfastRoom[]>([]);
  const [skipReservationId, setSkipReservationId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  const applyLookup = useCallback((next: BreakfastLookupResponse, preserveDraft = false) => {
    setLookup(next); setLoadState("ready"); setLoadError("");
    if (next.link_state === "valid" && !preserveDraft) {
      setDraft(createBreakfastDraft(next));
      setErrors(EMPTY_ERRORS);
      setEditing(!next.rooms.some((room) => room.order_status));
    }
  }, []);

  const loadBreakfast = useCallback(async (preserveDraft = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    if (!preserveDraft) setLoadState("loading");
    try {
      const result = await getPublicBreakfast(token, controller.signal);
      if (!result.ok) { if (!preserveDraft) { setLoadState("error"); setLoadError(result.message); } return null; }
      applyLookup(result.data, preserveDraft); return result.data;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      if (!preserveDraft) { setLoadState("error"); setLoadError("We couldn't load the breakfast service. Try again."); }
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
    if (!editing || pending || lookup?.link_state !== "valid" || JSON.stringify(draft) === JSON.stringify(createBreakfastDraft(lookup))) return;
    const preventExit = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventExit); return () => window.removeEventListener("beforeunload", preventExit);
  }, [draft, editing, lookup, pending]);

  const applyMutationError = useCallback(async (response: BreakfastValidResponse, result: Extract<Awaited<ReturnType<typeof submitPublicBreakfast>>, { ok: false }>) => {
    if (result.data?.link_state) { setLookup({ link_state: result.data.link_state, brand: response.brand }); return; }
    if (result.data?.error === "window_frozen") { setLookup({ ...response, window: result.data.window ?? { ...response.window, state: "frozen" } }); setEditing(false); setAnnouncement("Breakfast ordering is now read-only."); return; }
    if (result.data?.error === "slot_full") { setLookup({ ...response, slots: result.data.slots ?? response.slots }); setErrors({ form: "A selected slot just filled up. Review each plate and choose another time." }); await loadBreakfast(true); return; }
    setErrors({ form: result.message }); setAnnouncement(result.message);
  }, [loadBreakfast]);

  const handleSubmit = useCallback(async () => {
    if (lookup?.link_state !== "valid" || pending) return;
    const validation = validateBreakfastDraft(draft, lookup); setErrors(validation.errors);
    if (!validation.ok || !validation.payload) {
      const firstErrorKey = Object.keys(validation.errors)[0] ?? "form";
      window.requestAnimationFrame(() => {
        const target = document.getElementById(getBreakfastErrorId(firstErrorKey));
        target?.focus({ preventScroll: true });
        target?.scrollIntoView?.({ behavior: "auto", block: "center" });
      });
      return;
    }
    setPending(true);
    try {
      let rooms: BreakfastRoom[];
      if (simulateSubmit) {
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        rooms = buildPreviewRooms(lookup, validation.payload.rooms);
      } else {
        const result = await submitPublicBreakfast(token, validation.payload);
        if (!result.ok) { await applyMutationError(lookup, result); return; }
        rooms = mergeRooms(lookup.rooms, result.data.rooms);
      }
      const next = { ...lookup, rooms }; setLookup(next); setDraft(createBreakfastDraft(next)); setConfirmedRooms(rooms.filter((room) => room.order_status)); setEditing(false); setConfirmationOpen(true); setAnnouncement(simulateSubmit ? "Sample confirmation opened. No order was saved." : "Breakfast order submitted.");
    } finally { setPending(false); }
  }, [applyMutationError, draft, lookup, pending, simulateSubmit, token]);

  const handleSkip = useCallback(async () => {
    if (lookup?.link_state !== "valid" || !skipReservationId || pending) return;
    const payload = { rooms: [{ ezee_reservation_id: skipReservationId, action: "SKIP" as const }] };
    setPending(true);
    try {
      let rooms: BreakfastRoom[];
      if (simulateSubmit) { await new Promise((resolve) => window.setTimeout(resolve, 300)); rooms = buildPreviewRooms(lookup, payload.rooms); }
      else { const result = await submitPublicBreakfast(token, payload); if (!result.ok) { await applyMutationError(lookup, result); return; } rooms = mergeRooms(lookup.rooms, result.data.rooms); }
      const next = { ...lookup, rooms }; setLookup(next); setDraft(createBreakfastDraft(next)); setSkipReservationId(null); setEditing(false); setAnnouncement(simulateSubmit ? "Sample skip shown. No order was saved." : "Breakfast skipped for this room.");
    } finally { setPending(false); }
  }, [applyMutationError, lookup, pending, simulateSubmit, skipReservationId, token]);

  const brand = lookup?.brand;
  const validLookup = lookup?.link_state === "valid" ? lookup : null;
  const summaryRooms = validLookup?.rooms.filter((room) => room.order_status) ?? [];
  const skipRoom = validLookup?.rooms.find((room) => room.ezee_reservation_id === skipReservationId);

  return <main className="relative min-h-[100dvh] overflow-x-clip bg-[#07070a] text-white" style={{ colorScheme: "dark" }}><a className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[260] focus:not-sr-only focus:rounded-[10px] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-[#07070a]" href="#breakfast-content">Skip to breakfast content</a><div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(198,40,40,0.14),transparent_34%),radial-gradient(circle_at_90%_8%,rgba(215,166,74,0.08),transparent_25%)]" /><div className="relative mx-auto w-full max-w-[860px] px-4 pb-12 sm:px-6 sm:pb-16"><BreakfastBrandHeader brand={brand} previewLabel={previewLabel} /><div id="breakfast-content" tabIndex={-1}>{loadState === "loading" ? <BreakfastLoadingPanel /> : null}{loadState === "error" ? <BreakfastErrorPanel message={loadError} onRetry={() => void loadBreakfast()} /> : null}{loadState === "ready" && lookup && lookup.link_state !== "valid" ? <BreakfastTerminalPanel response={lookup} /> : null}{validLookup ? <div className="space-y-8"><BreakfastStayContext response={validLookup} />{validLookup.window.state === "frozen" ? <section className="border-l-2 border-[#f3c96b] bg-[#f3c96b]/8 px-4 py-4" role="status"><p className="font-bold text-amber-50">Ordering is read-only right now.</p><p className="mt-1 text-sm leading-6 text-white/66">Ordering for {formatBreakfastServiceDate(validLookup.window.service_date)} opens at {validLookup.window.opens_at_ist}.</p></section> : null}{!editing && summaryRooms.length > 0 ? <BreakfastOrderSummary actions={validLookup.window.state === "open" ? <Button className="h-12 rounded-[12px] bg-[var(--vh-pink)] px-5 font-bold text-white hover:bg-[var(--vh-pink-soft)]" onClick={() => { setDraft(createBreakfastDraft(validLookup)); setErrors(EMPTY_ERRORS); setEditing(true); }} type="button">Edit breakfast choices</Button> : undefined} menu={validLookup.menu} note={validLookup.window.state === "open" ? "You can change these choices while the backend ordering window remains open." : `Ordering opens at ${validLookup.window.opens_at_ist}.`} rooms={summaryRooms} serviceDate={validLookup.window.service_date} /> : null}{editing && validLookup.window.state === "open" ? <BreakfastOrderForm draft={draft} errors={errors} onSkipRoom={setSkipReservationId} onSubmit={() => void handleSubmit()} pending={pending} response={validLookup} setDraft={setDraft} /> : null}{validLookup.window.state === "frozen" && summaryRooms.length === 0 ? <section className="border-y border-dashed border-white/16 py-8"><h2 className="font-sectiontitle text-[28px] text-white">No breakfast order yet</h2><p className="mt-2 text-sm leading-6 text-white/64">Return when the backend ordering window opens.</p></section> : null}</div> : null}</div></div><p aria-live="polite" className="sr-only" role="status">{announcement}</p>{validLookup ? <><BreakfastConfirmationDialog canEdit={validLookup.window.state === "open"} menu={validLookup.menu} onEdit={() => { setDraft(createBreakfastDraft(validLookup)); setEditing(true); }} onOpenChange={setConfirmationOpen} open={confirmationOpen} rooms={confirmedRooms} serviceDate={validLookup.window.service_date} simulated={simulateSubmit} /><BreakfastSkipDialog onConfirm={() => void handleSkip()} onOpenChange={(open) => { if (!open) setSkipReservationId(null); }} open={Boolean(skipRoom)} pending={pending} roomNumber={skipRoom?.room_number ?? ""} /></> : null}</main>;
}
