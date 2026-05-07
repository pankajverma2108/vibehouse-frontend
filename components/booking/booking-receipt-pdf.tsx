"use client";

/**
 * BookingReceiptPDF
 *
 * A @react-pdf/renderer document that mirrors the design in
 * guidelines/TicketReceiptPage.tsx.
 *
 * Design tokens:
 *  - Background black:  #000000
 *  - Hero red strip:    #c62828
 *  - White card:        #ffffff
 *  - Footer black:      #000000
 *  - Font:              Geologica (loaded via @react-pdf/renderer Font.register)
 *
 * Layout (A4 portrait, 595pt wide):
 *  ┌──────────────────────────────────────────┐
 *  │ [64pt black side strip]  MAIN CONTENT    │
 *  │                          ├ Hero red      │
 *  │                          ├ Property block│
 *  │                          ├ Dashed div    │
 *  │                          ├ Stay grid     │
 *  │                          ├ Guest block   │
 *  │                          ├ QR + footer   │
 *  │                          └ Payment strip │
 *  └──────────────────────────────────────────┘
 */

import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { BookingReceiptData } from "@/lib/receipt-api";

// ---------------------------------------------------------------------------
// Font registration — Geologica via Google Fonts CDN
// ---------------------------------------------------------------------------

Font.register({
  family: "Geologica",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/geologica/v1/oY1l8evIr7j9P3kazFO1MsHgc_eFfnYFnbYv6zmE0dF0.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/geologica/v1/oY1l8evIr7j9P3kazFO1MsHgc_eFfnYFnbYv9jmE0dF0.woff2",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/geologica/v1/oY1l8evIr7j9P3kazFO1MsHgc_eFfnYFnbYv7zmE0dF0.woff2",
      fontWeight: 900,
    },
  ],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDisplayDate(isoString?: string | null): string {
  if (!isoString) return "TBA";
  const d = new Date(`${isoString.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "TBA";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatGeneratedDate(): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function buildQrUrl(bookingId: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=vibehouse-${encodeURIComponent(bookingId)}`;
}

// ---------------------------------------------------------------------------
// StyleSheet — A4 595pt × 842pt
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    fontFamily: "Geologica",
    backgroundColor: "#0a0a0a",
    flexDirection: "row",
    width: 595,
    minHeight: 842,
  },

  // ── Side strip ────────────────────────────────────────────────────────
  sideStrip: {
    width: 64,
    backgroundColor: "#000000",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  sideTextWrapper: {
    transform: "rotate(-90deg)",
    // react-pdf does not support rotate on text directly; we use a View
    width: 280,
    flexDirection: "row",
    gap: 28,
    justifyContent: "center",
  },
  sideText: {
    fontSize: 7,
    color: "#9ca3af",
    letterSpacing: 2.4,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  hole: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0a0a0a",
    right: -6,
  },
  holeTop: { top: 48 },
  holeBottom: { bottom: 48 },

  // ── Main column ───────────────────────────────────────────────────────
  main: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },

  // ── Hero strip ────────────────────────────────────────────────────────
  hero: {
    backgroundColor: "#c62828",
    paddingHorizontal: 40,
    paddingVertical: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logoBox: {
    width: 44,
    height: 44,
    backgroundColor: "#000000",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1,
  },
  heroRight: {
    alignItems: "flex-end",
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: 900,
    color: "#000000",
    lineHeight: 1,
    letterSpacing: -1,
    textTransform: "uppercase",
    textAlign: "right",
  },
  heroSubtitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "rgba(0,0,0,0.7)",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginTop: 6,
  },

  // ── Body ──────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 40,
    paddingVertical: 36,
    flex: 1,
    flexDirection: "column",
  },

  // ── Property block ────────────────────────────────────────────────────
  propertyName: {
    fontSize: 28,
    fontWeight: 900,
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: -0.5,
    lineHeight: 1,
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: 700,
    letterSpacing: 0.5,
  },

  // ── Dashed divider ────────────────────────────────────────────────────
  dashedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  dashedLine: {
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: "#d1d5db",
    borderStyle: "dashed",
  },
  cutoutCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0a0a0a",
    marginHorizontal: -10,
  },

  // ── Stay grid 2-col ───────────────────────────────────────────────────
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginBottom: 28,
  },
  gridCell: {
    width: "50%",
    paddingBottom: 24,
  },
  gridLabel: {
    fontSize: 7,
    color: "#9ca3af",
    fontWeight: 700,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 18,
    fontWeight: 900,
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: -0.5,
    lineHeight: 1,
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 9,
    color: "#6b7280",
    fontWeight: 700,
  },

  // ── Guest block ───────────────────────────────────────────────────────
  passengerLabel: {
    fontSize: 7,
    color: "#9ca3af",
    fontWeight: 700,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  passengerName: {
    fontSize: 22,
    fontWeight: 900,
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },

  // ── Line items table ──────────────────────────────────────────────────
  lineItemsSection: {
    marginTop: 20,
    marginBottom: 12,
  },
  lineItemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
    marginBottom: 6,
  },
  lineItemsHeaderText: {
    fontSize: 7,
    fontWeight: 700,
    color: "#9ca3af",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  lineItemDesc: {
    fontSize: 9,
    color: "#374151",
    flex: 1,
  },
  lineItemAmt: {
    fontSize: 9,
    color: "#374151",
    fontWeight: 700,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  priceLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  priceValue: {
    fontSize: 9,
    color: "#374151",
    fontWeight: 700,
  },
  priceDivider: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginVertical: 5,
  },
  priceTotalLabel: {
    fontSize: 10,
    color: "#111827",
    fontWeight: 900,
  },
  priceTotalValue: {
    fontSize: 10,
    color: "#111827",
    fontWeight: 900,
  },

  // ── QR + footer ───────────────────────────────────────────────────────
  qrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 24,
  },
  footerMeta: {
    gap: 4,
  },
  footerMetaText: {
    fontSize: 7,
    color: "#9ca3af",
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  qrWrapper: {
    alignItems: "center",
    gap: 4,
  },
  qrBox: {
    width: 72,
    height: 72,
    borderWidth: 2.5,
    borderColor: "#111827",
    padding: 4,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrCaption: {
    fontSize: 6,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#6b7280",
    textAlign: "center",
  },

  // ── T&C section ───────────────────────────────────────────────────────
  tncSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  tncTitle: {
    fontSize: 7,
    fontWeight: 700,
    color: "#9ca3af",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  tncItem: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 3,
  },
  tncBullet: {
    fontSize: 7,
    color: "#9ca3af",
  },
  tncText: {
    fontSize: 7,
    color: "#6b7280",
    flex: 1,
    lineHeight: 1.5,
  },

  // ── Payment footer strip ──────────────────────────────────────────────
  paymentStrip: {
    backgroundColor: "#000000",
    paddingHorizontal: 40,
    paddingVertical: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#9ca3af",
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 900,
    color: "#ffffff",
    letterSpacing: -1,
    lineHeight: 1,
  },
  paymentRef: {
    alignItems: "flex-end",
    gap: 3,
  },
  paymentRefLabel: {
    fontSize: 7,
    color: "#6b7280",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  paymentRefValue: {
    fontSize: 9,
    color: "#d1d5db",
    fontWeight: 700,
  },
});

// ---------------------------------------------------------------------------
// Default T&C (fallback when API does not send terms)
// ---------------------------------------------------------------------------

const DEFAULT_TERMS = [
  "All guests must carry a valid government-issued photo ID at check-in.",
  "Check-in: 1:00 PM | Check-out: 10:00 AM. Late check-out subject to availability.",
  "No-shows and early departures may be treated as fully chargeable stays.",
  "Outside visitors are not permitted beyond designated guest areas without prior approval.",
  "The property reserves the right to update operational guidelines for guest safety and comfort.",
  "Cancellations within 48 hours of check-in are non-refundable unless otherwise stated in the booking.",
  "Disputes are subject to the jurisdiction of Bengaluru, Karnataka, India.",
];

// ---------------------------------------------------------------------------
// Document component
// ---------------------------------------------------------------------------

interface BookingReceiptPDFProps {
  data: BookingReceiptData;
}

export function BookingReceiptPDF({ data }: BookingReceiptPDFProps) {
  const terms = (data.terms && data.terms.length > 0) ? data.terms : DEFAULT_TERMS;

  return (
    <Document
      title={`Receipt – ${data.booking_id}`}
      author={data.property_name}
      subject="Booking Confirmation Receipt"
      creator="The Daily Social"
    >
      <Page size="A4" style={s.page}>
        {/* ── Side strip ──────────────────────────────────────────── */}
        <View style={s.sideStrip}>
          <View style={s.sideTextWrapper}>
            <Text style={s.sideText}>BOOKING ID — {data.booking_id}</Text>
            <Text style={s.sideText}>CONFIRMATION — {data.confirmation_code}</Text>
          </View>
          <View style={[s.hole, s.holeTop]} />
          <View style={[s.hole, s.holeBottom]} />
        </View>

        {/* ── Main column ─────────────────────────────────────────── */}
        <View style={s.main}>

          {/* Hero strip */}
          <View style={s.hero}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>TDS</Text>
            </View>
            <View style={s.heroRight}>
              <Text style={s.heroTitle}>{"Booking\nConfirmed"}</Text>
              <Text style={s.heroSubtitle}>Your stay is locked in</Text>
            </View>
          </View>

          {/* Body */}
          <View style={s.body}>

            {/* Property */}
            <Text style={s.propertyName}>{data.property_name}</Text>
            <Text style={s.propertyAddress}>{data.property_address}</Text>

            {/* Dashed divider with cutouts */}
            <View style={s.dashedRow}>
              <View style={s.cutoutCircle} />
              <View style={s.dashedLine} />
              <View style={s.cutoutCircle} />
            </View>

            {/* Stay grid */}
            <View style={s.grid2}>
              <View style={s.gridCell}>
                <Text style={s.gridLabel}>Check-in</Text>
                <Text style={s.gridValue}>{formatDisplayDate(data.checkin_date)}</Text>
                <Text style={s.gridSub}>{data.checkin_time}</Text>
              </View>
              <View style={s.gridCell}>
                <Text style={s.gridLabel}>Check-out</Text>
                <Text style={s.gridValue}>{formatDisplayDate(data.checkout_date)}</Text>
                <Text style={s.gridSub}>{data.checkout_time}</Text>
              </View>
              <View style={s.gridCell}>
                <Text style={s.gridLabel}>Guests</Text>
                <Text style={[s.gridValue, { fontSize: 14 }]}>
                  {data.no_of_guests} {data.no_of_guests === 1 ? "Adult" : "Adults"}
                </Text>
              </View>
              <View style={s.gridCell}>
                <Text style={s.gridLabel}>Duration</Text>
                <Text style={[s.gridValue, { fontSize: 14 }]}>
                  {data.no_of_nights} {data.no_of_nights === 1 ? "Night" : "Nights"}
                </Text>
              </View>
              <View style={s.gridCell}>
                <Text style={s.gridLabel}>Room Type</Text>
                <Text style={[s.gridValue, { fontSize: 11, letterSpacing: 0 }]}>
                  {data.room_type_name}
                </Text>
              </View>
              {data.room_number ? (
                <View style={s.gridCell}>
                  <Text style={s.gridLabel}>Room No.</Text>
                  <Text style={[s.gridValue, { fontSize: 14 }]}>{data.room_number}</Text>
                </View>
              ) : null}
            </View>

            {/* Guest */}
            <Text style={s.passengerLabel}>Passenger</Text>
            <Text style={s.passengerName}>{data.guest_name}</Text>

            {/* Line items / price breakdown */}
            <View style={s.lineItemsSection}>
              {data.line_items.length > 0 ? (
                <>
                  <View style={s.lineItemsHeader}>
                    <Text style={s.lineItemsHeaderText}>Description</Text>
                    <Text style={s.lineItemsHeaderText}>Amount</Text>
                  </View>
                  {data.line_items.map((item, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <View key={idx} style={s.lineItem}>
                      <Text style={s.lineItemDesc}>
                        {item.description}
                        {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                      </Text>
                      <Text style={s.lineItemAmt}>
                        {formatCurrency(item.line_total, data.currency)}
                      </Text>
                    </View>
                  ))}
                  <View style={s.priceDivider} />
                </>
              ) : null}

              <View style={s.priceRow}>
                <Text style={s.priceLabel}>Room charges</Text>
                <Text style={s.priceValue}>{formatCurrency(data.subtotal_rooms, data.currency)}</Text>
              </View>
              {data.subtotal_addons > 0 ? (
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Add-on charges</Text>
                  <Text style={s.priceValue}>{formatCurrency(data.subtotal_addons, data.currency)}</Text>
                </View>
              ) : null}
              <View style={s.priceRow}>
                <Text style={s.priceLabel}>Taxes & fees</Text>
                <Text style={s.priceValue}>{formatCurrency(data.taxes, data.currency)}</Text>
              </View>
              <View style={s.priceDivider} />
              <View style={s.priceRow}>
                <Text style={s.priceTotalLabel}>Grand Total</Text>
                <Text style={s.priceTotalValue}>{formatCurrency(data.grand_total, data.currency)}</Text>
              </View>
              {data.amount_paid > 0 ? (
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Amount paid</Text>
                  <Text style={s.priceValue}>− {formatCurrency(data.amount_paid, data.currency)}</Text>
                </View>
              ) : null}
              {data.amount_due > 0 ? (
                <View style={s.priceRow}>
                  <Text style={s.priceTotalLabel}>Balance due</Text>
                  <Text style={s.priceTotalValue}>{formatCurrency(data.amount_due, data.currency)}</Text>
                </View>
              ) : null}
            </View>

            {/* T&C */}
            <View style={s.tncSection}>
              <Text style={s.tncTitle}>Terms, Rules & Conditions</Text>
              {terms.map((line, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <View key={idx} style={s.tncItem}>
                  <Text style={s.tncBullet}>•</Text>
                  <Text style={s.tncText}>{line}</Text>
                </View>
              ))}
            </View>

            {/* QR + meta footer */}
            <View style={s.qrRow}>
              <View style={s.footerMeta}>
                <Text style={s.footerMetaText}>Generated on {formatGeneratedDate()}</Text>
                <Text style={s.footerMetaText}>{data.property_email}</Text>
                {data.payment_id ? (
                  <Text style={s.footerMetaText}>Payment ref: {data.payment_id}</Text>
                ) : null}
              </View>

              <View style={s.qrWrapper}>
                <View style={s.qrBox}>
                  <Image
                    style={s.qrImage}
                    src={buildQrUrl(data.booking_id)}
                  />
                </View>
                <Text style={s.qrCaption}>Scan to view booking</Text>
              </View>
            </View>
          </View>

          {/* Payment footer strip */}
          <View style={s.paymentStrip}>
            <View>
              <Text style={s.totalLabel}>Total Paid</Text>
              <Text style={s.totalAmount}>
                {formatCurrency(data.amount_paid > 0 ? data.amount_paid : data.grand_total, data.currency)}
              </Text>
            </View>
            <View style={s.paymentRef}>
              {data.payment_method ? (
                <>
                  <Text style={s.paymentRefLabel}>Payment Method</Text>
                  <Text style={s.paymentRefValue}>{data.payment_method}</Text>
                </>
              ) : null}
              <Text style={s.paymentRefLabel}>Booking ID</Text>
              <Text style={s.paymentRefValue}>{data.booking_id}</Text>
            </View>
          </View>

        </View>
      </Page>
    </Document>
  );
}
