import { ScopedGuestRedirect } from "@/components/guest/scoped-guest-redirect";

export default function Page() {
  return <ScopedGuestRedirect subpath="addons#upgrades" />;
}
