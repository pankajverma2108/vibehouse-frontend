import svgPaths from "./svg-s32u9ip48w";
import imgImageBorder from "figma:asset/14c194126c3a4935152fe989636c6baef45be4c5.png";
import imgImage from "figma:asset/b6219055314f681066cdc75951de344516ca4cf5.png";
import imgImage1 from "figma:asset/7880ced7fe9efe2a47a86f8268594bc7c7bc287f.png";
import imgImage2 from "figma:asset/234e75da656b6e32d80334ea98fdc6caf55b3b40.png";

function Container1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Container">
          <path d={svgPaths.p300a1100} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[40px]" data-name="Container">
      <Container1 />
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Heading 1">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[18px] tracking-[1.8px] uppercase w-[153.69px]">
        <p className="leading-[28px]">Vibe Passport</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Container">
          <path d={svgPaths.p2cd8680} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Button">
      <Container3 />
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex items-center justify-end relative shrink-0 w-[40px]" data-name="Container">
      <Button />
    </div>
  );
}

function Header() {
  return (
    <div className="backdrop-blur-[6px] bg-[rgba(35,15,20,0.8)] relative shrink-0 w-full z-[2]" data-name="Header">
      <div className="flex flex-row items-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between p-[16px] relative w-full">
          <Container />
          <Heading />
          <Container2 />
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder1() {
  return (
    <div className="absolute bottom-[-8px] h-[23.083px] right-[-8px] w-[23.667px]" data-name="Background+Border">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 23.6667 23.0833">
        <g id="Background+Border">
          <rect fill="var(--fill-0, #00F0FF)" height="21.0833" rx="10.5417" width="21.6667" x="1" y="1" />
          <rect height="21.0833" rx="10.5417" stroke="var(--stroke-0, #230F14)" strokeWidth="2" width="21.6667" x="1" y="1" />
          <path d={svgPaths.p37392bc0} fill="var(--fill-0, black)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container5() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="pointer-events-none relative rounded-[12px] shrink-0 size-[128px]" data-name="Image+Border">
          <div className="absolute inset-0 overflow-hidden rounded-[12px]">
            <img alt="" className="absolute left-[3.13%] max-w-none size-[93.75%] top-[3.13%]" src={imgImageBorder} />
          </div>
          <div aria-hidden="true" className="absolute border-4 border-[#c62828] border-solid inset-0 rounded-[12px]" />
        </div>
        <BackgroundBorder1 />
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[14px] text-center tracking-[2.8px] uppercase w-[137.27px]">
        <p className="leading-[20px]">Global Nomad</p>
      </div>
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[4px] relative shrink-0" data-name="Margin">
      <Container7 />
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Mono:Regular',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#94a3b8] text-[12px] text-center w-[136.83px]">
        <p className="leading-[16px]">ID: VP-992-KLA-2024</p>
      </div>
    </div>
  );
}

function Margin1() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[16px] relative shrink-0" data-name="Margin">
      <Container8 />
    </div>
  );
}

function Container6() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[36px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[30px] text-center tracking-[-0.75px] w-[177.61px]">
          <p className="leading-[36px]">Elena Thorne</p>
        </div>
        <Margin />
        <Margin1 />
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#00f0ff] text-[20px] w-[24.28px]">
          <p className="leading-[28px]">24</p>
        </div>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[1px] uppercase w-[35.03px]">
          <p className="leading-[15px]">Visits</p>
        </div>
      </div>
    </div>
  );
}

function OverlayBorder1() {
  return (
    <div className="bg-[rgba(35,15,20,0.5)] flex-[1_0_0] min-h-px min-w-px relative rounded-[4px] self-stretch" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(198,40,40,0.1)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col items-center p-[13px] relative size-full">
          <Container10 />
          <Container11 />
        </div>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#39ff14] text-[20px] w-[31px]">
          <p className="leading-[28px]">4.9</p>
        </div>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[1px] uppercase w-[39.42px]">
          <p className="leading-[15px]">Rating</p>
        </div>
      </div>
    </div>
  );
}

