import svgPaths from "./svg-yiukxx3ohc";

function Container1() {
  return (
    <div className="relative shrink-0 size-[17.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.5 17.5">
        <g id="Container">
          <path d={svgPaths.p1f082d00} fill="var(--fill-0, #F1F5F9)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 size-[48px]" data-name="Container">
      <Container1 />
    </div>
  );
}

function Heading() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative" data-name="Heading 2">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col items-center pr-[48px] relative w-full">
          <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[30px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[24px] text-center tracking-[-0.36px] w-[62.95px]">
            <p className="leading-[30px]">Menu</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-0 p-[24px] right-0 top-0" data-name="Header">
      <Container />
      <Heading />
    </div>
  );
}

function Background1() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col items-start left-[257.77px] px-[8px] py-[4px] rounded-[12px] top-0" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[10px] tracking-[1px] uppercase w-[24.225px]">
        <p className="leading-[15px]">New</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="h-[39.994px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <div className="-translate-y-1/2 absolute flex flex-col font-['Material_Symbols_Outlined:Thin',sans-serif] h-[40px] justify-center leading-[0] left-[-0.07px] not-italic text-[36px] text-white top-[21px] w-[36.127px]">
          <p className="leading-[40px]">bed</p>
        </div>
        <Background1 />
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[30px] text-white tracking-[-1.5px] uppercase w-full">
        <p className="leading-[36px]">Rooms</p>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Regular_Italic',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)] w-full">
        <p className="leading-[20px]">find your corner...</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <Container4 />
        <Container5 />
      </div>
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(35,15,20,0.1)] h-[159.997px] relative rounded-[2px] shrink-0 w-full" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(255,255,255,0.3)] border-dashed inset-0 pointer-events-none rounded-[2px]" />
      <div className="content-stretch flex flex-col items-start justify-between pb-[18.003px] pt-[17.999px] px-[18px] relative size-full">
        <Container2 />
        <Container3 />
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#c62828] relative rounded-[4px] shrink-0 w-full" data-name="Background">
      <div className="content-stretch flex flex-col items-start p-[4px] relative w-full">
        <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[4px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
        <OverlayBorder />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#fef08a] content-stretch flex flex-col items-start px-[9px] py-[5px] relative rounded-[2px]" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[2px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
      <div className="flex flex-col font-['Liberation_Serif:Regular_Italic',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-black w-[53.665px]">
        <p className="leading-[16px]">Book Now!</p>
      </div>
    </div>
  );
}

function RoomsSticker() {
  return (
    <div className="content-stretch flex flex-col items-start relative w-full" data-name="Rooms Sticker">
      <Background />
      <div className="absolute flex h-[40.332px] items-center justify-center right-[-9.92px] top-[-19.17px] w-[75.505px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-12">
          <BackgroundBorder />
        </div>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="relative shrink-0 size-[9.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.33333 9.33333">
        <g id="Container">
          <path d={svgPaths.pce77c00} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Overlay() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.2)] content-stretch flex items-center justify-center left-[266px] rounded-[12px] size-[32.001px] top-0" data-name="Overlay">
      <Container7 />
    </div>
  );
}

function Container6() {
  return (
    <div className="h-[40.004px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <div className="absolute h-[24px] left-[3.06px] top-[9px] w-[30px]" data-name="Icon">
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 30 24">
            <path d={svgPaths.p3ac9af80} fill="var(--fill-0, white)" id="Icon" />
          </svg>
        </div>
        <Overlay />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[30px] text-white tracking-[-1.5px] uppercase w-full">
        <p className="leading-[36px]">Events</p>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Regular_Italic',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)] w-full">
        <p className="leading-[20px]">{`what's poppin?`}</p>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <Container9 />
        <Container10 />
      </div>
    </div>
  );
}

function OverlayBorder1() {
  return (
    <div className="bg-[rgba(35,15,20,0.1)] h-[159.995px] relative rounded-[2px] shrink-0 w-full" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(255,255,255,0.3)] border-dashed inset-0 pointer-events-none rounded-[2px]" />
      <div className="content-stretch flex flex-col items-start justify-between pb-[17.997px] pt-[17.995px] px-[18px] relative size-full">
        <Container6 />
        <Container8 />
      </div>
    </div>
  );
}

