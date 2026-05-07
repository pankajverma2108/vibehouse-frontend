import svgPaths from "./svg-56g4hkyy5t";
import imgImage from "figma:asset/321509ee187d1ebc7785fcdfaf8a49ca748900bf.png";
import imgImageBorder from "figma:asset/065c28aacdba4f8e4927efcf5c064cff23fc4475.png";
import imgImageBorder1 from "figma:asset/778e06f2da13c1fa77dac7b324c3a649609a57b2.png";
import imgImageBorder2 from "figma:asset/7606851c382d9f781b149120559d6120a71e4345.png";
import imgImage1 from "figma:asset/d86672fa40b4ad598cc763bea75c0cbee55930a4.png";
import imgImage2 from "figma:asset/0490efee02cd88db6e4822d6f9a0fc4d778267c5.png";
import imgImage3 from "figma:asset/bec8814c112c812b22caf3a423dce1d2c8e27835.png";
import imgBackgroundBorder from "figma:asset/7a8ae845b71237f567c61b690a22fc2f3ae9945c.png";
import imgBackgroundBorder1 from "figma:asset/7fd6c0a2af0945845bbf9be57e8d3139df3fe2d3.png";
import imgBackgroundBorder2 from "figma:asset/4edb4892e87306272850545d176b5e48bd22a705.png";
import imgBackgroundBorder3 from "figma:asset/f8fc420cb7c05705be4bca12ab2ef4da45303ffc.png";
import imgBackgroundBorder4 from "figma:asset/72e56540b35bbd6becda81d3a35d6b44c2f5513b.png";
import imgBackgroundBorder5 from "figma:asset/50c993a15534441fd40873d06f714dc3b3203bfd.png";

function Container() {
  return (
    <div className="absolute bottom-[43.78%] content-stretch flex flex-col items-start opacity-20 right-[40px] top-1/4" data-name="Container">
      <div className="h-[101.333px] relative shrink-0 w-[85.333px]" data-name="Icon">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 85.3333 101.333">
          <path d={svgPaths.pac8e080} fill="var(--fill-0, #c62828)" id="Icon" />
        </svg>
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-center px-[12px] py-[4px] relative" data-name="Background">
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[12px] text-center text-white tracking-[1.2px] uppercase w-[143.267px]">
        <p className="leading-[16px]">Street Art Inspired</p>
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-center max-w-[896px] px-[61.16px] relative shrink-0" data-name="Heading 1">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[102px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[60px] text-center tracking-[-3px] uppercase w-[235.68px]">
        <p className="mb-0">
          <span className="leading-[51px]">{`STAY `}</span>
          <span className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[51px] text-[#c62828]">MIX</span>
        </p>
        <p className="leading-[51px]">REPEAT</p>
      </div>
    </div>
  );
}

function Heading1Margin() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 max-w-[896px] pb-[32px] top-[48px]" data-name="Heading 1:margin">
      <Heading />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-center justify-center px-[40px] py-[16px] relative rounded-[2px] shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] shrink-0" data-name="Button">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[18px] text-center text-white uppercase w-[144.19px]">
        <p className="leading-[28px]">Book Your Stay</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[24px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[16px] text-center uppercase w-[152.75px]">
        <p className="leading-[24px]">Check Availability</p>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="h-[9px] relative shrink-0 w-[19px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 9">
        <g id="Container">
          <path d={svgPaths.p19756be0} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Container4 />
      <Container5 />
    </div>
  );
}

function Container2() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex flex-col gap-[16px] items-center left-[calc(50%+0.01px)] top-[182px]" data-name="Container">
      <Button />
      <Container3 />
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[282px] relative shrink-0 w-full" data-name="Container">
      <div className="absolute bg-[rgba(198,40,40,0.2)] blur-[12px] bottom-[-16px] h-[48px] left-1/4 mix-blend-screen right-[48.18%] rounded-[12px]" data-name="Overlay+Blur" />
      <div className="-translate-x-1/2 absolute flex h-[29.823px] items-center justify-center left-[calc(50%-0.01px)] top-[-2.91px] w-[168.003px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="-rotate-2 flex-none">
          <Background />
        </div>
      </div>
      <Heading1Margin />
      <Container2 />
    </div>
  );
}

