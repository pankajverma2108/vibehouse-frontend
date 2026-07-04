import {
  getApiBaseUrl,
  getRequestContextHeaders,
  parseApiError,
} from "@/lib/vibehouse-api";

export type FeedbackState = "valid" | "used" | "expired" | "not_found";
export type FeedbackBrand = "TDS" | "BUTEAK";

export type FeedbackLookupResponse = {
  ok: boolean;
  state: FeedbackState;
  brand?: FeedbackBrand | null;
  room_no?: string | null;
  request?: string | null;
  staff_name?: string | null;
  submitted_at?: string | null;
  submitted_at_ist?: string | null;
};

export type FeedbackSubmitResponse = {
  ok: boolean;
  state: FeedbackState;
  brand?: FeedbackBrand | null;
  submitted_at?: string | null;
  submitted_at_ist?: string | null;
};

export type SubmitFeedbackPayload = {
  rating: number;
  comment?: string;
};

export type FeedbackRequestResult<T> =
  | {
      ok: true;
      status: number;
      data: T;
    }
  | {
      ok: false;
      status: number;
      data: T | null;
      message: string;
      retryable: boolean;
    };

function isFeedbackState(value: unknown): value is FeedbackState {
  return value === "valid" || value === "used" || value === "expired" || value === "not_found";
}

function normalizeFeedbackPayload<T extends FeedbackLookupResponse | FeedbackSubmitResponse>(
  payload: unknown,
): T | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const state = (payload as { state?: unknown }).state;

  if (!isFeedbackState(state)) {
    return null;
  }

  return payload as T;
}

async function readJsonPayload(response: Response): Promise<unknown> {
  const rawText = await response.text();

  if (!rawText.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function resolveFeedbackErrorMessage(
  state: FeedbackState | null,
  fallback: string,
): string {
  if (state === "used") {
    return "This feedback link has already been used.";
  }

  if (state === "expired") {
    return "This feedback link has expired.";
  }

  if (state === "not_found") {
    return "This feedback link is invalid.";
  }

  return fallback;
}

async function requestFeedback<T extends FeedbackLookupResponse | FeedbackSubmitResponse>(
  token: string,
  init?: {
    method?: "GET" | "POST";
    body?: SubmitFeedbackPayload;
  },
): Promise<FeedbackRequestResult<T>> {
  const path = `/public/feedback/${encodeURIComponent(token)}`;

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...getRequestContextHeaders(),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    const payload = await readJsonPayload(response);
    const normalized = normalizeFeedbackPayload<T>(payload);

    if (response.ok && normalized) {
      return {
        ok: true,
        status: response.status,
        data: normalized,
      };
    }

    const message = resolveFeedbackErrorMessage(
      normalized?.state ?? null,
      parseApiError(payload, "Request failed. Please try again."),
    );

    return {
      ok: false,
      status: response.status,
      data: normalized,
      message,
      retryable: response.status >= 500 || response.status === 0,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      message: "We couldn't reach the feedback service. Please try again.",
      retryable: true,
    };
  }
}

export function getPublicFeedback(token: string) {
  return requestFeedback<FeedbackLookupResponse>(token);
}

export function submitPublicFeedback(
  token: string,
  payload: SubmitFeedbackPayload,
) {
  return requestFeedback<FeedbackSubmitResponse>(token, {
    method: "POST",
    body: payload,
  });
}
