"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Star } from "lucide-react";

import { GuestTextArea } from "@/components/guest/guest-form-fields";
import { Button } from "@/components/ui/button";
import {
  getPublicFeedback,
  submitPublicFeedback,
  type FeedbackLookupResponse,
  type FeedbackState,
} from "@/lib/feedback-api";
import {
  getFeedbackPreviewConfig,
  type FeedbackPreviewScenario,
} from "@/lib/feedback-preview";
import { cn } from "@/lib/utils";

type FeedbackPageProps = {
  token: string;
  previewScenario?: FeedbackPreviewScenario;
};

const MAX_COMMENT_LENGTH = 2000;
const RATING_VALUES = [1, 2, 3, 4, 5] as const;

function buildContextLine(feedback: FeedbackLookupResponse): string {
  const requestLabel = feedback.request?.trim();
  const roomLabel = feedback.room_no?.trim();

  if (requestLabel && roomLabel) {
    return `How was our help with ${requestLabel} in room ${roomLabel}?`;
  }

  if (requestLabel) {
    return `How was our help with ${requestLabel}?`;
  }

  if (roomLabel) {
    return `How was our help in room ${roomLabel}?`;
  }

  return "How was your support experience?";
}

function buildSupportLine(feedback: FeedbackLookupResponse): string {
  const staffName = feedback.staff_name?.trim() || "our team";
  return `Handled by ${staffName}.`;
}

function feedbackStateCopy(state: FeedbackState): {
  eyebrow: string;
  title: string;
  body: string;
} {
  switch (state) {
    case "used":
      return {
        eyebrow: "Already Submitted",
        title: "You've already rated this request.",
        body: "This completed request already has a response attached to it.",
      };
    case "expired":
      return {
        eyebrow: "Link Expired",
        title: "This feedback link has expired.",
        body: "The response window for this request has closed.",
      };
    case "not_found":
      return {
        eyebrow: "Invalid Link",
        title: "This feedback link is invalid.",
        body: "Please use the latest WhatsApp link for this ticket.",
      };
    default:
      return {
        eyebrow: "Service Feedback",
        title: "Rate the completed request.",
        body: "Your response is written back to the ticket.",
      };
  }
}

function FeedbackShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="min-h-screen bg-[#07070a] py-6 sm:py-8 md:py-12">
      <div className="vh-container px-4 sm:px-6">
        <div className="mx-auto max-w-[760px]">
          <header className="mb-4 flex items-center justify-between gap-3 border-b border-dashed border-white/14 pb-3 sm:mb-5 sm:gap-4 sm:pb-4">
            <Link
              aria-label="The Daily Social home"
              className="inline-flex items-center"
              href="/"
            >
              <span className="relative block h-[44px] w-[86px] sm:h-[52px] sm:w-[104px] md:h-[60px] md:w-[120px]">
                <Image
                  alt="The Daily Social"
                  fill
                  priority
                  src="/brands/tds/logo.png"
                  sizes="120px"
                  style={{ objectFit: "contain" }}
                />
              </span>
            </Link>
            <p className="font-caption text-right text-[11px] text-white/55 sm:text-xs">
              Service Feedback
            </p>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContextPanel({
  feedback,
  title,
  body,
}: {
  feedback: FeedbackLookupResponse | null;
  title: string;
  body: string;
}) {
  const isValidFeedback = feedback?.state === "valid";
  const displayTitle = isValidFeedback && feedback ? buildContextLine(feedback) : title;
  const displayBody = isValidFeedback && feedback ? buildSupportLine(feedback) : body;

  return (
    <div className="order-1 h-full">
      <div className="flex h-full flex-col rounded-[20px] border border-dashed border-[rgba(255,255,255,0.26)] bg-[#07070a] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.2)] sm:p-5 md:rounded-[22px] md:p-6">
        <div className="space-y-3 sm:space-y-4">
          <p className="font-caption text-white/55">The Daily Social</p>
          <h1 className="font-sectiontitle text-[25px] leading-[1.02] text-white sm:text-[32px] md:text-[42px]">
            {displayTitle}
          </h1>
          <p className="text-[15px] leading-7 text-white/72 sm:text-base">
            {displayBody}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="h-full">
      <div
        aria-busy="true"
        aria-live="polite"
        className="flex min-h-[280px] flex-col rounded-[20px] border border-dashed border-[rgba(255,255,255,0.26)] bg-[#07070a] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.2)] sm:min-h-[320px] sm:p-5 md:min-h-[420px] md:rounded-[22px] md:p-6"
        role="status"
      >
        <div className="my-auto text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#f9cb37]">
            Checking Link
          </p>
          <h2 className="font-sectiontitle mt-3 text-[22px] text-white">
            Validating this feedback request.
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/72">
            We are confirming the ticket context and token state.
          </p>
          <span className="vh-button-spinner mt-6 h-6 w-6 text-[#f9cb37]" />
        </div>
      </div>
    </div>
  );
}

function RetryPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="h-full">
      <div className="flex min-h-[280px] flex-col rounded-[20px] border border-dashed border-[rgba(255,255,255,0.26)] bg-[#07070a] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.2)] sm:min-h-[320px] sm:p-5 md:min-h-[420px] md:rounded-[22px] md:p-6">
        <div className="my-auto">
          <p className="font-caption text-white/55">Service Unavailable</p>
          <h2 className="font-sectiontitle mt-3 text-[22px] text-white">
            We couldn't load this feedback request.
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/72">
            {message}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="vh-cta-button h-11 px-5 text-sm"
              onClick={onRetry}
              type="button"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
            <Button
              asChild
              className="h-11 rounded-[14px] border border-white/12 bg-transparent px-5 text-sm font-bold uppercase text-white hover:bg-white/[0.05]"
              variant="outline"
            >
              <Link href="/">Back to site</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminalPanel({
  feedback,
  state,
}: {
  feedback: FeedbackLookupResponse | null;
  state: FeedbackState;
}) {
  const copy = feedbackStateCopy(state);

  return (
    <div className="h-full">
      <div className="flex min-h-[280px] flex-col rounded-[20px] border border-dashed border-[rgba(255,255,255,0.26)] bg-[#07070a] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.2)] sm:min-h-[320px] sm:p-5 md:min-h-[420px] md:rounded-[22px] md:p-6">
        <div className="my-auto">
          <p className="font-caption text-white/55">{copy.eyebrow}</p>
          <h2 className="font-sectiontitle mt-3 text-[22px] text-white sm:text-[24px]">
            {copy.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/72 sm:text-base">
            {copy.body}
          </p>

          {state === "used" && feedback?.submitted_at_ist ? (
            <p className="mt-4 text-sm leading-7 text-white/55">
              Submitted on {feedback.submitted_at_ist}
            </p>
          ) : null}

          <div className="mt-6">
            <Button
              asChild
              className="vh-cta-button h-11 px-5 text-sm"
            >
              <Link href="/">Back to The Daily Social</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessPanel({
  rating,
  comment,
}: {
  rating: number;
  comment: string;
}) {
  return (
    <div className="h-full">
      <div className="flex min-h-[280px] flex-col rounded-[20px] border border-dashed border-[rgba(255,255,255,0.26)] bg-[#07070a] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.2)] sm:min-h-[320px] sm:p-5 md:min-h-[420px] md:rounded-[22px] md:p-6">
        <div className="my-auto">
          <p className="font-caption text-white/55">Feedback Submitted</p>
          <h2 className="font-sectiontitle mt-3 text-[22px] text-white">
            Your feedback has been sent.
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/72 sm:text-base">
            The completed ticket now includes your rating for the team to review.
          </p>

          <div
            aria-label={`You rated this ${rating} out of 5`}
            className="mt-6 flex items-center gap-2 text-[#f9cb37]"
          >
            {Array.from({ length: 5 }).map((_, index) => {
              const active = index < rating;
              return (
                <Star
                  className={cn(
                    "h-6 w-6",
                    active ? "fill-current text-[#f9cb37]" : "text-white/18",
                  )}
                  key={index}
                />
              );
            })}
          </div>

          {comment ? (
            <div className="mt-6 border-t border-dashed border-white/14 pt-5">
              <p className="font-caption text-white/55">Your note</p>
              <p className="mt-2 text-sm leading-7 text-white/72">
                {comment}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RatingPicker({
  rating,
  onChange,
  disabled,
}: {
  rating: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
        Rating
      </legend>
      <div className="flex items-center gap-2 sm:gap-3">
        {RATING_VALUES.map((value) => {
          const active = rating >= value;

          return (
            <label
              className={cn(
                "cursor-pointer p-1 transition-transform duration-200",
                disabled && "cursor-not-allowed opacity-70",
              )}
              key={value}
            >
              <input
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                checked={rating === value}
                className="sr-only"
                disabled={disabled}
                name="rating"
                onChange={() => onChange(value)}
                type="radio"
                value={value}
              />
              <Star
                className={cn(
                  "h-8 w-8 transition-colors sm:h-9 sm:w-9",
                  active
                    ? "fill-[#f9cb37] text-[#f9cb37]"
                    : "fill-transparent text-white/28 hover:text-white/52",
                )}
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FeedbackPage({
  token,
  previewScenario,
}: FeedbackPageProps) {
  const previewConfig = useMemo(
    () => (previewScenario ? getFeedbackPreviewConfig(previewScenario) : null),
    [previewScenario],
  );
  const [feedback, setFeedback] = useState<FeedbackLookupResponse | null>(
    previewConfig?.feedback ?? null,
  );
  const [isLoading, setIsLoading] = useState(!previewConfig);
  const [loadError, setLoadError] = useState<string | null>(
    previewConfig?.loadError ?? null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [rating, setRating] = useState(previewConfig?.rating ?? 0);
  const [comment, setComment] = useState(previewConfig?.comment ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSubmit, setDidSubmit] = useState(Boolean(previewConfig?.didSubmit));

  const trimmedComment = useMemo(() => comment.trim(), [comment]);
  const contextTitle = useMemo(
    () => feedbackStateCopy(feedback?.state ?? "valid").title,
    [feedback?.state],
  );
  const contextBody = useMemo(
    () => feedbackStateCopy(feedback?.state ?? "valid").body,
    [feedback?.state],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFeedback() {
      if (previewScenario) {
        const preview = getFeedbackPreviewConfig(previewScenario);

        setFeedback(preview.feedback);
        setRating(preview.rating ?? 0);
        setComment(preview.comment ?? "");
        setLoadError(preview.loadError ?? null);
        setSubmitError(null);
        setDidSubmit(Boolean(preview.didSubmit));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setSubmitError(null);
      setDidSubmit(false);

      const result = await getPublicFeedback(token);

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setFeedback(result.data);
        setIsLoading(false);
        return;
      }

      if (result.data) {
        setFeedback(result.data);
        setIsLoading(false);
        return;
      }

      setFeedback(null);
      setLoadError(result.message);
      setIsLoading(false);
    }

    loadFeedback();

    return () => {
      cancelled = true;
    };
  }, [previewScenario, token, reloadKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setSubmitError("Choose a rating before submitting.");
      return;
    }

    if (previewScenario) {
      setSubmitError(null);
      setIsSubmitting(true);

      window.setTimeout(() => {
        setIsSubmitting(false);
        setDidSubmit(true);
      }, 250);

      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await submitPublicFeedback(token, {
      rating,
      comment: trimmedComment || undefined,
    });

    setIsSubmitting(false);

    if (result.ok) {
      setDidSubmit(true);
      return;
    }

    if (result.data) {
      setFeedback((current) => ({
        ...(current ?? {
          ok: false,
          state: result.data?.state ?? "not_found",
        }),
        ...result.data,
      }));
      return;
    }

    setSubmitError(result.message);
  }

  return (
    <FeedbackShell>
      <ContextPanel
        body={contextBody}
        feedback={feedback}
        title={contextTitle}
      />

      {isLoading ? (
        <LoadingPanel />
      ) : loadError ? (
        <RetryPanel
          message={loadError}
          onRetry={() => {
            setIsLoading(true);
            setLoadError(null);
            setFeedback(null);
            setReloadKey((current) => current + 1);
          }}
        />
      ) : didSubmit ? (
        <SuccessPanel comment={trimmedComment} rating={rating} />
      ) : feedback && feedback.state !== "valid" ? (
        <TerminalPanel feedback={feedback} state={feedback.state} />
      ) : (
        <div className="order-2 h-full">
          <form
            className="flex flex-col rounded-[20px] border border-dashed border-[rgba(255,255,255,0.26)] bg-[#07070a] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.2)] sm:p-5 md:rounded-[22px] md:p-6"
            onSubmit={handleSubmit}
          >
            <div className="space-y-4 sm:space-y-5">
              <div className="border-t border-dashed border-white/14 pt-1">
                <RatingPicker
                  disabled={isSubmitting}
                  onChange={setRating}
                  rating={rating}
                />
              </div>

              <div className="border-t border-dashed border-white/14 pt-4">
                <GuestTextArea
                  disabled={isSubmitting}
                  helper={`${comment.length}/${MAX_COMMENT_LENGTH} characters`}
                  label="Optional note"
                  maxLength={MAX_COMMENT_LENGTH}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Anything the team should review from this request?"
                  rows={5}
                  controlClassName="border-[rgba(198,40,40,0.28)] bg-[rgba(198,40,40,0.08)] focus:border-[var(--vh-pink)] focus:bg-[rgba(198,40,40,0.12)] placeholder:text-white/35"
                  value={comment}
                />
              </div>
            </div>

            <div className="mt-auto pt-4 sm:pt-5">
              <Button
                className="vh-cta-button h-11 w-full text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:h-12"
                disabled={rating === 0}
                loading={isSubmitting}
                loadingText="Sending feedback"
                type="submit"
              >
                Send Feedback
              </Button>

              {submitError ? (
                <p
                  aria-live="polite"
                  className="mt-3 text-sm leading-6 text-rose-300"
                  role="status"
                >
                  {submitError}
                </p>
              ) : null}

              <p className="mt-2.5 text-xs leading-5 text-[#94a3b8]">
                This link accepts one response only.
              </p>
            </div>
          </form>
        </div>
      )}
    </FeedbackShell>
  );
}