function Container6() {
  return (
    <div className="absolute h-[19px] left-[8px] top-[391px] w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 19">
        <g id="Container">
          <path d={svgPaths.p3e30af00} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function HeaderHeroSection() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 overflow-clip pb-[80px] pt-[48px] px-[16px] right-0 top-[81px]" data-name="Header - Hero Section">
      <div className="absolute bg-[rgba(198,40,40,0.2)] blur-[32px] right-[-40px] rounded-[12px] size-[160px] top-[-40px]" data-name="Overlay+Blur" />
      <div className="absolute bg-gradient-to-t bottom-0 from-[#230f14] h-[128px] left-0 right-0 to-[rgba(35,15,20,0)]" data-name="Gradient" />
      <Container />
      <Container1 />
      <Container6 />
    </div>
  );
}

function TonightAtDailySocialSectionPaints() {
  return <div className="absolute bg-[#1a0a0e] inset-0" data-name="Tonight at The Daily Social Section paints" />;
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 2">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[36px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[30px] tracking-[-1.5px] uppercase w-[303.78px]">
        <p className="leading-[36px]">Tonight at The Daily Social</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[14px] uppercase w-[159.8px]">
        <p className="leading-[20px]">{`Don't miss the energy`}</p>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-[303.78px]" data-name="Container">
      <Heading1 />
      <Container9 />
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex items-end relative shrink-0 w-full" data-name="Container">
      <Container8 />
    </div>
  );
}

function Background1() {
  return (
    <div className="bg-[#c62828] content-stretch flex items-start px-[8px] py-[2px] relative rounded-[12px] shrink-0" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-white uppercase w-[55.11px]">
        <p className="leading-[15px]">Live DJ Set</p>
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[30px] relative shrink-0 text-[24px] text-white uppercase w-full">
        <p className="mb-0">Midnight Pulse: Urban</p>
        <p>Art Showcase</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)] w-[107.05px]">
        <p className="leading-[20px]">Starts 10:00 PM</p>
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative rounded-[2px] shrink-0" data-name="Button">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[14px] text-center text-white uppercase w-[81.98px]">
        <p className="leading-[20px]">Get Tickets</p>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex items-center justify-between pt-[8px] relative shrink-0 w-full" data-name="Container">
      <Container13 />
      <Button1 />
    </div>
  );
}

function Container11() {
  return (
    <div className="absolute bottom-[2px] left-[2px] right-[2px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-start p-[24px] relative w-full">
        <Background1 />
        <Heading2 />
        <Container12 />
      </div>
    </div>
  );
}

