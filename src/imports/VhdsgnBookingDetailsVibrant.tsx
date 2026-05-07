import svgPaths from "./svg-ajj2lecu9r";
import { imgRoomInfoCutout, imgBackground } from "./svg-3bo20";

function Container1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Container">
          <path d={svgPaths.p300a1100} fill="var(--fill-0, #F1F5F9)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container() {
  return (
    <div className="relative rounded-[12px] shrink-0 size-[40px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Container1 />
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative" data-name="Heading 2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative w-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[18px] text-center tracking-[-0.45px] w-[150.69px]">
          <p className="leading-[28px]">Booking Summary</p>
        </div>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="h-[20px] relative shrink-0 w-[18px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 20">
        <g id="Container">
          <path d={svgPaths.p2b729200} fill="var(--fill-0, #F1F5F9)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="content-stretch flex items-center justify-center p-[8px] relative rounded-[12px] shrink-0" data-name="Button">
      <Container3 />
    </div>
  );
}

function Container2() {
  return (
    <div className="relative shrink-0 size-[40px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-end relative size-full">
        <Button />
      </div>
    </div>
  );
}

function Nav() {
  return (
    <div className="bg-[#230f14] relative shrink-0 w-full" data-name="Nav">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.1)] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pb-[17px] pt-[16px] px-[16px] relative w-full">
          <Container />
          <Heading1 />
          <Container2 />
        </div>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col items-start opacity-70 relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[12px] tracking-[1.2px] uppercase w-full">
        <p className="leading-[16px]">Confirmation Receipt</p>
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold items-start leading-[0] pb-[0.003px] relative shrink-0 text-[#0f172a] text-[48px] w-full" data-name="Heading 1">
      <div className="flex flex-col h-[48px] justify-center mb-[-0.003px] relative shrink-0 w-[156.694px]">
        <p className="leading-[48px]">AUG 15</p>
      </div>
      <div className="flex flex-col h-[48px] justify-center mb-[-0.003px] relative shrink-0 w-[165.795px]">
        <p className="leading-[48px]">AUG 20</p>
      </div>
    </div>
  );
}

function HeaderSection() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header Section">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4.001px] items-start relative w-full">
        <Container4 />
        <Heading />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-start opacity-70 relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal justify-center leading-[0] relative shrink-0 text-[12px] text-white tracking-[-0.6px] uppercase w-full">
        <p className="leading-[16px]">Room Details</p>
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold items-start leading-[0] pb-[0.01px] relative shrink-0 text-[18px] text-white w-full" data-name="Paragraph">
      <div className="flex flex-col h-[28px] justify-center mb-[-0.01px] relative shrink-0 w-[215.8px]">
        <p className="leading-[28px]">Deluxe Mixed Dorm - Bed</p>
      </div>
      <div className="flex flex-col h-[28px] justify-center mb-[-0.01px] relative shrink-0 w-[23.12px]">
        <p className="leading-[28px]">04</p>
      </div>
    </div>
  );
}

function RoomInfoCutout() {
  return (
    <div className="absolute bg-[#0f172a] content-stretch flex flex-col items-start left-0 mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0px_0px] mask-size-[275.635px_100.762px] px-[24px] py-[12px] right-0 top-0" data-name="Room Info Cutout" style={{ maskImage: `url('${imgRoomInfoCutout}')` }}>
      <Container5 />
      <Paragraph />
    </div>
  );
}

function RoomInfoCutoutMaskGroup() {
  return (
    <div className="h-[95.995px] relative shrink-0 w-full" data-name="Room Info Cutout:mask-group">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <RoomInfoCutout />
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="h-[21px] relative shrink-0 w-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 21">
        <g id="Container">
          <path d={svgPaths.p3f3d1e00} fill="var(--fill-0, #0F172A)" fillOpacity="0.6" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container7() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Caveat:Regular',sans-serif] font-normal h-[36px] justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[30px] w-[211.458px]">
          <p>
            <span className="leading-[36px]">{`Passcode: `}</span>
            <span className="font-['Caveat:Bold',sans-serif] font-bold leading-[36px]">#2024*88</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function HorizontalBorder() {
  return (
    <div className="content-stretch flex gap-[15.992px] items-center pb-[10px] relative shrink-0 w-full" data-name="HorizontalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(15,23,42,0.2)] border-b-2 border-solid inset-0 pointer-events-none" />
      <Container6 />
      <Container7 />
    </div>
  );
}

function Container8() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p643d217} fill="var(--fill-0, #0F172A)" fillOpacity="0.6" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container9() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Caveat:Regular',sans-serif] font-normal h-[36px] justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[30px] w-[141.777px]">
          <p>
            <span className="leading-[36px]">{`Locker: `}</span>
            <span className="font-['Caveat:Bold',sans-serif] font-bold leading-[36px] text-[#c62828]">L-042</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function HorizontalBorder1() {
  return (
    <div className="content-stretch flex gap-[16px] items-center pb-[10px] relative shrink-0 w-full" data-name="HorizontalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(15,23,42,0.2)] border-b-2 border-solid inset-0 pointer-events-none" />
      <Container8 />
      <Container9 />
    </div>
  );
}

