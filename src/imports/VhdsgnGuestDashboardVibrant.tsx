import svgPaths from "./svg-7g1da4m9iu";
import imgUserProfile from "figma:asset/247a0f0a56802edfd662afe2555097984ab7c02d.png";
import imgLuxuryHotelRoom from "figma:asset/6d21ad85703ca82dca17f3323fab1540942a5076.png";
import imgCityMap from "figma:asset/6462d66f55c464162eda5e46c113359fc82acb93.png";

function Container2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[14px] tracking-[1.4px] uppercase w-[62.7px]">
        <p className="leading-[20px]">VHDSGN</p>
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 1">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[36px] justify-center leading-[0] relative shrink-0 text-[30px] text-white w-[148.63px]">
        <p className="leading-[36px]">Your Stay.</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[148.63px]" data-name="Container">
      <Container2 />
      <Heading />
    </div>
  );
}

function UserProfile() {
  return (
    <div className="max-w-[48px] relative shrink-0 size-[44px]" data-name="User Profile">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute left-[-4.55%] max-w-none size-[109.09%] top-[-4.55%]" src={imgUserProfile} />
      </div>
    </div>
  );
}

function Border() {
  return (
    <div className="relative rounded-[12px] shrink-0 size-[48px]" data-name="Border">
      <div className="content-stretch flex flex-col items-start overflow-clip p-[2px] relative rounded-[inherit] size-full">
        <UserProfile />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[#c62828] border-solid inset-0 pointer-events-none rounded-[12px]" />
    </div>
  );
}

function HeaderSection() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header Section">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[24px] relative w-full">
          <Container1 />
          <Border />
        </div>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="h-[18px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 18">
        <g id="Container">
          <path d={svgPaths.p20d1fa00} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Heading3ActionsCollage() {
  return (
    <div className="absolute content-stretch flex gap-[8px] items-center left-[16px] right-[16px] top-[460.5px]" data-name="Heading 3 - Actions Collage">
      <Container3 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[18px] w-[121.42px]">
        <p className="leading-[28px]">Guest Actions</p>
      </div>
    </div>
  );
}

function LuxuryHotelRoom() {
  return (
    <div className="h-[264.001px] relative shrink-0 w-full" data-name="Luxury Hotel Room">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgLuxuryHotelRoom} />
      </div>
    </div>
  );
}

function Background1() {
  return (
    <div className="bg-[#e2e8f0] content-stretch flex flex-col items-start justify-center overflow-clip relative shrink-0 w-full" data-name="Background">
      <LuxuryHotelRoom />
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[20px] w-full">
        <p className="leading-[25px]">Room 402</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex flex-col items-start opacity-70 relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[14px] w-full">
        <p className="leading-[20px]">Deluxe King Bed • 2 Guests</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[4.002px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] w-full">
        <p className="leading-[16px]">Until Oct 24, 2023</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <Container5 />
      <Container6 />
      <Container7 />
    </div>
  );
}

function Background() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[15.999px] h-[397px] items-start pb-[40px] pt-[12px] px-[12px] relative w-[288px]" data-name="Background">
      <div className="-translate-x-1/2 absolute bg-[rgba(255,255,255,0)] bottom-0 left-1/2 shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.3)] top-0 w-[288px]" data-name="Overlay+Shadow" />
      <Background1 />
      <Container4 />
    </div>
  );
}

function Container8() {
  return (
    <div className="h-[25.5px] relative shrink-0 w-[22.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22.5 25.5">
        <g id="Container">
          <path d={svgPaths.p1097f780} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[10px] tracking-[-0.5px] uppercase w-[77.926px]">
        <p className="leading-[15px]">Your Sanctuary</p>
      </div>
    </div>
  );
}

function HandDrawnStyleArrowAnnotation() {
  return (
    <div className="content-stretch flex flex-col gap-[0.009px] items-center relative" data-name="Hand-drawn style arrow annotation">
      <Container8 />
      <Container9 />
    </div>
  );
}

