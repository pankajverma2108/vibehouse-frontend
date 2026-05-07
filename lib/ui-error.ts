export function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.toLowerCase();

  if (message.includes("unauthorized") || message.includes("forbidden") || message.includes("token") || message.includes("401") || message.includes("403")) {
    return "Your session expired. Please sign in again.";
  }

  if (message.includes("network") || message.includes("failed to fetch") || message.includes("timeout")) {
    return "We could not reach the server. Please check your internet and try again.";
  }

  if (message.includes("not found") || message.includes("404")) {
    return "We could not find this booking right now.";
  }

  return fallback;
}

function normalizedErrorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return "";
  }

  return error.message.toLowerCase();
}

function hasAuthError(message: string): boolean {
  return (
    message.includes("unauthorized")
    || message.includes("forbidden")
    || message.includes("token")
    || message.includes("401")
    || message.includes("403")
  );
}

function hasNetworkError(message: string): boolean {
  return (
    message.includes("network")
    || message.includes("failed to fetch")
    || message.includes("timeout")
    || message.includes("unreachable")
  );
}

function hasNotFoundError(message: string): boolean {
  return message.includes("not found") || message.includes("404");
}

function hasBadInputError(message: string): boolean {
  return (
    message.includes("bad request")
    || message.includes("400")
    || message.includes("invalid")
    || message.includes("format")
  );
}

function hasAlreadyLinkedError(message: string): boolean {
  return message.includes("already linked") || message.includes("already exists") || message.includes("duplicate");
}

export function toBookingSyncMessage(error: unknown, options?: { hasFallbackData?: boolean }): string {
  const message = normalizedErrorText(error);

  if (hasAuthError(message)) {
    return "Session check needed. Please sign in again and we will resume syncing your stays.";
  }

  if (hasNetworkError(message)) {
    if (options?.hasFallbackData) {
      return "You are still on track. Live sync is delayed, so we are showing your saved booking snapshot for now.";
    }

    return "We are trying to reach live bookings. Please tap Refresh in a moment.";
  }

  if (hasNotFoundError(message)) {
    return "No synced bookings found yet. Your account is active and we will keep checking in the background.";
  }

  return "Sync is in progress. Your booking panel will update automatically as soon as fresh data arrives.";
}

export function toBookingLinkMessage(error: unknown): string {
  const message = normalizedErrorText(error);

  if (hasAuthError(message)) {
    return "Quick sign-in refresh needed before linking this booking.";
  }

  if (hasAlreadyLinkedError(message)) {
    return "Great news - this booking is already linked to your account.";
  }

  if (hasNotFoundError(message)) {
    return "We could not locate that booking ID yet. Please check the code and try again.";
  }

  if (hasBadInputError(message)) {
    return "That booking ID looks incomplete. Please use the exact reservation code.";
  }

  if (hasNetworkError(message)) {
    return "Connection looks unstable right now. Please retry linking in a moment.";
  }

  return "Linking is taking longer than usual. Please retry and we will take care of the rest.";
}
