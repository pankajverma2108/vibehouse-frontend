"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, RefreshCcw, Star } from "lucide-react";

import { GuestTextArea } from "@/components/guest/guest-form-fields";
import { Stagger, StaggerItem } from "@/components/shared/motion";
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

type FeedbackSubmitPreviewPayload = {
  rating: number;
  comment?: string;
};

const MAX_COMMENT_LENGTH = 2000;
const RATING_OPTIONS = [
  { value: 1, label: "Very poor", hint: "Needs immediate attention" },
  { value: 2, label: "Poor", hint: "Below expectations" },
  { value: 3, label: "Okay", hint: "Resolved, but average" },
  { value: 4, label: "Good", hint: "Quick and reliable" },
  { value: 5, label: "Excellent", hint: "Exactly what I needed" },
] as const;

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

function getRatingCopy(rating: number) {
  return RATING_OPTIONS.find((option) => option.value === rating) ?? null;
}

function buildSubmitPayload(
  rating: number,
  trimmedComment: string,
): FeedbackSubmitPreviewPayload {
  return {
    rating,
    ...(trimmedComment ? { comment: trimmedComment } : {}),
  };
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
    <section className="min-h-screen bg-[#07070a] py-16">
      <div className="vh-container">
        <div className="mx-auto max-w-screen-lg">
          <header className="mb-6 flex items-center justify-between gap-4 border-b border-dashed border-white/14 pb-4">
            <Link
              aria-label="The Daily Social home"
              className="inline-flex items-center"
              href="/"
            >
              <Image
                alt="The Daily Social"
                className="w-[120px]"
                height={62}
                priority
                src="/brands/tds/logo.png"
                style={{ height: "auto" }}
                width={120}
              />
            </Link>
            <p className="font-caption text-right text-white/55">Service Feedback</p>
          </header>

          <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {children}
          </Stagger>
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
    <StaggerItem className="h-full">
      <div className="flex h-full flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
        <div className="space-y-4">
          <p className="font-caption text-white/55">The Daily Social</p>
          <h1 className="font-sectiontitle text-[34px] leading-[1.05] text-white sm:text-[42px]">
            {displayTitle}
          </h1>
          <p className="text-sm leading-7 text-white/72 sm:text-base">
            {displayBody}
          </p>

          {isValidFeedback && feedback ? (
            <div className="border-t border-dashed border-white/14 pt-5">
              <p className="font-caption text-white/55">Ticket Context</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/62">
                {feedback.request?.trim() ? <span>{feedback.request.trim()}</span> : null}
                {feedback.room_no?.trim() ? <span>Room {feedback.room_no.trim()}</span> : null}
              </div>
              <p className="mt-4 text-sm leading-7 text-white/72">
                Choose a score on the right and leave a note only if something needs extra attention.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </StaggerItem>
  );
}

function LoadingPanel() {
  return (
    <StaggerItem className="h-full">
      <div
        aria-busy="true"
        aria-live="polite"
        className="flex min-h-[420px] flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6"
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
    </StaggerItem>
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
    <StaggerItem className="h-full">
      <div className="flex min-h-[420px] flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
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
    </StaggerItem>
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
    <StaggerItem className="h-full">
      <div className="flex min-h-[420px] flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
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
    </StaggerItem>
  );
}

function SuccessPanel({
  previewPayload,
  rating,
  comment,
}: {
  previewPayload?: FeedbackSubmitPreviewPayload | null;
  rating: number;
  comment: string;
}) {
  return (
    <StaggerItem className="h-full">
      <div className="flex min-h-[420px] flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
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
            <span className="ml-1 text-sm font-semibold text-white">
              {getRatingCopy(rating)?.label ?? `${rating}/5`}
            </span>
          </div>

          {comment ? (
            <div className="mt-6 border-t border-dashed border-white/14 pt-5">
              <div className="flex items-center gap-2 text-white/55">
                <MessageSquareText className="h-4 w-4" />
                <p className="font-caption">Your note</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-white/72">
                {comment}
              </p>
            </div>
          ) : null}

          {previewPayload ? (
            <div className="mt-6 border-t border-dashed border-white/14 pt-5">
              <p className="font-caption text-white/55">Mock API Payload</p>
              <p className="mt-2 text-xs leading-6 text-white/55">
                POST /public/feedback/:token
              </p>
              <pre className="mt-3 overflow-x-auto rounded-[16px] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/78">
                {JSON.stringify(previewPayload, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </StaggerItem>
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
      <div className="grid grid-cols-1 gap-2">
        {RATING_OPTIONS.map((option) => {
          const value = option.value;
          const active = rating >= value;

          return (
            <label
              className="block cursor-pointer"
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
              <span
                className={cn(
                  "flex min-h-[64px] w-full items-center justify-between gap-4 rounded-[16px] border px-4 py-3 text-left transition",
                  active
                    ? "border-[var(--vh-pink)] bg-[rgba(198,40,40,0.16)] text-white shadow-[0_0_0_1px_rgba(198,40,40,0.25)]"
                    : "border-white/10 bg-white/[0.03] text-white/68 hover:border-white/25 hover:bg-white/[0.05]",
                  disabled && "cursor-not-allowed opacity-70",
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20">
                    <Star
                      className={cn(
                        "h-5 w-5",
                        active ? "fill-current text-[#f9cb37]" : "text-white/34",
                      )}
                    />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-white">{option.label}</span>
                    <span className="block text-xs leading-5 text-white/60">{option.hint}</span>
                  </span>
                </span>
                <span className="text-sm font-black text-white/78">{value}</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="text-xs leading-6 text-[#94a3b8]">
        {rating > 0
          ? `${getRatingCopy(rating)?.label ?? "Selected"} selected`
          : "Choose 1 to 5 stars."}
      </p>
    </fieldset>
  );
}

export function FeedbackPage({
  token,
  previewScenario,
}: FeedbackPageProps) {
  const [feedback, setFeedback] = useState<FeedbackLookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);
  const [previewSubmittedPayload, setPreviewSubmittedPayload] =
    useState<FeedbackSubmitPreviewPayload | null>(null);

  const trimmedComment = useMemo(() => comment.trim(), [comment]);
  const draftPayload = useMemo(
    () => buildSubmitPayload(Math.max(rating, 1), trimmedComment),
    [rating, trimmedComment],
  );
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
        setPreviewSubmittedPayload(
          preview.didSubmit && preview.rating
            ? buildSubmitPayload(preview.rating, (preview.comment ?? "").trim())
            : null,
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setSubmitError(null);
      setDidSubmit(false);
      setPreviewSubmittedPayload(null);

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
      setPreviewSubmittedPayload(buildSubmitPayload(rating, trimmedComment));

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
            setPreviewSubmittedPayload(null);
            setReloadKey((current) => current + 1);
          }}
        />
      ) : didSubmit ? (
        <SuccessPanel
          comment={trimmedComment}
          previewPayload={previewSubmittedPayload}
          rating={rating}
        />
      ) : feedback && feedback.state !== "valid" ? (
        <TerminalPanel feedback={feedback} state={feedback.state} />
      ) : (
        <StaggerItem className="h-full">
          <form
            className="flex min-h-[420px] flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6"
            onSubmit={handleSubmit}
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="font-caption text-white/55">Submit Rating</p>
                <h2 className="font-sectiontitle text-[22px] text-white">
                  Choose the score that fits.
                </h2>
                <p className="text-sm leading-7 text-white/72 sm:text-base">
                  Select one rating and add a note only if you want the team to review more detail.
                </p>
              </div>

              <div className="border-t border-dashed border-white/14 pt-5">
                <p className="font-caption text-white/55">Completed Request</p>
                <p className="mt-2 font-bodyfocus text-[15px] text-white">
                  {feedback ? buildContextLine(feedback) : "How was your support experience?"}
                </p>
                {feedback ? (
                  <p className="mt-2 text-sm leading-7 text-white/72">
                    {buildSupportLine(feedback)}
                  </p>
                ) : null}
              </div>

              <div className="border-t border-dashed border-white/14 pt-5">
                <p className="font-caption text-white/55">Request Body</p>
                <p className="mt-2 text-sm leading-7 text-white/72">
                  Backend receives `rating` and optional `comment`. `rating` stays empty until a score is chosen, then submits as 1 to 5.
                </p>
                <RatingPicker
                  disabled={isSubmitting}
                  onChange={setRating}
                  rating={rating}
                />
              </div>

              <div className="border-t border-dashed border-white/14 pt-5">
                <GuestTextArea
                  disabled={isSubmitting}
                  helper={`${comment.length}/${MAX_COMMENT_LENGTH} characters`}
                  label="Optional note"
                  maxLength={MAX_COMMENT_LENGTH}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Anything the team should review from this request?"
                  rows={5}
                  value={comment}
                />
              </div>

              {previewScenario ? (
                <div className="border-t border-dashed border-white/14 pt-5">
                  <p className="font-caption text-white/55">Mock API Payload</p>
                  <p className="mt-2 text-xs leading-6 text-white/55">
                    POST /public/feedback/:token
                  </p>
                  <pre className="mt-3 overflow-x-auto rounded-[16px] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/78">
                    {JSON.stringify(draftPayload, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>

            <div className="mt-auto pt-6">
              <Button
                className="vh-cta-button h-12 w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
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

              <p className="mt-3 text-xs leading-6 text-[#94a3b8]">
                This link accepts one response only.
              </p>
            </div>
          </form>
        </StaggerItem>
      )}
    </FeedbackShell>
  );
}

