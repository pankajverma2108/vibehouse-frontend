import svgPaths from "./svg-mlz55w7bt7";
import imgDormRoomInterior from "figma:asset/c014b33280a2598f9163ef73b1cbf2999c9114ea.png";
import imgFemaleDormRoom from "figma:asset/71ba124ef6a42573ef23ea362e78a53d00811ee9.png";
import imgPrivateRoom from "figma:asset/fdc734b60d527db58333d9198974bda5eb7b8acb.png";
import imgDeluxeEnsuiteRoom from "figma:asset/0eb0e9d7dbfa591c90b4204ad8fe8dad1060d349.png";
import imgSinglePrivateRoom from "figma:asset/07fefc0d92e726f962e7a8c21545a20382b2a12f.png";

function ParagraphVerticalBorder() {
  return (
    <div className="relative shrink-0" data-name="Paragraph+VerticalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.2)] border-r border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold items-start pl-[16px] pr-[31.06px] relative text-[#f1f5f9]">
        <div className="flex flex-col h-[15px] justify-center leading-[0] opacity-60 relative shrink-0 text-[10px] uppercase w-[44.53px]">
          <p className="leading-[15px]">Check-in</p>
        </div>
        <div className="flex flex-col h-[40px] justify-center leading-[20px] relative shrink-0 text-[14px] w-[80.64px]">
          <p className="mb-0">Oct 24 - Oct</p>
          <p>28</p>
        </div>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[11.667px] relative shrink-0 w-[10.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 11.6667">
        <g id="Container">
          <path d={svgPaths.pb606280} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#c62828] relative shrink-0" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[33.57px] items-center pl-[53.58px] pr-[32px] py-[12px] relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[48px] justify-center leading-[24px] relative shrink-0 text-[16px] text-center text-white uppercase w-[61.13px]">
          <p className="mb-0">Change</p>
          <p>Dates</p>
        </div>
        <Container1 />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#0f172a] relative self-stretch shrink-0" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border-2 border-[#c62828] border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] h-full items-center p-[10px] relative">
          <div className="absolute bg-[rgba(255,255,255,0)] inset-[0_0.48px_0_0] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" data-name="Overlay+Shadow" />
          <ParagraphVerticalBorder />
          <Button />
        </div>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="absolute bottom-0 content-stretch flex h-[116px] items-start justify-center left-0 pb-[24px] px-[16px] right-0 z-[4]" data-name="Container">
      <BackgroundBorder />
    </div>
  );
}

function Container4() {
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
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Heading 1">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[24px] tracking-[-1.2px] uppercase w-[201.56px]">
        <p className="leading-[32px]">Stay / Availability</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="Container">
      <Container4 />
      <Heading />
    </div>
  );
}

function Container5() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Container">
          <path d={svgPaths.p8a35e00} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-center justify-center p-[8px] relative rounded-[4px] shrink-0" data-name="Button">
      <Container5 />
    </div>
  );
}

function Container2() {
  return (
    <div className="max-w-[1024px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] relative w-full">
        <Container3 />
        <Button1 />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="backdrop-blur-[6px] bg-[rgba(35,15,20,0.8)] relative shrink-0 w-full z-[3]" data-name="Header">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.2)] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col items-start pb-[17px] pt-[16px] px-[16px] relative w-full">
        <Container2 />
      </div>
    </div>
  );
}

function Container6() {
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

function Container7() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[10px] tracking-[-0.5px] uppercase w-[38.33px]">
        <p className="leading-[15px]">Explore</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="relative shrink-0" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center relative">
        <Container6 />
        <Container7 />
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="h-[20.5px] relative shrink-0 w-[19.175px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.175 20.5">
        <g id="Container">
          <path d={svgPaths.p17081600} fill="var(--fill-0, #F1F5F9)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[10px] tracking-[-0.5px] uppercase w-[44.45px]">
        <p className="leading-[15px]">Bookings</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="opacity-50 relative shrink-0" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center relative">
        <Container8 />
        <Container9 />
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="h-[18.35px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 18.35">
        <g id="Container">
          <path d={svgPaths.p279a9400} fill="var(--fill-0, #F1F5F9)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container11() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[10px] tracking-[-0.5px] uppercase w-[27.83px]">
        <p className="leading-[15px]">Saved</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="opacity-50 relative shrink-0" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center relative">
        <Container10 />
        <Container11 />
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Container">
          <path d={svgPaths.p85bff00} fill="var(--fill-0, #F1F5F9)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[10px] tracking-[-0.5px] uppercase w-[34.56px]">
        <p className="leading-[15px]">Profile</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="opacity-50 relative shrink-0" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center relative">
        <Container12 />
        <Container13 />
      </div>
    </div>
  );
}

