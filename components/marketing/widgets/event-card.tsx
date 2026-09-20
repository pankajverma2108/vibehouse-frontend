import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Users, ArrowUpRight } from "lucide-react";

import type { EventCardProps } from "@/content/types";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { MagneticButton } from "../interactive/magnetic-button";

export function EventCard({
  badge,
  capacity,
  date,
  description,
  image,
  location,
  price,
  time,
  title,
}: EventCardProps) {
  const rsvpSubject = `RSVP: ${title} at Vibehouse (${date})`;
  const rsvpBody = `Hi Vibehouse team,\n\nI'd like to RSVP for ${title}.\nDate: ${date}\nTime: ${time}\nLocation: ${location}\n\nThanks!`;
  const rsvpHref = `mailto:hello@vibehouse.co?subject=${encodeURIComponent(rsvpSubject)}&body=${encodeURIComponent(rsvpBody)}`;

  const details = [
    { icon: CalendarDays, label: date, tone: "text-[#E01E5A]" },
    { icon: Clock3, label: time, tone: "text-[#36C5F0]" },
    { icon: MapPin, label: location, tone: "text-[#2FBC81]" },
    { icon: Users, label: capacity, tone: "text-[#ECB22E]" },
  ];

  return (
    <div className="group flex flex-col bg-[#121216] rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)] h-full">
      {/* Event Photography */}
      <div className="relative h-[230px] w-full overflow-hidden bg-[#0A0A0E]">
        <ImageWithFallback
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          src={image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121216] via-transparent to-black/40" />

        {badge ? (
          <div className="absolute right-3 top-3 rounded-full bg-[#E01E5A] px-3 py-1 text-[10px] font-mono font-medium uppercase tracking-wider text-white shadow-md">
            {badge.label}
          </div>
        ) : null}

        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-display text-xl font-bold uppercase tracking-tight text-white drop-shadow-md">
            {title}
          </h3>
        </div>
      </div>

      {/* Event Metadata & RSVP */}
      <div className="p-6 flex flex-col flex-1 justify-between gap-5">
        <p className="text-xs leading-relaxed text-white/70 font-body line-clamp-2">
          {description ?? "Join resident nomads and local creators for an immersive evening under the Bangalore sky."}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {details.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2 text-xs text-white/80"
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${item.tone}`} />
                <span className="truncate font-mono font-medium text-[10.5px] uppercase tracking-wider">{item.label}</span>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
          <span className="inline-block rounded-full bg-[#E01E5A]/15 border border-[#E01E5A]/30 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E01E5A]">
            {price}
          </span>

          <Link href={rsvpHref} rel="noreferrer" className="shrink-0">
            <MagneticButton className="rounded-full bg-[#E01E5A] hover:bg-[#F02D6B] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_4px_16px_rgba(224,30,90,0.35)] active:scale-[0.98]">
              <span>RSVP</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </MagneticButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