function BackgroundBorderShadow() {
  return (
    <div className="bg-[#0f172a] col-1 justify-self-stretch relative rounded-[8px] row-1 self-start shrink-0" data-name="Background+Border+Shadow">
      <div className="content-stretch flex flex-col items-start overflow-clip p-[2px] relative rounded-[inherit] w-full">
        <div className="aspect-[4/5] relative shrink-0 w-full" data-name="Image">
          <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-full left-[-12.5%] max-w-none top-0 w-[125%]" src={imgImage} />
          </div>
        </div>
        <div className="absolute bg-gradient-to-t from-[#0f172a] inset-[2px] opacity-80 to-[rgba(15,23,42,0)] via-1/2 via-[rgba(15,23,42,0)]" data-name="Gradient" />
        <Container11 />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[8px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container14() {
  return (
    <div className="relative shrink-0 size-[55px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 55 55">
        <g id="Container">
          <path d={svgPaths.p34cb7300} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin() {
  return (
    <div className="relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[16px] relative">
        <Container14 />
      </div>
    </div>
  );
}

function Heading3() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[24px] text-center uppercase w-[166.72px]">
        <p className="leading-[32px]">Guest Energy</p>
      </div>
    </div>
  );
}

function Heading3Margin() {
  return (
    <div className="relative shrink-0" data-name="Heading 3:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[8px] relative">
        <Heading3 />
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex flex-col items-center pl-[2.64px] pr-[2.66px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[72px] justify-center leading-[24px] relative shrink-0 text-[#94a3b8] text-[16px] text-center w-[284.7px]">
        <p className="mb-0">Capture the vibe and tag us</p>
        <p className="mb-0">@vhdsgn to be featured on our main</p>
        <p>hall wall.</p>
      </div>
    </div>
  );
}

function Margin1() {
  return (
    <div className="relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[24px] relative">
        <Container15 />
      </div>
    </div>
  );
}

function Margin2() {
  return (
    <div className="content-stretch flex flex-col items-start mr-[-12px] relative shrink-0 size-[40px]" data-name="Margin">
      <div className="bg-size-[36px_36px] bg-top-left relative rounded-[12px] shrink-0 size-[40px]" data-name="Image+Border" style={{ backgroundImage: `url('${imgImageBorder1}')` }}>
        <div aria-hidden="true" className="absolute border-2 border-solid border-white inset-0 pointer-events-none rounded-[12px]" />
      </div>
    </div>
  );
}

function Margin3() {
  return (
    <div className="content-stretch flex flex-col items-start mr-[-12px] relative shrink-0 size-[40px]" data-name="Margin">
      <div className="bg-size-[36px_36px] bg-top-left relative rounded-[12px] shrink-0 size-[40px]" data-name="Image+Border" style={{ backgroundImage: `url('${imgImageBorder2}')` }}>
        <div aria-hidden="true" className="absolute border-2 border-solid border-white inset-0 pointer-events-none rounded-[12px]" />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#e2e8f0] content-stretch flex items-center justify-center p-[2px] relative rounded-[12px] shrink-0 size-[40px]" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border-2 border-solid border-white inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] text-center w-[20px]">
        <p className="leading-[16px]">+12</p>
      </div>
    </div>
  );
}

function Margin4() {
  return (
    <div className="content-stretch flex flex-col items-start mr-[-12px] relative shrink-0 size-[40px]" data-name="Margin">
      <BackgroundBorder />
    </div>
  );
}

function Container16() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start pr-[12px] relative">
        <div className="bg-size-[36px_36px] bg-top-left mr-[-12px] relative rounded-[12px] shrink-0 size-[40px]" data-name="Image+Border" style={{ backgroundImage: `url('${imgImageBorder}')` }}>
          <div aria-hidden="true" className="absolute border-2 border-solid border-white inset-0 pointer-events-none rounded-[12px]" />
        </div>
        <Margin2 />
        <Margin3 />
        <Margin4 />
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="absolute bottom-[-534.5px] h-[19px] right-[-32px] w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 19">
        <g id="Container">
          <path d={svgPaths.p3e30af00} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function FeatureCard() {
  return (
    <div className="bg-[rgba(198,40,40,0.1)] col-1 justify-self-stretch relative rounded-[8px] row-2 self-start shrink-0" data-name="Feature Card 1">
      <div aria-hidden="true" className="absolute border-2 border-[#c62828] border-dashed inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col items-center justify-center p-[34px] relative w-full">
          <Margin />
          <Heading3Margin />
          <Margin1 />
          <Container16 />
          <Container17 />
        </div>
      </div>
    </div>
  );
}

function Background2() {
  return (
    <div className="bg-[#c62828] content-stretch flex items-start px-[8px] py-[2px] relative rounded-[12px] shrink-0" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-white uppercase w-[59.03px]">
        <p className="leading-[15px]">Community</p>
      </div>
    </div>
  );
}

function Heading4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[30px] relative shrink-0 text-[24px] text-white uppercase w-full">
        <p className="mb-0">Late Night Mixer:</p>
        <p>Creators Hub</p>
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)] w-[69.28px]">
        <p className="leading-[20px]">Free Entry</p>
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-white content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative rounded-[2px] shrink-0" data-name="Button">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[14px] text-center uppercase w-[34.31px]">
        <p className="leading-[20px]">RSVP</p>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex items-center justify-between pt-[8px] relative shrink-0 w-full" data-name="Container">
      <Container20 />
      <Button2 />
    </div>
  );
}

function Container18() {
  return (
    <div className="absolute bottom-[2px] left-[2px] right-[2px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-start p-[24px] relative w-full">
        <Background2 />
        <Heading4 />
        <Container19 />
      </div>
    </div>
  );
}

function BackgroundBorderShadow1() {
  return (
    <div className="bg-[#0f172a] col-1 justify-self-stretch relative rounded-[8px] row-3 self-start shrink-0" data-name="Background+Border+Shadow">
      <div className="content-stretch flex flex-col items-start overflow-clip p-[2px] relative rounded-[inherit] w-full">
        <div className="aspect-[4/5] relative shrink-0 w-full" data-name="Image">
          <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-full left-[-12.5%] max-w-none top-0 w-[125%]" src={imgImage1} />
          </div>
        </div>
        <div className="absolute bg-gradient-to-t from-[#0f172a] inset-[2px] opacity-80 to-[rgba(15,23,42,0)] via-1/2 via-[rgba(15,23,42,0)]" data-name="Gradient" />
        <Container18 />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[8px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container10() {
  return (
    <div className="gap-x-[24px] gap-y-[24px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[___446.50px_320px_446.50px] relative shrink-0 w-full" data-name="Container">
      <BackgroundBorderShadow />
      <FeatureCard />
      <BackgroundBorderShadow1 />
      <div className="-translate-x-1/2 absolute flex h-[25.113px] items-center justify-center left-1/2 top-[-152.56px] w-[64.409px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="flex-none rotate-1">
          <div className="backdrop-blur-[2px] bg-[rgba(255,255,255,0.1)] h-[24px] relative w-[64px]" data-name="Event Card">
            <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.2)] border-solid inset-0 pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="-translate-x-1/2 absolute flex h-[25.113px] items-center justify-center left-1/2 top-[-152.56px] w-[64.409px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="flex-none rotate-1">
          <div className="backdrop-blur-[2px] bg-[rgba(255,255,255,0.1)] h-[24px] relative w-[64px]" data-name="Event Card 2">
            <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.2)] border-solid inset-0 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TonightAtDailySocialSection() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[32px] items-start left-0 px-[16px] py-[48px] right-0 top-[491px]" data-name="Tonight at The Daily Social Section">
      <div className="absolute flex inset-[-3.4px_0_-3.41px_0] items-center justify-center">
        <div className="flex-none h-[1449px] rotate-1 skew-x-1 w-[390.06px]">
          <div className="relative size-full" data-name="Border">
            <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.2)] border-b-4 border-solid border-t-4 inset-0 pointer-events-none" />
          </div>
        </div>
      </div>
      <TonightAtDailySocialSectionPaints />
      <Container7 />
      <Container10 />
    </div>
  );
}