function HandwrittenInfo() {
  return (
    <div className="relative shrink-0 w-full" data-name="Handwritten Info">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16.001px] items-start relative w-full">
        <HorizontalBorder />
        <HorizontalBorder1 />
      </div>
    </div>
  );
}

function MaskGroup() {
  return (
    <div className="flex-[1_0_0] h-full min-h-px min-w-px relative" data-name="Mask Group">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <div className="absolute bg-[#0f172a] inset-0 mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0%_0%] mask-size-[100%_100%]" data-name="Background" style={{ maskImage: `url('${imgBackground}')` }} />
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="absolute bottom-[-16px] left-[37.19px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[10px] uppercase w-[85.603px]">
          <p className="leading-[15px]">Scan for Access</p>
        </div>
      </div>
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(255,255,255,0.5)] content-stretch flex h-[160.004px] items-center justify-center p-[12px] relative shrink-0 w-[159.994px]" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border-4 border-[#0f172a] border-dashed inset-0 pointer-events-none" />
      <MaskGroup />
      <Container10 />
    </div>
  );
}

function QrCodeArea() {
  return (
    <div className="relative shrink-0 w-full" data-name="QR Code Area">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center pb-[8.001px] pt-[8.006px] relative w-full">
        <OverlayBorder />
      </div>
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[2px] relative shrink-0" data-name="Margin">
      <div className="flex flex-col font-['Material_Symbols_Outlined:Thin',sans-serif] h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#0f172a] text-[14px] w-[14.119px]">
        <p className="leading-[20px]">location_on</p>
      </div>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="content-stretch flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal gap-[0.003px] items-start leading-[0] pl-[0.003px] pr-[14.38px] relative shrink-0 text-[#0f172a] text-[14px]" data-name="Paragraph">
      <div className="flex flex-col h-[20px] justify-center relative shrink-0 w-[237.606px]">
        <p className="leading-[20px]">Hostel Vibe Central, 122 Art District,</p>
      </div>
      <div className="flex flex-col h-[20px] justify-center relative shrink-0 w-[38.266px]">
        <p className="leading-[20px]">Berlin</p>
      </div>
    </div>
  );
}

function AddressLabel() {
  return (
    <div className="opacity-80 relative shrink-0 w-full" data-name="Address Label">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[7.961px] items-start pb-[16.007px] pt-[0.001px] relative w-full">
        <Margin />
        <Paragraph1 />
      </div>
    </div>
  );
}

