import type { Request } from 'express';

/**
 * The set of brands the platform supports. Mirrors the CHECK constraint on
 * properties.brand in DB. Add new values here AND in the SQL CHECK constraint
 * (via migration) when onboarding a new brand.
 */
export type Brand = 'TDS' | 'BUTEAK';

export const ALL_BRANDS: Brand[] = ['TDS', 'BUTEAK'];

/**
 * Default property ID per brand — used when an action is brand-scoped but
 * lacks a specific property (e.g., signup OTP fires before any booking
 * context exists, so we use the brand's flagship property to drive
 * EmailService branding). Keep in sync with seed data.
 */
export const BRAND_TO_DEFAULT_PROPERTY: Record<Brand, string> = {
  TDS: '60765',
  BUTEAK: '55402',
};

/**
 * Maps a public hostname to the property (eZee hotel code) that should serve it.
 *
 * Used by public endpoints that don't have a JWT/booking context to fall back
 * on — e.g., /public/events. Returns null if the host doesn't match a known
 * property; callers should treat null as "client must supply ?property_id=".
 */
const HOST_TO_PROPERTY: Record<string, string> = {
  'www.thedailysocial.co.in': '60765',
  'thedailysocial.co.in':     '60765',
  'vibe-house.netlify.app':   '60765',
  'vibehouse-frontend.onrender.com': '60765',
  'www.buteak.in':            '55402',
  'buteak.in':                '55402',
  'dev.buteak.in':            '55402',
  'www.dev.buteak.in':        '55402',
  'localhost:3000':           '60765', // dev frontend default
  'localhost:8000':           '60765', // dev backend default
  'localhost:8080':           '60765', // legacy dev port
};

/**
 * Maps a public hostname to the brand serving it. Separate from
 * HOST_TO_PROPERTY because multiple properties can share a brand (future TDS
 * locations all → TDS); for now there's a 1:1 correspondence but we model it
 * as a separate concept so the upcoming expansion is straightforward.
 */
const HOST_TO_BRAND: Record<string, Brand> = {
  'www.thedailysocial.co.in': 'TDS',
  'thedailysocial.co.in':     'TDS',
  'vibe-house.netlify.app':   'TDS',
  'vibehouse-frontend.onrender.com': 'TDS',
  'www.buteak.in':            'BUTEAK',
  'buteak.in':                'BUTEAK',
  'dev.buteak.in':            'BUTEAK',
  'www.dev.buteak.in':        'BUTEAK',
  'localhost:3000':           'TDS', // dev default — override via FRONTEND_URL or signup origin
  'localhost:8000':           'TDS',
  'localhost:8080':           'TDS',
};

function normalizeHost(host: string | undefined | null): string {
  if (!host) return '';
  return host.toLowerCase().split(',')[0].trim();
}

function getRequestHost(req: Request): string {
  // CloudFront forwards the original Host header (because the origin request
  // policy is AllViewer). When the frontend SSR proxies through a CDN the
  // value lands in either Host or X-Forwarded-Host — prefer the forwarded
  // header since some intermediaries rewrite Host.
  const xfh = req.headers['x-forwarded-host'];
  return normalizeHost((Array.isArray(xfh) ? xfh[0] : xfh) ?? req.headers.host ?? '');
}

export function resolvePropertyFromHost(host: string | undefined | null): string | null {
  const normalized = normalizeHost(host);
  return HOST_TO_PROPERTY[normalized] ?? null;
}

export function resolvePropertyFromRequest(req: Request): string | null {
  return resolvePropertyFromHost(getRequestHost(req));
}

/**
 * Resolves the brand for a given hostname. Returns the default (TDS) if the
 * host is unknown — we'd rather over-serve TDS than 500 the request.
 */
export function resolveBrandFromHost(host: string | undefined | null): Brand {
  const normalized = normalizeHost(host);
  return HOST_TO_BRAND[normalized] ?? 'TDS';
}

export function resolveBrandFromRequest(req: Request): Brand {
  return resolveBrandFromHost(getRequestHost(req));
}

