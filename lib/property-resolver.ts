/**
 * Central property ID resolver for multi-property support.
 * Resolves property_id in priority order:
 * 1. Explicit route/search param
 * 2. Host mapping (matches backend rules)
 * 3. Env fallback (NEXT_PUBLIC_PROPERTY_ID) for local/dev only
 */

const PROPERTY_ID_REGEX = /^\d+$/;

// Host-to-property mapping (must match backend's property-resolver.ts)
// See: docs/multi_property/13_multi_property.md
const HOST_TO_PROPERTY: Record<string, string> = {
  "www.thedailysocial.co.in": "60765",
  "thedailysocial.co.in": "60765",
  "www.buteak.in": "55402",
  "buteak.in": "55402",
  "localhost": "60765",
  "127.0.0.1": "60765",
};

// Property ID to property name mapping
const PROPERTY_ID_TO_NAME: Record<string, string> = {
  "60765": "The Daily Social",
  "55402": "Buteak",
};

/**
 * Validate property_id is numeric (eZee hotel code format).
 */
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

  return "";
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

  return "";
}

/**
 * React hook to resolve property_id on the client.
 * Use in client components that need the active property.
 */
export function usePropertyId(explicit?: string | null): string {
  if (typeof window === "undefined") {
    return "";
  }

  return resolveClientPropertyId({ explicit });
}

/**
 * Get property name from property_id.
 * Returns empty string if property_id is unknown.
 */
export function getPropertyName(propertyId: string): string {
  return PROPERTY_ID_TO_NAME[propertyId] || "";
}