function Nav() {
  return (
    <div className="absolute bg-[#230f14] bottom-0 content-stretch flex gap-[53.2px] h-[80px] items-center left-0 pl-[42.59px] pr-[42.63px] pt-px right-0 z-[2]" data-name="Nav">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.2)] border-solid border-t inset-0 pointer-events-none" />
      <Link />
      <Link1 />
      <Link2 />
      <Link3 />
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex items-start justify-center relative" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[40px] justify-center leading-[20px] relative shrink-0 text-[14px] text-center text-white tracking-[1.4px] uppercase w-[46.05px]">
        <p className="mb-0">All</p>
        <p>Units</p>
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-center justify-center pl-[27.751px] pr-[27.747px] py-[12px] relative" data-name="Button">
      <div className="flex items-center justify-center relative shrink-0 w-[54.552px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "42" } as React.CSSProperties}>
        <div className="flex-none skew-x-12">
          <Container15 />
        </div>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-center relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[14px] text-center tracking-[1.4px] uppercase w-[55.47px]">
          <p className="leading-[20px]">Dorms</p>
        </div>
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[rgba(198,40,40,0.1)] content-stretch flex flex-col items-center justify-center pl-[31.876px] pr-[31.873px] py-[22px] relative" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#c62828] border-solid inset-0 pointer-events-none" />
      <div className="flex items-center justify-center relative shrink-0 w-[59.721px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none skew-x-12">
          <Container16 />
        </div>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-center relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[14px] text-center tracking-[1.4px] uppercase w-[72.67px]">
          <p className="leading-[20px]">Privates</p>
        </div>
      </div>
    </div>
  );
}

function Button4() {
  return (
    <div className="bg-[rgba(198,40,40,0.1)] content-stretch flex flex-col items-center justify-center pl-[31.876px] pr-[31.873px] py-[22px] relative" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#c62828] border-solid inset-0 pointer-events-none" />
      <div className="flex items-center justify-center relative shrink-0 w-[76.921px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none skew-x-12">
          <Container17 />
        </div>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="h-[80px] overflow-clip relative shrink-0 w-full" data-name="Container">
      <div className="absolute flex items-center justify-center left-[-6.8px] top-0 w-[123.654px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "42" } as React.CSSProperties}>
        <div className="-skew-x-12 flex-none">
          <Button2 />
        </div>
      </div>
      <div className="absolute flex items-center justify-center left-[119.23px] top-0 w-[137.074px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="-skew-x-12 flex-none">
          <Button3 />
        </div>
      </div>
      <div className="absolute flex items-center justify-center left-[258.7px] top-0 w-[154.274px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="-skew-x-12 flex-none">
          <Button4 />
        </div>
      </div>
    </div>
  );
}

function DormRoomInterior() {
  return (
    <div className="h-[244.497px] relative shrink-0 w-full" data-name="Dorm room interior">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 overflow-hidden">
          <img alt="" className="absolute h-[133.33%] left-0 max-w-none top-[-16.67%] w-full" src={imgDormRoomInterior} />
        </div>
        <div className="absolute bg-white inset-0 mix-blend-saturation" />
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#334155] content-stretch flex flex-col items-start justify-center overflow-clip relative shrink-0 w-full" data-name="Background">
      <DormRoomInterior />
      <div className="absolute bg-[rgba(198,40,40,0.2)] inset-0 mix-blend-multiply" data-name="Overlay" />
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#c62828] text-[20px] tracking-[-1px] uppercase w-full">
        <p className="leading-[28px]">Mixed 8-Bed Dorm</p>
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="font-['Space_Grotesk:Bold',sans-serif] font-bold h-[31.995px] leading-[0] relative shrink-0 text-[#f1f5f9] w-full" data-name="Paragraph">
      <div className="-translate-y-1/2 absolute flex flex-col h-[32px] justify-center left-0 text-[24px] top-[15.5px] w-[43.207px]">
        <p className="leading-[32px]">$25</p>
      </div>
      <div className="-translate-y-1/2 absolute flex flex-col h-[16px] justify-center left-[43.2px] opacity-60 text-[12px] top-[20px] uppercase w-[38.756px]">
        <p className="leading-[16px]">/night</p>
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex flex-col items-start opacity-70 relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[159.324px]">
        <p className="leading-[16px]">8 Capacity • Mixed Gender</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[159.324px]" data-name="Container">
      <Paragraph />
      <Container22 />
    </div>
  );
}

