Code:
import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  BedDouble,
  Ticket,
  House,
  TrendingUp,
  Key,
  UserRound,
  Phone,
  Info,
  ChevronDown,
  X,
} from "lucide-react";

const navTiles = [
  {
    id: "hostels",
    title: "HOSTELS",
    subtitle: "find your corner...",
    icon: BedDouble,
    colSpan: 2,
    bg: "bg-[#ff2e62]",
    overlay: "bg-[rgba(35,15,20,0.1)]",
    border:
      "border-[rgba(255,255,255,0.3)] border-dashed border-2",
    text: "text-white",
    subtext: "text-[rgba(255,255,255,0.8)]",
    rotation: "-rotate-1",
    badge: "Book Now!",
    badgeNew: "NEW",
    isDropdown: true,
    href: "/rooms",
  },
  {
    id: "colive",
    title: "COLIVE",
    subtitle: "stay a while",
    icon: House,
    colSpan: 1,
    bg: "bg-[#facc15]",
    overlay: "bg-[rgba(35,15,20,0.05)]",
    border: "border-[rgba(0,0,0,0.1)] border-dashed border-2",
    text: "text-[#230f14]",
    subtext: "text-[rgba(35,15,20,0.6)]",
    rotation: "rotate-2",
    href: "/colive",
  },
  {
    id: "events",
    title: "EVENTS",
    subtitle: "what's poppin?",
    icon: Ticket,
    colSpan: 1,
    bg: "bg-[#00d1ff]",
    overlay: "bg-[rgba(35,15,20,0.1)]",
    border:
      "border-[rgba(255,255,255,0.3)] border-dashed border-2",
    text: "text-white",
    subtext: "text-[rgba(255,255,255,0.8)]",
    rotation: "-rotate-1",
    href: "/events",
  },
  {
    id: "invest",
    title: "INVEST",
    subtitle: "partner up",
    icon: TrendingUp,
    colSpan: 1,
    bg: "bg-[#39ff14]",
    overlay: "bg-[rgba(35,15,20,0.1)]",
    border: "border-[rgba(0,0,0,0.1)] border-dashed border-2",
    text: "text-[#230f14]",
    subtext: "text-[rgba(35,15,20,0.6)]",
    rotation: "rotate-1",
    href: "/invest",
  },
  {
    id: "contact",
    title: "CONTACT",
    subtitle: "get in touch",
    icon: Phone,
    colSpan: 1,
    bg: "bg-[#ff2e62]",
    overlay: "bg-[rgba(35,15,20,0.1)]",
    border:
      "border-[rgba(255,255,255,0.3)] border-dashed border-2",
    text: "text-white",
    subtext: "text-[rgba(255,255,255,0.8)]",
    rotation: "-rotate-2",
    href: "/contact",
  },
  {
    id: "my-stay",
    title: "MY STAY",
    subtitle: "current & past",
    icon: Key,
    colSpan: 1,
    bg: "bg-[#1e293b]",
    overlay: "bg-[rgba(51,65,85,0.5)]",
    border: "border-[#64748b] border-solid border",
    text: "text-white",
    subtext: "text-[rgba(255,255,255,0.6)]",
    rotation: "rotate-1",
    href: "/my-stay",
  },
  {
    id: "profile",
    title: "PROFILE",
    subtitle: "your details",
    icon: UserRound,
    colSpan: 1,
    bg: "bg-white",
    overlay: "bg-[#f1f5f9]",
    border: "border-[#cbd5e1] border-solid border",
    text: "text-[#1e293b]",
    subtext: "text-[#64748b]",
    rotation: "-rotate-1",
    href: "/profile",
  },
  {
    id: "about",
    title: "ABOUT US",
    subtitle: "our story",
    icon: Info,
    colSpan: 2,
    bg: "bg-[#00d1ff]",
    overlay: "bg-[rgba(35,15,20,0.1)]",
    border:
      "border-[rgba(255,255,255,0.3)] border-dashed border-2",
    text: "text-white",
    subtext: "text-[rgba(255,255,255,0.8)]",
    rotation: "rotate-1",
    href: "/about",
  },
];

