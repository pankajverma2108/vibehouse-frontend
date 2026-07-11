"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { BreakfastOrderDetails } from "@/components/breakfast/breakfast-order-summary";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import type { BreakfastMenuItem, BreakfastRoom } from "@/lib/breakfast-api";
import {
  MOTION_SCALE,
  createMotionTransition,
  createReducedMotionTransition,
} from "@/lib/motion";

function BreakfastDialogFrame({
  open,
  onOpenChange,
  title,
  description,
  sticker,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  sticker?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const transition = reducedMotion
    ? createReducedMotionTransition()
    : createMotionTransition("moderate", "enter");

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <AnimatePresence initial={false}>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[240] bg-black/76 backdrop-blur-sm"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={transition}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.section
                animate={{ opacity: 1, scale: 1 }}
                className="fixed left-1/2 top-1/2 z-[241] flex max-h-[min(88dvh,720px)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border border-white/16 bg-[#09090d] text-white shadow-[0_30px_90px_rgba(0,0,0,0.62)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b]"
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: MOTION_SCALE.exit }}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: MOTION_SCALE.subtleEnter }}
                transition={transition}
              >
                <header className="flex items-start justify-between gap-4 border-b border-dashed border-white/14 bg-[#150a0d] p-5 sm:p-6">
                  <div className="min-w-0">
                    {sticker ? (
                      <StickerTag
                        bg="#FEF08A"
                        className="px-3 py-1.5 text-[10px] font-black not-italic uppercase tracking-[0.1em]"
                        label={sticker}
                        rotate="-rotate-[2deg]"
                        text="#230f14"
                      />
                    ) : null}
                    <Dialog.Title className="font-sectiontitle mt-3 break-words text-[28px] leading-tight text-white sm:text-[34px]">
                      {title}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm leading-6 text-white/64">
                      {description}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      aria-label="Close breakfast dialog"
                      className="inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-[12px] border border-white/16 bg-white/[0.04] text-white transition-colors hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b]"
                      type="button"
                    >
                      <X aria-hidden="true" className="size-5" />
                    </button>
                  </Dialog.Close>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                  {children}
                </div>
                <footer className="border-t border-dashed border-white/14 bg-[#150a0d] p-4 sm:p-5">
                  {footer}
                </footer>
              </motion.section>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function BreakfastConfirmationDialog({
  open,
  onOpenChange,
  rooms,
  menu,
  serviceDate,
  canEdit,
  onEdit,
  simulated = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: BreakfastRoom[];
  menu: BreakfastMenuItem[];
  serviceDate: string;
  canEdit: boolean;
  onEdit: () => void;
  simulated?: boolean;
}) {
  if (rooms.length === 0) {
    return null;
  }

  return (
    <BreakfastDialogFrame
      description={simulated ? "Sample confirmation only. No breakfast order was saved." : "Your latest saved breakfast order is shown below."}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Dialog.Close asChild>
            <Button className="h-12 rounded-[12px] bg-[var(--vh-pink)] px-5 font-bold text-white hover:bg-[var(--vh-pink-soft)]">
              <Check aria-hidden="true" />
              Close summary
            </Button>
          </Dialog.Close>
          {canEdit ? (
            <Button
              className="h-12 rounded-[12px] border border-white/16 bg-transparent px-5 font-bold text-white hover:bg-white/[0.06]"
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
              type="button"
              variant="outline"
            >
              Edit order
            </Button>
          ) : null}
        </div>
      )}
      onOpenChange={onOpenChange}
      open={open}
      sticker={simulated ? "SAMPLE ORDER" : "ORDER SAVED"}
      title="Order submitted"
    >
      <BreakfastOrderDetails menu={menu} rooms={rooms} serviceDate={serviceDate} />
    </BreakfastDialogFrame>
  );
}

export function BreakfastSkipDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
  roomNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
  roomNumber: string;
}) {
  return (
    <BreakfastDialogFrame
      description={`This clears any saved plates and delivery slots for Room ${roomNumber}.`}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            className="h-12 rounded-[12px] bg-[var(--vh-pink)] px-5 font-bold text-white hover:bg-[var(--vh-pink-soft)]"
            loading={pending}
            loadingText="Saving choice…"
            onClick={onConfirm}
            type="button"
          >
            Skip breakfast
          </Button>
          <Dialog.Close asChild>
            <Button
              className="h-12 rounded-[12px] border border-white/16 bg-transparent px-5 font-bold text-white hover:bg-white/[0.06]"
              disabled={pending}
              type="button"
              variant="outline"
            >
              Keep my order
            </Button>
          </Dialog.Close>
        </div>
      )}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          onOpenChange(nextOpen);
        }
      }}
      open={open}
      title="Skip breakfast?"
    >
      <p className="text-base leading-7 text-white/74">
        Choose this only if nobody in Room {roomNumber} needs breakfast for the service date shown on the page.
      </p>
    </BreakfastDialogFrame>
  );
}
