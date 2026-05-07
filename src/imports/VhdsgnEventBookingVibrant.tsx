import svgPaths from "./svg-1mn03c4tn5";
import imgVhdsgnEventBookingVibrant from "figma:asset/7ac9796147d2ee6711c2a7b00ac11c1c1bb036dd.png";
import imgBackgroundImage from "figma:asset/895f4d5125da4568d51da691d77fa9a1cc789974.png";
import imgImage from "figma:asset/86299d23ddaccf5ed2249494ceee4c8e31232c16.png";
import imgImage1 from "figma:asset/43d7d51d04c50c4222cc2b8416190cf6155f0461.png";
import imgImage2 from "figma:asset/015beb61ce65e964b88c6d51f693f7c5a74c2b03.png";
import imgAttendee from "figma:asset/d4ced3603129d131f8bb400075827e4ad75b8127.png";
import imgAttendee1 from "figma:asset/6989de701a00dfa0f44397c92c700b78f2f45e9d.png";

function Container1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#c62828] text-[20px] tracking-[2px] uppercase w-[173.06px]">
        <p className="leading-[28px]">Hostel Underground</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex items-start mb-[-4.5px] py-[4.5px] relative shrink-0 w-[55.02px]" data-name="Container">
      <div className="absolute flex inset-[55.62%_3.73%_2.62%_-9.43%] items-center justify-center">
        <div className="-rotate-1 flex-none h-[22.8px] w-[57.77px]">
          <div className="bg-[rgba(198,40,40,0.4)] size-full" data-name="Overlay" />
        </div>
      </div>
      <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[48px] justify-center leading-[0] not-italic relative shrink-0 text-[#f1f5f9] text-[48px] tracking-[-2.4px] w-[55.02px]">
        <p className="leading-[48px]">GIGS</p>
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 pb-[4.5px] right-0 top-[4px]" data-name="Heading 1">
      <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[48px] justify-center leading-[0] mb-[-4.5px] not-italic relative shrink-0 text-[#f1f5f9] text-[48px] tracking-[-2.4px] w-[130.61px]">
        <p className="leading-[48px]">UPCOMING</p>
      </div>
      <Container2 />
    </div>
  );
}

function Heading1Margin() {
  return (
    <div className="h-[100px] relative shrink-0 w-full" data-name="Heading 1:margin">
      <Heading />
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[173.06px]" data-name="Container">
      <Container1 />
      <Heading1Margin />
    </div>
  );
}

function Container3() {
  return (
    <div className="h-[12px] relative shrink-0 w-[18px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 12">
        <g id="Container">
          <path d={svgPaths.p2bce57c0} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Border() {
  return (
    <div className="content-stretch flex items-center justify-center p-[2px] relative rounded-[12px] shrink-0 size-[48px]" data-name="Border">
      <div aria-hidden="true" className="absolute border-2 border-[#c62828] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Container3 />
    </div>
  );
}

function Header() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header">
      <div className="flex flex-row items-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pb-[8px] pt-[24px] px-[24px] relative w-full">
          <Container />
          <Border />
        </div>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#f1f5f9] text-[18px] tracking-[0.9px] uppercase w-[72.38px]">
          <p className="leading-[28px]">All Events</p>
        </div>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="relative self-stretch shrink-0" data-name="Link">
      <div aria-hidden="true" className="absolute border-[#c62828] border-b-4 border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col items-center justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col h-full items-center justify-center pb-[12px] relative">
          <Container4 />
        </div>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#94a3b8] text-[18px] tracking-[0.9px] uppercase w-[68.91px]">
          <p className="leading-[28px]">Live Music</p>
        </div>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="relative self-stretch shrink-0" data-name="Link">
      <div aria-hidden="true" className="absolute border-[rgba(0,0,0,0)] border-b-4 border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col items-center justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col h-full items-center justify-center pb-[12px] relative">
          <Container5 />
        </div>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#94a3b8] text-[18px] tracking-[0.9px] uppercase w-[50.66px]">
          <p className="leading-[28px]">Socials</p>
        </div>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="relative self-stretch shrink-0" data-name="Link">
      <div aria-hidden="true" className="absolute border-[rgba(0,0,0,0)] border-b-4 border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col items-center justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col h-full items-center justify-center pb-[12px] relative">
          <Container6 />
        </div>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative">
        <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#94a3b8] text-[18px] tracking-[0.9px] uppercase w-[39.38px]">
          <p className="leading-[28px]">Tours</p>
        </div>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="relative self-stretch shrink-0" data-name="Link">
      <div aria-hidden="true" className="absolute border-[rgba(0,0,0,0)] border-b-4 border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col items-center justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col h-full items-center justify-center pb-[12px] relative">
          <Container7 />
        </div>
      </div>
    </div>
  );
}

