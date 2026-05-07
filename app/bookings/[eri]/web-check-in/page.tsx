import { PreArrivalPage } from "@/components/booking/pre-arrival-page";

type WebCheckInRouteProps = {
  params: Promise<{
    eri: string;
  }>;
};

export default async function WebCheckInRoute({ params }: WebCheckInRouteProps) {
  const { eri } = await params;

  return <PreArrivalPage ezeeReservationId={decodeURIComponent(eri)} />;
}
