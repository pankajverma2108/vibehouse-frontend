
import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BookingForm from '@/components/BookingForm';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const BookNow = () => {
  const [searchParams] = useSearchParams();
  const selectedRoom = searchParams.get('room');
  const [pageTitle, setPageTitle] = useState('Book Your Stay');

  useEffect(() => {
    if (selectedRoom) {
      setPageTitle(`Book ${selectedRoom}`);
      // Scroll to booking form
      document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedRoom]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="py-16 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h1 className="font-schibsted text-5xl md:text-5xl lg:text-6xl xl:text-[80px] font-medium leading-tight mb-4">{pageTitle}</h1>
            <p className="text-hotel-body max-w-2xl mx-auto">
              {selectedRoom
                ? `Reserve your ${selectedRoom} and start planning your luxurious getaway at Serenity Hotel.`
                : 'Reserve your perfect room and start planning your luxurious getaway at Serenity Hotel.'}
            </p>
          </div>

          <div className="mb-8 text-center">
            <Button variant="outline" asChild className="px-8 py-2 font-medium">
              <Link to="/rooms">
                View All Rooms
              </Link>
            </Button>
          </div>

          <div id="booking-form" className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <BookingForm selectedRoom={selectedRoom || undefined} />
          </div>

          <div className="mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold font-schibsted mb-6">Booking Information</h2>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-xl mb-2">Check-in & Check-out</h3>
                  <p className="text-hotel-body">Check-in time starts at 3 PM</p>
                  <p className="text-hotel-body">Check-out time is 12 PM</p>
                </div>

                <div>
                  <h3 className="font-bold text-xl mb-2">Cancellation Policy</h3>
                  <p className="text-hotel-body">Free cancellation up to 24 hours before check-in. After that, cancellations will incur a fee equivalent to one night's stay.</p>
                </div>

                <div>
                  <h3 className="font-bold text-xl mb-2">Special Requests</h3>
                  <p className="text-hotel-body">For any special requests or assistance with your booking, please contact our reservations team at contact@buteak.in or call +91 9993177238</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BookNow;