function HorizontalBorder() {
  return (
    <div className="h-[41px] relative shrink-0 w-full" data-name="HorizontalBorder">
      <div className="content-stretch flex gap-[24px] items-start overflow-clip pb-px relative rounded-[inherit] size-full">
        <Link />
        <Link1 />
        <Link2 />
        <Link3 />
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.3)] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function FiltersNavigation() {
  return (
    <div className="relative shrink-0 w-full" data-name="Filters/Navigation">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start px-[24px] py-[16px] relative w-full">
        <HorizontalBorder />
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col font-['Bebas_Neue:Regular',sans-serif] items-start leading-[0] not-italic pb-[0.001px] relative shrink-0 text-[#f1f5f9] text-[60px] tracking-[-3px] w-full" data-name="Heading 2">
      <div className="flex flex-col h-[60px] justify-center mb-[-0.001px] relative shrink-0 w-[139.451px]">
        <p className="leading-[60px]">DJ NIGHT:</p>
      </div>
      <div className="flex flex-col h-[60px] justify-center mb-[-0.001px] relative shrink-0 w-[227.054px]">
        <p className="leading-[60px]">TECHNO PULSE</p>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="relative shrink-0 size-[11.667px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.6667 11.6667">
        <g id="Container">
          <path d={svgPaths.p29478120} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container11() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[12px] tracking-[1.2px] uppercase w-[216.663px]">
        <p className="leading-[16px]">Basement Stage • 22:00 - Late</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex gap-[7.996px] items-center pb-[8.002px] relative shrink-0 w-full" data-name="Container">
      <Container10 />
      <Container11 />
    </div>
  );
}

function ParagraphVerticalBorder() {
  return (
    <div className="relative shrink-0 w-full" data-name="Paragraph+VerticalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.5)] border-l-2 border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal items-start leading-[0] pb-[0.3px] pl-[18px] relative text-[#94a3b8] text-[14px] w-full">
        <div className="flex flex-col h-[23px] justify-center mb-[-0.3px] relative shrink-0 w-[262.29px]">
          <p className="leading-[22.75px]">High-energy industrial techno set with</p>
        </div>
        <div className="flex flex-col h-[23px] justify-center mb-[-0.3px] relative shrink-0 w-[226.314px]">
          <p className="leading-[22.75px]">immersive spray paint visuals and</p>
        </div>
        <div className="flex flex-col h-[23px] justify-center mb-[-0.3px] relative shrink-0 w-[260.03px]">
          <p className="leading-[22.75px]">experimental light rigs. Bring earplugs.</p>
        </div>
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#c62828] content-stretch flex items-center justify-center px-[24px] py-[8px] relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]" data-name="Button">
      <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[36px] justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-center text-white w-[46.295px]">
        <p className="leading-[36px]">RSVP</p>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="absolute content-stretch flex flex-col items-start right-[12.85px] top-[-46.31px]" data-name="Container">
      <div className="flex h-[64.617px] items-center justify-center relative shrink-0 w-[100.614px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-8">
          <Button />
        </div>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-start p-[24px] relative w-full">
        <Heading1 />
        <Container9 />
        <ParagraphVerticalBorder />
        <Container12 />
      </div>
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(15,23,42,0.5)] relative w-[340.008px]" data-name="Overlay+Border">
      <div className="content-stretch flex flex-col items-start overflow-clip p-px relative rounded-[inherit] w-full">
        <div className="aspect-[4/5] relative shrink-0 w-full" data-name="Background+Image">
          <div aria-hidden="true" className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 pointer-events-none">
            <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden">
              <img alt="" className="absolute h-full left-[-12.5%] max-w-none top-0 w-[125%]" src={imgBackgroundImage} />
            </div>
            <div className="absolute bg-clip-padding bg-white border-0 border-[transparent] border-solid inset-0 mix-blend-saturation" />
          </div>
        </div>
        <Container8 />
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(198,40,40,0.2)] border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function BackgroundShadow() {
  return (
    <div className="bg-[#c62828] content-stretch flex flex-col items-start px-[12px] py-[4px] relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]" data-name="Background+Shadow">
      <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[20px] text-white tracking-[-1px] w-[44.1px]">
        <p className="leading-[28px]">TONIGHT</p>
      </div>
    </div>
  );
}

function DjNightCard() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[17.87px] right-[24px] top-[21.08px]" data-name="DJ NIGHT CARD">
      <div className="flex h-[706.738px] items-center justify-center relative shrink-0 w-[352.189px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "189" } as React.CSSProperties}>
        <div className="-rotate-1 flex-none">
          <OverlayBorder />
        </div>
      </div>
      <div className="absolute flex h-[45.127px] items-center justify-center left-[-4.04px] top-[-17.64px] w-[72.447px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-8">
          <BackgroundShadow />
        </div>
      </div>
    </div>
  );
}

