import type { FeedbackLookupResponse } from "@/lib/feedback-api";

export const FEEDBACK_PREVIEW_SCENARIOS = [
  "valid",
  "submitted",
  "used",
  "expired",
  "invalid",
  "unavailable",
] as const;

export type FeedbackPreviewScenario = (typeof FEEDBACK_PREVIEW_SCENARIOS)[number];

export type FeedbackPreviewConfig = {
  scenario: FeedbackPreviewScenario;
  label: string;
  description: string;
  feedback: FeedbackLookupResponse | null;
  loadError?: string | null;
  didSubmit?: boolean;
  rating?: number;
  comment?: string;
};

const baseFeedback: FeedbackLookupResponse = {
  ok: true,
  state: "valid",
  brand: "TDS",
  room_no: "101 A",
  request: "a fresh towel",
  staff_name: "Upamanyu",
  submitted_at: null,
  submitted_at_ist: null,
};

const previewConfigs: Record<FeedbackPreviewScenario, FeedbackPreviewConfig> = {
  valid: {
    scenario: "valid",
    label: "Valid Form",
    description: "The live rating form with a valid token context.",
    feedback: baseFeedback,
  },
  submitted: {
    scenario: "submitted",
    label: "Submitted Success",
    description: "Success state after a guest submits a 5-star response.",
    feedback: baseFeedback,
    didSubmit: true,
    rating: 5,
    comment: "Quick response and handled properly.",
  },
  used: {
    scenario: "used",
    label: "Already Used",
    description: "The token has already been consumed.",
    feedback: {
      ...baseFeedback,
      ok: false,
      state: "used",
      submitted_at: "2026-07-04T12:15:12.345Z",
      submitted_at_ist: "2026-07-04 17:45:12.345 IST",
    },
  },
  expired: {
    scenario: "expired",
    label: "Expired",
    description: "The feedback window has closed.",
    feedback: {
      ...baseFeedback,
      ok: false,
      state: "expired",
    },
  },
  invalid: {
    scenario: "invalid",
    label: "Invalid Link",
    description: "The token cannot be verified.",
    feedback: {
      ok: false,
      state: "not_found",
      brand: "TDS",
      room_no: null,
      request: null,
      staff_name: null,
      submitted_at: null,
      submitted_at_ist: null,
    },
  },
  unavailable: {
    scenario: "unavailable",
    label: "Service Unavailable",
    description: "The FE cannot reach the feedback API.",
    feedback: null,
    loadError: "Mocked preview: the feedback service did not respond. Retry keeps you on the same scenario.",
  },
};

export function isFeedbackPreviewScenario(
  value: string,
): value is FeedbackPreviewScenario {
  return FEEDBACK_PREVIEW_SCENARIOS.includes(value as FeedbackPreviewScenario);
}

export function getFeedbackPreviewConfig(
  scenario: FeedbackPreviewScenario,
): FeedbackPreviewConfig {
  return previewConfigs[scenario];
}