function Container21() {
  return (
    <div className="h-[14px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 14">
        <g id="Container">
          <path d={svgPaths.p18e761b0} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Heading5() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Heading 2">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[36px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[30px] tracking-[-1.5px] uppercase w-[159.67px]">
        <p className="leading-[36px]">Our Spaces</p>
      </div>
      <Container21 />
      <div className="absolute bottom-[-8.62px] flex h-[10.233px] items-center justify-center left-[-0.06px] w-[128.12px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="-rotate-1 flex-none">
          <div className="bg-[rgba(198,40,40,0.3)] h-[8px] w-[128px]" data-name="Overlay" />
        </div>
      </div>
    </div>
  );
}

function RoomCard1Paints() {
  return (
    <div className="absolute bg-[#0f172a] inset-0 rounded-[8px]" data-name="Room Card 1 paints">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Container23() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center overflow-clip relative rounded-[inherit] w-full">
        <div className="h-[199.13px] relative shrink-0 w-full" data-name="Image">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[177.77%] left-0 max-w-none top-[-38.89%] w-full" src={imgImage2} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] tracking-[2.4px] uppercase w-full">
        <p className="leading-[16px]">Signature Room</p>
      </div>
    </div>
  );
}

function Margin5() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[8px] relative shrink-0 w-full" data-name="Margin">
      <Container25 />
    </div>
  );
}

function Heading6() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[30px] uppercase w-full">
        <p className="leading-[36px]">The Neon Loft</p>
      </div>
    </div>
  );
}

function Heading3Margin1() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[16px] relative shrink-0 w-full" data-name="Heading 3:margin">
      <Heading6 />
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex flex-col items-start max-w-[448px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal justify-center leading-[24px] relative shrink-0 text-[#94a3b8] text-[16px] w-full">
        <p className="mb-0">Industrial aesthetics meets high-end</p>
        <p className="mb-0">comfort. Featuring a custom mural</p>
        <p className="mb-0">by local artists and a private sound</p>
        <p>system for your late-night mixes.</p>
      </div>
    </div>
  );
}

