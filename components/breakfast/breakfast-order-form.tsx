"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import type { BreakfastValidResponse } from "@/lib/breakfast-api";
import {
  MAX_BREAKFAST_REQUEST_LENGTH,
  addBreakfastPlate,
  getRoomDraft,
  getBreakfastErrorId,
  groupBreakfastMenu,
  isBreakfastSlotAvailable,
  removeBreakfastPlate,
  sortBreakfastSlots,
  updateBreakfastPlate,
  type BreakfastDraft,
  type BreakfastDraftErrors,
} from "@/lib/breakfast-order";

type Props = {
  response: BreakfastValidResponse;
  draft: BreakfastDraft;
  setDraft: Dispatch<SetStateAction<BreakfastDraft>>;
  errors: BreakfastDraftErrors;
  pending: boolean;
  onSubmit: () => void;
  onSkipRoom: (reservationId: string) => void;
};

function VegDot({ isVeg }: { isVeg: boolean }) {
  return <span aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"} className={`inline-flex size-4 shrink-0 items-center justify-center border ${isVeg ? "border-emerald-400" : "border-rose-400"}`}><span className={`size-2 rounded-full ${isVeg ? "bg-emerald-400" : "bg-rose-400"}`} /></span>;
}

export function BreakfastOrderForm({ response, draft, setDraft, errors, pending, onSubmit, onSkipRoom }: Props) {
  const [activeReservationId, setActiveReservationId] = useState(response.rooms[0]?.ezee_reservation_id ?? "");
  const room = response.rooms.find((item) => item.ezee_reservation_id === activeReservationId) ?? response.rooms[0];
  const roomDraft = room ? getRoomDraft(draft, room.ezee_reservation_id) : undefined;
  const groups = useMemo(() => groupBreakfastMenu(response.menu), [response.menu]);
  const slots = useMemo(() => sortBreakfastSlots(response.slots), [response.slots]);

  if (!room || !roomDraft) return null;

  const setPlate = (plateIndex: number, update: Parameters<typeof updateBreakfastPlate>[3]) => {
    setDraft((current) => updateBreakfastPlate(current, room.ezee_reservation_id, plateIndex, update));
  };

  return (
    <form className="pb-8" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      {response.rooms.length > 1 ? (
        <section aria-labelledby="breakfast-room-title" className="border-b border-dashed border-white/16 pb-7">
          <p className="font-caption text-xs uppercase tracking-[0.14em] text-[#f3c96b]">Your stay</p>
          <h2 className="font-sectiontitle mt-2 text-[28px] text-white sm:text-[34px]" id="breakfast-room-title">Choose a room</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-1" role="tablist" aria-label="Breakfast rooms">
            {response.rooms.map((item) => {
              const count = getRoomDraft(draft, item.ezee_reservation_id)?.plates.length ?? 0;
              const active = item.ezee_reservation_id === room.ezee_reservation_id;
              return (
                <button aria-selected={active} className={`min-h-12 min-w-0 rounded-full border px-4 text-left text-sm font-bold transition-colors sm:shrink-0 sm:px-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b] ${active ? "border-[#f3c96b] bg-[#f3c96b] text-[#180d0f]" : "border-white/16 bg-white/[0.04] text-white hover:bg-white/[0.08]"}`} key={item.ezee_reservation_id} onClick={() => setActiveReservationId(item.ezee_reservation_id)} role="tab" type="button">
                  Room {item.room_number} <span className={active ? "text-black/60" : "text-white/48"}>{count}/{item.max_plates}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="active-room-title" className="pt-7">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-dashed border-white/16 pb-6">
          <div>
            <p className="font-caption text-xs uppercase tracking-[0.14em] text-[#f3c96b]">Room {room.room_number}</p>
            <h2 className="font-sectiontitle mt-2 text-[30px] leading-tight text-white sm:text-[38px]" id="active-room-title">Build each plate</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">Up to {room.max_plates} {room.max_plates === 1 ? "plate" : "plates"}, based on the room occupancy.</p>
          </div>
          {roomDraft.plates.length < room.max_plates ? (
            <Button className="h-11 rounded-full border-white/18 bg-white/[0.04] px-4 text-white hover:bg-white/[0.09]" onClick={() => setDraft((current) => addBreakfastPlate(current, room))} type="button" variant="outline"><Plus aria-hidden="true" /> Add plate</Button>
          ) : null}
        </div>

        {roomDraft.plates.length === 0 ? (
          <div className="border-b border-dashed border-white/16 py-10 text-center">
            <p className="text-base font-semibold text-white">No plate added for this room.</p>
            <Button className="mt-4 h-11 rounded-full bg-[var(--vh-pink)] px-5 font-bold text-white hover:bg-[var(--vh-pink-soft)]" onClick={() => setDraft((current) => addBreakfastPlate(current, room))} type="button"><Plus aria-hidden="true" /> Add Plate 1</Button>
          </div>
        ) : null}

        {roomDraft.plates.map((plate, plateIndex) => {
          const mainError = errors[`${room.ezee_reservation_id}:${plateIndex}:main`];
          const slotError = errors[`${room.ezee_reservation_id}:${plateIndex}:slot`];
          const requestError = errors[`${room.ezee_reservation_id}:${plateIndex}:requests`];
          const currentSlotId = room.plates[plateIndex]?.slot_id;
          return (
            <fieldset className="border-b border-dashed border-white/16 py-8" key={`${room.ezee_reservation_id}-${plateIndex}`}>
              <legend className="sr-only">Plate {plateIndex + 1}</legend>
              <div className="flex items-center justify-between gap-4">
                <div><p className="font-caption text-xs uppercase tracking-[0.14em] text-[#f3c96b]">Adult {plateIndex + 1}</p><h3 className="font-sectiontitle mt-1 text-[27px] text-white">Plate {plateIndex + 1}</h3></div>
                <button aria-label={`Remove Plate ${plateIndex + 1}`} className="inline-flex size-11 items-center justify-center rounded-full border border-white/14 text-white/64 hover:border-rose-300/50 hover:text-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b]" onClick={() => setDraft((current) => removeBreakfastPlate(current, room.ezee_reservation_id, plateIndex))} type="button"><Trash2 aria-hidden="true" className="size-4" /></button>
              </div>

              <div className="mt-7">
                <p className="text-sm font-bold text-white">Choose one main</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {groups.mains.map((item) => {
                    const id = `breakfast-${room.ezee_reservation_id}-${plateIndex}-main-${item.id}`;
                    return <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-[12px] border border-white/14 bg-white/[0.025] px-4 py-3 transition-colors has-[:checked]:border-[#f3c96b] has-[:checked]:bg-[#f3c96b]/10" htmlFor={id} key={item.id}><input checked={(plate.quantities[item.id] ?? 0) > 0} className="size-5 accent-[#f3c96b]" id={id} name={`main-${room.ezee_reservation_id}-${plateIndex}`} onChange={() => setPlate(plateIndex, (current) => ({ ...current, quantities: { ...current.quantities, ...Object.fromEntries(groups.mains.map((main) => [main.id, main.id === item.id ? 1 : 0])) } }))} type="radio" /><VegDot isVeg={item.is_veg} /><span className="min-w-0"><span className="block font-semibold text-white">{item.name}</span>{item.description ? <span className="mt-0.5 block text-xs leading-5 text-white/52">{item.description}</span> : null}</span></label>;
                  })}
                </div>
                {mainError ? <p className="mt-3 text-sm font-semibold text-rose-300" id={getBreakfastErrorId(`${room.ezee_reservation_id}:${plateIndex}:main`)} role="alert" tabIndex={-1}>{mainError}</p> : null}
              </div>

              {[{ title: "Add something extra", items: groups.addons }, { title: "Drinks", items: groups.beverages }].map((group) => group.items.length > 0 ? (
                <div className="mt-7" key={group.title}><p className="text-sm font-bold text-white">{group.title}</p><div className="mt-2 divide-y divide-dashed divide-white/10 border-y border-dashed border-white/10">{group.items.map((item) => { const qty = plate.quantities[item.id] ?? 0; return <div className="flex min-h-14 items-center justify-between gap-4 py-2" key={item.id}><span className="flex min-w-0 items-center gap-3"><VegDot isVeg={item.is_veg} /><span className="truncate text-sm font-medium text-white/82">{item.name}</span></span><div className="flex shrink-0 items-center gap-1"><button aria-label={`Remove one ${item.name} from Plate ${plateIndex + 1}`} className="inline-flex size-10 items-center justify-center rounded-full border border-white/14 text-white disabled:opacity-30" disabled={qty === 0} onClick={() => setPlate(plateIndex, (current) => ({ ...current, quantities: { ...current.quantities, [item.id]: Math.max(0, qty - 1) } }))} type="button"><Minus aria-hidden="true" className="size-4" /></button><output aria-live="polite" className="w-8 text-center text-sm font-bold tabular-nums text-white">{qty}</output><button aria-label={`Add one ${item.name} to Plate ${plateIndex + 1}`} className="inline-flex size-10 items-center justify-center rounded-full border border-white/14 text-white disabled:opacity-30" disabled={qty >= 5} onClick={() => setPlate(plateIndex, (current) => ({ ...current, quantities: { ...current.quantities, [item.id]: Math.min(5, qty + 1) } }))} type="button"><Plus aria-hidden="true" className="size-4" /></button></div></div>; })}</div></div>
              ) : null)}

              <div className="mt-7"><p className="text-sm font-bold text-white">Delivery slot</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{slots.map((slot) => { const available = isBreakfastSlotAvailable(slot, currentSlotId); const id = `breakfast-${room.ezee_reservation_id}-${plateIndex}-slot-${slot.id}`; return <label className={`flex min-h-16 items-center justify-between gap-3 rounded-[12px] border px-4 py-3 ${available ? "cursor-pointer border-white/14 bg-white/[0.025] has-[:checked]:border-[#f3c96b] has-[:checked]:bg-[#f3c96b]/10" : "cursor-not-allowed border-white/8 bg-white/[0.015] opacity-45"}`} htmlFor={id} key={slot.id}><span className="flex items-center gap-3"><input checked={plate.slotId === slot.id} className="size-5 accent-[#f3c96b]" disabled={!available} id={id} name={`slot-${room.ezee_reservation_id}-${plateIndex}`} onChange={() => setPlate(plateIndex, (current) => ({ ...current, slotId: slot.id }))} type="radio" /><span className="font-semibold text-white">{slot.label}</span></span><span className="shrink-0 text-xs font-bold text-white/52">{available ? `${slot.remaining} left` : "Full"}</span></label>; })}</div>{slotError ? <p className="mt-3 text-sm font-semibold text-rose-300" id={getBreakfastErrorId(`${room.ezee_reservation_id}:${plateIndex}:slot`)} role="alert" tabIndex={-1}>{slotError}</p> : null}</div>

              <div className="mt-7"><div className="flex justify-between gap-4"><label className="text-sm font-bold text-white" htmlFor={`requests-${room.ezee_reservation_id}-${plateIndex}`}>Special requests <span className="font-normal text-white/42">(optional)</span></label><span className="text-xs tabular-nums text-white/42">{plate.specialRequests.length}/{MAX_BREAKFAST_REQUEST_LENGTH}</span></div><textarea className="mt-3 min-h-24 w-full resize-y rounded-[12px] border border-white/14 bg-white/[0.035] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[#f3c96b] focus:outline-none" id={`requests-${room.ezee_reservation_id}-${plateIndex}`} maxLength={MAX_BREAKFAST_REQUEST_LENGTH} onChange={(event) => setPlate(plateIndex, (current) => ({ ...current, specialRequests: event.target.value }))} placeholder="Allergies or preparation notes" value={plate.specialRequests} />{requestError ? <p className="mt-2 text-sm font-semibold text-rose-300" id={getBreakfastErrorId(`${room.ezee_reservation_id}:${plateIndex}:requests`)} role="alert" tabIndex={-1}>{requestError}</p> : null}</div>
            </fieldset>
          );
        })}
      </section>

      {errors.form ? <p className="mt-6 rounded-[10px] border border-rose-300/30 bg-rose-300/8 px-4 py-3 text-sm font-semibold text-rose-200" id={getBreakfastErrorId("form")} role="alert" tabIndex={-1}>{errors.form}</p> : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button className="h-13 rounded-[12px] bg-[var(--vh-pink)] px-7 font-bold text-white hover:bg-[var(--vh-pink-soft)]" loading={pending} loadingText="Submitting order..." type="submit">Submit order</Button>
        <Button className="h-13 rounded-[12px] border-white/16 bg-transparent px-6 font-bold text-white hover:bg-white/[0.06]" disabled={pending} onClick={() => onSkipRoom(room.ezee_reservation_id)} type="button" variant="outline">Skip breakfast for Room {room.room_number}</Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-white/46">Submit saves every room that currently has plates. Rooms without plates stay unchanged.</p>
    </form>
  );
}
