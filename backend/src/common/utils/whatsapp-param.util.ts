/**
 * WhatsApp template-parameter sanitiser.
 *
 * Meta's Cloud API rejects a template send outright when ANY body parameter
 * contains a newline, a tab, or a run of more than four spaces:
 *
 *   "Parameter content cannot have new-line characters, tabs, or more than 4
 *    consecutive spaces."
 *
 * WATI surfaces that as a 4xx and the message is simply never delivered. From
 * the guest's and the staffer's point of view it fails SILENTLY - the ticket
 * exists, the SLA timer runs, the escalation fires, and nobody's phone buzzes.
 *
 * This is not theoretical. Tickets #477/#478 ("Guest has ordered food from
 * Swiggy to Room 505 / for Room 504") escalated correctly through every rung of
 * the ladder, but each escalation template send was rejected because the guest
 * had typed their request across several lines - so, in the reporter's words,
 * "none of the escalated levels got this ticket". 22 sends were lost this way
 * over 14 days.
 *
 * Simply deleting the line breaks would run words together ("towelat 404"), so
 * instead each break becomes sentence punctuation. The result stays readable
 * for staff and parseable for the classifier:
 *
 *   "Can you send me a towel\nat 404 \nand 405\n"
 *      -> "Can you send me a towel. at 404. and 405"
 *
 * Applied centrally in WatiService.sendTemplateMessage, so no caller can
 * reintroduce the bug. Free-text session messages are NOT sanitised - they have
 * no such restriction, and several of our acks use \n deliberately.
 *
 * The character classes below are built with String.fromCharCode rather than
 * written as literals: a raw U+2028 inside a regex literal is itself a JS line
 * terminator (SyntaxError), and the rest are invisible in a diff.
 */

const ch = (...codes: number[]) => String.fromCharCode(...codes);

/**
 * Every character WhatsApp treats as a line break: CR, LF, NEL (U+0085), and
 * LINE / PARAGRAPH SEPARATOR (U+2028/U+2029). The last three arrive via paste
 * from rich-text apps and are rejected on the same rule as \n.
 */
const LINE_BREAKS = new RegExp('\\r\\n|[\\r\\n' + ch(0x85, 0x2028, 0x2029) + ']');

/**
 * Horizontal whitespace that is either explicitly banned (tab) or that inflates
 * a space run past the four-space limit: NBSP (U+00A0), OGHAM SPACE (U+1680),
 * the EN/EM quad-space block (U+2000-U+200A), zero-width space (U+200B), narrow
 * NBSP (U+202F), medium mathematical space (U+205F), ideographic space
 * (U+3000), BOM (U+FEFF), plus vertical tab and form feed. Folded to one plain
 * space each.
 */
const HORIZONTAL_WS = new RegExp(
  '[\\t\\v\\f' +
    ch(0xa0, 0x1680, 0x2000) +
    '-' +
    ch(0x200a, 0x200b, 0x202f, 0x205f, 0x3000, 0xfeff) +
    ']+',
  'g',
);

/**
 * A segment that already ends in punctuation must not get a second full stop -
 * "AC is not working." + "Please send someone" should read
 * "AC is not working. Please send someone", not "...working.. Please...".
 * Includes the en and em dash (U+2013/U+2014) alongside the ASCII hyphen.
 */
const ALREADY_PUNCTUATED = new RegExp('[.!?,;:' + ch(0x2013, 0x2014) + '-]$');

/** Ellipsis (U+2026) marking a value we had to truncate. */
const ELLIPSIS = ch(0x2026);

/**
 * Per-parameter character cap. The rendered template body is limited to 1024
 * characters, and blowing that budget fails the send exactly as a newline does.
 * Truncating a 1000-character rant is strictly better than not delivering the
 * escalation at all.
 */
const MAX_PARAM_LEN = 1000;

/**
 * Flatten a value into something WhatsApp will accept as a template parameter:
 * one line, no tabs, no long space runs, bounded length.
 *
 * Returns '' for null/undefined/whitespace-only input - callers are expected to
 * have supplied their own fallback ("Service request", "NA", ...) before this
 * point, and inventing content here would hide a missing value.
 */
export function flattenForWhatsAppParam(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';

  const segments = String(input)
    .split(LINE_BREAKS)
    .map((s) => s.replace(HORIZONTAL_WS, ' ').replace(/ {2,}/g, ' ').trim())
    .filter((s) => s.length > 0);

  if (segments.length === 0) return '';

  let out = segments[0];
  for (let i = 1; i < segments.length; i++) {
    out += (ALREADY_PUNCTUATED.test(out) ? ' ' : '. ') + segments[i];
  }

  // Cut on a word boundary when one is close by, so the tail doesn't end
  // mid-word; fall back to a hard cut for a single enormous token.
  if (out.length > MAX_PARAM_LEN) {
    const hard = out.slice(0, MAX_PARAM_LEN - 1);
    const lastSpace = hard.lastIndexOf(' ');
    out = (lastSpace > MAX_PARAM_LEN - 60 ? hard.slice(0, lastSpace) : hard).trimEnd() + ELLIPSIS;
  }

  return out;
}

/** Sanitise a whole ordered parameter list, preserving order and names. */
export function flattenTemplateParams(
  parameters: { name: string; value: string }[],
): { name: string; value: string }[] {
  return parameters.map((p) => ({ name: p.name, value: flattenForWhatsAppParam(p.value) }));
}
