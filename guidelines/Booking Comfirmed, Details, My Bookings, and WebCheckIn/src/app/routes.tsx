import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { MyBookings } from "./pages/MyBookings";
import { BookingDetails } from "./pages/BookingDetails";
import { WebCheckIn } from "./pages/WebCheckIn";
import { BookingConfirmed } from "./pages/BookingConfirmed";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/web/bookings" replace />
  },
  {
    path: "/web",
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/web/bookings" replace /> },
      { path: "bookings", element: <MyBookings /> },
      { path: "booking/:id", element: <BookingDetails /> },
      { path: "check-in/:id", element: <WebCheckIn /> },
      { path: "booking/:id/confirmed", element: <BookingConfirmed /> },
    ],
  },
]);