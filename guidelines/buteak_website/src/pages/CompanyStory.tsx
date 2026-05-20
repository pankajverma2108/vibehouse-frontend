
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CompanyStory = () => {
  const location = useLocation();

  // Effect to scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-hotel-primary py-16 md:py-24 overflow-hidden">
          {/* Background Image with Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0" 
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070')",
              opacity: "0.2" 
            }}
          />
          
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto">
              <Button variant="outline" className="mb-8 text-white border-white hover:bg-white hover:text-hotel-primary" asChild>
                <Link to="/career" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Careers
                </Link>
              </Button>
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-schibsted">
                  Explore the Buteak Story
                </h1>
                <h2 className="text-xl md:text-2xl text-white/90 font-medium">
                  From Vision to Revolution
                </h2>
              </div>
            </div>
          </div>
        </section>

        {/* Story Content */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="prose prose-lg">
                <h2 className="text-3xl font-bold mb-6 text-hotel-primary">Our Beginnings</h2>
                <p className="mb-6">
                  Founded in 2018, Buteak Suites began with a simple yet revolutionary idea: to combine the comfort and space of premium apartments with the convenience and service of high-end hotels—all at an accessible price point.
                </p>
                <p className="mb-10">
                  Our founder, Ashish Kumar, noticed a gap in the hospitality market during his extensive travels across India. Business travelers and vacationing families often had to choose between cramped hotel rooms or apartments without proper services. Buteak was born to bridge this gap.
                </p>
                
                <div className="bg-gray-50 p-8 rounded-lg mb-10">
                  <blockquote className="text-xl italic text-hotel-primary">
                    "We wanted to create spaces where people feel completely at home, yet still enjoy the luxuries of hospitality. That combination is the essence of Buteak."
                    <footer className="text-lg font-normal mt-3">— Ashish Kumar, Founder & CEO</footer>
                  </blockquote>
                </div>

                <h2 className="text-3xl font-bold mb-6 text-hotel-primary">Growth and Expansion</h2>
                <p className="mb-6">
                  What started as a single property in Bangalore quickly caught the attention of travelers looking for something different. By 2020, Buteak had expanded to five major Indian cities, despite the challenges posed by the global pandemic.
                </p>
                <p className="mb-10">
                  Our innovative approach to contactless check-ins and enhanced sanitization protocols allowed us to navigate the difficult period and emerge stronger, setting new standards for the industry along the way.
                </p>

                <h2 className="text-3xl font-bold mb-6 text-hotel-primary">Where We Are Today</h2>
                <p className="mb-6">
                  Today, Buteak Suites operates in over 15 cities across India with more than 50 properties, each maintaining our core values of comfort, convenience, and affordability. Our team has grown to over 500 dedicated professionals who share our passion for hospitality.
                </p>
                <p className="mb-10">
                  We've been recognized with multiple industry awards for innovation in hospitality and continue to push boundaries in how modern travelers experience accommodations.
                </p>

                <h2 className="text-3xl font-bold mb-6 text-hotel-primary">Looking Ahead</h2>
                <p className="mb-6">
                  As we look to the future, Buteak aims to become the leading hospitality brand in India, with plans to expand internationally within the next five years. We're continuously innovating our spaces and services, incorporating technology and sustainability into every aspect of our operations.
                </p>
                <p>
                  Join us on this exciting journey as we redefine hospitality, one thoughtfully designed suite at a time.
                </p>
              </div>

              <div className="mt-16 text-center">
                <h3 className="text-2xl font-bold mb-6 text-hotel-primary">Want to be part of our story?</h3>
                <Button className="bg-hotel-primary hover:bg-hotel-accent text-white" asChild>
                  <Link to="/career">
                    Explore Career Opportunities
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default CompanyStory;
