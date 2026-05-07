import svgPaths from "./svg-flw1gak7wx";
import imgImage from "figma:asset/67a11fc8a565434213b9de91ad588a9d16aeb6f6.png";
import { imgBackgroundBorderShadow } from "./svg-8fj3x";

function Container1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] tracking-[1.2px] uppercase w-[129.53px]">
        <p className="leading-[16px]">Mission Progress</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] w-[25.52px]">
        <p className="leading-[16px]">2 / 4</p>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container1 />
      <Container2 />
    </div>
  );
}

function Background() {
  return (
    <div className="absolute bg-[#c62828] bottom-[2px] content-stretch flex items-center justify-end left-[0.58%] px-[8px] right-1/2 top-[2px]" data-name="Background">
      <div className="bg-[rgba(255,255,255,0.3)] flex-[1_0_0] h-[8px] min-h-px min-w-px rounded-[12px]" data-name="Overlay" />
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[10px] w-[6.45px]">
        <p className="leading-[15px]">X</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[10px] w-[6.45px]">
        <p className="leading-[15px]">X</p>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[10px] w-[6.45px]">
        <p className="leading-[15px]">X</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[10px] w-[6.45px]">
        <p className="leading-[15px]">X</p>
      </div>
    </div>
  );
}

function DoodleStyleMarkings() {
  return (
    <div className="absolute content-stretch flex gap-[78.1px] inset-[2px] items-center opacity-30 pl-[39.02px] pr-[39.03px]" data-name="Doodle-style markings">
      <Container3 />
      <Container4 />
      <Container5 />
      <Container6 />
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(198,40,40,0.1)] h-[24px] relative rounded-[12px] shrink-0 w-full" data-name="Overlay+Border">
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <Background />
        <DoodleStyleMarkings />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[rgba(198,40,40,0.3)] border-solid inset-0 pointer-events-none rounded-[12px]" />
    </div>
  );
}

function GraffitiStepProgressBar() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-0 px-[24px] py-[16px] right-0 top-[84px]" data-name="Graffiti Step Progress Bar">
      <Container />
      <OverlayBorder />
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[20px] uppercase w-[168.33px]">
        <p className="leading-[28px]">1. ID Verification</p>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="h-[18px] relative shrink-0 w-[19px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 18">
        <g id="Container">
          <path d={svgPaths.p549310} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
      <Heading1 />
      <Container8 />
    </div>
  );
}

function Container9() {
  return (
    <div className="h-[40px] relative shrink-0 w-[44px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 40">
        <g id="Container">
          <path d={svgPaths.p3c322040} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[8px] relative shrink-0" data-name="Margin">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#64748b] text-[12px] w-[83.393px]">
        <p className="leading-[16px]">CLICK TO SNAP</p>
      </div>
    </div>
  );
}

function Background1() {
  return (
    <div className="bg-[#f1f5f9] relative shrink-0 w-full z-[3]" data-name="Background">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[0.003px] items-center justify-center overflow-clip pb-[117.998px] pt-[117.997px] relative rounded-[inherit] w-full">
        <div className="absolute bg-size-[308px_308px] bg-top-left inset-[0_-0.01px_0_0] opacity-40" data-name="Image" style={{ backgroundImage: `url('${imgImage}')` }} />
        <Container9 />
        <Margin />
      </div>
    </div>
  );
}

function Margin1() {
  return (
    <div className="relative shrink-0 w-full z-[2]" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pl-[7.722px] pr-[8.28px] pt-[16px] relative w-full">
        <div className="bg-[#f1f5f9] h-[4.001px] rounded-[12px] shrink-0 w-full" data-name="Background" />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[0.005px] isolate items-center pb-[49px] pt-[17px] px-[17px] relative w-[342px]" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none" />
      <Background1 />
      <Margin1 />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.3)] z-[1]" data-name="Overlay+Shadow" />
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[14px] text-center w-[257.42px]">
        <p className="leading-[20px]">{`"Gotta make sure it's really you, boss!"`}</p>
      </div>
    </div>
  );
}