function OverlayBorder2() {
  return (
    <div className="bg-[rgba(35,15,20,0.5)] flex-[1_0_0] min-h-px min-w-px relative rounded-[4px] self-stretch" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(198,40,40,0.1)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col items-center p-[13px] relative size-full">
          <Container12 />
          <Container13 />
        </div>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[20px] w-[32.2px]">
          <p className="leading-[28px]">12k</p>
        </div>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[1px] uppercase w-[39.61px]">
          <p className="leading-[15px]">Points</p>
        </div>
      </div>
    </div>
  );
}

function OverlayBorder3() {
  return (
    <div className="bg-[rgba(35,15,20,0.5)] flex-[1_0_0] min-h-px min-w-px relative rounded-[4px] self-stretch" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(198,40,40,0.1)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col items-center p-[13px] relative size-full">
          <Container14 />
          <Container15 />
        </div>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex gap-[16px] h-[69px] items-start justify-center relative shrink-0 w-full" data-name="Container">
      <OverlayBorder1 />
      <OverlayBorder2 />
      <OverlayBorder3 />
    </div>
  );
}

function Margin2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[16px] relative w-full">
        <Container9 />
      </div>
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(198,40,40,0.05)] relative rounded-[8px] shrink-0 w-full" data-name="Overlay+Border">
      <div className="flex flex-col items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-center p-[33px] relative w-full">
          <div className="absolute bg-gradient-to-r from-[#00f0ff] h-[4px] left-px right-px to-[#39ff14] top-px via-1/2 via-[#c62828]" data-name="Gradient" />
          <Container5 />
          <Container6 />
          <Margin2 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(198,40,40,0.2)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function ParagraphBackgroundBorderShadow() {
  return (
    <div className="bg-[#1e293b] content-stretch flex flex-col h-[40px] items-start pb-[11.005px] pt-[8.995px] px-[26px] relative rounded-[12px]" data-name="Paragraph+Background+Border+Shadow">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(198,40,40,0.4)] border-dashed inset-0 pointer-events-none rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]" />
      <div className="flex flex-col font-['Caveat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] relative shrink-0 text-[#cbd5e1] text-[14px] w-[133.84px]">
        <p className="leading-[20px]">Member since Autumn 2021</p>
      </div>
      <div className="-translate-y-1/2 absolute flex flex-col font-['Material_Symbols_Outlined:Thin',sans-serif] h-[25.998px] justify-center leading-[0] left-[-10.07px] not-italic text-[#c62828] text-[24px] top-[2.99px] w-[24.167px]">
        <p className="leading-[24px]">workspace_premium</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex items-start justify-center relative shrink-0 w-full" data-name="Container">
      <div className="flex h-[46.461px] items-center justify-center relative shrink-0 w-[187.123px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
        <div className="-rotate-2 flex-none">
          <ParagraphBackgroundBorderShadow />
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder2() {
  return (
    <div className="bg-[#39ff14] content-stretch flex flex-col items-start px-[18px] py-[6px] relative rounded-[4px] shrink-0" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border-2 border-black border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[4px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[12px] text-black tracking-[-0.6px] uppercase w-[69.344px]">
        <p className="leading-[16px]">Verified Vibe</p>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex flex-col items-start relative" data-name="Container">
      <BackgroundBorder2 />
    </div>
  );
}

function Container4() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex flex-col gap-[28.773px] items-start pb-[20.764px] pt-[24px] px-[24px] relative w-full">
        <OverlayBorder />
        <Container16 />
        <div className="absolute flex h-[49.29px] items-center justify-center right-[-9.76px] top-[-18.65px] w-[108.863px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none rotate-12">
            <Container17 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Heading 3">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[20px] tracking-[-1px] uppercase w-[159.97px]">
        <p className="leading-[28px]">Past Adventures</p>
      </div>
    </div>
  );
}

function Overlay() {
  return (
    <div className="bg-[rgba(198,40,40,0.2)] content-stretch flex flex-col items-start px-[8px] py-[2px] relative rounded-[2px] shrink-0" data-name="Overlay">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[10px] w-[42.89px]">
        <p className="leading-[15px]">VIEW ALL</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Heading1 />
      <Overlay />
    </div>
  );
}