function MaskGroup() {
  return (
    <div className="h-[181.13px] relative shrink-0 w-full" data-name="Mask Group">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <div className="absolute aspect-video left-0 mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0%_0px] mask-size-[100%_192.258px] right-[0.01px] top-0" data-name="Image" style={{ maskImage: `url('${imgImage}')` }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[177.77%] left-0 max-w-none top-[-38.89%] w-full" src={imgImage1} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="content-stretch flex flex-col font-['Bebas_Neue:Regular',sans-serif] items-start leading-[0] not-italic pb-[0.001px] relative shrink-0 text-[#f1f5f9] text-[48px] tracking-[-2.4px] w-full" data-name="Heading 2">
      <div className="flex flex-col h-[48px] justify-center mb-[-0.001px] relative shrink-0 w-[182.551px]">
        <p className="leading-[48px]">NEON DISTRICT</p>
      </div>
      <div className="flex flex-col h-[48px] justify-center mb-[-0.001px] relative shrink-0 w-[142.857px]">
        <p className="leading-[48px]">PUB CRAWL</p>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="h-[11.667px] relative shrink-0 w-[9.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.33333 11.6667">
        <g id="Container">
          <path d={svgPaths.p3d8f00c0} fill="var(--fill-0, #CBD5E1)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#cbd5e1] text-[12px] tracking-[1.2px] uppercase w-[154.504px]">
        <p className="leading-[16px]">Meet @ Lobby • 20:30</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex gap-[8.005px] items-center relative shrink-0 w-full" data-name="Container">
      <Container14 />
      <Container15 />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex flex-col font-['Space_Grotesk:Regular',sans-serif] font-normal items-start leading-[0] pb-[0.3px] pt-[8px] relative shrink-0 text-[#94a3b8] text-[14px] w-full" data-name="Paragraph">
      <div className="flex flex-col h-[23px] justify-center mb-[-0.3px] relative shrink-0 w-[260.799px]">
        <p className="leading-[22.75px]">4 Secret bars. 1 Massive club. Welcome</p>
      </div>
      <div className="flex flex-col h-[23px] justify-center mb-[-0.3px] relative shrink-0 w-[241.047px]">
        <p className="leading-[22.75px]">shots included. The ultimate way to</p>
      </div>
      <div className="flex flex-col h-[23px] justify-center mb-[-0.3px] relative shrink-0 w-[258.217px]">
        <p className="leading-[22.75px]">{`experience the city's hidden nightlife.`}</p>
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center px-[22px] py-[10px] relative" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#230f14] border-solid inset-0 pointer-events-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]" />
      <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[#230f14] text-[24px] text-center w-[49.511px]">
        <p className="leading-[32px]">JOIN IN</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="absolute content-stretch flex flex-col items-start right-[28.84px] top-[-30.26px]" data-name="Container">
      <div className="flex h-[64.508px] items-center justify-center relative shrink-0 w-[99.838px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
        <div className="flex-none rotate-8">
          <Button1 />
        </div>
      </div>
    </div>
  );
}

function Overlay() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] relative shrink-0 w-full" data-name="Overlay">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-start p-[24px] relative w-full">
        <Heading2 />
        <Container13 />
        <Paragraph />
        <Container16 />
      </div>
    </div>
  );
}

function PubCrawlCard() {
  return (
    <div className="bg-[rgba(15,23,42,0.5)] relative w-full" data-name="PUB CRAWL CARD">
      <div className="content-stretch flex flex-col items-start overflow-clip p-px relative rounded-[inherit] w-full">
        <MaskGroup />
        <Overlay />
      </div>
      <div aria-hidden="true" className="absolute border border-[#334155] border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Heading3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 2">
      <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#c62828] text-[60px] tracking-[-1.5px] w-full">
        <p className="leading-[60px]">OPEN MIC</p>
      </div>
    </div>
  );
}

function Heading4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#f1f5f9] text-[30px] tracking-[-1.5px] w-full">
        <p className="leading-[36px]">{`UNCUT & ACOUSTIC`}</p>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="h-[11.667px] relative shrink-0 w-[10.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 11.6667">
        <g id="Container">
          <path d={svgPaths.p3bb7dc80} fill="var(--fill-0, #94A3B8)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#94a3b8] text-[12px] tracking-[1.2px] uppercase w-[220.905px]">
        <p className="leading-[16px]">Every Thursday • Rooftop Bar</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex gap-[8.005px] items-center pt-[12px] relative shrink-0 w-full" data-name="Container">
      <Container19 />
      <Container20 />
    </div>
  );
}