function BackgroundShadow() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-start px-[12px] py-[4px] relative rounded-[9999px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]" data-name="Background+Shadow">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[18px] justify-center leading-[0] relative shrink-0 text-[12px] text-white uppercase w-[66.266px]">
        <p className="leading-[18px]">Confirmed</p>
      </div>
    </div>
  );
}

function RoomInfoSectionPolaroidStyle() {
  return (
    <div className="absolute content-stretch flex items-start justify-center left-[16px] right-[16px] top-[11.1px]" data-name="Room Info Section (Polaroid Style)">
      <div className="flex h-[406.809px] items-center justify-center relative shrink-0 w-[301.68px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "84" } as React.CSSProperties}>
        <div className="-rotate-2 flex-none">
          <Background />
        </div>
      </div>
      <div className="absolute bottom-[-44.3px] flex h-[59.297px] items-center justify-center left-[34.72px] w-[85.755px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
        <div className="-rotate-15 flex-none">
          <HandDrawnStyleArrowAnnotation />
        </div>
      </div>
      <div className="absolute flex h-[44.199px] items-center justify-center right-[-9.72px] top-[-16.2px] w-[93.7px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-12">
          <BackgroundShadow />
        </div>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[0.75px] relative shrink-0 w-full z-[3]" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[22.5px] relative shrink-0 text-[18px] text-white w-full">
        <p className="mb-0">Extend</p>
        <p>Stay</p>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="absolute h-[50px] right-[8px] top-[8px] w-[47.5px] z-[2]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 47.5 50">
        <g id="Container" opacity="0.2">
          <path d={svgPaths.pdae4c00} fill="var(--fill-0, #F1F5F9)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container13() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 139 20">
        <g id="Container">
          <path d={svgPaths.p1c96f700} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[8px] relative shrink-0 w-full z-[1]" data-name="Margin">
      <Container13 />
    </div>
  );
}

function BackgroundShadow1() {
  return (
    <div className="bg-[#c62828] relative rounded-[8px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] shrink-0 w-full" data-name="Background+Shadow">
      <div className="flex flex-col justify-end overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col isolate items-start justify-end pb-[16px] pt-[126.25px] px-[16px] relative w-full">
          <Container11 />
          <Container12 />
          <Margin />
        </div>
      </div>
    </div>
  );
}

function Background2() {
  return (
    <div className="bg-[#facc15] content-stretch flex flex-col items-start px-[8px] py-[2px] relative rounded-[2px]" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-black w-[43.637px]">
        <p className="leading-[15px]">POPULAR</p>
      </div>
    </div>
  );
}

function ExtendStayCard() {
  return (
    <div className="col-1 content-stretch flex flex-col items-start justify-self-stretch relative row-1 self-start shrink-0" data-name="Extend Stay Card">
      <BackgroundShadow1 />
      <div className="absolute flex h-[24.125px] items-center justify-center left-[-8.71px] top-[-10.56px] w-[61.066px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="-rotate-5 flex-none">
          <Background2 />
        </div>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[0.75px] relative w-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[22.5px] relative shrink-0 text-[18px] text-white w-full">
          <p className="mb-0">Buy</p>
          <p>Add-ons</p>
        </div>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 135 20">
        <g id="Container">
          <path d={svgPaths.p2d8e4cc0} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] relative w-full">
        <Container15 />
      </div>
    </div>
  );
}