function Margin6() {
  return (
    <div className="content-stretch flex flex-col items-start max-w-[448px] pb-[32px] relative shrink-0 w-full" data-name="Margin">
      <Container26 />
    </div>
  );
}

function Background3() {
  return (
    <div className="bg-[#1e293b] relative rounded-[12px] self-stretch shrink-0" data-name="Background">
      <div className="content-stretch flex flex-col h-full items-start px-[12px] py-[4px] relative">
        <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[52.11px]">
          <p className="leading-[16px]">King Bed</p>
        </div>
      </div>
    </div>
  );
}

function Background4() {
  return (
    <div className="bg-[#1e293b] relative rounded-[12px] self-stretch shrink-0" data-name="Background">
      <div className="content-stretch flex flex-col h-full items-start px-[12px] py-[4px] relative">
        <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[63.22px]">
          <p className="leading-[16px]">Hi-Fi Audio</p>
        </div>
      </div>
    </div>
  );
}

function Background5() {
  return (
    <div className="bg-[#1e293b] relative rounded-[12px] self-stretch shrink-0" data-name="Background">
      <div className="content-stretch flex flex-col h-full items-start px-[12px] py-[4px] relative">
        <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[52.95px]">
          <p className="leading-[16px]">Balcony</p>
        </div>
      </div>
    </div>
  );
}

function Container27() {
  return (
    <div className="content-stretch flex gap-[12px] h-[24px] items-start relative shrink-0 w-full" data-name="Container">
      <Background3 />
      <Background4 />
      <Background5 />
    </div>
  );
}

function Margin7() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[32px] relative shrink-0 w-full" data-name="Margin">
      <Container27 />
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-center justify-center px-[32px] py-[12px] relative rounded-[2px] shadow-[4px_4px_0px_0px_#1a0a0e] shrink-0" data-name="Button">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[24px] justify-center leading-[0] relative shrink-0 text-[16px] text-center text-white uppercase w-[82.16px]">
        <p className="leading-[24px]">Book Now</p>
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[32px] leading-[0] relative shrink-0 w-[100.25px]" data-name="Paragraph">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32px] justify-center left-0 text-[#f1f5f9] text-[24px] top-[15.5px] w-[59.23px]">
        <p className="leading-[32px]">$240</p>
      </div>
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[20px] justify-center left-[59.23px] text-[#64748b] text-[14px] top-[19px] w-[41.02px]">
        <p className="leading-[20px]">/night</p>
      </div>
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex gap-[24px] items-center relative shrink-0 w-full" data-name="Container">
      <Button3 />
      <Paragraph />
    </div>
  );
}

function Container24() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center p-[32px] relative w-full">
          <Margin5 />
          <Heading3Margin1 />
          <Margin6 />
          <Margin7 />
          <Container28 />
        </div>
      </div>
    </div>
  );
}

function RoomCard() {
  return (
    <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[8px] shrink-0 w-full" data-name="Room Card 1">
      <div className="absolute inset-[10px_-6px_-6px_10px]" data-name="Border">
        <div aria-hidden="true" className="absolute border-2 border-[rgba(198,40,40,0.1)] border-solid inset-0 pointer-events-none" />
      </div>
      <RoomCard1Paints />
      <Container23 />
      <Container24 />
    </div>
  );
}

function Container29() {
  return (
    <div className="mb-[-0.01px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center overflow-clip relative rounded-[inherit] w-full">
        <div className="h-[199.13px] relative shrink-0 w-full" data-name="Image">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[177.77%] left-0 max-w-none top-[-38.89%] w-full" src={imgImage3} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] tracking-[2.4px] uppercase w-full">
        <p className="leading-[16px]">Shared Experience</p>
      </div>
    </div>
  );
}

function Margin8() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[8px] relative shrink-0 w-full" data-name="Margin">
      <Container31 />
    </div>
  );
}

function Heading7() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[30px] uppercase w-full">
        <p className="leading-[36px]">The Mix Bunker</p>
      </div>
    </div>
  );
}

function Heading3Margin2() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[16px] relative shrink-0 w-full" data-name="Heading 3:margin">
      <Heading7 />
    </div>
  );
}

