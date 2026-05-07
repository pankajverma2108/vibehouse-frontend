import { GuestLegacyRouteRedirect } from "@/components/guest/guest-route-gate";

export default function GuestBorrowPage() {
  return <GuestLegacyRouteRedirect subpath="borrow" />;
}