function BuyAddOnsCard() {
  return (
    <div className="bg-[#1e293b] col-2 justify-self-stretch relative rounded-[8px] row-1 self-start shrink-0" data-name="Buy Add-ons Card">
      <div className="flex flex-col justify-end overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start justify-end pb-[18px] pt-[124.25px] px-[18px] relative w-full">
          <Container14 />
          <Margin1 />
          <div className="absolute bg-[rgba(198,40,40,0.1)] right-[-14px] rounded-[12px] size-[96px] top-[-14px]" data-name="Overlay" />
          <div className="absolute h-[23.75px] left-[19.27px] top-[23.5px] w-[27.47px]" data-name="Icon">
            <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 27.4697 23.75">
              <path d={svgPaths.p2d6ea180} fill="var(--fill-0, #c62828)" id="Icon" />
            </svg>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[rgba(198,40,40,0.2)] border-solid inset-0 pointer-events-none rounded-[8px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[24px] tracking-[-1.2px] uppercase w-[182.27px]">
        <p className="leading-[32px]">Request Service</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[12px] w-full">
        <p className="leading-[16px]">Concierge, Spa, or Housekeeping</p>
      </div>
    </div>
  );
}

function Margin2() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[4px] relative shrink-0 w-full" data-name="Margin">
      <Container18 />
    </div>
  );
}

function Container16() {
  return (
    <div className="relative shrink-0 w-[182.27px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <Container17 />
        <Margin2 />
      </div>
    </div>
  );
}

function Overlay() {
  return (
    <div className="h-[54.5px] relative shrink-0 w-[62px]" data-name="Overlay">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 62 54.5">
        <g id="Overlay">
          <rect fill="var(--fill-0, #c62828)" fillOpacity="0.2" height="54.5" rx="12" width="62" />
          <path d={svgPaths.p11d1aa40} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function RequestServiceCardFullWidthInCollage() {
  return (
    <div className="aspect-[2/1] bg-[#12080a] col-[1/span_2] justify-self-stretch relative rounded-[8px] row-2 shrink-0" data-name="Request Service Card (Full Width in Collage)">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-between p-[26px] relative size-full">
          <Container16 />
          <Overlay />
          <div className="absolute bg-[rgba(198,40,40,0.2)] blur-[32px] bottom-[-30px] left-[-30px] rounded-[12px] size-[128px]" data-name="Spray Paint Aesthetic Background Element" />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[#c62828] border-solid inset-0 pointer-events-none rounded-[8px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container10() {
  return (
    <div className="absolute gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[__228px_179px] left-[16px] right-[16px] top-[505px]" data-name="Container">
      <ExtendStayCard />
      <BuyAddOnsCard />
      <RequestServiceCardFullWidthInCollage />
    </div>
  );
}

function CityMap() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px opacity-50 relative w-full" data-name="City Map">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[217.5%] left-0 max-w-none top-[-58.75%] w-full" src={imgCityMap} />
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="h-[30px] relative shrink-0 w-[24px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 30">
        <g id="Container">
          <path d={svgPaths.p2e497c80} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container19() {
  return (
    <div className="absolute content-stretch flex inset-0 items-center justify-center" data-name="Container">
      <Container20 />
    </div>
  );
}

function Container21() {
  return (
    <div className="relative shrink-0 size-[10px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 10">
        <g id="Container">
          <path d={svgPaths.p36960700} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Overlay1() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0.8)] bottom-[8px] content-stretch flex gap-[4px] items-center left-[8px] px-[8px] py-[4px] rounded-[12px]" data-name="Overlay">
      <Container21 />
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-white w-[107.59px]">
        <p className="leading-[15px]">Explore Neighborhood</p>
      </div>
    </div>
  );
}

function Background3() {
  return (
    <div className="h-[160px] relative rounded-[4px] shrink-0 w-full" data-name="Background">
      <div aria-hidden="true" className="absolute bg-clip-padding bg-white border-0 border-[transparent] border-solid inset-0 mix-blend-saturation pointer-events-none rounded-[4px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center overflow-clip relative rounded-[inherit] size-full">
        <CityMap />
        <Container19 />
        <Overlay1 />
      </div>
    </div>
  );
}

function ExperienceMapPlaceholder() {
  return (
    <div className="absolute bg-[#1e293b] left-[16px] right-[16px] rounded-[8px] top-[960px]" data-name="Experience Map Placeholder">
      <div className="content-stretch flex flex-col items-start overflow-clip p-[5px] relative rounded-[inherit] w-full">
        <Background3 />
      </div>
      <div aria-hidden="true" className="absolute border border-[#334155] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function MainContent() {
  return (
    <div className="h-[1226px] relative shrink-0 w-full" data-name="Main Content">
      <Heading3ActionsCollage />
      <RoomInfoSectionPolaroidStyle />
      <Container10 />
      <ExperienceMapPlaceholder />
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col items-start min-h-[1330px] overflow-clip relative shrink-0 w-full" data-name="Container">
      <HeaderSection />
      <MainContent />
      <div className="-translate-y-1/2 absolute bg-[rgba(198,40,40,0.05)] blur-[40px] h-[256px] right-[-64px] rounded-[12px] top-[calc(50%+128px)] w-[128px]" data-name="Floating Decorative Element (Spray Effect)" />
      <div className="absolute bg-[rgba(198,40,40,0.05)] blur-[40px] bottom-1/4 left-[-64px] rounded-[12px] top-[55.75%] w-[128px]" data-name="Overlay+Blur" />
    </div>
  );
}

function Container23() {
  return (
    <div className="h-[18px] relative shrink-0 w-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 18">
        <g id="Container">
          <path d={svgPaths.p12a32500} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container23 />
    </div>
  );
}

function Container24() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[10px] tracking-[1px] uppercase w-[31.69px]">
        <p className="leading-[15px]">Home</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-center relative size-full">
        <Container22 />
        <Container24 />
      </div>
    </div>
  );
}

function Container26() {
  return (
    <div className="h-[20.5px] relative shrink-0 w-[22px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 20.5">
        <g id="Container">
          <path d={svgPaths.p22493d80} fill="var(--fill-0, #94A3B8)" id="Icon" />
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

function Container27() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[1px] uppercase w-[52.67px]">
        <p className="leading-[15px]">Services</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-center relative size-full">
        <Container25 />
        <Container27 />
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p176f0bb4} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container29 />
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[1px] uppercase w-[48.83px]">
        <p className="leading-[15px]">Explore</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-center relative size-full">
        <Container28 />
        <Container30 />
      </div>
    </div>
  );
}

