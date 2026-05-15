import { redirect } from "next/navigation";

import { getScopedGuestHubHref } from "@/lib/guest-hub";

export default async function ScopedGuestUpgradeRedirectPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  redirect(getScopedGuestHubHref(bookingId, "addons#upgrades"));
}
