export function isFeedbackRoute(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === "/feedback" || pathname.startsWith("/feedback/");
}