function Container24() {
  return (
    <div className="content-stretch flex flex-col items-end relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] text-right uppercase w-[75.472px]">
        <p className="leading-[16px]">3 Slots left</p>
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <Container24 />
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex items-end justify-between relative shrink-0 w-full" data-name="Container">
      <Container21 />
      <Container23 />
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex flex-col gap-[8.001px] items-start relative shrink-0 w-full" data-name="Container">
      <Heading1 />
      <Container20 />
    </div>
  );
}

function BackgroundShadow() {
  return (
    <div className="bg-[#1e293b] relative shadow-[8px_8px_0px_0px_rgba(198,40,40,0.3)] shrink-0 w-full" data-name="Background+Shadow">
      <div className="content-stretch flex flex-col gap-[16.002px] items-start pb-[48px] pt-[16px] px-[16px] relative w-full">
        <Background />
        <Container19 />
      </div>
    </div>
  );
}

function Background1() {
  return (
    <div className="absolute bg-[#c62828] content-stretch flex flex-col items-start left-[-16px] px-[12px] py-[4px] top-[-15.99px]" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[12px] text-white uppercase w-[51.058px]">
        <p className="leading-[16px]">Hot Pick</p>
      </div>
    </div>
  );
}

function RoomCard() {
  return (
    <div className="content-stretch flex flex-col items-start relative w-full" data-name="Room Card 1">
      <BackgroundShadow />
      <Background1 />
    </div>
  );
}

function FemaleDormRoom() {
  return (
    <div className="h-[244.504px] relative shrink-0 w-full" data-name="Female dorm room">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 overflow-hidden">
          <img alt="" className="absolute h-[133.33%] left-0 max-w-none top-[-16.67%] w-full" src={imgFemaleDormRoom} />
        </div>
        <div className="absolute bg-white inset-0 mix-blend-saturation" />
      </div>
    </div>
  );
}

function Background2() {
  return (
    <div className="bg-[#334155] content-stretch flex flex-col items-start justify-center overflow-clip relative shrink-0 w-full" data-name="Background">
      <FemaleDormRoom />
      <div className="absolute bg-[rgba(198,40,40,0.1)] inset-0 mix-blend-screen" data-name="Overlay" />
    </div>
  );
}

function Heading2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#c62828] text-[20px] tracking-[-1px] uppercase w-full">
        <p className="leading-[28px]">Female 6-Bed</p>
      </div>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32.001px] leading-[0] relative shrink-0 text-[#f1f5f9] w-full" data-name="Paragraph">
      <div className="-translate-y-1/2 absolute flex flex-col h-[32px] justify-center left-0 text-[24px] top-[15.5px] w-[44.705px]">
        <p className="leading-[32px]">$30</p>
      </div>
      <div className="-translate-y-1/2 absolute flex flex-col h-[16px] justify-center left-[44.71px] opacity-60 text-[12px] top-[20px] uppercase w-[38.743px]">
        <p className="leading-[16px]">/night</p>
      </div>
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex flex-col items-start opacity-70 relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[151.602px]">
        <p className="leading-[16px]">6 Capacity • Female Only</p>
      </div>
    </div>
  );
}

function Container27() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[151.602px]" data-name="Container">
      <Paragraph1 />
      <Container28 />
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex flex-col items-end relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] text-right uppercase w-[76.686px]">
        <p className="leading-[16px]">Selling Fast</p>
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <Container30 />
    </div>
  );
}

