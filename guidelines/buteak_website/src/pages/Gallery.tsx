import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const Gallery = () => {
  const galleryImages = [
    {
      src: "/images/room/bedroom.jpg",
      alt: "Hotel Lobby"
    },
    {
      src: "/images/room/large-sofa.jpg",
      alt: "Hotel Room"
    },
    {
      src: "/images/room/sofa-with-window.jpg",
      alt: "Hotel Restaurant"
    },
    {
      src: "/images/room/large-bedroom.jpg",
      alt: "Hotel Pool"
    },
    {
      src: "/images/room/large-cubord.jpg",
      alt: "Hotel Spa"
    },
    {
      src: "/images/room/sofa.jpg",
      alt: "Hotel View"
    },
    {
      src: "/images/room/kitchen.jpg",
      alt: "Hotel Bar"
    },
    {
      src: "/images/room/kitchen-utensils.jpg",
      alt: "Hotel Gym"
    },
    {
      src: "/images/room/washroom.jpg",
      alt: "Hotel Suite"
    },
    {
      src: "/images/room/table-with-chair.jpg",
      alt: "Hotel Bedroom"
    },
    {
      src: "/images/room/large-kitchen.jpg",
      alt: "Hotel Bathroom"
    },
    {
      src: "/images/room/balcony.jpg",
      alt: "Hotel Breakfast"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="py-16 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h1 className="font-schibsted text-5xl md:text-5xl lg:text-6xl xl:text-[80px] font-medium leading-tight mb-4">Hotel Gallery</h1>
            <div className="w-24 h-1 bg-hotel-accent mx-auto mb-16"></div>
            <p className="text-hotel-body max-w-2xl mx-auto">
              Take a visual journey through our elegant spaces and breathtaking views.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => (
              <div key={index} className="aspect-square overflow-hidden rounded-lg">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Gallery;