function Container20() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative w-full">
        <div className="flex flex-col font-['Caveat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[14px] text-center w-[83.334px]">
          <p className="leading-[20px]">{`Bali Hideaway '23`}</p>
        </div>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="absolute h-[19.991px] right-[-7.08px] top-[-7.99px] w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 19.9906">
        <g id="Container">
          <path d={svgPaths.p1f93f980} fill="var(--fill-0, #00F0FF)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function BackgroundBorder3() {
  return (
    <div className="bg-[#f1f5f9] content-stretch flex flex-col gap-[8.001px] items-start pb-[33px] pt-[9px] px-[9px] relative size-full" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none" />
      <div className="absolute bg-[rgba(255,255,255,0)] bottom-0 left-0 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] top-0 w-[160px]" data-name="Overlay+Shadow" />
      <div className="aspect-square bg-size-[142px_142px] bg-top-left shrink-0 w-full" data-name="Image" style={{ backgroundImage: `url('${imgImage}')` }} />
      <Container20 />
      <Container21 />
    </div>
  );
}

function Container22() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative w-full">
        <div className="flex flex-col font-['Caveat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[14px] text-center w-[69.652px]">
          <p className="leading-[20px]">{`Tokyo Neon '24`}</p>
        </div>
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="absolute bottom-[-15px] left-[-7.07px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[0.999px] relative">
        <div className="flex flex-col font-['Material_Symbols_Outlined:Thin',sans-serif] h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[#c62828] text-[24px] w-[24.167px]">
          <p className="leading-[32px]">favorite</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder4() {
  return (
    <div className="bg-[#f1f5f9] content-stretch flex flex-col gap-[8.005px] items-start pb-[33px] pt-[9px] px-[9px] relative size-full" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none" />
      <div className="absolute bg-[rgba(255,255,255,0)] bottom-0 left-0 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] top-0 w-[160px]" data-name="Overlay+Shadow" />
      <div className="aspect-square relative shrink-0 w-full" data-name="Image">
        <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgImage1} />
        </div>
      </div>
      <Container22 />
      <Container23 />
    </div>
  );
}

function Container24() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative w-full">
        <div className="flex flex-col font-['Caveat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] relative shrink-0 text-[#0f172a] text-[14px] text-center w-[79.592px]">
          <p className="leading-[20px]">{`Parisian Loft '22`}</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder5() {
  return (
    <div className="bg-[#f1f5f9] content-stretch flex flex-col gap-[8.001px] items-start pb-[33px] pt-[9px] px-[9px] relative size-full" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none" />
      <div className="absolute bg-[rgba(255,255,255,0)] bottom-0 left-0 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] top-0 w-[160px]" data-name="Overlay+Shadow" />
      <div className="aspect-square bg-size-[142px_142px] bg-top-left shrink-0 w-full" data-name="Image" style={{ backgroundImage: `url('${imgImage2}')` }} />
      <Container24 />
    </div>
  );
}

function Container19() {
  return (
    <div className="h-[236px] overflow-clip relative shrink-0 w-full" data-name="Container">
      <div className="absolute bottom-[19.96px] flex items-center justify-center left-[-5.44px] top-[-4.04px] w-[170.876px]">
        <div className="-rotate-3 flex-none h-[212px] w-[160px]">
          <BackgroundBorder3 />
        </div>
      </div>
      <div className="absolute bottom-[21.28px] flex items-center justify-center left-[180.35px] top-[-2.73px] w-[167.301px]">
        <div className="flex-none h-[212px] rotate-2 w-[160px]">
          <BackgroundBorder4 />
        </div>
      </div>
      <div className="absolute bottom-[22.62px] flex items-center justify-center left-[366.16px] top-[-1.38px] w-[163.676px]">
        <div className="-rotate-1 flex-none h-[212px] w-[160px]">
          <BackgroundBorder5 />
        </div>
      </div>
    </div>
  );
}