function FloatingSticker() {
  return (
    <div className="bg-[#c62828] relative rounded-[12px]" data-name="Floating Sticker">
      <div aria-hidden="true" className="absolute border-2 border-[#0f172a] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start px-[26px] py-[10px] relative">
        <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[12px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Floating Sticker:shadow" />
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[24px] justify-center leading-[0] relative shrink-0 text-[16px] text-white w-[78.563px]">
          <p className="leading-[24px]">{`YOU'RE IN!`}</p>
        </div>
      </div>
    </div>
  );
}

function PosterStyleCard() {
  return (
    <div className="bg-[#facc15] content-stretch flex flex-col gap-[32px] items-start p-[34px] relative w-[342px]" data-name="Poster Style Card">
      <div aria-hidden="true" className="absolute border-2 border-[#0f172a] border-solid inset-0 pointer-events-none shadow-[8px_8px_0px_0px_#c62828]" />
      <HeaderSection />
      <RoomInfoCutoutMaskGroup />
      <HandwrittenInfo />
      <QrCodeArea />
      <AddressLabel />
      <div className="absolute flex h-[70.184px] items-center justify-center right-[-17.14px] top-[-35.1px] w-[136.858px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-12">
          <FloatingSticker />
        </div>
      </div>
    </div>
  );
}

function PosterStyleCardCssTransform() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-2.927px] relative shrink-0 w-[348.43px] z-[2]" data-name="Poster Style Card:css-transform">
      <div className="flex h-[753.871px] items-center justify-center max-w-[448px] relative shrink-0 w-[355.003px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "315" } as React.CSSProperties}>
        <div className="-rotate-1 flex-none">
          <PosterStyleCard />
        </div>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[11.667px] relative shrink-0 w-[9.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.33333 11.6667">
        <g id="Container">
          <path d={svgPaths.pd490b00} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function OverlayBorder1() {
  return (
    <div className="-translate-x-1/2 absolute bg-[rgba(198,40,40,0.1)] bottom-[54px] content-stretch flex gap-[7.99px] items-center left-[calc(50%-80.68px)] px-[17px] py-[9px] rounded-[12px] top-0" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(198,40,40,0.3)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Container11 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] uppercase w-[73.86px]">
        <p className="leading-[16px]">High Energy</p>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="h-[9.333px] relative shrink-0 w-[12.833px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.8333 9.33333">
        <g id="Container">
          <path d={svgPaths.p1d3af800} fill="var(--fill-0, #F1F5F9)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="-translate-x-1/2 absolute bg-[#230f14] bottom-[54px] content-stretch flex gap-[8px] items-center left-[calc(50%+72.93px)] px-[17px] py-[9px] rounded-[12px] top-0" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(241,245,249,0.2)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Container12 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[89.34px]">
        <p className="leading-[16px]">Social Meetup</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="h-[11.958px] relative shrink-0 w-[12.571px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.5708 11.9583">
        <g id="Container">
          <path d={svgPaths.p1ed7a680} fill="var(--fill-0, #854D0E)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function BackgroundBorder1() {
  return (
    <div className="-translate-x-1/2 absolute bg-[#fef9c3] bottom-0 content-stretch flex gap-[7.99px] items-center left-1/2 px-[17px] py-[9px] rounded-[12px] top-[54px]" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#fde047] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Container13 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#854d0e] text-[12px] uppercase w-[95.03px]">
        <p className="leading-[16px]">Party Included</p>
      </div>
    </div>
  );
}

function SocialEnergyExtras() {
  return (
    <div className="h-[92px] max-w-[448px] relative shrink-0 w-[342px]" data-name="Social Energy Extras">
      <OverlayBorder1 />
      <BackgroundBorder />
      <BackgroundBorder1 />
    </div>
  );
}

function SocialEnergyExtrasMargin() {
  return (
    <div className="content-stretch flex flex-col items-start max-w-[448px] mb-[-2.927px] pt-[48px] relative shrink-0 z-[1]" data-name="Social Energy Extras:margin">
      <SocialEnergyExtras />
    </div>
  );
}

function Main() {
  return (
    <div className="relative shrink-0 w-full" data-name="Main">
      <div className="flex flex-col items-end overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col isolate items-end pb-[26.927px] pt-[21.071px] px-[24px] relative w-full">
          <PosterStyleCardCssTransform />
          <SocialEnergyExtrasMargin />
        </div>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="h-[18px] relative shrink-0 w-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 18">
        <g id="Container">
          <path d={svgPaths.p12a32500} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[0.5px] uppercase w-[29.63px]">
        <p className="leading-[15px]">Home</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-end min-h-px min-w-px relative self-stretch" data-name="Link">
      <Container15 />
      <Container16 />
    </div>
  );
}

function Container17() {
  return (
    <div className="h-[16px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 16">
        <g id="Container">
          <path d={svgPaths.p12995800} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[15px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[10px] tracking-[0.5px] uppercase w-[52.19px]">
        <p className="leading-[15px]">Bookings</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-end min-h-px min-w-px relative self-stretch" data-name="Link">
      <Container17 />
      <Container18 />
    </div>
  );
}

function Container19() {
  return (
    <div className="h-[16px] relative shrink-0 w-[22px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 16">
        <g id="Container">
          <path d={svgPaths.p19ab6100} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[0.5px] uppercase w-[36.56px]">
        <p className="leading-[15px]">Social</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-end min-h-px min-w-px relative self-stretch" data-name="Link">
      <Container19 />
      <Container20 />
    </div>
  );
}

function Container21() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Container">
          <path d={svgPaths.p85bff00} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[0.5px] uppercase w-[41.53px]">
        <p className="leading-[15px]">Profile</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-end min-h-px min-w-px relative self-stretch" data-name="Link">
      <Container21 />
      <Container22 />
    </div>
  );
}

function Container14() {
  return (
    <div className="h-[37px] max-w-[448px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-start justify-center max-w-[inherit] relative size-full">
        <Link />
        <Link1 />
        <Link2 />
        <Link3 />
      </div>
    </div>
  );
}

function BottomNavigation() {
  return (
    <div className="bg-[#230f14] relative shrink-0 w-full" data-name="Bottom Navigation">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col items-start pb-[24px] pt-[9px] px-[16px] relative w-full">
        <Container14 />
      </div>
    </div>
  );
}

export default function VhdsgnBookingDetailsVibrant() {
  return (
    <div className="bg-[#230f14] content-stretch flex flex-col items-start relative size-full" data-name="vhdsgn - Booking Details (Vibrant)">
      <Nav />
      <Main />
      <BottomNavigation />
    </div>
  );
}