function Container26() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-end size-full">
        <div className="content-stretch flex items-end justify-between pr-[0.002px] relative w-full">
          <Container27 />
          <Container29 />
        </div>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex flex-col gap-[8.003px] items-start relative shrink-0 w-full" data-name="Container">
      <Heading2 />
      <Container26 />
    </div>
  );
}

function BackgroundShadow1() {
  return (
    <div className="bg-[#1e293b] relative shadow-[8px_8px_0px_0px_rgba(198,40,40,0.3)] shrink-0 w-full" data-name="Background+Shadow">
      <div className="content-stretch flex flex-col gap-[15.995px] items-start pb-[48px] pt-[16px] px-[16px] relative w-full">
        <Background2 />
        <Container25 />
      </div>
    </div>
  );
}

function RoomCard1() {
  return (
    <div className="content-stretch flex flex-col items-start relative w-full" data-name="Room Card 2">
      <div className="absolute bg-[rgba(198,40,40,0.3)] inset-[16px_-16px_-15.99px_15.99px]" data-name="Overlay" />
      <BackgroundShadow1 />
    </div>
  );
}

function PrivateRoom() {
  return (
    <div className="h-[244.499px] relative shrink-0 w-full" data-name="Private room">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 overflow-hidden">
          <img alt="" className="absolute h-[133.33%] left-0 max-w-none top-[-16.67%] w-full" src={imgPrivateRoom} />
        </div>
        <div className="absolute bg-white inset-0 mix-blend-saturation" />
      </div>
    </div>
  );
}

function Background3() {
  return (
    <div className="bg-[#334155] content-stretch flex flex-col items-start justify-center overflow-clip relative shrink-0 w-full" data-name="Background">
      <PrivateRoom />
      <div className="absolute inset-[8px]" data-name="Border">
        <div aria-hidden="true" className="absolute border-8 border-[rgba(198,40,40,0.4)] border-solid inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

function Heading3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#c62828] text-[20px] tracking-[-1px] uppercase w-full">
        <p className="leading-[28px]">Standard Private</p>
      </div>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32.001px] leading-[0] relative shrink-0 text-[#f1f5f9] w-full" data-name="Paragraph">
      <div className="-translate-y-1/2 absolute flex flex-col h-[32px] justify-center left-0 text-[24px] top-[15.5px] w-[42.252px]">
        <p className="leading-[32px]">$75</p>
      </div>
      <div className="-translate-y-1/2 absolute flex flex-col h-[16px] justify-center left-[42.25px] opacity-60 text-[12px] top-[20px] uppercase w-[38.751px]">
        <p className="leading-[16px]">/night</p>
      </div>
    </div>
  );
}

function Container34() {
  return (
    <div className="content-stretch flex flex-col items-start opacity-70 relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[126.645px]">
        <p className="leading-[16px]">2 People • Queen Bed</p>
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[126.645px]" data-name="Container">
      <Paragraph2 />
      <Container34 />
    </div>
  );
}

function Container36() {
  return (
    <div className="content-stretch flex flex-col items-end relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#22c55e] text-[12px] text-right uppercase w-[59.942px]">
        <p className="leading-[16px]">Available</p>
      </div>
    </div>
  );
}

function Container35() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <Container36 />
    </div>
  );
}

function Container32() {
  return (
    <div className="content-stretch flex items-end justify-between relative shrink-0 w-full" data-name="Container">
      <Container33 />
      <Container35 />
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Heading3 />
      <Container32 />
    </div>
  );
}

function RoomCard2() {
  return (
    <div className="bg-[#1e293b] relative shadow-[8px_8px_0px_0px_rgba(198,40,40,0.3)] w-full" data-name="Room Card 3">
      <div className="content-stretch flex flex-col gap-[16.001px] items-start pb-[48px] pt-[16px] px-[16px] relative w-full">
        <Background3 />
        <Container31 />
      </div>
    </div>
  );
}

function DeluxeEnsuiteRoom() {
  return (
    <div className="h-[244.497px] relative shrink-0 w-full" data-name="Deluxe ensuite room">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 overflow-hidden">
          <img alt="" className="absolute h-[133.33%] left-0 max-w-none top-[-16.67%] w-full" src={imgDeluxeEnsuiteRoom} />
        </div>
        <div className="absolute bg-white inset-0 mix-blend-saturation" />
      </div>
    </div>
  );
}

