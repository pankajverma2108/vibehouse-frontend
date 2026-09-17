import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Users } from "lucide-react";

import type { EventCardProps } from "@/content/types";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { Button as NeoPopButton } from "@/components/neopop";

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
  const whatsappText = `Hi, I'd like to RSVP for ${title} at The Daily Social. Date: ${date}, Time: ${time}, Location: ${location}.`;
  const whatsappHref = `https://wa.me/918884973328?text=${encodeURIComponent(whatsappText)}`;

  const details = [
    { icon: CalendarDays, label: date, tone: "text-[var(--np-yellow)]" },
    { icon: Clock3, label: time, tone: "text-[var(--np-blue)]" },
    { icon: MapPin, label: location, tone: "text-[var(--np-green)]" },
    { icon: Users, label: capacity, tone: "text-white/80" },
  ];

  return (
    <div className="flex flex-col border border-[#3D3D3D] bg-[#161616] shadow-[4px_4px_0px_#000000] hover:border-white/40 transition-colors h-full">
      <div className="relative h-[220px] w-full overflow-hidden border-b border-[#3D3D3D] bg-black">
        <ImageWithFallback
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          src={image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {badge ? (
          <div className="absolute right-3 top-3 border border-black bg-[var(--np-yellow)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-black">
            {badge.label}
          </div>
        ) : null}

        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-['Gilroy',sans-serif] text-xl font-extrabold uppercase tracking-[0.06em] text-white">
            {title}
          </h3>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 gap-4">
        <p className="text-xs leading-relaxed text-white/65 font-['Gilroy',sans-serif] line-clamp-2">
          {description ?? "Experience details will be available from API soon. Stay tuned for full lineup info."}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {details.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2 border border-[#3D3D3D] bg-[#121212] px-2.5 py-1.5 text-xs text-white/80 font-['Gilroy',sans-serif]"
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${item.tone}`} />
                <span className="truncate font-semibold text-[11px] uppercase tracking-[0.04em]">{item.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-2 flex flex-col gap-3">
          <div className="border border-[var(--np-yellow)]/40 bg-[var(--np-yellow)]/10 p-2 text-center text-xs font-black uppercase tracking-[0.12em] text-[var(--np-yellow)] font-['Gilroy',sans-serif]">
            {price}
          </div>

          <NeoPopButton asChild fullWidth size="sm" variant="primary">
            <Link href={whatsappHref} rel="noreferrer" target="_blank">
              RSVP via WhatsApp
            </Link>
          </NeoPopButton>
        </div>
      </div>
    </div>
  );
}
