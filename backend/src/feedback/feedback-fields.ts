/**
 * The Zoho Desk feedback fields — `cf_feedback_sentiment` (Picklist: Good | Bad),
 * `cf_feedback_rating` (Number 1-5) and `cf_feedback_remark` (Textarea).
 *
 * Built in one place because three sites write them: the Good/Bad tap, the 1-5 star
 * link, and the worker's late replay for feedback captured before the Zoho mirror
 * existed. They drifted apart once already — the tap path was rewired to write only
 * cf_feedback_rating on the mistaken belief that cf_feedback_sentiment didn't exist,
 * so closed tickets carried a remark and a rating with an empty sentiment column.
 *
 * TWO CAPTURE CHANNELS, ONE REPORT. The buttons give Good/Bad; the link gives 1-5.
 * We fill both the picklist and the number from whichever the guest actually gave, so
 * a Desk report can group by sentiment or average the rating without caring which
 * prompt the guest saw.
 */

export type Sentiment = 'Good' | 'Bad';

/** Narrow a free-form DB string to the picklist's only two values. */
function asSentiment(v: string | null | undefined): Sentiment | null {
  return v === 'Good' || v === 'Bad' ? v : null;
}

/** Good → 5, Bad → 1 — the ends of the same 1-5 scale the link channel uses. */
export function ratingForSentiment(sentiment: string | null | undefined): number | null {
  const s = asSentiment(sentiment);
  return s === 'Good' ? 5 : s === 'Bad' ? 1 : null;
}

/**
 * The picklist value a star rating implies. A 3 returns null: the picklist holds only
 * Good and Bad, and forcing a neutral score into either would misreport it. Those rows
 * keep their cf_feedback_rating and simply have no sentiment.
 */
export function sentimentForRating(rating: number | null | undefined): Sentiment | null {
  if (rating == null) return null;
  if (rating >= 4) return 'Good';
  if (rating <= 2) return 'Bad';
  return null;
}

/**
 * The `cf` payload for a captured feedback. Whatever can't be stated is omitted rather
 * than sent empty, so a blank cell always means "the guest didn't tell us" — never
 * "we overwrote it with a default".
 */
export function feedbackCustomFields(input: {
  rating?: number | null;
  sentiment?: string | null;
  comment?: string | null;
}): Record<string, string | number> {
  const sentiment = asSentiment(input.sentiment) ?? sentimentForRating(input.rating);
  const rating = input.rating ?? ratingForSentiment(input.sentiment);
  return {
    ...(rating != null ? { cf_feedback_rating: rating } : {}),
    ...(sentiment ? { cf_feedback_sentiment: sentiment } : {}),
    ...(input.comment ? { cf_feedback_remark: input.comment } : {}),
  };
}