function Background5() {
  return (
    <div className="absolute bg-[#c62828] bottom-0 content-stretch flex flex-col items-start p-[8px] right-0" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[12px] text-white w-[56.169px]">
        <p className="leading-[16px]">SOLD OUT</p>
      </div>
    </div>
  );
}

function Background4() {
  return (
    <div className="bg-[#334155] content-stretch flex flex-col items-start justify-center overflow-clip relative shrink-0 w-full" data-name="Background">
      <DeluxeEnsuiteRoom />
      <Background5 />
    </div>
  );
}

function Heading4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#c62828] text-[20px] tracking-[-1px] uppercase w-full">
        <p className="leading-[28px]">Deluxe Ensuite</p>
      </div>
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="font-['Space_Grotesk:Bold',sans-serif] font-bold h-[31.995px] leading-[0] relative shrink-0 text-[#f1f5f9] w-full" data-name="Paragraph">
      <div className="-translate-y-1/2 absolute flex flex-col h-[32px] justify-center left-0 text-[24px] top-[15.5px] w-[51.798px]">
        <p className="leading-[32px]">$110</p>
      </div>
      <div className="-translate-y-1/2 absolute flex flex-col h-[16px] justify-center left-[51.8px] opacity-60 text-[12px] top-[20px] uppercase w-[38.746px]">
        <p className="leading-[16px]">/night</p>
      </div>
    </div>
  );
}

function Container40() {
  return (
    <div className="content-stretch flex flex-col items-start opacity-70 relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[141.261px]">
        <p className="leading-[16px]">2 People • Private Bath</p>
      </div>
    </div>
  );
}

function Container39() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[141.261px]" data-name="Container">
      <Paragraph3 />
      <Container40 />
    </div>
  );
}

function Container38() {
  return (
    <div className="content-stretch flex items-end relative shrink-0 w-full" data-name="Container">
      <Container39 />
    </div>
  );
}

function Container37() {
  return (
    <div className="content-stretch flex flex-col gap-[8.001px] items-start opacity-50 relative shrink-0 w-full" data-name="Container">
      <Heading4 />
      <Container38 />
    </div>
  );
}

function RoomCard3() {
  return (
    <div className="bg-[#1e293b] relative shadow-[8px_8px_0px_0px_rgba(198,40,40,0.3)] w-full" data-name="Room Card 4">
      <div className="content-stretch flex flex-col gap-[16.002px] items-start pb-[48px] pt-[16px] px-[16px] relative w-full">
        <Background4 />
        <Container37 />
      </div>
    </div>
  );
}

function SinglePrivateRoom() {
  return (
    <div className="h-[244.504px] relative shrink-0 w-full" data-name="Single private room">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 overflow-hidden">
          <img alt="" className="absolute h-[133.33%] left-0 max-w-none top-[-16.67%] w-full" src={imgSinglePrivateRoom} />
        </div>
        <div className="absolute bg-white inset-0 mix-blend-saturation" />
      </div>
    </div>
  );
}

function Background6() {
  return (
    <div className="bg-[#334155] content-stretch flex flex-col items-start justify-center overflow-clip relative shrink-0 w-full" data-name="Background">
      <SinglePrivateRoom />
    </div>
  );
}

function Heading5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#c62828] text-[20px] tracking-[-1px] uppercase w-full">
        <p className="leading-[28px]">Solo Pod</p>
      </div>
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32.001px] leading-[0] relative shrink-0 text-[#f1f5f9] w-full" data-name="Paragraph">
      <div className="-translate-y-1/2 absolute flex flex-col h-[32px] justify-center left-0 text-[24px] top-[15.5px] w-[44.225px]">
        <p className="leading-[32px]">$45</p>
      </div>
      <div className="-translate-y-1/2 absolute flex flex-col h-[16px] justify-center left-[44.22px] opacity-60 text-[12px] top-[20px] uppercase w-[38.753px]">
        <p className="leading-[16px]">/night</p>
      </div>
    </div>
  );
}

