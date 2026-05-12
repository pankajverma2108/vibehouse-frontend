type SelectionSource = "nightly" | "colive";

type PropertySelectionState = {
  version: 1;
  updatedAt: number;
  source: SelectionSource;
  propertyId: string;
  checkin: string;
  checkout: string;
  selectedCounts: Record<string, number>;
  isAgeConfirmed: boolean;
  signature: string;
};

type ReviewResumeIntent = {
  version: 1;
  updatedAt: number;
  source: SelectionSource;
  propertyId: string;
  checkin: string;
  checkout: string;
  signature: string;
};

const PROPERTY_SELECTION_KEY = "vh_property_selection_v1";
const REVIEW_RESUME_KEY = "vh_review_resume_v1";
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isExpired(updatedAt: number): boolean {
  return Date.now() - updatedAt > STORAGE_TTL_MS;
}

function normalizeCounts(input: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, Math.max(0, Math.floor(value))] as const)
      .filter((entry) => entry[1] > 0),
  );
}

function writeBoth(key: string, value: string): void {
  window.sessionStorage.setItem(key, value);
  window.localStorage.setItem(key, value);
}

function removeBoth(key: string): void {
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

function readWithFallback(key: string): string | null {
  return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
}

export function buildSelectionSignature(params: {
  source: SelectionSource;
  propertyId: string;
  checkin: string;
  checkout: string;
  selectedCounts: Record<string, number>;
}): string {
  const counts = normalizeCounts(params.selectedCounts);
  const serializedCounts = Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
  return [params.source, params.propertyId.trim(), params.checkin.trim(), params.checkout.trim(), serializedCounts].join("::");
}

export function savePropertySelection(state: Omit<PropertySelectionState, "version" | "updatedAt" | "selectedCounts"> & {
  selectedCounts: Record<string, number>;
}): void {
  if (!isBrowser()) {
    return;
  }

  const payload: PropertySelectionState = {
    version: 1,
    updatedAt: Date.now(),
    ...state,
    selectedCounts: normalizeCounts(state.selectedCounts),
  };
  writeBoth(PROPERTY_SELECTION_KEY, JSON.stringify(payload));
}

export function getPropertySelection(source: SelectionSource): PropertySelectionState | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = readWithFallback(PROPERTY_SELECTION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PropertySelectionState;
    if (
      parsed.version !== 1 ||
      parsed.source !== source ||
      typeof parsed.propertyId !== "string" ||
      typeof parsed.checkin !== "string" ||
      typeof parsed.checkout !== "string" ||
      typeof parsed.updatedAt !== "number" ||
      typeof parsed.signature !== "string" ||
      typeof parsed.isAgeConfirmed !== "boolean" ||
      !parsed.selectedCounts ||
      typeof parsed.selectedCounts !== "object"
    ) {
      return null;
    }

    if (isExpired(parsed.updatedAt)) {
      clearPropertySelection();
      return null;
    }

    return {
      ...parsed,
      selectedCounts: normalizeCounts(parsed.selectedCounts),
    };
  } catch {
    return null;
  }
}

export function clearPropertySelection(): void {
  if (!isBrowser()) {
    return;
  }
  removeBoth(PROPERTY_SELECTION_KEY);
}

export function saveReviewResumeIntent(intent: Omit<ReviewResumeIntent, "version" | "updatedAt">): void {
  if (!isBrowser()) {
    return;
  }
  const payload: ReviewResumeIntent = {
    version: 1,
    updatedAt: Date.now(),
    ...intent,
  };
  writeBoth(REVIEW_RESUME_KEY, JSON.stringify(payload));
}

export function consumeReviewResumeIntent(source: SelectionSource): ReviewResumeIntent | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = readWithFallback(REVIEW_RESUME_KEY);
  if (!raw) {
    return null;
  }

  removeBoth(REVIEW_RESUME_KEY);

  try {
    const parsed = JSON.parse(raw) as ReviewResumeIntent;
    if (
      parsed.version !== 1 ||
      parsed.source !== source ||
      typeof parsed.updatedAt !== "number" ||
      typeof parsed.propertyId !== "string" ||
      typeof parsed.checkin !== "string" ||
      typeof parsed.checkout !== "string" ||
      typeof parsed.signature !== "string"
    ) {
      return null;
    }
    if (isExpired(parsed.updatedAt)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
