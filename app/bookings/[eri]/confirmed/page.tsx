import { BookingConfirmedPage } from "@/components/booking/booking-confirmed-page";

type BookingConfirmedRouteProps = {
  params: Promise<{
    eri: string;
  }>;
};

export default async function BookingConfirmedRoute({ params }: BookingConfirmedRouteProps) {
  const { eri } = await params;

  return <BookingConfirmedPage ezeeReservationId={decodeURIComponent(eri)} />;
}
