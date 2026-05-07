"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraOff, LoaderCircle } from "lucide-react";

type QrScannerProps = {
  active: boolean;
  onScanSuccess: (decodedText: string) => void;
  onStatusChange?: (status: string) => void;
  onError?: (message: string) => void;
};

export function QrScanner({
  active,
  onScanSuccess,
  onStatusChange,
  onError,
}: QrScannerProps) {
  const scannerRegionId = useMemo(
    () => `aadhaar-secure-qr-${Math.random().toString(36).slice(2, 11)}`,
    [],
  );
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null,
  );
  const [booting, setBooting] = useState(false);
  const [status, setStatus] = useState("Adjusting focus...");

  const publishStatus = useCallback(
    (value: string) => {
      setStatus(value);
      onStatusChange?.(value);
    },
    [onStatusChange],
  );

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) {
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // Ignore stop errors during teardown.
    }

    try {
      scanner.clear();
    } catch {
      // Ignore clear errors during teardown.
    }
  }, []);

  useEffect(() => {
    if (!active) {
      void stopScanner();
      return;
    }

    let cancelled = false;

    const bootScanner = async () => {
      setBooting(true);
      publishStatus("Adjusting focus...");

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) {
          return;
        }

        const scanner = new Html5Qrcode(scannerRegionId, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
          },
          (decodedText) => {
            publishStatus("Scanning complete.");
            onScanSuccess(decodedText);
            void stopScanner();
          },
          () => {
            publishStatus("Adjusting focus...");
          },
        );
      } catch {
        const errorMessage = "Camera access failed. Check browser permission and try again.";
        publishStatus(errorMessage);
        onError?.(errorMessage);
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    };

    void bootScanner();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [active, onError, onScanSuccess, publishStatus, scannerRegionId, stopScanner]);

  if (!active) {
    return null;
  }

  return (
    <div className="rounded-[14px] border border-white/10 bg-[#161616] p-3">
      <div className="relative overflow-hidden rounded-[12px] border border-white/10 bg-black">
        <div
          id={scannerRegionId}
          className="h-[280px] w-full [&>div]:h-full [&>div]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[200px] w-[200px] rounded-[18px] border-2 border-[var(--vh-pink)] shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]" />
        </div>

        {booting ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs text-white/85">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Starting camera
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-[#99A1AF]">
        <CameraOff className="h-3.5 w-3.5" />
        <span aria-live="polite">{status}</span>
      </div>
    </div>
  );
}
