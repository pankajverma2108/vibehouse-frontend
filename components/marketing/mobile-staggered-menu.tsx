"use client";

import React, { useState } from "react";
import { CredExpandTrigger, CredMegaMenuOverlay } from "./cred-mega-menu";

type MobileStaggeredMenuProps = {
  activeGuestHubBookingId?: null | string;
  isAuthenticated: boolean;
  onOpenSignIn: () => void;
};

export function MobileStaggeredMenu({
  isAuthenticated,
  onOpenSignIn,
}: MobileStaggeredMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <CredExpandTrigger isOpen={open} onClick={() => setOpen(true)} />
      <CredMegaMenuOverlay
        isOpen={open}
        onClose={() => setOpen(false)}
        isAuthenticated={isAuthenticated}
        onOpenSignIn={onOpenSignIn}
      />
    </div>
  );
}
