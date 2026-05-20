
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Image, Users, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const PressMedia = () => {
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
        <section className="relative bg-gray-800 py-16 md:py-24 overflow-hidden">
          {/* Background Image with Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0" 
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=5304')",
              opacity: "0.2" 
            }}
          />
          
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto">
              <Button variant="outline" className="mb-8 text-white border-white hover:bg-white hover:text-gray-800" asChild>
                <Link to="/career" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Careers
                </Link>
              </Button>
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-schibsted">
                  Press & Media
                </h1>
                <h2 className="text-xl md:text-2xl text-white/90 font-medium">
                  Resources for Journalists and Media Professionals
                </h2>
              </div>
            </div>
          </div>
        </section>

        {/* Media Resources */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-hotel-primary">Media Resources</h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Everything you need to tell the Buteak story. Browse our collection of assets, information, and resources for media professionals.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                {/* Press Releases */}
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className="bg-hotel-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                      <FileText className="text-hotel-primary h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-hotel-primary">Press Releases</h3>
                    <p className="text-gray-600 mb-6 flex-grow">
                      Access our latest press releases, company announcements, and statements from Buteak leadership.
                    </p>
                    <Button className="bg-hotel-primary hover:bg-hotel-accent text-white self-start">
                      Download Press Kit
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Image Gallery */}
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className="bg-hotel-accent/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                      <Image className="text-hotel-accent h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-hotel-primary">Image Gallery</h3>
                    <p className="text-gray-600 mb-6 flex-grow">
                      High-resolution images of our properties, leadership team, and brand assets for use in publications.
                    </p>
                    <Button className="bg-hotel-accent hover:bg-hotel-primary text-white self-start">
                      Browse Gallery
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Executive Profiles */}
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className="bg-hotel-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                      <Users className="text-hotel-primary h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-hotel-primary">Executive Profiles</h3>
                    <p className="text-gray-600 mb-6 flex-grow">
                      Biographies and high-resolution images of Buteak's leadership team for media use.
                    </p>
                    <Button className="bg-hotel-primary hover:bg-hotel-accent text-white self-start">
                      View Leadership
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Brand Guidelines */}
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className="bg-hotel-accent/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                      <LinkIcon className="text-hotel-accent h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-hotel-primary">Brand Guidelines</h3>
                    <p className="text-gray-600 mb-6 flex-grow">
                      Official logos, color palettes, typography, and usage guidelines for the Buteak brand.
                    </p>
                    <Button className="bg-hotel-accent hover:bg-hotel-primary text-white self-start">
                      Download Assets
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              {/* Media Contact Section */}
              <div className="bg-gray-50 p-8 md:p-12 rounded-xl">
                <div className="md:flex justify-between items-center">
                  <div className="md:w-7/12 mb-6 md:mb-0">
                    <h3 className="text-2xl font-bold mb-4 text-hotel-primary">Media Contact</h3>
                    <p className="text-gray-600 mb-4">
                      For press inquiries, interview requests, or additional information about Buteak Suites, please contact:
                    </p>
                    <div className="space-y-2">
                      <p className="font-medium text-hotel-primary">Priya Sharma</p>
                      <p>Head of Public Relations</p>
                      <p>media@buteaksuites.com</p>
                      <p>+91 98765 43210</p>
                    </div>
                  </div>
                  <div className="md:w-4/12">
                    <Button className="w-full py-6 bg-hotel-primary hover:bg-hotel-accent text-white">
                      Media Inquiry Form
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default PressMedia;