function Attendee() {
  return (
    <div className="max-w-[40px] relative shrink-0 size-[35.992px]" data-name="Attendee">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute left-[-5.57%] max-w-none size-[111.14%] top-[-5.57%]" src={imgAttendee} />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#334155] h-[39.994px] mr-[-12px] relative rounded-[12px] shrink-0 w-[39.995px]" data-name="Background+Border">
      <div className="content-stretch flex flex-col items-start overflow-clip p-[2px] relative rounded-[inherit] size-full">
        <Attendee />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[#230f14] border-solid inset-0 pointer-events-none rounded-[12px]" />
    </div>
  );
}

function Attendee1() {
  return (
    <div className="max-w-[40px] relative shrink-0 size-[36.002px]" data-name="Attendee">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[111.11%] left-[-5.55%] max-w-none top-[-5.55%] w-[111.1%]" src={imgAttendee1} />
      </div>
    </div>
  );
}

function BackgroundBorder1() {
  return (
    <div className="bg-[#475569] relative rounded-[12px] shrink-0 size-[40.004px]" data-name="Background+Border">
      <div className="content-stretch flex flex-col items-start overflow-clip p-[2px] relative rounded-[inherit] size-full">
        <Attendee1 />
      </div>
      <div aria-hidden="true" className="absolute border-2 border-[#230f14] border-solid inset-0 pointer-events-none rounded-[12px]" />
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col h-[40.004px] items-start mr-[-12px] relative shrink-0 w-[40.015px]" data-name="Margin">
      <BackgroundBorder1 />
    </div>
  );
}

function BackgroundBorder2() {
  return (
    <div className="bg-[#c62828] content-stretch flex items-center justify-center p-[2px] relative rounded-[12px] shrink-0 size-[40.004px]" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border-2 border-[#230f14] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[12px] text-center text-white w-[19.992px]">
        <p className="leading-[16px]">+12</p>
      </div>
    </div>
  );
}

function Margin1() {
  return (
    <div className="content-stretch flex flex-col h-[40.004px] items-start mr-[-12px] relative shrink-0 w-[40.014px]" data-name="Margin">
      <BackgroundBorder2 />
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex items-start pr-[12px] relative shrink-0" data-name="Container">
      <BackgroundBorder />
      <Margin />
      <Margin1 />
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[rgba(198,40,40,0.2)] content-stretch flex flex-col items-center justify-center px-[17px] py-[9px] relative shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c62828] border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Bebas_Neue:Regular',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#c62828] text-[20px] text-center w-[56.745px]">
        <p className="leading-[28px]">PERFORM</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[0.005px] pt-[20.002px] relative w-full">
          <Container22 />
          <Button2 />
        </div>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start p-[32px] relative w-full">
        <Heading3 />
        <Heading4 />
        <Container18 />
        <Container21 />
      </div>
    </div>
  );
}

function OpenMicCard() {
  return (
    <div className="bg-[#230f14] relative w-full" data-name="OPEN MIC CARD">
      <div className="content-stretch flex flex-col items-start overflow-clip p-[4px] relative rounded-[inherit] w-full">
        <div className="aspect-[3/2] relative shrink-0 w-full" data-name="Image">
          <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[150.01%] left-0 max-w-none top-[-25.01%] w-full" src={imgImage2} />
          </div>
        </div>
        <Container17 />
      </div>
      <div aria-hidden="true" className="absolute border-4 border-[rgba(198,40,40,0.4)] border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function MainFeed() {
  return (
    <div className="h-[1776.78px] relative shrink-0 w-full" data-name="Main Feed">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <DjNightCard />
        <div className="absolute flex items-center justify-center left-[32.5px] right-[16.49px] top-[771.23px]">
          <div className="flex-none h-[435.529px] rotate-2 w-[324.005px]">
            <PubCrawlCard />
          </div>
        </div>
        <div className="absolute flex items-center justify-center left-[15.64px] right-[31.64px] top-[1258.62px]">
          <div className="-rotate-2 flex-none h-[484.672px] w-[324.005px]">
            <OpenMicCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function BackgroundBorderShadow() {
  return (
    <div className="bg-[rgba(35,15,20,0.95)] max-w-[448px] min-h-[2106px] relative shrink-0 w-full" data-name="Background+Border+Shadow">
      <div className="content-stretch flex flex-col items-start max-w-[inherit] min-h-[inherit] overflow-clip px-px relative rounded-[inherit] w-full">
        <Header />
        <FiltersNavigation />
        <MainFeed />
        <div className="h-[96px] shrink-0 w-full" data-name="Rectangle" />
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.2)] border-l border-r border-solid inset-0 pointer-events-none shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" />
    </div>
  );
}

function Container23() {
  return (
    <div className="h-[20px] relative shrink-0 w-[25px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 20">
        <g id="Container">
          <path d={svgPaths.p3656e480} fill="var(--fill-0, #c62828)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container24() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#c62828] text-[10px] tracking-[1px] uppercase w-[41.78px]">
        <p className="leading-[15px]">Events</p>
      </div>
    </div>
  );
}

function Link4() {
  return (
    <div className="absolute bottom-[16px] content-stretch flex flex-col gap-[4px] items-center left-[24px]" data-name="Link">
      <Container23 />
      <Container24 />
    </div>
  );
}

function Container25() {
  return (
    <div className="relative shrink-0 size-[22.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22.5 22.5">
        <g id="Container">
          <path d={svgPaths.p54d2380} fill="var(--fill-0, #64748B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#64748b] text-[10px] tracking-[1px] uppercase w-[24.21px]">
        <p className="leading-[15px]">Map</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="absolute bottom-[16px] content-stretch flex flex-col gap-[4px] items-center left-[93.95px]" data-name="Link">
      <Container25 />
      <Container26 />
    </div>
  );
}

function Container27() {
  return (
    <div className="h-[20px] relative shrink-0 w-[25px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 20">
        <g id="Container">
          <path d={svgPaths.p15758880} fill="var(--fill-0, #64748B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#64748b] text-[10px] tracking-[1px] uppercase w-[56.45px]">
        <p className="leading-[15px]">Bookings</p>
      </div>
    </div>
  );
}

function Link6() {
  return (
    <div className="absolute bottom-[16px] content-stretch flex flex-col gap-[4px] items-center left-[236.3px]" data-name="Link">
      <Container27 />
      <Container28 />
    </div>
  );
}

function Container29() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p1a881780} fill="var(--fill-0, #64748B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#64748b] text-[10px] tracking-[1px] uppercase w-[45.06px]">
        <p className="leading-[15px]">Profile</p>
      </div>
    </div>
  );
}

