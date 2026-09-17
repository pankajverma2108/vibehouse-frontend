import { Suspense } from "react";

import Loading from "@/app/property/loading";
import { PropertyClientPage } from "@/components/marketing/pages/property-client-page";

export default function PropertyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PropertyClientPage />
    </Suspense>
  );
}
