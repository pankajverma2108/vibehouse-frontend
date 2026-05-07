"use client";

import { Activity, Fingerprint, Lock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type ReflectiveCardProps = {
  name: string;
  roleLabel?: string;
  idLabel?: string;
  backgroundMode?: "gradient" | "flat";
  backgroundColor?: string;
  blurStrength?: number;
  color?: string;
  metalness?: number;
  roughness?: number;
  overlayColor?: string;
  displacementStrength?: number;
  noiseScale?: number;
  specularConstant?: number;
  grayscale?: number;
  glassDistortion?: number;
  useCamera?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function ReflectiveCard({
  name,
  roleLabel = "Daily Passport",
  idLabel = "ID",
  backgroundMode = "flat",
  backgroundColor = "#07070a",
  blurStrength = 12,
  color = "#ffffff",
  metalness = 1,
  roughness = 0.75,
  overlayColor = "rgba(0, 0, 0, 0.2)",
  displacementStrength = 20,
  noiseScale = 1,
  specularConstant = 5,
  grayscale = 0.15,
  glassDistortion = 30,
  useCamera = false,
  className = "",
  style = {},
}: ReflectiveCardProps) {
  const filterId = useId().replace(/:/g, "");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);

  useEffect(() => {
    if (!useCamera) {
      return;
    }

    let stream: MediaStream | null = null;

    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch {
        setStreamActive(false);
      }
    };

    void startWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [useCamera]);

  const baseFrequency = 0.03 / Math.max(0.1, noiseScale);
  const saturation = 1 - Math.max(0, Math.min(1, grayscale));

  return (
    <div
      className={`relative isolate h-[500px] w-[320px] overflow-hidden rounded-[20px] bg-transparent font-sans shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)_inset] ${className}`}
      style={{ backgroundColor, ...style }}
    >
      <svg className="pointer-events-none absolute h-0 w-0 opacity-0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency={baseFrequency} numOctaves="2" result="noise" />
            <feColorMatrix in="noise" type="luminanceToAlpha" result="noiseAlpha" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={displacementStrength}
              xChannelSelector="R"
              yChannelSelector="G"
              result="rippled"
            />
            <feSpecularLighting
              in="noiseAlpha"
              surfaceScale={displacementStrength}
              specularConstant={specularConstant}
              specularExponent="20"
              lightingColor="#ffffff"
              result="light"
            >
              <fePointLight x="0" y="0" z="300" />
            </feSpecularLighting>
            <feComposite in="light" in2="rippled" operator="in" result="lightEffect" />
            <feBlend in="lightEffect" in2="rippled" mode="screen" result="metallicResult" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="solidAlpha"
            />
            <feMorphology in="solidAlpha" operator="erode" radius="45" result="erodedAlpha" />
            <feGaussianBlur in="erodedAlpha" stdDeviation="10" result="blurredMap" />
            <feComponentTransfer in="blurredMap" result="glassMap">
              <feFuncA type="linear" slope="0.5" intercept="0" />
            </feComponentTransfer>
            <feDisplacementMap
              in="metallicResult"
              in2="glassMap"
              scale={glassDistortion}
              xChannelSelector="A"
              yChannelSelector="A"
              result="final"
            />
          </filter>
        </defs>
      </svg>

      {backgroundMode === "gradient" ? (
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(110% 100% at 22% 8%, rgba(255,125,95,0.34) 0%, rgba(255,125,95,0.06) 35%, rgba(0,0,0,0.62) 100%)",
          }}
        />
      ) : (
        <div className="absolute inset-0 z-0" style={{ backgroundColor }} />
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute left-0 top-0 z-0 h-full w-full object-cover opacity-90 transition-[filter] duration-300"
        style={{
          transform: "scale(1.2) scaleX(-1)",
          display: streamActive ? "block" : "none",
          filter: `saturate(${saturation}) contrast(120%) brightness(110%) blur(${blurStrength}px) url(#${filterId})`,
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.75] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} />

      {backgroundMode === "gradient" ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay"
          style={{
            opacity: metalness,
            background:
              "linear-gradient(135deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.1)_40%,rgba(255,255,255,0)_50%,rgba(255,255,255,0.1)_60%,rgba(255,255,255,0.3)_100%)",
          }}
        />
      ) : null}

      {backgroundMode === "gradient" ? (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[20px] p-[1px] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]" style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.6)_100%)" }} />
      ) : (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[20px] border border-white/20" />
      )}

      <div
        className="relative z-30 flex h-full flex-col justify-between p-8"
        style={{
          color,
          backgroundColor: overlayColor,
          opacity: Math.max(0.2, Math.min(1, roughness + 0.25)),
        }}
      >
        <div className="flex items-center justify-between border-b border-white/20 pb-4">
          <div className="flex items-center gap-1.5 rounded border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold tracking-[0.1em]">
            <Lock size={14} className="opacity-80" />
            <span>YOUR &apos;SOCIAL&apos; CARD, MAYBE?</span>
          </div>
          <Activity className="opacity-80" size={20} />
        </div>

        <div className="mb-8 flex flex-1 flex-col items-center justify-end gap-6 text-center">
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-[0.05em] drop-shadow-md font-['Geologica']">{name}</h2>
            <p className="m-0 text-xs uppercase tracking-[0.2em] opacity-70">{roleLabel}</p>
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-white/20 pt-6">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] tracking-[0.1em] opacity-60">ID NUMBER</span>
            <span className="font-mono text-sm tracking-[0.05em]">{idLabel}</span>
          </div>
          <div className="opacity-40">
            <Fingerprint size={32} />
          </div>
        </div>
      </div>
    </div>
  );
}
