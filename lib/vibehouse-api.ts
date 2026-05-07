const DEFAULT_API_BASE_URL = "https://api.thedailysocial.co.in";

export class ApiRequestError extends Error {
  status: number;
  data: unknown;
  path: string;
  method: string;

  constructor(message: string, options: { status: number; data: unknown; path: string; method: string }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.data = options.data;
    this.path = options.path;
    this.method = options.method;
  }
}

function normalizeApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }

  return trimmed.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
}

export function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const message = (data as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.join(". ");
  }

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return fallback;
}

export async function requestJson<T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    token?: string;
  },
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const rawText = await response.text();
  let data: unknown = null;

  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(parseApiError(data, "Request failed. Please try again."), {
      status: response.status,
      data,
      path,
      method: options?.method ?? "GET",
    });
  }

  return data as T;
}
