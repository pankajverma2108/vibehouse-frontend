export function getDefaultMoveInDate(): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 14);

  return toIsoDate(date);
}

export function toIsoDate(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatColiveDate(value?: string | null): string {
  if (!value) {
    return "TBA";
  }

  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatColiveMoney(amount?: number | null, currency = "INR"): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "Pricing pending";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