function EventsSticker() {
  return (
    <div className="bg-[#00d1ff] content-stretch flex flex-col items-start p-[4px] relative rounded-[4px] w-full" data-name="Events Sticker">
      <div className="absolute bg-[rgba(255,255,255,0)] inset-[0_0_-0.01px_0] rounded-[4px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
      <OverlayBorder1 />
    </div>
  );
}

function Container11() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start pt-[0.996px] relative w-full">
        <div className="flex flex-col font-['Material_Symbols_Outlined:Thin',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#230f14] text-[36px] w-[36.147px]">
          <p className="leading-[40px]">calendar_month</p>
        </div>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#230f14] text-[30px] tracking-[-1.5px] uppercase w-full">
        <p className="leading-[36px]">Social</p>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Regular_Italic',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[rgba(35,15,20,0.6)] w-full">
        <p className="leading-[20px]">meet the crew</p>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <Container13 />
        <Container14 />
      </div>
    </div>
  );
}

function OverlayBorder2() {
  return (
    <div className="bg-[rgba(35,15,20,0.1)] h-[159.997px] relative rounded-[2px] shrink-0 w-full" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0.1)] border-dashed inset-0 pointer-events-none rounded-[2px]" />
      <div className="content-stretch flex flex-col items-start justify-between pb-[18.003px] pt-[17.999px] px-[18px] relative size-full">
        <Container11 />
        <Container12 />
      </div>
    </div>
  );
}

function Background2() {
  return (
    <div className="bg-[#39ff14] relative rounded-[4px] shrink-0 w-full" data-name="Background">
      <div className="content-stretch flex flex-col items-start p-[4px] relative w-full">
        <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[4px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
        <OverlayBorder2 />
      </div>
    </div>
  );
}

function SocialCalendarSticker() {
  return (
    <div className="content-stretch flex flex-col items-start relative w-full" data-name="Social Calendar Sticker">
      <Background2 />
      <div className="-translate-x-1/2 absolute flex h-[34.772px] items-center justify-center left-1/2 top-[-17.39px] w-[81.068px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="flex-none rotate-2">
          <div className="backdrop-blur-[2px] bg-[rgba(255,255,255,0.3)] h-[32px] relative w-[80px]" data-name="Playful Tape Effect">
            <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.2)] border-solid inset-0 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="h-[12px] relative shrink-0 w-full" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 121 12">
        <g id="Container">
          <path d={svgPaths.p13e03480} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container17() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[20px] text-white uppercase w-full">
          <p className="leading-[28px]">My Stay</p>
        </div>
      </div>
    </div>
  );
}

