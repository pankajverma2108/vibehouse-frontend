import { GuestLegacyRouteRedirect } from "@/components/guest/guest-route-gate";

export default function GuestCheckoutPage() {
  return <GuestLegacyRouteRedirect subpath="checkout" />;
}
