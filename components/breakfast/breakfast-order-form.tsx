"use client";

import { Ban, Check, CircleAlert, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type Dispatch, type FocusEvent, type SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import type { BreakfastValidResponse } from "@/lib/breakfast-api";
import {
  MAX_BREAKFAST_REQUEST_LENGTH,
  addBreakfastPlate,
  formatBreakfastSlotWindow,
  getBreakfastErrorId,
  getRoomDraft,
  groupBreakfastMenu,
  isBreakfastSlotSelectable,
  removeBreakfastPlate,
  setBreakfastRoomIntent,
  sortBreakfastSlots,
  updateBreakfastPlate,
  type BreakfastDraft,
  type BreakfastDraftErrors,
} from "@/lib/breakfast-order";

export type BreakfastOrderFormProps = {
  response: BreakfastValidResponse;
  draft: BreakfastDraft;
  setDraft: Dispatch<SetStateAction<BreakfastDraft>>;
  validationErrors: BreakfastDraftErrors;
  errors: BreakfastDraftErrors;
  pending: boolean;
  remainingRequirements: string[];
  initialReservationId?: string;
  onReview: () => void;
  onSkipRoom: (reservationId: string) => void;
};

type RoomState = "complete" | "incomplete" | "skipped";

const ROOM_STATE_PRESENTATION: Record<RoomState, { label: string; className: string }> = {
  complete: { label: "Complete", className: "text-emerald-300" },
  incomplete: { label: "Needs choices", className: "text-amber-200" },
  skipped: { label: "Skipped", className: "text-white/58" },
};

function VegDot({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={`inline-flex size-4 shrink-0 items-center justify-center border ${isVeg ? "border-emerald-400" : "border-rose-400"}`}
    >
      <span className={`size-2 rounded-full ${isVeg ? "bg-emerald-400" : "bg-rose-400"}`} />
    </span>
  );
}

function getRoomState(
  reservationId: string,
  intent: "ORDER" | "SKIP",
  validationErrors: BreakfastDraftErrors,
): RoomState {
  if (intent === "SKIP") return "skipped";
  return Object.keys(validationErrors).some((key) => key === "form" || key.startsWith(`${reservationId}:`))
    ? "incomplete"
    : "complete";
}

export function BreakfastOrderForm({
  response,
  draft,
  setDraft,
  validationErrors,
  errors,
  pending,
  remainingRequirements,
  initialReservationId,
  onReview,
  onSkipRoom,
}: BreakfastOrderFormProps) {
  const [activeReservationId, setActiveReservationId] = useState(
    initialReservationId ?? response.rooms[0]?.ezee_reservation_id ?? "",
  );
  const [touchedFields, setTouchedFields] = useState<Set<string>>(() => new Set());
  const room = response.rooms.find((item) => item.ezee_reservation_id === activeReservationId) ?? response.rooms[0];
  const roomDraft = room ? getRoomDraft(draft, room.ezee_reservation_id) : undefined;
  const groups = useMemo(() => groupBreakfastMenu(response.menu), [response.menu]);
  const slots = useMemo(() => sortBreakfastSlots(response.slots), [response.slots]);
  const isComplete = Object.keys(validationErrors).length === 0;

  if (!room || !roomDraft) return null;

  const markTouched = (key: string) => {
    setTouchedFields((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  };

  const markRoomTouched = (reservationId: string) => {
    const roomKeys = Object.keys(validationErrors).filter((key) => key.startsWith(`${reservationId}:`));
    if (roomKeys.length === 0) return;
    setTouchedFields((current) => new Set([...current, ...roomKeys]));
  };

  const handleGroupBlur = (key: string, event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      markTouched(key);
    }
  };

  const visibleError = (key: string) => errors[key] ?? (touchedFields.has(key) ? validationErrors[key] : undefined);

  const setPlate = (plateIndex: number, update: Parameters<typeof updateBreakfastPlate>[3]) => {
    setDraft((current) => updateBreakfastPlate(current, room.ezee_reservation_id, plateIndex, update));
  };

  const selectRoom = (reservationId: string) => {
    if (reservationId === room.ezee_reservation_id) return;
    markRoomTouched(room.ezee_reservation_id);
    setActiveReservationId(reservationId);
  };

  return (
    <form className="pb-8" onSubmit={(event) => { event.preventDefault(); if (isComplete && !pending) onReview(); }}>
      {response.rooms.length > 1 ? (
        <section aria-labelledby="breakfast-room-title" className="border-b border-dashed border-white/16 pb-7">
          <p className="font-caption text-xs uppercase tracking-[0.14em] text-[#f3c96b]">Your stay</p>
          <h2 className="font-sectiontitle mt-2 text-[28px] text-white sm:text-[34px]" id="breakfast-room-title">
            Choose a room
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/62">Choose breakfast or skip each room.</p>
          <div
            aria-label="Breakfast rooms"
            className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-1"
            role="tablist"
          >
            {response.rooms.map((item) => {
              const itemDraft = getRoomDraft(draft, item.ezee_reservation_id);
              const state = getRoomState(item.ezee_reservation_id, itemDraft?.intent ?? "ORDER", validationErrors);
              const statePresentation = ROOM_STATE_PRESENTATION[state];
              const active = item.ezee_reservation_id === room.ezee_reservation_id;
              return (
                <button
                  aria-controls={`breakfast-room-panel-${item.ezee_reservation_id}`}
                  aria-selected={active}
                  className={`min-h-14 min-w-0 rounded-[12px] border px-4 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b] sm:min-w-40 sm:shrink-0 sm:px-5 ${active ? "border-[#f3c96b] bg-[#f3c96b] text-[#180d0f]" : "border-white/16 bg-white/[0.04] text-white hover:bg-white/[0.08]"}`}
                  id={`breakfast-room-tab-${item.ezee_reservation_id}`}
                  key={item.ezee_reservation_id}
                  onClick={() => selectRoom(item.ezee_reservation_id)}
                  role="tab"
                  type="button"
                >
                  <span className="block text-sm font-bold">Room {item.room_number}</span>
                  <span className={`mt-0.5 block text-[11px] font-bold uppercase tracking-[0.08em] ${active ? "text-black/62" : statePresentation.className}`}>
                    {statePresentation.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="active-room-title"
        id={`breakfast-room-panel-${room.ezee_reservation_id}`}
        role={response.rooms.length > 1 ? "tabpanel" : undefined}
        tabIndex={response.rooms.length > 1 ? 0 : undefined}
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-dashed border-white/16 py-7">
          <div>
            <p className="font-caption text-xs uppercase tracking-[0.14em] text-[#f3c96b]">Room {room.room_number}</p>
            <h2 className="font-sectiontitle mt-2 text-[30px] leading-tight text-white sm:text-[38px]" id="active-room-title">
              {roomDraft.intent === "SKIP" ? "Breakfast skipped" : "Build each plate"}
            </h2>
          </div>
          {roomDraft.intent === "ORDER" && roomDraft.plates.length < room.max_plates ? (
            <Button
              className="h-11 rounded-full border-white/18 bg-white/[0.04] px-4 text-white hover:bg-white/[0.09]"
              onClick={() => setDraft((current) => addBreakfastPlate(current, room))}
              type="button"
              variant="outline"
            >
              <Plus aria-hidden="true" /> Add plate
            </Button>
          ) : null}
        </div>

        {roomDraft.intent === "SKIP" ? (
          <div className="border-b border-dashed border-white/16 py-9">
            <div className="flex items-start gap-3">
              <Ban aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f3c96b]" />
              <div>
                <p className="font-bold text-white">Room {room.room_number} is marked to skip breakfast.</p>
                <p className="mt-1 text-sm leading-6 text-white/62">You can change this before confirming your order.</p>
              </div>
            </div>
            <Button
              className="mt-5 h-11 rounded-[12px] border-white/24 bg-[#15151b] px-5 font-bold text-white hover:bg-[#202029]"
              onClick={() => setDraft((current) => setBreakfastRoomIntent(current, room, "ORDER"))}
              type="button"
              variant="outline"
            >
              Choose breakfast instead
            </Button>
          </div>
        ) : (
          <>
            {roomDraft.plates.length === 0 ? (
              <div className="border-b border-dashed border-white/16 py-10 text-center">
                <p className="text-base font-semibold text-white">Add a plate or skip breakfast for this room.</p>
                <Button
                  className="mt-4 h-11 rounded-full bg-[var(--vh-pink)] px-5 font-bold text-white hover:bg-[var(--vh-pink-soft)]"
                  onClick={() => setDraft((current) => addBreakfastPlate(current, room))}
                  type="button"
                >
                  <Plus aria-hidden="true" /> Add Plate 1
                </Button>
              </div>
            ) : null}

            {roomDraft.plates.map((plate, plateIndex) => {
              const mainKey = `${room.ezee_reservation_id}:${plateIndex}:main`;
              const slotKey = `${room.ezee_reservation_id}:${plateIndex}:slot`;
              const requestKey = `${room.ezee_reservation_id}:${plateIndex}:requests`;
              const mainError = visibleError(mainKey);
              const slotError = visibleError(slotKey);
              const requestError = visibleError(requestKey);
              const mainLabelId = `breakfast-${room.ezee_reservation_id}-${plateIndex}-main-label`;
              const slotLabelId = `breakfast-${room.ezee_reservation_id}-${plateIndex}-slot-label`;

              return (
                <fieldset className="border-b border-dashed border-white/16 py-8" key={`${room.ezee_reservation_id}-${plateIndex}`}>
                  <legend className="sr-only">Plate {plateIndex + 1}</legend>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-caption text-xs uppercase tracking-[0.14em] text-[#f3c96b]">Guest {plateIndex + 1}</p>
                      <h3 className="font-sectiontitle mt-1 text-[27px] text-white">Plate {plateIndex + 1}</h3>
                    </div>
                    <button
                      aria-label={`Remove Plate ${plateIndex + 1}`}
                      className="inline-flex size-11 items-center justify-center rounded-full border border-white/14 text-white/64 hover:border-rose-300/50 hover:text-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b]"
                      onClick={() => setDraft((current) => removeBreakfastPlate(current, room.ezee_reservation_id, plateIndex))}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>

                  <div
                    aria-describedby={mainError ? getBreakfastErrorId(mainKey) : undefined}
                    aria-invalid={Boolean(mainError)}
                    aria-labelledby={mainLabelId}
                    className="mt-7"
                    onBlur={(event) => handleGroupBlur(mainKey, event)}
                    role="radiogroup"
                  >
                    <p className="text-sm font-bold text-white" id={mainLabelId}>Choose one main</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {groups.mains.map((item) => {
                        const id = `breakfast-${room.ezee_reservation_id}-${plateIndex}-main-${item.id}`;
                        return (
                          <label
                            className="flex min-h-16 cursor-pointer items-center gap-3 rounded-[12px] border border-white/14 bg-white/[0.025] px-4 py-3 transition-colors has-[:checked]:border-[#f3c96b] has-[:checked]:bg-[#f3c96b]/10"
                            htmlFor={id}
                            key={item.id}
                          >
                            <input
                              aria-describedby={mainError ? getBreakfastErrorId(mainKey) : undefined}
                              checked={(plate.quantities[item.id] ?? 0) > 0}
                              className="size-5 accent-[#f3c96b]"
                              id={id}
                              name={`main-${room.ezee_reservation_id}-${plateIndex}`}
                              onChange={() => setPlate(plateIndex, (current) => ({
                                ...current,
                                quantities: {
                                  ...current.quantities,
                                  ...Object.fromEntries(groups.mains.map((main) => [main.id, main.id === item.id ? 1 : 0])),
                                },
                              }))}
                              type="radio"
                            />
                            <VegDot isVeg={item.is_veg} />
                            <span className="min-w-0">
                              <span className="block font-semibold text-white">{item.name}</span>
                              {item.description ? <span className="mt-0.5 block text-xs leading-5 text-white/52">{item.description}</span> : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {mainError ? <p className="mt-3 text-sm font-semibold text-rose-300" id={getBreakfastErrorId(mainKey)} role="alert" tabIndex={-1}>{mainError}</p> : null}
                  </div>

                  {[
                    { title: "Add something extra", items: groups.addons },
                    { title: "Drinks", items: groups.beverages },
                  ].map((group) => group.items.length > 0 ? (
                    <div className="mt-7" key={group.title}>
                      <p className="text-sm font-bold text-white">{group.title}</p>
                      <div className="mt-2 divide-y divide-dashed divide-white/10 border-y border-dashed border-white/10">
                        {group.items.map((item) => {
                          const qty = plate.quantities[item.id] ?? 0;
                          return (
                            <div className="flex min-h-14 items-center justify-between gap-4 py-2" key={item.id}>
                              <span className="flex min-w-0 items-center gap-3">
                                <VegDot isVeg={item.is_veg} />
                                <span className="truncate text-sm font-medium text-white/82">{item.name}</span>
                              </span>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  aria-label={`Remove one ${item.name} from Plate ${plateIndex + 1}`}
                                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/14 text-white disabled:opacity-30"
                                  disabled={qty === 0}
                                  onClick={() => setPlate(plateIndex, (current) => ({ ...current, quantities: { ...current.quantities, [item.id]: Math.max(0, qty - 1) } }))}
                                  type="button"
                                >
                                  <Minus aria-hidden="true" className="size-4" />
                                </button>
                                <output aria-live="polite" className="w-8 text-center text-sm font-bold tabular-nums text-white">{qty}</output>
                                <button
                                  aria-label={`Add one ${item.name} to Plate ${plateIndex + 1}`}
                                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/14 text-white disabled:opacity-30"
                                  disabled={qty >= 5}
                                  onClick={() => setPlate(plateIndex, (current) => ({ ...current, quantities: { ...current.quantities, [item.id]: Math.min(5, qty + 1) } }))}
                                  type="button"
                                >
                                  <Plus aria-hidden="true" className="size-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null)}

                  <div
                    aria-describedby={slotError ? getBreakfastErrorId(slotKey) : undefined}
                    aria-invalid={Boolean(slotError)}
                    aria-labelledby={slotLabelId}
                    className="mt-7"
                    onBlur={(event) => handleGroupBlur(slotKey, event)}
                    role="radiogroup"
                  >
                    <p className="text-sm font-bold text-white" id={slotLabelId}>Delivery slot</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {slots.map((slot) => {
                        const available = isBreakfastSlotSelectable(
                          slot.id,
                          room.ezee_reservation_id,
                          plateIndex,
                          draft,
                          response,
                        );
                        const id = `breakfast-${room.ezee_reservation_id}-${plateIndex}-slot-${slot.id}`;
                        return (
                          <label
                            className={`flex min-h-16 items-center justify-between gap-3 rounded-[12px] border px-4 py-3 ${available ? "cursor-pointer border-white/14 bg-white/[0.025] has-[:checked]:border-[#f3c96b] has-[:checked]:bg-[#f3c96b]/10" : "cursor-not-allowed border-white/8 bg-white/[0.015] opacity-45"}`}
                            htmlFor={id}
                            key={slot.id}
                          >
                            <span className="flex items-center gap-3">
                              <input
                                aria-describedby={slotError ? getBreakfastErrorId(slotKey) : undefined}
                                checked={plate.slotId === slot.id}
                                className="size-5 accent-[#f3c96b]"
                                disabled={!available}
                                id={id}
                                name={`slot-${room.ezee_reservation_id}-${plateIndex}`}
                                onChange={() => setPlate(plateIndex, (current) => ({ ...current, slotId: slot.id }))}
                                type="radio"
                              />
                              <span className="font-semibold tabular-nums text-white">
                                {formatBreakfastSlotWindow(slot)}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs font-bold text-white/52">{available ? "Available" : "Full"}</span>
                          </label>
                        );
                      })}
                    </div>
                    {slotError ? <p className="mt-3 text-sm font-semibold text-rose-300" id={getBreakfastErrorId(slotKey)} role="alert" tabIndex={-1}>{slotError}</p> : null}
                  </div>

                  <div className="mt-7">
                    <div className="flex justify-between gap-4">
                      <label className="text-sm font-bold text-white" htmlFor={`requests-${room.ezee_reservation_id}-${plateIndex}`}>
                        Special requests <span className="font-normal text-white/42">(optional)</span>
                      </label>
                      <span className="text-xs tabular-nums text-white/42">{plate.specialRequests.length}/{MAX_BREAKFAST_REQUEST_LENGTH}</span>
                    </div>
                    <textarea
                      aria-describedby={requestError ? getBreakfastErrorId(requestKey) : undefined}
                      aria-invalid={Boolean(requestError)}
                      className="mt-3 min-h-24 w-full resize-y rounded-[12px] border border-white/14 bg-white/[0.035] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[#f3c96b] focus:outline-none"
                      id={`requests-${room.ezee_reservation_id}-${plateIndex}`}
                      maxLength={MAX_BREAKFAST_REQUEST_LENGTH}
                      onBlur={() => markTouched(requestKey)}
                      onChange={(event) => setPlate(plateIndex, (current) => ({ ...current, specialRequests: event.target.value }))}
                      placeholder="Allergies or preparation notes"
                      value={plate.specialRequests}
                    />
                    {requestError ? <p className="mt-2 text-sm font-semibold text-rose-300" id={getBreakfastErrorId(requestKey)} role="alert" tabIndex={-1}>{requestError}</p> : null}
                  </div>
                </fieldset>
              );
            })}
          </>
        )}
      </section>

      {visibleError(`${room.ezee_reservation_id}:room`) ? (
        <p className="mt-6 border-l-2 border-rose-300 bg-rose-300/8 px-4 py-3 text-sm font-semibold text-rose-200" id={getBreakfastErrorId(`${room.ezee_reservation_id}:room`)} role="alert" tabIndex={-1}>
          {visibleError(`${room.ezee_reservation_id}:room`)}
        </p>
      ) : null}
      {errors.form ? <p className="mt-6 border-l-2 border-rose-300 bg-rose-300/8 px-4 py-3 text-sm font-semibold text-rose-200" id={getBreakfastErrorId("form")} role="alert" tabIndex={-1}>{errors.form}</p> : null}

      <div className="mt-8 border-t border-dashed border-white/16 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            className="h-13 rounded-[12px] bg-[var(--vh-pink)] px-7 font-bold text-white hover:bg-[var(--vh-pink-soft)] disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/48"
            disabled={!isComplete || pending}
            type="submit"
          >
            Review Order
          </Button>
          <Button
            className="h-13 rounded-[12px] border-white/20 bg-[#15151b] px-6 font-bold text-white hover:bg-[#202029]"
            disabled={pending}
            onClick={() => onSkipRoom(room.ezee_reservation_id)}
            type="button"
            variant="outline"
          >
            Skip Breakfast for Room {room.room_number}
          </Button>
        </div>

        {isComplete ? (
          <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-emerald-200" role="status">
            <Check aria-hidden="true" className="mt-1 size-4 shrink-0" />
            Your order is ready to review.
          </p>
        ) : (
          <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-amber-100" role="status">
            <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Finish each room to review your order.</p>
              {remainingRequirements.length > 0 ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-white/62">
                  {remainingRequirements.slice(0, 3).map((requirement, index) => <li key={`${index}-${requirement}`}>{requirement}</li>)}
                </ul>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
