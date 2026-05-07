"use client";

/**
 * useDownloadReceipt
 *
 * Encapsulates the full receipt download flow:
 *   1. Fetches receipt data from GET /guest/booking/receipt/:id
 *   2. Generates a PDF blob in-browser via @react-pdf/renderer
 *   3. Triggers a browser download of `receipt-<bookingId>.pdf`
 *
 * Falls back gracefully when the API is not yet available:
 *   - On a 404 or network error the hook surfaces a user-friendly error message
 *     and never crashes the booking confirmation page.
 *
 * Usage:
 *   const { downloadReceipt, isGenerating, error } = useDownloadReceipt(ezeeReservationId);
 *   <button onClick={downloadReceipt} disabled={isGenerating}>Download Receipt</button>
 */

import { useCallback, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement, JSXElementConstructor } from "react";
import React from "react";

import { fetchBookingReceipt } from "@/lib/receipt-api";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { toSafeErrorMessage } from "@/lib/ui-error";
import { BookingReceiptPDF } from "@/components/booking/booking-receipt-pdf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UseDownloadReceiptReturn = {
  /** Trigger the download. Safe to call multiple times. */
  downloadReceipt: () => Promise<void>;
  /** True while the API call + PDF generation are in progress. */
  isGenerating: boolean;
  /** Non-null when the last attempt failed. Cleared on next call. */
  error: string | null;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDownloadReceipt(
  ezeeReservationId: string,
): UseDownloadReceiptReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadReceipt = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const token = getStoredGuestToken();

      if (typeof token !== "string" || token.length === 0) {
        throw new Error("You must be signed in to download your receipt.");
      }

      // 1. Fetch data from API
      const receiptData = await fetchBookingReceipt(token, ezeeReservationId);

      // 2. Generate PDF blob in-browser
      // Cast is required because BookingReceiptPDF wraps <Document> internally;
      // @react-pdf/renderer's pdf() overload expects ReactElement<DocumentProps>.
      const pdfElement = React.createElement(
        BookingReceiptPDF,
        { data: receiptData },
      ) as unknown as ReactElement<DocumentProps, JSXElementConstructor<DocumentProps>>;

      const blob = await pdf(pdfElement).toBlob();

      // 3. Trigger browser download
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receipt-${receiptData.booking_id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Clean up the object URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10_000);
    } catch (err) {
      setError(
        toSafeErrorMessage(
          err,
          "Could not generate your receipt right now. Please try again or contact support.",
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [ezeeReservationId]);

  return { downloadReceipt, isGenerating, error };
}
