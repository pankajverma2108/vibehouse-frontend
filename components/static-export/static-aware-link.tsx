import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

import { requiresDocumentNavigation } from "@/lib/static-export-routes";

type StaticAwareLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export function StaticAwareLink({ href, ...props }: StaticAwareLinkProps) {
  if (requiresDocumentNavigation(href)) {
    return <a {...props} href={href} />;
  }

  return <Link {...props} href={href} />;
}