function IdUploadSectionPolaroidStyle() {
  return (
    <div className="content-stretch flex flex-col gap-[13px] items-center relative shrink-0 w-full" data-name="ID Upload Section (Polaroid Style)">
      <Container7 />
      <div className="flex h-[391.913px] items-center justify-center max-w-[384px] relative shrink-0 w-[348.685px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
        <div className="-rotate-1 flex-none">
          <BackgroundBorder />
        </div>
      </div>
      <Container10 />
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[40px] relative w-[22.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22.5 40">
        <g id="Container">
          <path d={svgPaths.p1097f780} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function DoodleArrow() {
  return (
    <div className="content-stretch flex items-start justify-center py-[10px] relative shrink-0 w-full" data-name="Doodle Arrow">
      <div className="flex h-[22.5px] items-center justify-center relative shrink-0 w-[40px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-90">
          <Container11 />
        </div>
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[20px] uppercase w-full">
        <p className="leading-[28px]">2. Grab Your Gear</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="h-[30px] relative shrink-0 w-[27px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 27 30">
        <g id="Container">
          <path d={svgPaths.p1ac85300} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin2() {
  return (
    <div className="mb-[-0.5px] relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[8px] relative">
        <Container13 />
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-[rgba(255,255,255,0.8)] text-center w-[27.334px]">
        <p className="leading-[15px]">$5.00</p>
      </div>
    </div>
  );
}

function Margin3() {
  return (
    <div className="mb-[-0.5px] relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[12px] relative">
        <Container14 />
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-white mb-[-0.5px] relative rounded-[12px] shrink-0" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center px-[16px] py-[4px] relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] text-center uppercase w-[23.344px]">
          <p className="leading-[16px]">Add</p>
        </div>
      </div>
    </div>
  );
}

function TowelSticker() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-center pb-[20.5px] pt-[20px] px-[20px] relative rounded-[8px] w-[163px]" data-name="Towel Sticker">
      <div aria-hidden="true" className="absolute border-4 border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-[0_0_-0.5px_0] rounded-[8px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]" data-name="Towel Sticker:shadow" />
      <Margin2 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[21px] justify-center leading-[0] mb-[-0.5px] relative shrink-0 text-[14px] text-center text-white uppercase w-[98.538px]">
        <p className="leading-[20px]">Fresh Towels</p>
      </div>
      <Margin3 />
      <Button />
    </div>
  );
}

function Container15() {
  return (
    <div className="h-[31.5px] relative shrink-0 w-[24px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 31.5">
        <g id="Container">
          <path d={svgPaths.p415fb40} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin4() {
  return (
    <div className="mb-[-0.5px] relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[8px] relative">
        <Container15 />
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-[rgba(198,40,40,0.8)] text-center w-[31.551px]">
        <p className="leading-[15px]">$12.00</p>
      </div>
    </div>
  );
}

function Margin5() {
  return (
    <div className="mb-[-0.5px] relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[12px] relative">
        <Container16 />
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#c62828] mb-[-0.5px] relative rounded-[12px] shrink-0" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center px-[16px] py-[4px] relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[12px] text-center text-white uppercase w-[23.338px]">
          <p className="leading-[16px]">Add</p>
        </div>
      </div>
    </div>
  );
}

function LockSticker() {
  return (
    <div className="bg-[#0f172a] content-stretch flex flex-col items-center pb-[20.5px] pt-[20px] px-[20px] relative rounded-[8px] w-[163px]" data-name="Lock Sticker">
      <div aria-hidden="true" className="absolute border-4 border-[#c62828] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[8px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]" data-name="Lock Sticker:shadow" />
      <Margin4 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[21px] justify-center leading-[0] mb-[-0.5px] relative shrink-0 text-[14px] text-center text-white uppercase w-[89.31px]">
        <p className="leading-[20px]">Secure Lock</p>
      </div>
      <Margin5 />
      <Button1 />
    </div>
  );
}

function Container12() {
  return (
    <div className="gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[_159px] relative shrink-0 w-full" data-name="Container">
      <div className="col-1 flex h-[151.322px] items-center justify-center relative row-1 self-start shrink-0 w-[165.567px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "84" } as React.CSSProperties}>
        <div className="flex-none rotate-1">
          <TowelSticker />
        </div>
      </div>
      <div className="col-2 flex h-[154.215px] items-center justify-center relative row-1 self-start shrink-0 w-[166.871px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "84" } as React.CSSProperties}>
        <div className="flex-none rotate-[-1.5deg]">
          <LockSticker />
        </div>
      </div>
    </div>
  );
}

function AddOnsSectionStickerStyle() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="Add-ons Section (Sticker Style)">
      <Heading2 />
      <Container12 />
    </div>
  );
}

function Heading3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[20px] uppercase w-full">
        <p className="leading-[28px]">3. Need More Sleep?</p>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[18px] w-[125.91px]">
        <p className="leading-[28px]">Late Checkout</p>
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[14px] w-[122.94px]">
        <p className="leading-[20px]">Stay until 2:00 PM</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[125.91px]" data-name="Container">
      <Container19 />
      <Container20 />
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex flex-col items-end relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[24px] text-right w-[43.2px]">
        <p className="leading-[32px]">$25</p>
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#c62828] content-stretch flex items-center justify-center px-[24px] py-[8px] relative rounded-[4px] shrink-0" data-name="Button">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[14px] text-center text-white uppercase w-[37px]">
        <p className="leading-[20px]">Book</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="Container">
      <Container22 />
      <Button2 />
    </div>
  );
}

function Container17() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between relative w-full">
        <Container18 />
        <Container21 />
      </div>
    </div>
  );
}