function Container44() {
  return (
    <div className="content-stretch flex flex-col items-start opacity-70 relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[118.811px]">
        <p className="leading-[16px]">1 Person • Compact</p>
      </div>
    </div>
  );
}

function Container43() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[118.811px]" data-name="Container">
      <Paragraph4 />
      <Container44 />
    </div>
  );
}

function Container46() {
  return (
    <div className="content-stretch flex flex-col items-end relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] text-right uppercase w-[35.092px]">
        <p className="leading-[16px]">1 left</p>
      </div>
    </div>
  );
}

function Container45() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <Container46 />
    </div>
  );
}

function Container42() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-end size-full">
        <div className="content-stretch flex items-end justify-between pr-[0.002px] relative w-full">
          <Container43 />
          <Container45 />
        </div>
      </div>
    </div>
  );
}

function Container41() {
  return (
    <div className="content-stretch flex flex-col gap-[8.003px] items-start relative shrink-0 w-full" data-name="Container">
      <Heading5 />
      <Container42 />
    </div>
  );
}

function BackgroundShadow2() {
  return (
    <div className="bg-[#1e293b] relative shadow-[8px_8px_0px_0px_rgba(198,40,40,0.3)] shrink-0 w-full" data-name="Background+Shadow">
      <div className="content-stretch flex flex-col gap-[15.995px] items-start pb-[48px] pt-[16px] px-[16px] relative w-full">
        <Background6 />
        <Container41 />
      </div>
    </div>
  );
}

function RoomCard4() {
  return (
    <div className="content-stretch flex flex-col items-start relative w-full" data-name="Room Card 5">
      <div className="absolute flex inset-[-8.53px_-21.14px_-8.52px_-21.13px] items-center justify-center">
        <div className="-skew-x-3 flex-none h-[409.059px] rotate-3 w-[358.004px]">
          <div className="bg-[#c62828] opacity-5 size-full" data-name="Background" />
        </div>
      </div>
      <BackgroundShadow2 />
    </div>
  );
}

function Container18() {
  return (
    <div className="gap-x-[48px] gap-y-[48px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[_____408.50px_408.50px_408.50px_408.50px_408.50px] relative shrink-0 w-full" data-name="Container">
      <div className="col-1 flex h-[414.682px] items-center justify-center justify-self-stretch relative row-1 self-start shrink-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "147" } as React.CSSProperties}>
        <div className="-rotate-1 flex-none w-full">
          <RoomCard />
        </div>
      </div>
      <div className="col-1 flex h-[417.734px] items-center justify-center justify-self-stretch relative row-2 self-start shrink-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "126" } as React.CSSProperties}>
        <div className="flex-none rotate-[1.5deg] w-full">
          <RoomCard1 />
        </div>
      </div>
      <div className="col-1 flex h-[411.61px] items-center justify-center justify-self-stretch relative row-3 self-start shrink-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "126" } as React.CSSProperties}>
        <div className="flex-none rotate-[-0.5deg] w-full">
          <RoomCard2 />
        </div>
      </div>
      <div className="col-1 flex h-[414.682px] items-center justify-center justify-self-stretch relative row-4 self-start shrink-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "126" } as React.CSSProperties}>
        <div className="-rotate-1 flex-none w-full">
          <RoomCard3 />
        </div>
      </div>
      <div className="col-1 flex h-[417.734px] items-center justify-center justify-self-stretch relative row-5 self-start shrink-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "126" } as React.CSSProperties}>
        <div className="flex-none rotate-[1.5deg] w-full">
          <RoomCard4 />
        </div>
      </div>
    </div>
  );
}

function Main() {
  return (
    <div className="max-w-[1024px] relative shrink-0 w-full z-[1]" data-name="Main">
      <div className="content-stretch flex flex-col gap-[48px] items-start max-w-[inherit] pb-[128px] pt-[16px] px-[16px] relative w-full">
        <Container14 />
        <Container18 />
      </div>
    </div>
  );
}

export default function VhdsgnRoomSelectionVibrant() {
  return (
    <div className="bg-[#230f14] content-stretch flex flex-col isolate items-start pb-[7.5px] relative size-full" data-name="vhdsgn - Room Selection (Vibrant)">
      <Container />
      <Header />
      <Nav />
      <Main />
    </div>
  );
}