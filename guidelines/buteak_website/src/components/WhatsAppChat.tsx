
// import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const WhatsAppChat: React.FC = () => {
    const handleWhatsAppClick = () => {
        window.open('https://api.whatsapp.com/send/?phone=917470793161&text=Hello%21+I+would+like+to+know+more+about+Buteak+Suites.&type=phone_number&app_absent=0', '_blank');
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {/* <Button
                            onClick={handleWhatsAppClick}
                            size="lg"
                            className="h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#128C7E] shadow-lg"
                        >
                            <MessageCircle className="h-7 w-7 text-white" />
                        </Button> */}

                        <button
                            onClick={handleWhatsAppClick}
                            // size="lg"
                            className="h-20 w-20 rounded-full hover:bg-[#128C7E]"
                        >

                            <img src="/images/whatsapp.svg" alt="WhatsApp" className="h-20 w-20" />
                            {/* <MessageCircle className="h-7 w-7 text-white" /> */}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Chat with us on WhatsApp</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};

export default WhatsAppChat;