function Container32() {
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

function Container31() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container32 />
    </div>
  );
}

function Container33() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[1px] uppercase w-[45.06px]">
        <p className="leading-[15px]">Profile</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-center relative size-full">
        <Container31 />
        <Container33 />
      </div>
    </div>
  );
}

function BackgroundHorizontalBorderOverlayBlur() {
  return (
    <div className="backdrop-blur-[6px] bg-[#12080a] relative shrink-0 w-full" data-name="Background+HorizontalBorder+OverlayBlur">
      <div aria-hidden="true" className="absolute border-[#1e293b] border-solid border-t inset-0 pointer-events-none" />
      <div className="flex flex-row justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-start justify-center pb-[24px] pt-[13px] px-[16px] relative w-full">
          <div className="absolute bg-[rgba(255,255,255,0)] inset-0 shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" data-name="Overlay+Shadow" />
          <Link />
          <Link1 />
          <Link2 />
          <Link3 />
        </div>
      </div>
    </div>
  );
}

function BottomNavigationBar() {
  return (
    <div className="absolute bottom-0 content-stretch flex flex-col items-start left-0 right-0" data-name="Bottom Navigation Bar">
      <BackgroundHorizontalBorderOverlayBlur />
    </div>
  );
}

export default function VhdsgnGuestDashboardVibrant() {
  return (
    <div className="bg-[#12080a] content-stretch flex flex-col items-start relative size-full" data-name="vhdsgn - Guest Dashboard (Vibrant)">
      <Container />
      <BottomNavigationBar />
    </div>
  );
}