function Container32() {
  return (
    <div className="content-stretch flex flex-col items-start max-w-[448px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal justify-center leading-[24px] relative shrink-0 text-[#94a3b8] text-[16px] w-full">
        <p className="mb-0">Designed for groups and solo</p>
        <p className="mb-0">travelers who live for the community.</p>
        <p className="mb-0">Minimalist design with maximum</p>
        <p>personality.</p>
      </div>
    </div>
  );
}

function Margin9() {
  return (
    <div className="content-stretch flex flex-col items-start max-w-[448px] pb-[32px] relative shrink-0 w-full" data-name="Margin">
      <Container32 />
    </div>
  );
}

function Background6() {
  return (
    <div className="absolute bg-[#1e293b] bottom-[36px] content-stretch flex flex-col items-start left-0 px-[12px] py-[4px] rounded-[12px] top-0" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[49.27px]">
        <p className="leading-[16px]">4 Bunks</p>
      </div>
    </div>
  );
}

function Background7() {
  return (
    <div className="absolute bg-[#1e293b] bottom-[36px] content-stretch flex flex-col items-start left-[85.27px] px-[12px] py-[4px] rounded-[12px] top-0" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[98.61px]">
        <p className="leading-[16px]">Secure Storage</p>
      </div>
    </div>
  );
}

function Background8() {
  return (
    <div className="absolute bg-[#1e293b] bottom-0 content-stretch flex flex-col items-start left-0 px-[12px] py-[4px] rounded-[12px] top-[36px]" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[12px] uppercase w-[77.61px]">
        <p className="leading-[16px]">Gaming Zone</p>
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="h-[60px] relative shrink-0 w-full" data-name="Container">
      <Background6 />
      <Background7 />
      <Background8 />
    </div>
  );
}

function Margin10() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[32px] relative shrink-0 w-full" data-name="Margin">
      <Container33 />
    </div>
  );
}

function Button4() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-center justify-center px-[32px] py-[12px] relative rounded-[2px] shadow-[4px_4px_0px_0px_#1a0a0e] shrink-0" data-name="Button">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[24px] justify-center leading-[0] relative shrink-0 text-[16px] text-center text-white uppercase w-[82.16px]">
        <p className="leading-[24px]">Book Now</p>
      </div>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="h-[32px] leading-[0] relative shrink-0 w-[84.8px]" data-name="Paragraph">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[32px] justify-center left-0 text-[#f1f5f9] text-[24px] top-[15.5px] w-[43.78px]">
        <p className="leading-[32px]">$65</p>
      </div>
      <div className="-translate-y-1/2 absolute flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[20px] justify-center left-[43.78px] text-[#64748b] text-[14px] top-[19px] w-[41.02px]">
        <p className="leading-[20px]">/night</p>
      </div>
    </div>
  );
}

function Container34() {
  return (
    <div className="content-stretch flex gap-[24px] items-center relative shrink-0 w-full" data-name="Container">
      <Button4 />
      <Paragraph1 />
    </div>
  );
}

function Container30() {
  return (
    <div className="mb-[-0.01px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center p-[32px] relative w-full">
          <Margin8 />
          <Heading3Margin2 />
          <Margin9 />
          <Margin10 />
          <Container34 />
        </div>
      </div>
    </div>
  );
}

function RoomCard1() {
  return (
    <div className="bg-[#0f172a] relative rounded-[8px] shrink-0 w-full" data-name="Room Card 2">
      <div className="content-stretch flex flex-col items-start overflow-clip pb-[2.01px] pt-[2px] px-[2px] relative rounded-[inherit] w-full">
        <Container29 />
        <Container30 />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-full" data-name="Container">
      <RoomCard />
      <RoomCard1 />
    </div>
  );
}

function OurSpacesSection() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[32px] items-start left-0 px-[16px] py-[64px] right-0 top-[1940px]" data-name="Our Spaces Section">
      <Heading5 />
      <Container22 />
    </div>
  );
}

function Heading8() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Heading 2">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[40px] justify-center leading-[0] relative shrink-0 text-[36px] text-center text-white tracking-[-1.8px] uppercase w-[187.72px]">
        <p className="leading-[40px]">The Energy</p>
      </div>
    </div>
  );
}

function Container36() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[24px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[16px] text-center uppercase w-[265.13px]">
        <p className="leading-[24px]">Captured by you, curated by us</p>
      </div>
    </div>
  );
}