function OverlayBorder3() {
  return (
    <div className="bg-[rgba(51,65,85,0.5)] h-[128.004px] relative rounded-[2px] shrink-0 w-full" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[#64748b] border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="content-stretch flex flex-col items-start justify-between px-[17px] py-[17.001px] relative size-full">
        <Container16 />
        <Container17 />
      </div>
    </div>
  );
}

function Background3() {
  return (
    <div className="bg-[#1e293b] relative rounded-[4px] shrink-0 w-full" data-name="Background">
      <div className="content-stretch flex flex-col items-start p-[4px] relative w-full">
        <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[4px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
        <OverlayBorder3 />
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex flex-col h-[136px] items-start relative w-[163px]" data-name="Container">
      <Background3 />
    </div>
  );
}

function ContainerCssTransform() {
  return (
    <div className="content-stretch flex flex-col h-[140.22px] items-start justify-center relative shrink-0" data-name="Container:css-transform">
      <div className="flex h-[140.22px] items-center justify-center relative shrink-0 w-[166.504px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
        <div className="flex-none rotate-[1.5deg]">
          <Container15 />
        </div>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 120.999 20">
        <g id="Container">
          <path d={svgPaths.p17cbad00} fill="var(--fill-0, #1E293B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container20() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#1e293b] text-[20px] uppercase w-full">
          <p className="leading-[28px]">Profile</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder1() {
  return (
    <div className="bg-[#f1f5f9] h-[128.008px] relative rounded-[2px] shrink-0 w-full" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#cbd5e1] border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="content-stretch flex flex-col items-start justify-between pb-[17.007px] pt-[17.004px] px-[17px] relative size-full">
        <Container19 />
        <Container20 />
      </div>
    </div>
  );
}

function Background4() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 w-full" data-name="Background">
      <div className="content-stretch flex flex-col items-start p-[4px] relative w-full">
        <div className="absolute bg-[rgba(255,255,255,0)] inset-[0_0_0.01px_0] rounded-[4px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
        <BackgroundBorder1 />
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col h-[136px] items-start relative w-[163px]" data-name="Container">
      <Background4 />
    </div>
  );
}

function ContainerCssTransform1() {
  return (
    <div className="content-stretch flex flex-col h-[141.606px] items-start justify-center relative shrink-0" data-name="Container:css-transform">
      <div className="flex h-[141.606px] items-center justify-center relative shrink-0 w-[167.647px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
        <div className="-rotate-2 flex-none">
          <Container18 />
        </div>
      </div>
    </div>
  );
}

function MyStayProfileRow() {
  return (
    <div className="absolute content-stretch flex gap-[11.926px] h-[136px] items-center left-[22.25px] right-[21.67px] top-[600px]" data-name="My Stay & Profile Row">
      <ContainerCssTransform />
      <ContainerCssTransform1 />
    </div>
  );
}

function StickersNavigationGrid() {
  return (
    <div className="absolute h-[760px] left-0 right-0 top-[96px]" data-name="Stickers Navigation Grid">
      <div className="absolute flex items-center justify-center left-[21.17px] right-[21.18px] top-[18.08px]">
        <div className="-rotate-2 flex-none h-[167.997px] w-[342px]">
          <RoomsSticker />
        </div>
      </div>
      <div className="absolute flex items-center justify-center left-[21.86px] right-[21.86px] top-[211.55px]">
        <div className="flex-none h-[167.995px] rotate-[1.5deg] w-[342px]">
          <EventsSticker />
        </div>
      </div>
      <div className="absolute flex items-center justify-center left-[21.17px] right-[21.18px] top-[402.08px]">
        <div className="-rotate-2 flex-none h-[167.997px] w-[342px]">
          <SocialCalendarSticker />
        </div>
      </div>
      <MyStayProfileRow />
    </div>
  );
}

function Container22() {
  return (
    <div className="h-[17px] relative shrink-0 w-[22px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 17">
        <g id="Container">
          <path d={svgPaths.p3163ad80} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container21() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container22 />
    </div>
  );
}

function Link() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-end relative size-full">
        <Container21 />
      </div>
    </div>
  );
}

function Container24() {
  return (
    <div className="h-[20px] relative shrink-0 w-[18px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 20">
        <g id="Container">
          <path d={svgPaths.p2a946800} fill="var(--fill-0, #64748B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container23() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container24 />
    </div>
  );
}

function Link1() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-end relative size-full">
        <Container23 />
      </div>
    </div>
  );
}

function Container26() {
  return (
    <div className="h-[16px] relative shrink-0 w-[22px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 16">
        <g id="Container">
          <path d={svgPaths.p39955c80} fill="var(--fill-0, #64748B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container26 />
    </div>
  );
}

function Link2() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-end relative size-full">
        <Container25 />
      </div>
    </div>
  );
}

function Container28() {
  return (
    <div className="h-[14px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 14">
        <g id="Container">
          <path d={svgPaths.p18e761b0} fill="var(--fill-0, #64748B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container27() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container28 />
    </div>
  );
}

function Link3() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-end relative size-full">
        <Container27 />
      </div>
    </div>
  );
}

function Container30() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Container">
          <path d={svgPaths.p85bff00} fill="var(--fill-0, #64748B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container29() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container30 />
    </div>
  );
}

function Link4() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-end relative size-full">
        <Container29 />
      </div>
    </div>
  );
}

function BottomNavigationBar() {
  return (
    <div className="absolute bg-[#230f14] content-stretch flex gap-[8px] h-[81px] items-start justify-center left-0 pb-[32px] pt-[17px] px-[16px] right-0 top-[856px]" data-name="Bottom Navigation Bar">
      <div aria-hidden="true" className="absolute border-[#1e293b] border-solid border-t inset-0 pointer-events-none" />
      <Link />
      <Link1 />
      <Link2 />
      <Link3 />
      <Link4 />
    </div>
  );
}

export default function VhdsgnNavMenuVibrant() {
  return (
    <div className="bg-[#230f14] relative size-full" data-name="vhdsgn - Nav Menu (Vibrant)">
      <Header />
      <StickersNavigationGrid />
      <div className="absolute h-0 left-0 right-0 top-[856px]" data-name="Decorative Spacer" />
      <BottomNavigationBar />
    </div>
  );
}