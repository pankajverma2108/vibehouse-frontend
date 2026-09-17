export const STATIC_ROUTE_SHELL_SEGMENT = "__static_shell__";

export function requiresDocumentNavigation(href: string): boolean {
  const pathname = href.split(/[?#]/, 1)[0];

  return (
    /^\/bookings\/[^/]+\/(confirmed|web-check-in)$/.test(pathname) ||
    /^\/(breakfast|feedback)\/(?!preview(?:\/|$))[^/]+$/.test(pathname) ||
    /^\/[^/]+\/guest(?:\/(addons|borrow|checkout|extend|guide|lost-found|review|services))?$/.test(pathname)
  );
}