function Container35() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex flex-col gap-[8px] items-start px-[16px] relative w-full">
        <Heading8 />
        <Container36 />
      </div>
    </div>
  );
}

function BackgroundBorder1() {
  return (
    <div className="bg-size-[163px_163px] bg-top-left col-1 justify-self-stretch relative rounded-[8px] row-1 self-stretch shrink-0" data-name="Background+Border" style={{ backgroundImage: `url('${imgBackgroundBorder}')` }}>
      <div aria-hidden="true" className="absolute border-4 border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[8px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" data-name="Overlay+Shadow" />
    </div>
  );
}

function BackgroundBorder2() {
  return (
    <div className="bg-size-[163px_163px] bg-top-left relative rounded-[8px] size-full" data-name="Background+Border" style={{ backgroundImage: `url('${imgBackgroundBorder1}')` }}>
      <div aria-hidden="true" className="absolute border-4 border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[8px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" data-name="Overlay+Shadow" />
    </div>
  );
}

function Container38() {
  return (
    <div className="col-2 gap-x-[16px] gap-y-[16px] grid grid-cols-[_171px] grid-rows-[repeat(2,minmax(0,1fr))] justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Container">
      <BackgroundBorder1 />
      <div className="col-1 flex items-center justify-center justify-self-stretch relative row-2 self-stretch shrink-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="flex-none rotate-3 size-full">
          <BackgroundBorder2 />
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder3() {
  return (
    <div className="bg-size-[284px_284px] bg-top-left col-1 justify-self-stretch relative rounded-[8px] row-2 self-stretch shrink-0" data-name="Background+Border" style={{ backgroundImage: `url('${imgBackgroundBorder2}')` }}>
      <div aria-hidden="true" className="absolute border-4 border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[8px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" data-name="Overlay+Shadow" />
    </div>
  );
}

function BackgroundBorder4() {
  return (
    <div className="bg-size-[163px_163px] bg-top-left relative rounded-[8px] size-full" data-name="Background+Border" style={{ backgroundImage: `url('${imgBackgroundBorder3}')` }}>
      <div aria-hidden="true" className="absolute border-4 border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[8px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" data-name="Overlay+Shadow" />
    </div>
  );
}

function BackgroundBorder5() {
  return (
    <div className="bg-size-[163px_163px] bg-top-left col-1 justify-self-stretch relative rounded-[8px] row-2 self-stretch shrink-0" data-name="Background+Border" style={{ backgroundImage: `url('${imgBackgroundBorder4}')` }}>
      <div aria-hidden="true" className="absolute border-4 border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[8px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" data-name="Overlay+Shadow" />
    </div>
  );
}

function Container39() {
  return (
    <div className="col-2 gap-x-[16px] gap-y-[16px] grid grid-cols-[_171px] grid-rows-[repeat(2,minmax(0,1fr))] justify-self-stretch relative row-2 self-stretch shrink-0" data-name="Container">
      <div className="col-1 flex items-center justify-center justify-self-stretch relative row-1 self-stretch shrink-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "0" } as React.CSSProperties}>
        <div className="-rotate-2 flex-none size-full">
          <BackgroundBorder4 />
        </div>
      </div>
      <BackgroundBorder5 />
    </div>
  );
}

function BackgroundBorder6() {
  return (
    <div className="bg-size-[284px_284px] bg-top-left relative rounded-[8px] size-full" data-name="Background+Border" style={{ backgroundImage: `url('${imgBackgroundBorder5}')` }}>
      <div aria-hidden="true" className="absolute border-4 border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[8px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" data-name="Overlay+Shadow" />
    </div>
  );
}

function Container37() {
  return (
    <div className="h-[600px] relative shrink-0 w-full" data-name="Container">
      <div className="gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[__292px_292px] px-[16px] relative size-full">
        <Container38 />
        <BackgroundBorder3 />
        <Container39 />
        <div className="col-1 flex items-center justify-center justify-self-stretch relative row-1 self-stretch shrink-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "0" } as React.CSSProperties}>
          <div className="-rotate-2 flex-none size-full">
            <BackgroundBorder6 />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionGuestEnergyCollage() {
  return (
    <div className="absolute bg-[#0f172a] content-stretch flex flex-col gap-[40px] items-start left-0 py-[64px] right-0 top-[3354.25px]" data-name="Section - Guest Energy Collage">
      <Container35 />
      <Container37 />
    </div>
  );
}

function Container41() {
  return (
    <div className="h-[15px] relative shrink-0 w-[22.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22.5 15">
        <g id="Container">
          <path d={svgPaths.p26d9f500} fill="var(--fill-0, #F1F5F9)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container40() {
  return (
    <div className="relative shrink-0 size-[48px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <Container41 />
      </div>
    </div>
  );
}

function Heading9() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative" data-name="Heading 2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative w-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[30px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[24px] text-center tracking-[-1.2px] uppercase w-[85.88px]">
          <p className="leading-[30px]">vhdsgn</p>
        </div>
      </div>
    </div>
  );
}

function Container43() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p3de21300} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button5() {
  return (
    <div className="bg-[rgba(198,40,40,0.1)] content-stretch flex items-center justify-center p-[8px] relative rounded-[12px] shrink-0" data-name="Button">
      <Container43 />
    </div>
  );
}

function Container42() {
  return (
    <div className="relative shrink-0 w-[48px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-end relative w-full">
        <Button5 />
      </div>
    </div>
  );
}

function NavHeader() {
  return (
    <div className="absolute bg-[#230f14] content-stretch flex items-center left-0 pb-[17px] pt-[16px] px-[16px] right-0 top-0" data-name="Nav - Header">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.1)] border-b border-solid inset-0 pointer-events-none" />
      <Container40 />
      <Heading9 />
      <Container42 />
    </div>
  );
}

function Container45() {
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

function Container44() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container45 />
    </div>
  );
}

