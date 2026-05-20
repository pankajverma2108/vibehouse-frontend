
import React from 'react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';

const Contact = () => {

  const phoneNumber = '+91 9993177238';
  const message = encodeURIComponent('Hello! I would like to know more about Buteak Suites.');

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };
  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h1 className="font-schibsted text-5xl md:text-5xl lg:text-6xl xl:text-[80px] font-medium leading-tight mb-4">Contact Us</h1>
            <p className="text-hotel-body max-w-2xl mx-auto">
              We're here to assist you with any inquiries or special requests for your stay.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div className="bg-white flex flex-col justify-center item-center shadow-lg  rounded-lg p-8">
              <h2 className="text-2xl text-center font-schibsted font-bold mb-6">Send us a Message</h2>
              {/* <form "className="space-y-6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-hotel-body mb-1">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hotel-accent"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-hotel-body mb-1">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hotel-accent"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-hotel-body mb-1">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hotel-accent"
                    placeholder="Booking Inquiry"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-hotel-body mb-1">Message</label>
                  <textarea
                    id="message"
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hotel-accent"
                    placeholder="Your message..."
                  ></textarea>
                </div>

              </form> */}
              <div className='space-y-6'>
                <Button onClick={handleWhatsAppClick} className="w-full">Send Message</Button>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <div className="bg-white shadow-lg py-8 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-schibsted font-bold mb-6">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-lg">Address</h3>
                    {/* <p className="text-hotel-body">13/14,Rashtrakavi Kuvempu Nagar</p>
                    <p className="text-hotel-body">Bengaluru Urban, Karnataka,560076</p> */}
                    <a
  href="https://maps.app.goo.gl/iWpmJKyfJ6QC29tw7?g_st=aw"
  target="_blank"
  rel="noopener noreferrer"
  className="text-hotel-body hover:text-hotel-accent transition-colors"
>
  13/14, 1st B Main Rd, Mico Layout, BTM 2nd Stage, BTM Layout, Bengaluru, Karnataka 560076
</a>
                  </div>
                  <div>

                    <h3 className="font-medium text-lg">Phone</h3>
                    <Link to={"tel:+91 9993177238"}> <p className="text-hotel-body">+91 9993177238</p></Link>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">Email</h3>

                    <Link to={"mailto:contact@buteak.in"}>
                      <p className="text-hotel-body">contact@buteak.in</p></Link>
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              {/* <div className="bg-gray-200 h-64 rounded-lg overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6044.876702005952!2d-73.98629534658191!3d40.748402903819096!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259a9b30eac9f%3A0xaca8b8c4d20adf14!2sNew%20York%2C%20NY%2010001!5e0!3m2!1sen!2sus!4v1651234567890!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  title="Hotel Location"
                ></iframe>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
