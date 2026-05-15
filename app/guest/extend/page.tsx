import { GuestLegacyRouteRedirect } from "@/components/guest/guest-route-gate";

export default function GuestUpgradeRedirectPage() {
  return <GuestLegacyRouteRedirect subpath="addons#upgrades" />;
}