export default function NavPage() {
  const [hostelsExpanded, setHostelsExpanded] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: "-10%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "-10%" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-[#230f14] overflow-y-auto overflow-x-hidden flex flex-col"
    >
      {/* Header */}
      <div className="h-[96px] relative shrink-0 w-full flex items-center justify-between p-[24px]">
        <button
          onClick={() => navigate(-1)}
          className="relative shrink-0 size-[48px] flex items-center justify-center bg-[#F1F5F9] rounded-full text-[#230f14] hover:bg-white transition-colors"
        >
          <X size={24} strokeWidth={2.5} />
        </button>
        <div className="flex-1 flex justify-center pr-[48px]">
          <span className="font-['Space_Grotesk'] font-bold text-[#f1f5f9] text-[24px] tracking-tight">
            Menu
          </span>
        </div>
      </div>

      {/* Grid Content */}
      <div className="px-4 pb-12 pt-4 max-w-lg mx-auto w-full flex-1">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {navTiles.map((tile, i) => {
            const isHostel = tile.id === "hostels";

            return (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: 0.1 + i * 0.05,
                  duration: 0.3,
                }}
                className={`${tile.colSpan === 2 ? "col-span-2" : "col-span-1"} ${tile.rotation}`}
              >
                <div
                  className={`${tile.bg} relative rounded-[4px] shrink-0 w-full shadow-lg`}
                >
                  <div className="content-stretch flex flex-col items-start p-[4px] relative w-full">
                    {/* Overlay and Border */}
                    <div
                      className={`${tile.overlay} relative rounded-[2px] shrink-0 w-full min-h-[140px]`}
                    >
                      <div
                        aria-hidden="true"
                        className={`absolute ${tile.border} inset-0 pointer-events-none rounded-[2px]`}
                      />

                      <div
                        className="content-stretch flex flex-col items-start justify-between pb-[18px] pt-[18px] px-[18px] relative size-full min-h-[140px] cursor-pointer"
                        onClick={() => {
                          if (isHostel) {
                            setHostelsExpanded(
                              !hostelsExpanded,
                            );
                          } else {
                            navigate(tile.href);
                          }
                        }}
                      >
                        {/* Top row with icon & optional badges */}
                        <div className="h-[40px] relative shrink-0 w-full flex justify-between items-start">
                          <div
                            className={`flex items-center justify-center h-[40px] w-[40px] bg-[rgba(255,255,255,0.2)] rounded-xl ${tile.text}`}
                          >
                            <tile.icon
                              size={24}
                              strokeWidth={2}
                            />
                          </div>

                          {tile.badgeNew && (
                            <div className="bg-white px-[8px] py-[4px] rounded-[12px] shadow-sm">
                              <span className="font-['Space_Grotesk'] font-bold text-[#ff2e62] text-[10px] tracking-[1px] uppercase">
                                {tile.badgeNew}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Text content */}
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full mt-2">
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`font-['Space_Grotesk'] font-bold text-[24px] md:text-[30px] tracking-tight uppercase ${tile.text}`}
                            >
                              {tile.title}
                            </span>
                            {isHostel && (
                              <ChevronDown
                                className={`${tile.text} transition-transform duration-300 ${hostelsExpanded ? "rotate-180" : ""}`}
                              />
                            )}
                          </div>
                          <span
                            className={`font-['Liberation_Serif'] italic text-[14px] leading-[20px] ${tile.subtext}`}
                          >
                            {tile.subtitle}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Content for Hostels */}
                      {isHostel && (
                        <AnimatePresence>
                          {hostelsExpanded && (
                            <motion.div
                              initial={{
                                height: 0,
                                opacity: 0,
                              }}
                              animate={{
                                height: "auto",
                                opacity: 1,
                              }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-[18px] pb-[18px] pt-2 flex flex-col gap-2">
                                <div className="h-px w-full bg-white/20 mb-2"></div>
                                {[
                                  "Vibe House Bali",
                                  "Vibe House Tulum",
                                  "Vibe House Lisbon",
                                  "Vibe House Medellin",
                                ].map((prop) => (
                                  <Link
                                    key={prop}
                                    to="/rooms"
                                    className={`font-['Space_Grotesk'] text-[16px] ${tile.text} hover:opacity-75 transition-opacity py-1`}
                                  >
                                    • {prop}
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>

                  {/* Rotated corner badge */}
                  {tile.badge && (
                    <div className="absolute right-[-10px] top-[-15px] rotate-12 z-10">
                      <div className="bg-[#fef08a] px-[12px] py-[6px] relative rounded-[4px] shadow-md border border-[rgba(0,0,0,0.1)]">
                        <span className="font-['Liberation_Serif'] italic text-[12px] text-black font-bold">
                          {tile.badge}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

Text styles:
// NEW
color: '#FF2E62';
 fontSize: 10;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 textTransform: 'uppercase';
 lineHeight: 15;
 letterSpacing: 1;
 wordWrap: 'break-word'
---
// HOSTELS
color: 'white';
 fontSize: 24;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 textTransform: 'uppercase';
 lineHeight: 36;
 wordWrap: 'break-word'
---
// find your corner...
color: 'rgba(255;
 255;
 255;
 0.80)';
 fontSize: 14;
 fontFamily: 'Arimo';
 fontStyle: 'italic';
 fontWeight: '400';
 lineHeight: 20;
 wordWrap: 'break-word'
---
// Book Now!
color: 'black';
 fontSize: 12;
 fontFamily: 'Arimo';
 fontStyle: 'italic';
 fontWeight: '700';
 lineHeight: 18;
 wordWrap: 'break-word'
---
// COLIVE
color: '#230F14';
 fontSize: 24;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 textTransform: 'uppercase';
 lineHeight: 36;
 wordWrap: 'break-word'
---
// stay a while
color: 'rgba(35;
 15;
 20;
 0.60)';
 fontSize: 14;
 fontFamily: 'Arimo';
 fontStyle: 'italic';
 fontWeight: '400';
 lineHeight: 20;
 wordWrap: 'break-word'
---
// EVENTS
color: 'white';
 fontSize: 24;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 textTransform: 'uppercase';
 lineHeight: 36;
 wordWrap: 'break-word'
---
// what&apos;s poppin?
color: 'rgba(255;
 255;
 255;
 0.80)';
 fontSize: 14;
 fontFamily: 'Arimo';
 fontStyle: 'italic';
 fontWeight: '400';
 lineHeight: 20;
 wordWrap: 'break-word'
---
// INVEST
color: '#230F14';
 fontSize: 24;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 textTransform: 'uppercase';
 lineHeight: 36;
 wordWrap: 'break-word'
---
// partner up
color: 'rgba(35;
 15;
 20;
 0.60)';
 fontSize: 14;
 fontFamily: 'Arimo';
 fontStyle: 'italic';
 fontWeight: '400';
 lineHeight: 20;
 wordWrap: 'break-word'
---
// CONTACT
color: 'white';
 fontSize: 24;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 textTransform: 'uppercase';
 lineHeight: 36;
 wordWrap: 'break-word'
---
// get in touch
color: 'rgba(255;
 255;
 255;
 0.80)';
 fontSize: 14;
 fontFamily: 'Arimo';
 fontStyle: 'italic';
 fontWeight: '400';
 lineHeight: 20;
 wordWrap: 'break-word'
---
// MY STAY
color: 'white';
 fontSize: 24;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 textTransform: 'uppercase';
 lineHeight: 36;
 wordWrap: 'break-word'
---
// current &amp; past
color: 'rgba(255;
 255;
 255;
 0.60)';
 fontSize: 14;
 fontFamily: 'Arimo';
 fontStyle: 'italic';
 fontWeight: '400';
 lineHeight: 20;
 wordWrap: 'break-word'
---
// PROFILE
color: '#1E293B';
 fontSize: 24;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 textTransform: 'uppercase';
 lineHeight: 36;
 wordWrap: 'break-word'
---
// your details
color: '#64748B';
 fontSize: 14;
 fontFamily: 'Arimo';
 fontStyle: 'italic';
 fontWeight: '400';
 lineHeight: 20;
 wordWrap: 'break-word'
---
// ABOUT US
color: 'white';
 fontSize: 24;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 textTransform: 'uppercase';
 lineHeight: 36;
 wordWrap: 'break-word'
---
// our story
color: 'rgba(255;
 255;
 255;
 0.80)';
 fontSize: 14;
 fontFamily: 'Arimo';
 fontStyle: 'italic';
 fontWeight: '400';
 lineHeight: 20;
 wordWrap: 'break-word'
---
// Menu
color: '#F1F5F9';
 fontSize: 24;
 fontFamily: 'Space Grotesk';
 fontWeight: '700';
 lineHeight: 36;
 wordWrap: 'break-word'


 