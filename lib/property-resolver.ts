/**
 * Central property ID resolver for multi-property support.
 * Resolves property_id in priority order:
 * 1. Explicit route/search param
 * 2. Host mapping (matches backend rules)
 * 3. Env fallback (NEXT_PUBLIC_PROPERTY_ID) for local/dev only
 */
/**
 * Central property ID resolver for multi-property support.
 * Resolves property_id in priority order:
 * 1. Explicit route/search param
 * 2. Host mapping (matches backend rules)
 * 3. Env fallback (NEXT_PUBLIC_PROPERTY_ID) for local/dev only
 */

const PROPERTY_ID_REGEX = /^\d+$/;
const DEFAULT_BRAND: Brand = "TDS";

export type Brand = "TDS" | "BUTEAK";

// Host-to-property mapping (must match backend's property-resolver.ts)
// See: docs/multi_property/13_multi_property.md
const HOST_TO_PROPERTY: Record<string, string> = {
  "www.vibehouse.co": "60765",
  "vibehouse.co": "60765",
  "www.vibehouse.in": "60765",
  "vibehouse.in": "60765",
  "vibe-house.netlify.app": "60765",
  "www.buteak.in": "55402",
  "buteak.in": "55402",
  "www.dev.buteak.in": "55402",
  "dev.buteak.in": "55402",
  "localhost": "60765",
  "127.0.0.1": "60765",
};

const PROPERTY_ID_TO_BRAND: Record<string, Brand> = {
  "60765": "TDS",
  "55402": "BUTEAK",
};

// Property ID to property name mapping
const PROPERTY_ID_TO_NAME: Record<string, string> = {
  "60765": "Vibehouse",
  "55402": "Buteak",
};
export function isValidPropertyId(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  return PROPERTY_ID_REGEX.test(value);
}

/**
 * Sanitize and validate property_id.
 * Returns empty string if invalid.
 */
export function sanitizePropertyId(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return PROPERTY_ID_REGEX.test(raw) ? raw : "";
}

/**
 * Resolve property_id from a hostname.
 * Returns empty string if hostname is not recognized.
 */
export function resolvePropertyIdFromHost(hostname: string): string {
  if (!hostname) {
    return "";
  }

  const normalized = hostname.toLowerCase();

  // Exact match
  if (HOST_TO_PROPERTY[normalized]) {
    return HOST_TO_PROPERTY[normalized];
  }

  // Strip port and try again
  const withoutPort = normalized.split(":")[0];
  if (withoutPort !== normalized && HOST_TO_PROPERTY[withoutPort]) {
    return HOST_TO_PROPERTY[withoutPort];
  }

  return "";
}

/**
 * Resolve brand from a hostname.
 * Unknown hosts intentionally default to TDS to match backend brand isolation behavior.
 */
export function resolveBrandFromHost(hostname: string): Brand {
  const propertyId = resolvePropertyIdFromHost(hostname);
  return PROPERTY_ID_TO_BRAND[propertyId] ?? DEFAULT_BRAND;
}

/**
 * Resolve brand from a property_id.
 */
export function resolveBrandFromPropertyId(propertyId: string | null | undefined): Brand {
  const sanitized = sanitizePropertyId(propertyId);
  return PROPERTY_ID_TO_BRAND[sanitized] ?? DEFAULT_BRAND;
}

function getSearchParamFromPath(path: string | null | undefined, key: string): string | null {
  if (!path) {
    return null;
  }

  try {
    const parsed = new URL(path, "http://localhost:3000");
    return parsed.searchParams.get(key);
  } catch {
    return null;
  }
}

/**
 * Client-side brand resolver.
 * Priority: explicit property_id > return path property_id > current URL property_id > host > TDS.
 */
export function resolveClientBrand(options?: {
  explicitPropertyId?: string | null;
  returnTo?: string | null;
}): Brand {
  const explicitBrand = PROPERTY_ID_TO_BRAND[sanitizePropertyId(options?.explicitPropertyId)];
  if (explicitBrand) {
    return explicitBrand;
  }

  const returnToBrand = PROPERTY_ID_TO_BRAND[sanitizePropertyId(getSearchParamFromPath(options?.returnTo, "property_id"))];
  if (returnToBrand) {
    return returnToBrand;
  }

  if (typeof window !== "undefined") {
    const currentUrlBrand = PROPERTY_ID_TO_BRAND[sanitizePropertyId(new URLSearchParams(window.location.search).get("property_id"))];
    if (currentUrlBrand) {
      return currentUrlBrand;
    }

    return resolveBrandFromHost(window.location.hostname);
  }

  return DEFAULT_BRAND;
}


/**
 * Server-side property resolver.
 * Call from layout, pages, or server components.
 * Priority: explicit param > host > env fallback
 *
 * Returns empty string if property cannot be resolved.
 */
export function resolveServerPropertyId(options: {
  explicit?: string | null;
  hostname?: string;
}): string {
  // 1. Explicit param
  if (options.explicit) {
    const sanitized = sanitizePropertyId(options.explicit);
    if (sanitized) {
      return sanitized;
    }
  }

  // 2. Host mapping (server-side only)
  if (options.hostname) {
    const fromHost = resolvePropertyIdFromHost(options.hostname);
    if (fromHost) {
      return fromHost;
    }
  }

  // 3. Env fallback (local/dev)
  const envProperty = process.env.NEXT_PUBLIC_PROPERTY_ID?.trim() || "";
  if (sanitizePropertyId(envProperty)) {
    return envProperty;
  }

  return "60765";
}

/**
 * Client-side property resolver.
 * Call from client components or hooks.
 * Priority: explicit param > host > env fallback
 *
 * Returns empty string if property cannot be resolved.
 */
export function resolveClientPropertyId(options: {
  explicit?: string | null;
}): string {
  // 1. Explicit param
  if (options.explicit) {
    const sanitized = sanitizePropertyId(options.explicit);
    if (sanitized) {
      return sanitized;
    }
  }

  // 2. Host mapping (client-side from window.location)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const fromHost = resolvePropertyIdFromHost(hostname);
    if (fromHost) {
      return fromHost;
    }
  }

  // 3. Env fallback (local/dev)
  const envProperty = process.env.NEXT_PUBLIC_PROPERTY_ID?.trim() || "";
  if (sanitizePropertyId(envProperty)) {
    return envProperty;
  }

  return "60765";
}

/**
 * Get property name from property_id.
 */
export function getPropertyName(propertyId: string): string {
  return PROPERTY_ID_TO_NAME[propertyId] || "";
}
