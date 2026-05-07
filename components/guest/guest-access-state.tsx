"use client";

import Link from "next/link";
import { BedDouble, ConciergeBell, PackagePlus, ShoppingBag } from "lucide-react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { BentoCard } from "@/components/guest/bento-card";
import { Button } from "@/components/ui/button";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";

type GuestAccessStateProps = {
  title: string;
  description: string;
  showSignIn?: boolean;
};

const offerCards = [
  {
    title: "Stay services",
    description: "Housekeeping, concierge help, and on-stay support when the booking is live.",
    icon: ConciergeBell,
  },
  {
    title: "Add-ons",
    description: "Snacks, upgrades, and the extra comforts guests usually ask for after arrival.",
    icon: ShoppingBag,
  },
  {
    title: "Borrow desk",
    description: "Adapters, daily-use essentials, and handy items that make the stay easier.",
    icon: PackagePlus,
  },
  {
    title: "Room-first access",
    description: "Your hub becomes active against the booking that is currently in-house for you.",
    icon: BedDouble,
  },
] as const;

export function GuestAccessState({ title, description, showSignIn = false }: GuestAccessStateProps) {
  const { openAuthModal } = useGuestAuth();

  return (
    <section className="space-y-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex rounded-full border border-[var(--vh-pink)]/35 bg-[rgba(198,40,40,0.12)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--vh-pink)]">
          Guest access
        </p>
        <h2 className="vh-title mt-4 text-center text-[26px] text-white md:text-[34px]">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-white/72 md:text-base">{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {showSignIn ? (
          <Button className="h-11 rounded-[4px] bg-[var(--vh-pink)] px-6 font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]" onClick={() => openAuthModal("signin")} type="button">
            Sign in to continue
          </Button>
        ) : null}
        <Button asChild className="h-11 rounded-[4px] bg-white px-6 font-black uppercase text-[#07070a] hover:bg-white/90">
          <Link href={getDefaultPropertyDestinationHref()}>Make a booking</Link>
        </Button>
        <Button asChild className="h-11 rounded-[4px] border border-white/15 bg-white/5 px-6 font-black uppercase text-white hover:bg-white/10" variant="secondary">
          <Link href="/bookings">My Bookings</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {offerCards.map((card) => (
          <BentoCard key={card.title} description={card.description} icon={card.icon} title={card.title} />
        ))}
      </div>
    </section>
  );
}
