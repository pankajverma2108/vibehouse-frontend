/**
 * Strict environment-variable access.
 *
 * Security: we deliberately do NOT fall back to a hardcoded default for any
 * secret. A missing secret must crash the process at startup rather than let
 * the app run with a guessable value (the old `?? 'fallback-secret'` pattern
 * meant a misconfigured deploy silently signed JWTs with a public string).
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Refusing to start with an insecure default.`,
    );
  }
  return value;
}

/**
 * The single JWT signing/verification secret, used by both the guest and admin
 * auth modules + their passport strategies. Throws at boot if unset.
 */
export function getJwtSecret(): string {
  return requireEnv('JWT_SECRET');
}
