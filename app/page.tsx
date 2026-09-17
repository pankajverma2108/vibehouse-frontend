import { Suspense } from "react";

import { HomeClientPage } from "@/components/marketing/pages/home-client-page";
import Loading from "@/app/loading";

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeClientPage />
    </Suspense>
  );
}
