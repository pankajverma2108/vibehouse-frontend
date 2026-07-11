export function isFeedbackRoute(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === "/feedback" || pathname.startsWith("/feedback/");
}

export function isBreakfastRoute(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === "/breakfast" || pathname.startsWith("/breakfast/");
}

export function isStandalonePublicRoute(pathname: string | null | undefined): boolean {
  return isFeedbackRoute(pathname) || isBreakfastRoute(pathname);
}