function Section() {
  return (
    <div className="relative shrink-0 w-full" data-name="Section">
      <div className="content-stretch flex flex-col gap-[24px] items-start px-[24px] relative w-full">
        <Container18 />
        <Container19 />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#00f0ff] text-[14px] uppercase w-full">
          <p className="leading-[20px]">Vibe Notes</p>
        </div>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Caveat:Regular',sans-serif] font-normal justify-center leading-[32.5px] relative shrink-0 text-[#e2e8f0] text-[20px] w-full">
          <p className="mb-0">Always asks for extra pillows. Loves local</p>
          <p className="mb-0">coffee recommendations. Prefers sunrise</p>
          <p>views over sunset.</p>
        </div>
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-start px-[8px] py-[4px] relative rounded-[2px] shrink-0" data-name="Background">
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[2px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-white w-[51.547px]">
        <p className="leading-[15px]">TOP GUEST</p>
      </div>
    </div>
  );
}

function Container26() {
  return (
    <div className="relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <Background />
      </div>
    </div>
  );
}

function Section1() {
  return (
    <div className="bg-[rgba(0,240,255,0.1)] content-stretch flex flex-col gap-[11px] items-start p-[17px] relative rounded-[8px] shrink-0 w-[340px]" data-name="Section">
      <div aria-hidden="true" className="absolute border border-[rgba(0,240,255,0.3)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <Heading2 />
      <Container25 />
      <div className="absolute bottom-[-17.27px] flex h-[36.541px] items-center justify-center right-[15.35px] w-[70.853px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-12">
          <Container26 />
        </div>
      </div>
    </div>
  );
}

function Main() {
  return (
    <div className="relative shrink-0 w-full z-[1]" data-name="Main">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[32px] items-center pb-[96px] relative w-full">
        <Container4 />
        <Section />
        <Section1 />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#230f14] max-w-[448px] min-h-[1223px] relative shrink-0 w-full" data-name="Background+Border">
      <div className="content-stretch flex flex-col isolate items-start max-w-[inherit] min-h-[inherit] overflow-clip px-px relative rounded-[inherit] w-full">
        <Header />
        <Main />
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.1)] border-l border-r border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Container27() {
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
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[-0.5px] uppercase w-[38.33px]">
        <p className="leading-[15px]">Explore</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-center relative size-full">
        <Container27 />
        <Container28 />
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="h-[19.067px] relative shrink-0 w-[20.038px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.0385 19.0667">
        <g id="Container">
          <path d={svgPaths.p77fe800} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[10px] tracking-[-0.5px] uppercase w-[44.84px]">
        <p className="leading-[15px]">Passport</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-center relative size-full">
        <Container29 />
        <Container30 />
      </div>
    </div>
  );
}

function Container31() {
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

function Container32() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[-0.5px] uppercase w-[26.31px]">
        <p className="leading-[15px]">Stays</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-center relative size-full">
        <Container31 />
        <Container32 />
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="h-[20px] relative shrink-0 w-[20.1px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.1 20">
        <g id="Container">
          <path d={svgPaths.p3cdadd00} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container34() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] tracking-[-0.5px] uppercase w-[41.73px]">
        <p className="leading-[15px]">Account</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-center relative size-full">
        <Container33 />
        <Container34 />
      </div>
    </div>
  );
}

function BackgroundHorizontalBorderOverlayBlur() {
  return (
    <div className="backdrop-blur-[8px] bg-[#230f14] h-[76px] relative shrink-0 w-full" data-name="Background+HorizontalBorder+OverlayBlur">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.2)] border-solid border-t inset-0 pointer-events-none" />
      <div className="flex flex-row justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-start justify-center pb-[24px] pt-[13px] px-[16px] relative size-full">
          <Link />
          <Link1 />
          <Link2 />
          <Link3 />
        </div>
      </div>
    </div>
  );
}

function Nav() {
  return (
    <div className="absolute bottom-0 content-stretch flex flex-col items-start left-0 max-w-[448px] right-0" data-name="Nav">
      <BackgroundHorizontalBorderOverlayBlur />
    </div>
  );
}

export default function VhdsgnGuestProfileVibrant() {
  return (
    <div className="bg-[#230f14] content-stretch flex flex-col items-start relative size-full" data-name="vhdsgn - Guest Profile (Vibrant)">
      <BackgroundBorder />
      <Nav />
    </div>
  );
}