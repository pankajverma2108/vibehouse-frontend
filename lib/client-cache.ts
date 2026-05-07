type CacheEnvelope<T> = {
  value: T;
  savedAt: number;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getClientCache<T>(key: string, ttlMs: number): T | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.savedAt > ttlMs) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export function setClientCache<T>(key: string, value: T): void {
  if (!isBrowser()) {
    return;
  }

  const payload: CacheEnvelope<T> = {
    value,
    savedAt: Date.now(),
  };

  window.sessionStorage.setItem(key, JSON.stringify(payload));
}

export function clearClientCache(key: string): void {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(key);
}
