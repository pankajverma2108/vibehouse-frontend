import { forwardRef, type AnchorHTMLAttributes } from "react";

export const DocumentLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  function DocumentLink(props, ref) {
    return <a {...props} ref={ref} />;
  },
);