function BackgroundDoodleIcon() {
  return (
    <div className="relative size-[80px]" data-name="Background Doodle Icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 80 80">
        <g id="Background Doodle Icon">
          <path d={svgPaths.p1b031998} fill="var(--fill-0, #c62828)" fillOpacity="0.05" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function OverlayBorder1() {
  return (
    <div className="bg-[rgba(198,40,40,0.05)] relative rounded-[8px] shrink-0 w-full" data-name="Overlay+Border">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[26px] relative w-full">
          <Container17 />
          <div className="absolute bottom-[-22.93px] flex items-center justify-center left-[-22.93px] size-[94.885px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
            <div className="flex-none rotate-12">
              <BackgroundDoodleIcon />
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[rgba(198,40,40,0.4)] border-dashed inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function LateCheckoutSection() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Late Checkout Section">
      <Heading3 />
      <OverlayBorder1 />
    </div>
  );
}

function Heading4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[20px] uppercase w-full">
        <p className="leading-[28px]">4. The Rules</p>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="h-[17px] relative shrink-0 w-[24px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 17">
        <g id="Container">
          <path d={svgPaths.p2c6c5a00} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function HorizontalBorder() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px pb-[5px] relative" data-name="HorizontalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.3)] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[14px] tracking-[-0.7px] uppercase w-[167.11px]">
        <p className="leading-[20px]">Network: StreetArt_Hub</p>
      </div>
    </div>
  );
}

function Container24() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Container">
      <Container25 />
      <HorizontalBorder />
    </div>
  );
}

function Container27() {
  return (
    <div className="relative shrink-0 size-[20.6px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.6 20.6">
        <g id="Container">
          <path d={svgPaths.p317c7780} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function HorizontalBorder1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px pb-[5px] relative" data-name="HorizontalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.3)] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[14px] tracking-[-0.7px] uppercase w-[120.27px]">
        <p className="leading-[20px]">No smoking inside!</p>
      </div>
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Container">
      <Container27 />
      <HorizontalBorder1 />
    </div>
  );
}

function Container29() {
  return (
    <div className="relative shrink-0 size-[19.8px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.8 19.8">
        <g id="Container">
          <path d={svgPaths.pc2b8ec0} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function HorizontalBorder2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px pb-[5px] relative" data-name="HorizontalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.3)] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[14px] tracking-[-0.7px] uppercase w-[155.56px]">
        <p className="leading-[20px]">Quiet hours after 10PM</p>
      </div>
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Container">
      <Container29 />
      <HorizontalBorder2 />
    </div>
  );
}

function Container23() {
  return (
    <div className="opacity-80 relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[12px] items-start relative w-full">
        <Container24 />
        <Container26 />
        <Container28 />
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center px-[34px] py-[10px] relative shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#c62828] border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[24px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[16px] text-center uppercase w-[168.3px]">
        <p className="leading-[24px]">Download PDF Guide</p>
      </div>
    </div>
  );
}