function Container46() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[18px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] tracking-[1.2px] uppercase w-[38.03px]">
        <p className="leading-[18px]">Home</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-end relative size-full">
        <Container44 />
        <Container46 />
      </div>
    </div>
  );
}

function Container48() {
  return (
    <div className="h-[20px] relative shrink-0 w-[18px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 20">
        <g id="Container">
          <path d={svgPaths.pdbf5c00} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container47() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container48 />
    </div>
  );
}

function Container49() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[18px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[12px] tracking-[1.2px] uppercase w-[50.14px]">
        <p className="leading-[18px]">Events</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-end relative size-full">
        <Container47 />
        <Container49 />
      </div>
    </div>
  );
}

function Container51() {
  return (
    <div className="h-[14px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 14">
        <g id="Container">
          <path d={svgPaths.p18e761b0} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container50() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container51 />
    </div>
  );
}

function Container52() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[18px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[12px] tracking-[1.2px] uppercase w-[50.27px]">
        <p className="leading-[18px]">Spaces</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-end relative size-full">
        <Container50 />
        <Container52 />
      </div>
    </div>
  );
}

function Container54() {
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

function Container53() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-center relative shrink-0" data-name="Container">
      <Container54 />
    </div>
  );
}

function Container55() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[18px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[12px] tracking-[1.2px] uppercase w-[54.08px]">
        <p className="leading-[18px]">Profile</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-end relative size-full">
        <Container53 />
        <Container55 />
      </div>
    </div>
  );
}

function BackgroundHorizontalBorderOverlayBlur() {
  return (
    <div className="backdrop-blur-[6px] bg-[#230f14] relative shrink-0 w-full" data-name="Background+HorizontalBorder+OverlayBlur">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.2)] border-solid border-t inset-0 pointer-events-none" />
      <div className="flex flex-row justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-start justify-center pb-[24px] pt-[9px] px-[16px] relative w-full">
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

function SpacerForFixedNav() {
  return (
    <div className="absolute bottom-[24.25px] content-stretch flex flex-col items-start left-0 right-0" data-name="Spacer for fixed nav">
      <BackgroundHorizontalBorderOverlayBlur />
    </div>
  );
}

export default function Body() {
  return (
    <div className="bg-gradient-to-r from-[#230f14] relative size-full to-[#230f14]" data-name="Body">
      <HeaderHeroSection />
      <TonightAtDailySocialSection />
      <OurSpacesSection />
      <SectionGuestEnergyCollage />
      <div className="absolute h-[80px] left-0 right-0 top-[4194.25px]" data-name="Footer / Bottom Navigation" />
      <NavHeader />
      <SpacerForFixedNav />
    </div>
  );
}