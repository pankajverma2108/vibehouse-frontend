import svgPaths from "./svg-yp2d2sd3sa";
import imgVhdsgnBunkSelectionVibrant from "figma:asset/469c47a28b481845dfddd68f23cc100559d27b6e.png";
import imgBackground from "figma:asset/0073878e649915366d7a6d72046ccfc2472bb6a6.png";
import imgOverlayBackground from "figma:asset/8d0b2b318e83ed6cc3adce364033cd24289585f4.png";
import imgBackground1 from "figma:asset/0c972b96ac0d09e94221b53d3771c7cbef8813f8.png";
import imgBackground2 from "figma:asset/4728d77666bbc01acb581e581716347c55de88ce.png";

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[358px]" data-name="Heading 2">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[38px] justify-center leading-[0] not-italic relative shrink-0 text-[#f1f5f9] text-[30px] w-[232.5px]">
        <p className="leading-[37.5px]">Sleeping Quarters</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[14px] tracking-[1.4px] uppercase w-[100.352px]">
          <p className="leading-[20px]">Dorm Alpha</p>
        </div>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="bg-[rgba(198,40,40,0.1)] content-stretch flex flex-col h-[48px] items-center justify-center px-[2px] py-[14px] relative rounded-[4px] w-[171px]" data-name="Link">
      <div aria-hidden="true" className="absolute border-2 border-[#c62828] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Container1 />
    </div>
  );
}

function LinkCssTransform() {
  return (
    <div className="content-stretch flex flex-col h-[82.504px] items-start justify-center relative shrink-0" data-name="Link:css-transform">
      <div className="flex h-[82.504px] items-center justify-center relative shrink-0 w-[177.243px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="-rotate-12 flex-none">
          <Link />
        </div>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[#64748b] text-[14px] tracking-[1.4px] uppercase w-[89.41px]">
          <p className="leading-[20px]">Dorm Beta</p>
        </div>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="bg-[rgba(35,15,20,0.5)] content-stretch flex flex-col h-[48px] items-center justify-center px-[2px] py-[14px] relative rounded-[4px] w-[171px]" data-name="Link">
      <div aria-hidden="true" className="absolute border-2 border-[#334155] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Container2 />
    </div>
  );
}

function LinkCssTransform1() {
  return (
    <div className="content-stretch flex flex-col h-[71.331px] items-start justify-center relative shrink-0" data-name="Link:css-transform">
      <div className="flex h-[71.331px] items-center justify-center relative shrink-0 w-[176.016px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-8">
          <Link1 />
        </div>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex gap-[10.367px] h-[48px] items-center relative shrink-0 w-full" data-name="Container">
      <LinkCssTransform />
      <LinkCssTransform1 />
    </div>
  );
}

function RoomSelectorTabs() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[16px] items-center left-0 pb-[32px] pl-[12.88px] pr-[13.494px] pt-[24px] right-0 top-[73px]" data-name="Room Selector Tabs">
      <Heading />
      <Container />
    </div>
  );
}

function Background2() {
  return (
    <div className="absolute bg-[#39ff14] content-stretch flex flex-col items-start left-[8px] px-[8px] py-[2px] rounded-[2px] top-[8px]" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#230f14] text-[10px] uppercase w-[30.67px]">
        <p className="leading-[15px]">Upper</p>
      </div>
    </div>
  );
}

function Background1() {
  return (
    <div className="h-[110px] relative shrink-0 w-full z-[2]" data-name="Background">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[148.18%] left-0 max-w-none top-[-24.09%] w-full" src={imgBackground} />
      </div>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Background2 />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#f1f5f9] text-[18px] w-full">
        <p className="leading-[28px]">Bunk 101</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#39ff14] text-[12px] w-full">
        <p className="leading-[16px]">✓ AVAILABLE</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <Container5 />
      <Container6 />
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="relative shrink-0 size-[25px]" data-name="Icon">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 25">
          <path d={svgPaths.p2d32e580} fill="var(--fill-0, #39FF14)" id="Icon" />
        </svg>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex h-[25px] items-start justify-end relative shrink-0 w-full" data-name="Container">
      <Container8 />
    </div>
  );
}

function Container3() {
  return (
    <div className="relative shrink-0 w-full z-[1]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-between p-[12px] relative w-full">
        <Container4 />
        <Container7 />
      </div>
    </div>
  );
}

function BackgroundBorderShadow() {
  return (
    <div className="bg-[#0f172a] relative rounded-[8px] shrink-0 w-full" data-name="Background+Border+Shadow">
      <div className="content-stretch flex flex-col isolate items-start overflow-clip p-[4px] relative rounded-[inherit] w-full">
        <Background1 />
        <Container3 />
      </div>
      <div aria-hidden="true" className="absolute border-4 border-[#39ff14] border-solid inset-0 pointer-events-none rounded-[8px] shadow-[0px_0px_20px_0px_rgba(57,255,20,0.3)]" />
    </div>
  );
}

