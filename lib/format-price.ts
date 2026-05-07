/**
 * Shared INR price formatting utility.
 *
 * DESIGN RULE: Always show exactly 2 decimal places for all monetary amounts.
 * e.g.  500  → "₹500.00"
 *      1299.5 → "₹1,299.50"
 *     12500   → "₹12,500.00"
 *
 * NEVER round prices on the frontend. If a value looks like a rounded integer
 * (e.g. 500 instead of 499.99) that means the backend is truncating —
 * see docs/be-price-decimal-handoff.md for the backend task.
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a number as INR currency with always-2 decimal places.
 * Returns "₹0.00" for non-finite inputs instead of throwing.
 *
 * @example
 *   formatINR(500)      → "₹500.00"
 *   formatINR(1299.5)   → "₹1,299.50"
 *   formatINR(12500)    → "₹12,500.00"
 */
export function formatINR(amount: number): string {
  return INR_FORMATTER.format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Formats a number as a plain rupee string (no ₹ symbol, no currency code).
 * Useful for template-literal contexts like `Rs. ${formatINRPlain(x)}`.
 *
 * @example
 *   formatINRPlain(500)    → "500.00"
 *   formatINRPlain(1299.5) → "1,299.50"
 */
export function formatINRPlain(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}