/**
 * Maps a `property_selector_v3` quick-reply button payload → property id (eZee
 * hotel code) for the NON-GUEST prospect path. When a prospect taps a property
 * in the selector template, WATI delivers the button's text as the inbound
 * message; we match it here (case-insensitive, trimmed) to pin their session to
 * a property.
 *
 * Aliases are intentional: the button text has drifted across template versions
 * (v2 used `KORAMANGALA`, v3 uses `KORAMANGALA_A`) — accept all historical spellings
 * so an older session tap still resolves. Keyed by brand because button payloads
 * are only meaningful within a brand's WATI tenant. Keep in sync with the buttons
 * authored in each brand's `property_selector_v3` template.
 *
 * Keys are underscore-delimited; the matcher normalizes inbound whitespace to
 * underscore, so a live button titled "BTM Layout" resolves against `BTM_LAYOUT`
 * and "Koramangala" against `KORAMANGALA`.
 */
const PROPERTY_SELECTOR_KEYS: Record<Brand, Record<string, string>> = {
  TDS: {
    // TDS is single-property today; no selector is shown, but keep a mapping in
    // case a second TDS location is onboarded with a selector.
    KORAMANGALA_A: '60765',
  },
  BUTEAK: {
    BTM_LAYOUT: '55402',
    BTM_A: '55402',
    KORAMANGALA: '61766',
    KORAMANGALA_A: '61766',
    TEST_PROPERTY: '00000',
  },
};

/**
 * If `text` is a property-selector button payload for this brand, returns the
 * mapped property id; otherwise null (the message is a real query, not a tap).
 */
export function resolvePropertyFromSelectorKey(brand: Brand, text: string): string | null {
  // Normalize internal whitespace to underscore so a button whose title renders with
  // a space ("BTM Layout" → BTM_LAYOUT, "Koramangala" → KORAMANGALA) matches the
  // underscore-delimited keys. WATI delivers the button's display title as the text.
  const key = (text ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  if (!key) return null;
  return PROPERTY_SELECTOR_KEYS[brand]?.[key] ?? null;
}

/** Human-facing brand name for guest/prospect messages. */
const BRAND_DISPLAY_NAME: Record<Brand, string> = {
  TDS: 'The Daily Social',
  BUTEAK: 'Buteak Suites',
};

/** Public booking site per brand (env-overridable), used in the prospect "booking" reply. */
const BRAND_BOOKING_URL: Record<Brand, string> = {
  TDS: 'https://thedailysocial.co.in',
  BUTEAK: 'https://buteak.in',
};

export function brandDisplayName(brand: string): string {
  return BRAND_DISPLAY_NAME[(brand?.toUpperCase() as Brand)] ?? 'us';
}

export function brandBookingUrl(brand: string): string {
  const b = brand?.toUpperCase() as Brand;
  return process.env[`BOOKING_URL_${b}`] || BRAND_BOOKING_URL[b] || 'https://thedailysocial.co.in';
}

/**
 * Exact Zoho Desk `cf_property_name` picklist values, keyed by property id (eZee
 * hotel code). These strings MUST match the field's picklist options character-for-
 * character (Zoho rejects/ignores an unknown option) — note TDS's option is spelled
 * "Koramanagala" in Zoho, while Buteak's is "Koramangala". Keep in sync with the
 * `cf_property_name` field options in the Zoho Desk ticket layout.
 */
const PROPERTY_ZOHO_NAME: Record<string, string> = {
  '60765': 'The Daily Social Koramanagala',
  '55402': 'Buteak BTM Layout',
  '61766': 'Buteak Koramangala',
};

/** The exact Zoho `cf_property_name` picklist value for a property id, or null if unmapped. */
export function zohoPropertyName(propertyId: string | null | undefined): string | null {
  if (!propertyId) return null;
  return PROPERTY_ZOHO_NAME[propertyId] ?? null;
}

/**
 * Short human label for a property, for staff-facing WhatsApp (e.g. shown next to
 * the room number in an escalation so a director paged across properties knows which
 * site — and whom — the request belongs to). Falls back to the brand display name.
 */
const PROPERTY_SHORT_LABEL: Record<string, string> = {
  '60765': 'TDS Koramangala',
  '55402': 'Buteak BTM',
  '61766': 'Buteak Koramangala',
};

export function propertyShortLabel(propertyId: string | null | undefined, brand?: string): string {
  if (propertyId && PROPERTY_SHORT_LABEL[propertyId]) return PROPERTY_SHORT_LABEL[propertyId];
  return brandDisplayName(brand ?? '');
}