function MineSticker() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-start px-[18px] py-[10px] relative" data-name="MINE Sticker">
      <div aria-hidden="true" className="absolute border-2 border-solid border-white inset-0 pointer-events-none" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="MINE Sticker:shadow" />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[20px] text-white w-[53.38px]">
        <p className="leading-[28px]">MINE!</p>
      </div>
    </div>
  );
}

function BunkCardSelectedMine() {
  return (
    <div className="col-1 content-stretch flex flex-col items-start justify-self-stretch relative row-1 self-start shrink-0" data-name="Bunk Card: Selected (MINE)">
      <BackgroundBorderShadow />
      <div className="absolute flex h-[59.972px] items-center justify-center right-[-10.91px] top-[-21.99px] w-[95.19px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-8">
          <MineSticker />
        </div>
      </div>
    </div>
  );
}

function Background3() {
  return (
    <div className="absolute bg-[#f1f5f9] content-stretch flex flex-col items-start left-[8px] px-[8px] py-[2px] rounded-[2px] top-[8px]" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#230f14] text-[10px] uppercase w-[32.73px]">
        <p className="leading-[15px]">Lower</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="h-[9.5px] relative shrink-0 w-[8px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 9.5">
        <g id="Container">
          <path d={svgPaths.p3fcfe380} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function HotPickBadge() {
  return (
    <div className="absolute bg-[#c62828] bottom-[8px] content-stretch flex gap-[3.99px] items-center px-[8px] py-[4px] right-[8px] rounded-[12px]" data-name="HOT PICK Badge">
      <Container9 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-white uppercase w-[42.55px]">
        <p className="leading-[15px]">HOT PICK</p>
      </div>
    </div>
  );
}

function OverlayBackground() {
  return (
    <div className="h-[112px] relative shrink-0 w-full z-[2]" data-name="Overlay+Background">
      <div aria-hidden="true" className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 pointer-events-none">
        <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden">
          <img alt="" className="absolute h-[149.11%] left-0 max-w-none top-[-24.55%] w-full" src={imgOverlayBackground} />
        </div>
        <div className="absolute bg-[rgba(255,255,255,0.5)] bg-clip-padding border-0 border-[transparent] border-solid inset-0 mix-blend-saturation" />
      </div>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Background3 />
        <HotPickBadge />
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#f1f5f9] text-[18px] w-full">
        <p className="leading-[28px]">Bunk 101</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#c62828] text-[12px] w-full">
        <p className="leading-[16px]">✓ AVAILABLE</p>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <Container12 />
      <Container13 />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[rgba(198,40,40,0.2)] content-stretch flex flex-col items-center justify-center px-[13px] py-[5px] relative rounded-[2px] shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c62828] border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] text-center uppercase w-[53.09px]">
        <p className="leading-[16px]">Upgrade</p>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex items-start justify-end relative shrink-0 w-full" data-name="Container">
      <Button />
    </div>
  );
}

function Container10() {
  return (
    <div className="relative shrink-0 w-full z-[1]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-between p-[12px] relative w-full">
        <Container11 />
        <Container14 />
      </div>
    </div>
  );
}

