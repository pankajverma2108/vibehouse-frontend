"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { Skeleton } from "@/components/ui/skeleton";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

function getSeasonFromDate(date: Date): string {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

function generatePassportId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  let id = "VP-";
  
  for (let i = 0; i < 3; i++) id += nums.charAt(Math.floor(Math.random() * nums.length));
  id += "-";
  for (let i = 0; i < 3; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  id += "-";
  id += new Date().getFullYear();
  
  return id;
}

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

  const memberSinceText = useMemo(() => {
    const date = new Date(guest?.created_at || "2021-09-15");
    const season = getSeasonFromDate(date);
    const year = date.getFullYear();
    return `Member since ${season} ${year}`;
  }, [guest?.created_at]);

  const passportId = useMemo(() => {
    return generatePassportId();
  }, []);

  if (isRestoringSession) {
    return (
      <section className="vh-section py-20">
        <div className="vh-container">
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
      <section className="vh-section py-20">
        <div className="vh-container">
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

    setIsEditing(false);
    setError(null);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-[rgba(35,15,20,0.20)]  py-8">
      <div className="w-full max-w-[448px] border-x border-[rgba(198,40,40,0.10)] bg-[#230F14]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(198,40,40,0.10)] bg-[rgba(35,15,20,0.80)] p-4 backdrop-blur-md">
          <button
            className="inline-flex h-10 w-10 items-center justify-center text-[#c62828] hover:opacity-80"
            onClick={() => window.history.back()}
            type="button"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="text-center text-lg font-bold uppercase tracking-widest text-[#F1F5F9]" style={{ fontFamily: "Space Grotesk" }}>
            Vibe Passport
          </div>
          
          <button
            className="inline-flex h-10 w-10 items-center justify-center text-[#c62828] hover:opacity-80"
            onClick={() => isEditing ? cancelEdit() : null}
            type="button"
          >
            {isEditing ? <X size={20} /> : <div className="h-5 w-5 bg-[#c62828]" />}
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-8 overflow-y-auto px-6 pb-32 pt-6">
          
          {/* Passport Card */}
          <div className="relative space-y-6 rounded-lg border border-[rgba(198,40,40,0.20)] bg-[rgba(198,40,40,0.05)] p-8">
            
            {/* Gradient top line */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#00F0FF] via-[#c62828] to-[#39FF14]" />
            
            {/* Avatar */}
            <div className="relative flex justify-center">
              <div className="relative inline-block">
                <div className="flex h-32 w-32 items-center justify-center rounded-xl border-4 border-[#c62828] bg-gradient-to-br from-[#c62828] to-[#8e1b1b] text-5xl font-bold text-white">
                  {guest.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#230F14] bg-[#00F0FF]" />
              </div>
            </div>

            {/* Name & Tier */}
            <div className="text-center space-y-1">
              <h2 className="text-3xl font-bold text-[#F1F5F9]" style={{ fontFamily: "Space Grotesk" }}>
                {guest.name}
              </h2>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#c62828]" style={{ fontFamily: "Space Grotesk" }}>
                Global Nomad
              </p>
              <p className="text-xs font-mono text-[#94A3B8]">
                ID: {passportId}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded bg-[rgba(35,15,20,0.50)] border border-[rgba(198,40,40,0.10)] p-3 text-center">
                <div className="text-2xl font-bold text-[#00F0FF]" style={{ fontFamily: "Space Grotesk" }}>
                  {visits}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-[#94A3B8]" style={{ fontFamily: "Space Grotesk" }}>
                  Visits
                </div>
              </div>
              
              <div className="rounded bg-[rgba(35,15,20,0.50)] border border-[rgba(198,40,40,0.10)] p-3 text-center">
                <div className="text-2xl font-bold text-[#39FF14]" style={{ fontFamily: "Space Grotesk" }}>
                  4.9
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-[#94A3B8]" style={{ fontFamily: "Space Grotesk" }}>
                  Rating
                </div>
              </div>
              
              <div className="rounded bg-[rgba(35,15,20,0.50)] border border-[rgba(198,40,40,0.10)] p-3 text-center">
                <div className="text-2xl font-bold text-[#c62828]" style={{ fontFamily: "Space Grotesk" }}>
                  12k
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-[#94A3B8]" style={{ fontFamily: "Space Grotesk" }}>
                  Points
                </div>
              </div>
            </div>
          </div>

          {/* Member Since & Verified Badges */}
          <div className="relative space-y-4">
            <div className="flex justify-center">
              <div className="relative inline-block -rotate-2 rounded-xl border-2 border-[rgba(198,40,40,0.40)] bg-[#1E293B] px-6 py-2 text-center text-sm text-[#CBD5E1]" style={{ fontFamily: "Caveat Brush" }}>
                {memberSinceText}
                <span className="absolute -left-3 -top-2 text-2xl text-[#c62828]">★</span>
              </div>
            </div>

            <div className="absolute -right-8 -top-16 rotate-12">
              <div className="inline-block rounded bg-[#39FF14] px-4 py-1 p-2 outline-2 outline-black outline-offset-[-2px]">
                <div className="text-xs font-bold uppercase text-black" style={{ fontFamily: "Space Grotesk" }}>
                  Verified Vibe
                </div>
              </div>
            </div>
          </div>

          {/* Vibe Notes */}
          <div className="relative space-y-3 rounded-lg border border-[rgba(0,240,255,0.30)] bg-[rgba(0,240,255,0.10)] p-4">
            <p className="text-sm font-bold uppercase tracking-widest text-[#00F0FF]" style={{ fontFamily: "Space Grotesk" }}>
              Vibe Notes
            </p>
            <p className="text-lg leading-relaxed text-[#E2E8F0]" style={{ fontFamily: "Caveat Brush" }}>
              Always asks for extra pillows. Loves local coffee recommendations. Prefers sunrise views over sunset.
            </p>
            
            <div className="absolute bottom-2 right-2 rotate-12 inline-block rounded bg-[#c62828] px-2 py-1">
              <div className="text-xs font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
                TOP GUEST
              </div>
            </div>
          </div>

          {/* Edit / Display Buttons */}
          {!isEditing ? (
            <div className="flex gap-3 pt-4">
              <button
                onClick={startEdit}
                className="flex-1 rounded-lg bg-[var(--vh-cyan)] px-4 py-2 font-bold text-black hover:opacity-90"
                type="button"
              >
                Edit Profile
              </button>
              <button
                onClick={signOut}
                className="flex-1 rounded-lg border border-[var(--vh-pink)] bg-[rgba(198,40,40,0.2)] px-4 py-2 font-bold text-[var(--vh-pink)] hover:opacity-90"
                type="button"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-white/15 bg-white/5 p-4">
              <h3 className="font-bold uppercase tracking-wider text-white" style={{ fontFamily: "Space Grotesk" }}>
                Edit Profile
              </h3>
              
              <label className="block">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white">Name</div>
                <input
                  className="h-10 w-full rounded border border-white/20 bg-white/5 px-3 text-sm text-white placeholder-white/40 focus:border-[var(--vh-cyan)] focus:outline-none"
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  value={name}
                />
              </label>

              <label className="block">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white">Email</div>
                <input
                  className="h-10 w-full rounded border border-white/20 bg-white/5 px-3 text-sm text-white placeholder-white/40 focus:border-[var(--vh-cyan)] focus:outline-none"
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  value={email}
                />
              </label>

              <label className="block">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white">Phone (Optional)</div>
                <input
                  className="h-10 w-full rounded border border-white/20 bg-white/5 px-3 text-sm text-white placeholder-white/40 focus:border-[var(--vh-cyan)] focus:outline-none"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  type="tel"
                  value={phone}
                />
              </label>

              {error && (
                <div className="rounded bg-[rgba(198,40,40,0.1)] px-3 py-2 text-xs text-[#FDECEC]">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveEdit}
                  className="flex-1 rounded-lg bg-[var(--vh-pink)] px-3 py-2 font-bold text-white hover:opacity-90"
                  type="button"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-bold text-white hover:opacity-90"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
