"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { BreakfastReviewDetails } from "@/components/breakfast/breakfast-order-summary";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import type { BreakfastOrderReview } from "@/lib/breakfast-order";
import {
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
  closeDisabled = false,
  closeLabel = "Close order receipt",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  sticker?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeDisabled?: boolean;
  closeLabel?: string;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const transition = reducedMotion
    ? createReducedMotionTransition()
    : createMotionTransition("moderate", "enter");

  return (
    <Dialog.Root onOpenChange={(nextOpen) => { if (!closeDisabled) onOpenChange(nextOpen); }} open={open}>
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
            <Dialog.Content asChild forceMount onEscapeKeyDown={(event) => { if (closeDisabled) event.preventDefault(); }} onPointerDownOutside={(event) => { if (closeDisabled) event.preventDefault(); }}>
              <motion.section
                animate={{ opacity: 1 }}
                className="fixed left-1/2 top-1/2 z-[241] flex max-h-[min(88dvh,760px)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border border-white/16 bg-[#09090d] text-white shadow-[0_30px_90px_rgba(0,0,0,0.62)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b]"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
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
                      aria-label={closeLabel}
                      className="inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-[12px] border border-white/16 bg-white/[0.04] text-white transition-colors hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={closeDisabled}
                      type="button"
                    >
                      <X aria-hidden="true" className="size-5" />
                    </button>
                  </Dialog.Close>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                  {children}
                </div>
                {footer ? (
                  <footer className="border-t border-dashed border-white/14 bg-[#150a0d] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
                    {footer}
                  </footer>
                ) : null}
              </motion.section>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

type BreakfastConfirmationDialogBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: BreakfastOrderReview | null;
  serviceDate: string;
  pending: boolean;
  canEdit: boolean;
  onEdit: () => void;
  simulated?: boolean;
};

export type BreakfastConfirmationDialogProps = BreakfastConfirmationDialogBaseProps & (
  | { mode: "review"; onConfirm: () => void }
  | { mode: "placed"; onConfirm?: never }
);

export function BreakfastConfirmationDialog({
  open,
  onOpenChange,
  review,
  serviceDate,
  mode,
  pending,
  canEdit,
  onEdit,
  onConfirm,
  simulated = false,
}: BreakfastConfirmationDialogProps) {
  if (!review || review.rooms.length === 0) return null;

  const editingButton = canEdit ? (
    <Button
      className="h-12 rounded-[12px] border border-white/24 bg-[#15151b] px-5 font-bold text-white shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] hover:bg-[#202029]"
      disabled={pending}
      onClick={() => {
        onOpenChange(false);
        onEdit();
      }}
      type="button"
      variant="outline"
    >
      Edit Order
    </Button>
  ) : null;

  return (
    <BreakfastDialogFrame
      closeLabel="Close order receipt"
      closeDisabled={pending}
      description={mode === "review"
        ? "Check every room, plate, and delivery slot. Nothing is sent until you confirm."
        : simulated
          ? "Preview complete. This sample order was not sent to the backend."
          : "Your breakfast order has been sent. This is your latest receipt."}
      footer={mode === "review" ? (
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            className="h-12 rounded-[12px] bg-[var(--vh-pink)] px-5 font-bold text-white hover:bg-[var(--vh-pink-soft)]"
            loading={pending}
            loadingText="Placing order..."
            onClick={onConfirm}
            type="button"
          >
            <Check aria-hidden="true" />
            Confirm Order
          </Button>
          {editingButton}
        </div>
      ) : editingButton ? <div className="flex flex-col sm:flex-row">{editingButton}</div> : undefined}
      onOpenChange={onOpenChange}
      open={open}
      sticker={mode === "review" ? "CHECK YOUR PLATES" : simulated ? "SAMPLE ORDER" : "ORDER PLACED"}
      title={mode === "review" ? "Review Your Order" : "Order Placed"}
    >
      <BreakfastReviewDetails review={review} serviceDate={serviceDate} />
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
      closeLabel="Close skip breakfast dialog"
      closeDisabled={pending}
      description={`This marks Room ${roomNumber} to skip breakfast. It does not send anything yet.`}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            className="h-12 rounded-[12px] bg-[var(--vh-pink)] px-5 font-bold text-white hover:bg-[var(--vh-pink-soft)]"
            loading={pending}
            loadingText="Updating choice..."
            onClick={onConfirm}
            type="button"
          >
            Skip Breakfast
          </Button>
          <Dialog.Close asChild>
            <Button
              className="h-12 rounded-[12px] border border-white/24 bg-[#15151b] px-5 font-bold text-white hover:bg-[#202029]"
              disabled={pending}
              type="button"
              variant="outline"
            >
              Keep Breakfast Choices
            </Button>
          </Dialog.Close>
        </div>
      )}
      onOpenChange={onOpenChange}
      open={open}
      sticker="ROOM CHOICE"
      title="Skip Breakfast?"
    >
      <p className="text-base leading-7 text-white/74">
        Skip only if nobody in Room {roomNumber} needs breakfast for the service date shown on the page. You can change this before confirming the full order.
      </p>
    </BreakfastDialogFrame>
  );
}
