/**
 * Per-brand WhatsApp template-name resolution.
 *
 * TDS and BUTEAK are separate WATI tenants with DIFFERENT registered template
 * names (Buteak carries its own suffixed names; TDS's names are baked into live
 * prod env). The rest of the codebase only ever used `brand` to pick WATI
 * *credentials* — the template *name* was a shared literal/env constant, so a
 * Buteak send fired TDS's name at the Buteak tenant and silently failed.
 *
 * `resolveTemplate(brand, key)` fixes that: a per-brand env override
 * `WATI_{BRAND}_TPL_{KEY}` wins; otherwise we fall back to the current default.
 * TDS sets no `WATI_TDS_TPL_*`, so it resolves to EXACTLY today's names (incl.
 * the four that still honour the existing global env vars) — live TDS is
 * unchanged. Buteak diverges only by setting `WATI_BUTEAK_TPL_*`.
 */

export type TemplateKey =
  | 'GUEST_ACK'
  | 'GUEST_DONE'
  | 'GUEST_DONE_SOFT'
  | 'STAFF_ASSIGNED'
  | 'STAFF_ESCALATION'
  | 'STAFF_REMINDER'
  | 'PAYMENT_REQUEST'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'FEEDBACK_BUTTONS'
  | 'FEEDBACK_LINK'
  | 'PROPERTY_SELECTOR'
  | 'PROSPECT_NOTIFY'
  | 'BREAKFAST_INVITE';

/**
 * Defaults preserve EXACTLY the pre-existing behaviour. The four entries that
 * read a global env var keep doing so, so a TDS tenant that already sets e.g.
 * `PROSPECT_SELECTOR_TEMPLATE` still gets that value.
 */
const TEMPLATE_DEFAULTS: Record<TemplateKey, string> = {
  GUEST_ACK: 'guest_request_notify',
  GUEST_DONE: 'service_guest_completion_template',
  // BACKSTOP closing message for an UNFULFILLED (T-1) ticket. The T-1 close is normally
  // fixed free text sent as a session message (guestUnfulfilledDone in wati.service.ts) —
  // no approval needed, correct wording guaranteed. This template is used only when that
  // session send fails, i.e. the 24-hour window shut before anyone closed the ticket.
  // Must promise nothing: GUEST_DONE's "completed by <staff>" is untrue for something we
  // never offered. Params: guest_name, request.
  GUEST_DONE_SOFT: 'service_guest_softclose_v1',
  STAFF_ASSIGNED: 'service_guest_completion_template_v2',
  STAFF_ESCALATION: 'escalation_template_v5',
  STAFF_REMINDER: 'staff_reminder_complete_v1',
  PAYMENT_REQUEST: 'service_payment_request_v1',
  PAYMENT_SUCCESS: 'service_payment_success_v1',
  PAYMENT_FAILED: 'service_payment_failed_v1',
  FEEDBACK_BUTTONS: process.env.FEEDBACK_BUTTON_TEMPLATE || 'service_feedback_buttons_v1',
  FEEDBACK_LINK: 'service_feedback_request_v1',
  PROPERTY_SELECTOR: process.env.PROSPECT_SELECTOR_TEMPLATE || 'property_selector_v3',
  PROSPECT_NOTIFY: process.env.PROSPECT_STAFF_NOTIFY_TEMPLATE || 'prospect_question_notify_v3',
  BREAKFAST_INVITE: process.env.BREAKFAST_INVITE_TEMPLATE || 'breakfast_order_invite_v1',
};

/**
 * The registered WATI template name for a brand. Checks `WATI_{BRAND}_TPL_{KEY}`
 * first (e.g. `WATI_BUTEAK_TPL_GUEST_ACK`), else the default above.
 */
export function resolveTemplate(brand: string | null | undefined, key: TemplateKey): string {
  const b = (brand || 'TDS').toUpperCase();
  const override = process.env[`WATI_${b}_TPL_${key}`];
  return override && override.trim() ? override.trim() : TEMPLATE_DEFAULTS[key];
}