function ButtonMargin() {
  return (
    <div className="content-stretch flex flex-col items-center pt-[32px] relative shrink-0" data-name="Button:margin">
      <Button3 />
    </div>
  );
}

function ButtonMarginAlignCenter() {
  return (
    <div className="relative shrink-0 w-[278px]" data-name="Button:margin:align-center">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative w-full">
        <ButtonMargin />
      </div>
    </div>
  );
}

function BackgroundBorderShadow() {
  return (
    <div className="absolute content-stretch flex flex-col items-center justify-center left-0 mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0px_0px] mask-size-[342px_243px] min-h-[200px] p-[34px] right-0 top-0" data-name="Background+Border+Shadow" style={{ backgroundImage: "linear-gradient(134.862deg, rgba(198, 40, 40, 0.1) 0%, rgb(35, 15, 20) 100%), linear-gradient(90deg, rgb(35, 15, 20) 0%, rgb(35, 15, 20) 100%)", maskImage: `url('${imgBackgroundBorderShadow}')` }}>
      <div aria-hidden="true" className="absolute border-2 border-[rgba(198,40,40,0.2)] border-solid inset-0 pointer-events-none" />
      <Container23 />
      <ButtonMarginAlignCenter />
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]" />
    </div>
  );
}

function MaskGroup() {
  return (
    <div className="h-[243px] min-h-[200px] relative shrink-0 w-full" data-name="Mask Group">
      <BackgroundBorderShadow />
    </div>
  );
}

function SectionPropertyGuideFoldedPaper() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Section - Property Guide (Folded Paper)">
      <Heading4 />
      <MaskGroup />
    </div>
  );
}

function Button4() {
  return (
    <div className="bg-[#c62828] content-stretch flex items-center justify-center py-[20px] relative rounded-[8px] shadow-[0px_8px_0px_0px_#9a1c3b] shrink-0 w-full" data-name="Button">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[20px] text-center text-white tracking-[2px] uppercase w-[149.45px]">
        <p className="leading-[28px]">Finish Setup</p>
      </div>
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#64748b] text-[12px] text-center tracking-[-0.6px] uppercase w-[175.31px]">
        <p className="leading-[16px]">{`You're almost home, traveler.`}</p>
      </div>
    </div>
  );
}

function FinalAction() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start pt-[32px] relative shrink-0 w-full" data-name="Final Action">
      <Button4 />
      <Container30 />
    </div>
  );
}

function Main() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[48px] items-start left-0 pb-[96px] pt-[24px] px-[24px] right-0 top-[164px]" data-name="Main">
      <IdUploadSectionPolaroidStyle />
      <DoodleArrow />
      <AddOnsSectionStickerStyle />
      <LateCheckoutSection />
      <SectionPropertyGuideFoldedPaper />
      <FinalAction />
    </div>
  );
}

function DoodleArrowsFloatingVisualDecoration() {
  return (
    <div className="absolute bottom-[30.03px] right-[20.13px] size-[84.906px]" data-name="Doodle Arrows Floating (Visual Decoration)">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 84.9059 84.9059">
        <g id="Doodle Arrows Floating (Visual Decoration)" opacity="0.2">
          <path d={svgPaths.p3f4ca598} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container31() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p21bb7900} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Heading 2">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[24px] text-shadow-[2px_2px_0px_#c62828] tracking-[-1.2px] uppercase w-[133.78px]">
        <p className="leading-[32px]">Pre-Arrival</p>
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="relative shrink-0 size-[25px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 25">
        <g id="Container">
          <path d={svgPaths.p17404900} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function TopNavigation() {
  return (
    <div className="absolute backdrop-blur-[6px] bg-[rgba(35,15,20,0.9)] content-stretch flex items-center justify-between left-0 p-[24px] right-0 top-0" data-name="Top Navigation">
      <Container31 />
      <Heading />
      <Container32 />
    </div>
  );
}

export default function VhdsgnPreArrivalSetupVibrant() {
  return (
    <div className="bg-[#230f14] relative size-full" data-name="vhdsgn - Pre-Arrival Setup (Vibrant)">
      <GraffitiStepProgressBar />
      <Main />
      <DoodleArrowsFloatingVisualDecoration />
      <TopNavigation />
    </div>
  );
}