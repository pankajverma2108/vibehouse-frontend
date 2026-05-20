
// import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Building, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
const LocationPage = () => {
  const { locationId } = useParams();

  // Map location IDs to display names
  const locationNames: Record<string, string> = {
    'btm-layout': 'BTM Layout',
    'hsr-layout': 'HSR Layout',
    'koramangala': 'Koramangala',
    'indira-nagar': 'Indira Nagar'
  };

  const displayName = locationNames[locationId as string] || 'Location';

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="flex flex-col space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">Buteak Suites at {displayName}</h1>
          <p className="text-hotel-body flex items-center gap-2">
            <MapPin className="h-5 w-5 text-hotel-accent" />
            {displayName}, Bangalore
          </p>
        </div>
        <h2 className="text-3xl md:text-4xl mb-4 font-bold">Hotels</h2>
        <div></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div>
            <div className="rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=2574&auto=format&fit=crop"
                alt={`Buteak Suites ${displayName}`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">About BTM Layout</h2>
              {/* {displayName} */}

              <p className="text-hotel-body mb-6">
                Our {displayName} location offers premium serviced apartments in one of Bangalore's
                most vibrant neighborhoods. Enjoy the perfect blend of home comfort and hotel luxury
                with our thoughtfully designed spaces.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-hotel-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Modern Architecture</h3>
                    <p className="text-sm text-hotel-body">Contemporary design with premium finishes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Compass className="h-5 w-5 text-hotel-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Prime Location</h3>
                    <p className="text-sm text-hotel-body">Close to tech parks, restaurants, and shopping</p>
                  </div>
                </div>
              </div>
            </div>
            <Link to={'/hotels'} >
              <Button className="bg-hotel-accent text-white w-full md:w-auto">Explore</Button>
            </Link>
          </div>
        </div>
      </div >
      <Footer />
    </>
  );
};

export default LocationPage;