function BunkCardHotPickLowerUpgrade() {
  return (
    <div className="bg-[#0f172a] col-2 justify-self-stretch relative rounded-[8px] row-1 self-start shrink-0" data-name="Bunk Card: Hot Pick (Lower Upgrade)">
      <div className="content-stretch flex flex-col isolate items-start overflow-clip p-[2px] relative rounded-[inherit] w-full">
        <OverlayBackground />
        <Container10 />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[#334155] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Background5() {
  return (
    <div className="absolute bg-[#1e293b] content-stretch flex flex-col items-start left-[8px] px-[8px] py-[2px] rounded-[2px] top-[8px]" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] uppercase w-[30.67px]">
        <p className="leading-[15px]">Upper</p>
      </div>
    </div>
  );
}

function Background4() {
  return (
    <div className="h-[112px] relative shrink-0 w-full z-[2]" data-name="Background">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[149.11%] left-0 max-w-none top-[-24.55%] w-full" src={imgBackground1} />
      </div>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Background5 />
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#94a3b8] text-[18px] w-full">
        <p className="[text-decoration-skip-ink:none] decoration-solid leading-[28px] line-through">Bunk 102</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#475569] text-[12px] w-full">
        <p className="leading-[16px]">X OCCUPIED</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <Container17 />
      <Container18 />
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="relative shrink-0 size-[17.5px]" data-name="Icon">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.5 17.5">
          <path d={svgPaths.p1f082d00} fill="var(--fill-0, #475569)" id="Icon" />
        </svg>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex h-[17.5px] items-start justify-end relative shrink-0 w-full" data-name="Container">
      <Container20 />
    </div>
  );
}

function Container15() {
  return (
    <div className="relative shrink-0 w-full z-[1]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-between p-[12px] relative w-full">
        <Container16 />
        <Container19 />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#0f172a] relative rounded-[8px] shrink-0 w-full" data-name="Background+Border">
      <div className="content-stretch flex flex-col isolate items-start overflow-clip p-[2px] relative rounded-[inherit] w-full">
        <Background4 />
        <Container15 />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[#1e293b] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function BunkCardOccupied() {
  return (
    <div className="col-1 content-stretch flex flex-col items-start justify-self-stretch opacity-60 relative row-2 self-start shrink-0" data-name="Bunk Card: Occupied">
      <div aria-hidden="true" className="absolute bg-white inset-0 mix-blend-saturation pointer-events-none" />
      <BackgroundBorder />
    </div>
  );
}

function Background7() {
  return (
    <div className="absolute bg-[#f1f5f9] content-stretch flex flex-col items-start left-[8px] px-[8px] py-[2px] rounded-[2px] top-[8px]" data-name="Background">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#230f14] text-[10px] uppercase w-[32.73px]">
        <p className="leading-[15px]">Lower</p>
      </div>
    </div>
  );
}

function Background6() {
  return (
    <div className="h-[112px] relative shrink-0 w-full z-[2]" data-name="Background">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[149.11%] left-0 max-w-none top-[-24.55%] w-full" src={imgBackground2} />
      </div>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Background7 />
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#f1f5f9] text-[18px] w-full">
        <p className="leading-[28px]">Bunk 102</p>
      </div>
    </div>
  );
}

function Container24() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#39ff14] text-[12px] w-full">
        <p className="leading-[16px]">✓ AVAILABLE</p>
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <Container23 />
      <Container24 />
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="relative shrink-0 size-[25px]" data-name="Icon">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 25">
          <path d={svgPaths.pd5f1216} fill="var(--fill-0, #F1F5F9)" fillOpacity="0.3" id="Icon" />
        </svg>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex h-[25px] items-start justify-end relative shrink-0 w-full" data-name="Container">
      <Container26 />
    </div>
  );
}

function Container21() {
  return (
    <div className="relative shrink-0 w-full z-[1]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-between p-[12px] relative w-full">
        <Container22 />
        <Container25 />
      </div>
    </div>
  );
}

function BunkCardAvailable() {
  return (
    <div className="bg-[#0f172a] col-2 justify-self-stretch relative rounded-[8px] row-2 self-start shrink-0" data-name="Bunk Card: Available">
      <div className="content-stretch flex flex-col isolate items-start overflow-clip p-[2px] relative rounded-[inherit] w-full">
        <Background6 />
        <Container21 />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[#334155] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function BunkGrid() {
  return (
    <div className="absolute gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[__228px_228px] left-0 p-[16px] right-0 top-[230.5px]" data-name="Bunk Grid">
      <BunkCardSelectedMine />
      <BunkCardHotPickLowerUpgrade />
      <BunkCardOccupied />
      <BunkCardAvailable />
    </div>
  );
}

function Container29() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#230f14] text-[12px] uppercase w-[75.224px]">
        <p className="leading-[16px]">Your Choice</p>
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#230f14] text-[20px] uppercase w-[176.107px]">
        <p className="leading-[28px]">Bunk 101 - Upper</p>
      </div>
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[176.107px]" data-name="Container">
      <Container29 />
      <Heading1 />
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#230f14] content-stretch flex flex-col items-center justify-center px-[24px] py-[12px] relative rounded-[2px] shrink-0" data-name="Button">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[24px] justify-center leading-[0] relative shrink-0 text-[#39ff14] text-[16px] text-center uppercase w-[68.846px]">
        <p className="leading-[24px]">Confirm</p>
      </div>
    </div>
  );
}

function Container27() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pl-[0.003px] relative w-full">
          <Container28 />
          <Button1 />
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder1() {
  return (
    <div className="bg-[#39ff14] content-stretch flex flex-col items-start p-[20px] relative rounded-[8px] w-[358px]" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border-4 border-[#230f14] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[8px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]" data-name="Overlay+Shadow" />
      <Container27 />
    </div>
  );
}

function StickyCtaArea() {
  return (
    <div className="absolute bottom-[59.74px] content-stretch flex flex-col items-start left-0 pl-[10.76px] pr-[10.767px] right-0" data-name="Sticky CTA Area">
      <div className="flex h-[160.509px] items-center justify-center relative shrink-0 w-[368.473px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "63" } as React.CSSProperties}>
        <div className="-rotate-12 flex-none">
          <BackgroundBorder1 />
        </div>
      </div>
    </div>
  );
}

function StickyCtaAreaMargin() {
  return (
    <div className="absolute bottom-[32px] h-[200.5px] left-0 right-0" data-name="Sticky CTA Area:margin">
      <StickyCtaArea />
    </div>
  );
}

function Container31() {
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

function Container30() {
  return (
    <div className="relative shrink-0 size-[48px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <Container31 />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative" data-name="Heading 2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative w-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[25px] justify-center leading-[0] relative shrink-0 text-[#f1f5f9] text-[20px] text-center tracking-[-0.5px] uppercase w-[162.23px]">
          <p className="leading-[25px]">Claim Your Spot</p>
        </div>
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p2816f2c0} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[rgba(198,40,40,0.2)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[40px]" data-name="Button">
      <Container33 />
    </div>
  );
}

function Container32() {
  return (
    <div className="relative shrink-0 w-[48px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-end relative w-full">
        <Button2 />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="absolute backdrop-blur-[6px] bg-[rgba(35,15,20,0.8)] content-stretch flex items-center justify-between left-0 pb-[9px] pt-[16px] px-[16px] right-0 top-0" data-name="Header">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.2)] border-b border-solid inset-0 pointer-events-none" />
      <Container30 />
      <Heading2 />
      <Container32 />
    </div>
  );
}

function Container34() {
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

function Container35() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] uppercase w-[41.83px]">
        <p className="leading-[15px]">Explore</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-end relative size-full">
        <Container34 />
        <Container35 />
      </div>
    </div>
  );
}

