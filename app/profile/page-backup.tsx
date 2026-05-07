"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Save, ShieldCheck, X } from "lucide-react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Skeleton } from "@/components/ui/skeleton";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

const adventureCards = [
  { image: "/images/property/property-1.jpg", title: "Bali Hideaway '23", rotate: "-rotate-[3deg]" },
  { image: "/images/property/property-2.jpg", title: "Tokyo Neon '24", rotate: "rotate-[2deg]" },
];

export default function ProfilePage() {
  const { guest, isAuthenticated, isRestoringSession, openAuthModal, updateGuestProfile, signOut } = useGuestAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(guest?.name ?? "");
  const [email, setEmail] = useState(guest?.email ?? "");
  const [phone, setPhone] = useState(guest?.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  const visits = useMemo(() => {
    return String(guest?.bookings?.length ?? 0);
  }, [guest?.bookings?.length]);

  if (isRestoringSession) {
    return (
      <section className="vh-section">
        <div className="vh-container py-16">
          <div aria-busy="true" aria-live="polite" className="mx-auto max-w-[520px] space-y-4 rounded-[12px] border border-white/15 bg-white/5 p-8" role="status">
            <span className="sr-only">Loading your vibe passport.</span>
            <Skeleton className="mx-auto h-8 w-44 rounded-full bg-white/10" />
            <Skeleton className="h-14 w-full rounded-xl bg-white/8" />
            <Skeleton className="h-14 w-full rounded-xl bg-white/8" />
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated || !guest) {
    return (
      <section className="vh-section">
        <div className="vh-container py-16">
          <div className="mx-auto max-w-[520px] rounded-[12px] border border-white/15 bg-white/5 p-8 text-center">
            <h1 className="text-3xl font-bold uppercase tracking-[1px] text-white">Vibe Passport</h1>
            <p className="mt-2 text-white/75">Sign in to unlock your profile and booking identity.</p>
            <button
              className="mt-6 inline-flex rounded-[10px] border-2 border-[#0F172A] bg-[var(--vh-pink)] px-5 py-3 text-sm font-extrabold uppercase tracking-[1px] text-white"
              onClick={() => openAuthModal("signin")}
              type="button"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>
    );
  }

  const startEdit = () => {
    setName(guest.name);
    setEmail(guest.email);
    setPhone(guest.phone ?? "");
    setError(null);
    setIsEditing(true);
  };

  const saveEdit = () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (!normalizedName) {
      setError("Name is required.");
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      setError("Enter a valid phone number.");
      return;
    }

    updateGuestProfile({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone || null,
    });

    setError(null);
    setIsEditing(false);
  };

  return (
    <section className="vh-section pb-14">
      <div className="vh-container">
        <div className="mx-auto max-w-[860px] rounded-[12px] border border-[#c62828]/20 bg-[rgba(35,15,20,0.94)] p-5 md:p-7">
          <div className="mb-5 flex items-center justify-between">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-[var(--vh-pink)]"
              onClick={() => window.history.back()}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-bold uppercase tracking-[0.18em] text-[#F1F5F9] md:text-2xl">Vibe Passport</h1>
            {isEditing ? (
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/85"
                onClick={() => setIsEditing(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-[#c62828]"
                onClick={startEdit}
                type="button"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="rounded-[10px] border border-[#c62828]/30 bg-[#300917] p-5">
            <div className="h-1 rounded-full bg-[linear-gradient(90deg,#00F0FF_0%,#c62828_50%,#39FF14_100%)]" />
            <div className="mt-5 flex flex-col items-center">
              <div className="relative">
                <Image
                  alt={guest.name}
                  className="h-28 w-28 rounded-[12px] border-4 border-[#c62828] object-cover"
                  height={112}
                  src="/images/property/property-3.jpg"
                  width={112}
                />
                <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#230F14] bg-[#00F0FF] text-xs">✦</span>
              </div>
              <h2 className="mt-4 text-4xl font-bold text-[#F1F5F9]">{guest.name}</h2>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.28em] text-[#c62828]">Global Nomad</p>
              <p className="mt-2 text-xs text-[#94A3B8]">ID: {guest.id.slice(0, 14).toUpperCase()}</p>

              <div className="mt-5 grid w-full max-w-[520px] grid-cols-3 gap-3">
                <StatCard label="Visits" tone="text-[#00F0FF]" value={visits} />
                <StatCard label="Rating" tone="text-[#39FF14]" value="4.9" />
                <StatCard label="Points" tone="text-[#c62828]" value="12k" />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <div className="rotate-[-2deg] rounded-[12px] border-2 border-[#c62828]/40 bg-[#1E293B] px-6 py-2 text-lg text-[#CBD5E1]" style={{ fontFamily: "Caveat" }}>
              Member since Autumn 2021
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-3xl font-bold uppercase text-[#F1F5F9] md:text-[34px]">Past Adventures</h3>
              <span className="rounded-[2px] bg-[#c62828]/20 px-2 py-1 text-[11px] font-bold uppercase text-[#c62828]">View all</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {adventureCards.map((item) => (
                <article key={item.title} className={`border border-[#E2E8F0] bg-[#F1F5F9] p-2 shadow-[0_14px_24px_rgba(0,0,0,0.25)] ${item.rotate}`}>
                  <Image alt={item.title} className="h-52 w-full object-cover" height={208} src={item.image} width={300} />
                  <p className="pt-3 text-center text-2xl text-[#0F172A]" style={{ fontFamily: "Caveat" }}>{item.title}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[10px] border border-[#00F0FF]/35 bg-[#1A2230] p-4">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#00F0FF]">Vibe Notes</p>
            <p className="mt-2 text-3xl leading-[1.5] text-[#E2E8F0]" style={{ fontFamily: "Caveat" }}>
              Always asks for extra pillows. Loves local coffee recommendations. Prefers sunrise views over sunset.
            </p>
            <div className="mt-4 flex justify-end">
              <StickerTag bg="#c62828" className="font-bold uppercase not-italic" label="Top Guest" rotate="rotate-[10deg]" text="#FFFFFF" />
            </div>
          </div>

          <div className="mt-8 rounded-[12px] border border-white/15 bg-white/[0.03] p-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-white/75">Profile Details</p>
            <div className="grid gap-3 md:grid-cols-3">
              <ProfileField disabled={!isEditing} label="Full Name" onChange={setName} value={name} />
              <ProfileField disabled={!isEditing} label="Email" onChange={setEmail} value={email} />
              <ProfileField disabled={!isEditing} label="Phone" onChange={setPhone} value={phone} />
            </div>

            {error ? <p className="mt-3 text-sm text-[#ff9fbc]">{error}</p> : null}

            {isEditing ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-[10px] border-2 border-[#0F172A] bg-[var(--vh-lime)] px-4 py-2 text-sm font-extrabold uppercase text-[#0F172A]"
                  onClick={saveEdit}
                  type="button"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
                <button
                  className="rounded-[10px] border border-white/25 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/85"
                  onClick={() => setIsEditing(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex justify-center md:justify-end">
            <button
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#c62828]/50 bg-[#c62828]/10 px-4 py-2 text-sm font-semibold text-[#ffd0de]"
              onClick={signOut}
              type="button"
            >
              <ShieldCheck className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="rounded-[4px] border border-[#c62828]/15 bg-[rgba(35,15,20,0.5)] px-3 py-3 text-center">
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#94A3B8]">{label}</p>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-white/70">{label}</span>
      <input
        className="h-11 w-full rounded-[10px] border border-white/20 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-[var(--vh-cyan)] disabled:opacity-85"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
