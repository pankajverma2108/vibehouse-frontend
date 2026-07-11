"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import type { ReactNode } from "react";

import type { BreakfastMenuItem, BreakfastRoom } from "@/lib/breakfast-api";

export function formatBreakfastServiceDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function BreakfastOrderDetails({ rooms, menu, serviceDate }: { rooms: BreakfastRoom[]; menu: BreakfastMenuItem[]; serviceDate: string }) {
  const menuNames = new Map(menu.map((item) => [item.id, item.name]));
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3 border-y border-dashed border-white/15 py-5"><CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f3c96b]" /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-white/48">Breakfast date</p><p className="mt-1 font-semibold text-white">{formatBreakfastServiceDate(serviceDate)}</p></div></div>
      {rooms.map((room) => (
        <section aria-labelledby={`summary-room-${room.ezee_reservation_id}`} className="border-b border-dashed border-white/15 pb-8" key={room.ezee_reservation_id}>
          <div className="flex items-center justify-between gap-4"><h3 className="font-sectiontitle text-[25px] text-white" id={`summary-room-${room.ezee_reservation_id}`}>Room {room.room_number}</h3><span className="text-xs font-bold uppercase tracking-[0.1em] text-[#f3c96b]">{room.order_status ?? "Not submitted"}</span></div>
          {room.order_status === "SKIPPED" || room.plates.length === 0 ? <p className="mt-4 text-sm leading-6 text-white/62">Breakfast skipped for this room.</p> : (
            <ol className="mt-4 divide-y divide-dashed divide-white/12 border-t border-dashed border-white/12">
              {room.plates.map((plate) => (
                <li className="py-5" key={plate.plate_number}>
                  <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-[#f3c96b]">Plate {plate.plate_number}</p><span className="flex items-center gap-2 text-sm font-semibold text-white/72"><Clock3 aria-hidden="true" className="size-4" />{plate.slot_label}</span></div>
                  <ul className="mt-3 space-y-1.5">{plate.items.map((item) => <li className="flex justify-between gap-4 text-sm" key={item.menu_item_id}><span className="text-white/78">{item.name || menuNames.get(item.menu_item_id) || "Menu item"}</span><span className="font-semibold tabular-nums text-white">x{item.qty}</span></li>)}</ul>
                  {plate.special_requests ? <p className="mt-3 border-l border-white/20 pl-3 text-sm italic leading-6 text-white/58">{plate.special_requests}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}

export function BreakfastOrderSummary({ rooms, menu, serviceDate, title = "Your breakfast order", note, actions }: { rooms: BreakfastRoom[]; menu: BreakfastMenuItem[]; serviceDate: string; title?: string; note?: string; actions?: ReactNode }) {
  return <section aria-labelledby="breakfast-order-summary-title" className="py-2"><p className="font-caption text-xs uppercase tracking-[0.12em] text-[#f3c96b]">Saved for your stay</p><h2 className="font-sectiontitle mt-2 text-[30px] leading-tight text-white sm:text-[36px]" id="breakfast-order-summary-title">{title}</h2>{note ? <p className="mt-3 text-sm leading-6 text-white/66">{note}</p> : null}<div className="mt-7"><BreakfastOrderDetails menu={menu} rooms={rooms} serviceDate={serviceDate} /></div>{actions ? <div className="mt-7 flex flex-col gap-3 sm:flex-row">{actions}</div> : null}</section>;
}