function Container36() {
  return (
    <div className="h-[14px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 14">
        <g id="Container">
          <path d={svgPaths.p38b8fb00} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container37() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[10px] uppercase w-[43.83px]">
        <p className="leading-[15px]">My Bunk</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-end relative size-full">
        <Container36 />
        <Container37 />
      </div>
    </div>
  );
}

function Container38() {
  return (
    <div className="h-[16px] relative shrink-0 w-[22px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 16">
        <g id="Container">
          <path d={svgPaths.p39955c80} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container39() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] uppercase w-[33.67px]">
        <p className="leading-[15px]">Social</p>
      </div>
    </div>
  );
}

function Link4() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-end relative size-full">
        <Container38 />
        <Container39 />
      </div>
    </div>
  );
}

function Container40() {
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

function Container41() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[10px] uppercase w-[38.06px]">
        <p className="leading-[15px]">Profile</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative self-stretch" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-center justify-end relative size-full">
        <Container40 />
        <Container41 />
      </div>
    </div>
  );
}

function BackgroundHorizontalBorderOverlayBlur() {
  return (
    <div className="backdrop-blur-[8px] bg-[rgba(35,15,20,0.95)] h-[76px] relative shrink-0 w-full" data-name="Background+HorizontalBorder+OverlayBlur">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.2)] border-solid border-t inset-0 pointer-events-none" />
      <div className="flex flex-row justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-start justify-center pb-[24px] pt-[13px] px-[16px] relative size-full">
          <Link2 />
          <Link3 />
          <Link4 />
          <Link5 />
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

function Background() {
  return (
    <div className="h-[967px] min-h-[967px] overflow-clip relative shrink-0 w-full" data-name="Background" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 390 967\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(74.534 0 0 74.534 78 290.1)\\'><stop stop-color=\\'rgba(198,40,40,0.15)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(198,40,40,0)\\' offset=\\'0.5\\'/></radialGradient></defs></svg>'), url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 390 967\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(74.534 0 0 74.534 312 676.9)\\'><stop stop-color=\\'rgba(57,255,20,0.1)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(57,255,20,0)\\' offset=\\'0.4\\'/></radialGradient></defs></svg>')" }}>
      <RoomSelectorTabs />
      <BunkGrid />
      <StickyCtaAreaMargin />
      <div className="absolute h-[32px] left-0 right-0 top-[935px]" data-name="Rectangle" />
      <Header />
      <BottomNavigationBar />
    </div>
  );
}

export default function VhdsgnBunkSelectionVibrant() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="vhdsgn - Bunk Selection (Vibrant)">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute bg-[#230f14] inset-0" />
        <div className="absolute inset-0 overflow-hidden">
          <img alt="" className="absolute h-full left-0 max-w-none top-0 w-[247.95%]" src={imgVhdsgnBunkSelectionVibrant} />
        </div>
      </div>
      <Background />
    </div>
  );
}