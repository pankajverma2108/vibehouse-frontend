import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Users } from "lucide-react";

import type { EventCardProps } from "@/content/types";

import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { FloatCard } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    { icon: CalendarDays, label: date, tone: "text-[var(--vh-pink)]" },
    { icon: Clock3, label: time, tone: "text-[var(--vh-cyan)]" },
    { icon: MapPin, label: location, tone: "text-[var(--vh-lime)]" },
    { icon: Users, label: capacity, tone: "text-[var(--vh-amber)]" },
  ];

  return (
    <FloatCard style={{ rotate: "1deg" }}>
      <Card className="overflow-hidden border-white/12 bg-[linear-gradient(180deg,rgba(33,17,34,0.98),rgba(17,10,17,0.98))] hover:border-[var(--vh-pink)]">
        <div className="relative h-[220px] overflow-hidden">
          <ImageWithFallback alt={title} className="h-full w-full object-cover hover:scale-105" src={image} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
          {badge ? (
            <div
              className="absolute right-4 top-4 rounded-[12px] border-2 border-white px-3 py-1 text-[10px] font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]"
              style={{ backgroundColor: badge.color }}
            >
              {badge.label}
            </div>
          ) : null}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-['Geologica'] text-2xl font-bold uppercase text-white">{title}</h3>
          </div>
        </div>

        <CardContent className="space-y-4 py-3.5">
          <p className="text-sm leading-6 text-white/72">
            {description ?? "Experience details will be available from API soon. Stay tuned for full lineup info."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {details.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/82"
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/6 ${item.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate font-medium">{item.label}</span>
                </div>
              );
            })}
          </div>
          <div className="rounded-[4px] border-2 border-dashed border-[var(--vh-pink)] bg-[var(--vh-pink)]/10 p-3 text-center font-bold text-[var(--vh-pink)]">
            {price}
          </div>
          <Button asChild className="flex w-full">
            <Link href={whatsappHref} rel="noreferrer" target="_blank">RSVP / Book</Link>
          </Button>
        </CardContent>
      </Card>
    </FloatCard>
  );
}
