import { Suspense } from "react";

import Loading from "@/app/property/loading";
import { RoomsRedirect } from "@/components/marketing/pages/rooms-redirect";

export default function RoomsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RoomsRedirect />
    </Suspense>
  );
}
