
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Minus } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  isOpen?: boolean;
}

interface HotelFAQProps {
  faqs: FAQItem[];
}

const HotelFAQ: React.FC<HotelFAQProps> = ({ faqs }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold  text-[#d4a437] mb-6">Frequently Asked Questions</h2>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
              <div className="flex justify-between items-center w-full">
                <span className="text-left text-l text-gray-700">{faq.question}</span>
                <div className="flex-shrink-0 ml-4">
                  {faq.isOpen ? (
                    <Minus className="h-5 w-5 text-hotel-accent" />
                  ) : (
                    <Plus className="h-5 w-5 text-hotel-accent" />
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4  text-gray-700">
              <p className='text-gray-500'>{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default HotelFAQ;