function Link7() {
  return (
    <div className="absolute bottom-[16px] content-stretch flex flex-col gap-[4px] items-center left-[320.92px]" data-name="Link">
      <Container29 />
      <Container30 />
    </div>
  );
}

function Container32() {
  return (
    <div className="relative shrink-0 size-[17.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.5 17.5">
        <g id="Container">
          <path d={svgPaths.p2f5d9c00} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#c62828] content-stretch flex items-center justify-center relative rounded-[12px] shadow-[0px_0px_20px_0px_rgba(198,40,40,0.5)] shrink-0 size-[56px]" data-name="Button">
      <Container32 />
    </div>
  );
}

function Container31() {
  return (
    <div className="absolute bottom-[40px] content-stretch flex flex-col items-start left-[152.13px]" data-name="Container">
      <Button3 />
    </div>
  );
}

function BottomNav() {
  return (
    <div className="absolute backdrop-blur-[6px] bg-[rgba(35,15,20,0.95)] bottom-0 h-[89px] left-0 max-w-[448px] right-0" data-name="Bottom Nav">
      <div aria-hidden="true" className="absolute border-[rgba(198,40,40,0.3)] border-solid border-t inset-0 pointer-events-none" />
      <Link4 />
      <Link5 />
      <Link6 />
      <Link7 />
      <Container31 />
    </div>
  );
}

export default function VhdsgnEventBookingVibrant() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="vhdsgn - Event Booking (Vibrant)">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute bg-[#230f14] inset-0 mix-blend-overlay" />
        <div className="absolute inset-0 mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 390 2106\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(150.69 0 0 150.69 312 1474.2)\\'><stop stop-color=\\'rgba(198,40,40,0.1)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(198,40,40,0)\\' offset=\\'0.5\\'/></radialGradient></defs></svg>')" }} />
        <div className="absolute inset-0 mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 390 2106\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(150.69 0 0 150.69 78 631.8)\\'><stop stop-color=\\'rgba(198,40,40,0.15)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(198,40,40,0)\\' offset=\\'0.5\\'/></radialGradient></defs></svg>')" }} />
        <div className="absolute inset-0 mix-blend-overlay overflow-hidden">
          <img alt="" className="absolute h-full left-0 max-w-none top-0 w-[540%]" src={imgVhdsgnEventBookingVibrant} />
        </div>
      </div>
      <BackgroundBorderShadow />
      <BottomNav />
    </div>
  );
}