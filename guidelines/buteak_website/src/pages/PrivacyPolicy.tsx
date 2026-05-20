import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import React from 'react'

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <div className='container mx-auto pt-4 py-8'>
                <h1 className='text-center font-bold py-8'>Privacy Policy</h1>
                    <div className='py-4'>
                    <p>
                        At Buteak Suites, your privacy is of utmost importance. This Privacy Policy explains how we:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Collect your personal information</li>
                        <li>Use it responsibly</li>
                        <li>Protect it with appropriate safeguards</li>
                    </ul>
                    <p className="mt-4">
                        This policy applies whenever you interact with us through our website, mobile applications, reservations, or on-property services.  
                        By using our websites, apps, telephone lines, or any other hotel service, you consent and agree to the practices outlined in this statement.
                    </p>
                    </div>

                <div className='py-4'>
                <div className='py-4'>
                    <h2 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-2">
                        Personal Information Provided by You
                    </h2>
                    <ul className="list-disc pl-6 space-y-4">
                        <li>
                        <span className="font-bold">During Booking:</span>  
                        Name and contact information (email, phone number).
                        </li>
                        <li>
                        <span className="font-bold">Loyalty App, Web Check-in, or Front Office Check-in:</span>  
                        Name, contact information (email, phone number), address, ID proof (passport, driver's license, voter ID, or other valid identity proof), gender, date of birth, profile picture, company, profession, job title.
                        </li>
                        <li>
                        <span className="font-bold">During Stay:</span>  
                        Room service requests, food orders, chat conversations.
                        </li>
                        <li>
                        <span className="font-bold">Feedback and Surveys:</span>  
                        Opinions or suggestions shared through feedback forms, surveys, or reviews.
                        </li>
                        <li>
                        <span className="font-bold">Communication:</span>  
                        Emails, phone calls, chat conversations.
                        </li>
                    </ul>
                    </div>

                    <div className='py-4'>
                        <h2 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-2">
                            Automatically Collected Information
                        </h2>
                        <ul className="list-disc pl-6 space-y-4">
                            <li>
                            <span className="font-bold">Website/App Usage:</span>  
                            Browser type, operating system, device identifiers, searches, pages visited, clicks, time spent.
                            </li>
                            <li>
                            <span className="font-bold">During Stay:</span>  
                            Internet bandwidth consumption, energy usage, digital door lock and minibar access.
                            </li>
                            <li>
                            <span className="font-bold">Overtime:</span>  
                            Booking history, stay history, loyalty program usage.
                            </li>
                        </ul>
                    </div>

                    <div className='py-4'>
                        <h2 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-2">
                            Data from Third Parties
                        </h2>
                        <ul className="list-disc pl-6 space-y-4">
                            <li>
                            <span className="font-bold">Payment Processors:</span>  
                            Payment-related details but not sensitive financial data like full card numbers.
                            </li>
                            <li>
                            <span className="font-bold">Travel Agencies and Online Travel Platforms:</span>  
                            Data shared by travel agencies or online platforms for reservation purposes.
                            </li>
                            <li>
                            <span className="font-bold">Overtime:</span>  
                            Booking history, stay history, loyalty program usage.
                            </li>
                        </ul>
                    </div>

                    <div className='py-4'>
                        <h2 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-2">
                            How We Protect Your Information
                        </h2>
                        <p>We employ robust measures to secure your data:</p>
                        <ul className="list-disc pl-6 space-y-4">
                            <li>
                            <span className="font-bold">Access Controls:</span>  
                            Only authorized personnel have access to your personal information.
                            </li>
                            <li>
                            <span className="font-bold">Regular Audits:</span>  
                            Routine assessments to ensure compliance with security standards.
                            </li>
                            <li>
                            <span className="font-bold">Secure Payment Gateways:</span>  
                            Partnering with trusted payment processors to safeguard sensitive payment-related data.
                            </li>
                        </ul>

                        <div className='mt-6'>
                            <h3 className="md:text-xl text-[20px] font-bold text-[#494949] mb-2">
                            Protection of Children’s Data
                            </h3>
                            <ul className="list-disc pl-6 space-y-3">
                            <li>
                                If an individual below 18 years is accessing our services, it is assumed that their 
                                <span className="font-bold"> parent or legal guardian</span> is aware of and consents to the collection and use of their personal data.
                            </li>
                            <li>
                                We do not engage in tracking, behavioral monitoring, or targeted advertising aimed at children.
                            </li>
                            </ul>
                        </div>
                    </div>

                    <div className='py-4'>
                        <h2 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-2">
                            Data Sharing and Disclosure
                        </h2>
                        <p>We do not sell your personal information. We may share it in the following scenarios:</p>

                        <ul className="list-disc pl-6 space-y-4 mt-4">
                            <li>
                            <span className="font-bold">With Service Providers:</span>  
                            For services like payment processing, in-stay services, identity verification, communication, and marketing under strict confidentiality agreements with our partners.  
                            Service providers are bound by our privacy policy and may not use this information for their own purposes.
                            </li>
                            <li>
                            <span className="font-bold">For Legal Obligations:</span>  
                            When required by law, regulation, or judicial process.
                            </li>
                        </ul>

                        <div className='mt-8'>
                            <h3 className="md:text-xl text-[20px] font-bold text-[#494949] mb-2">
                            Local Storage & Cookies
                            </h3>
                            <p>We use cookies and other forms of local storage on your device to recognize you and provide you with relevant information.</p>
                            <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>
                                We, and third parties with whom we partner, may use cookies, pixel tags, web beacons, mobile device IDs, 
                                and similar technologies to collect and store information about your use of the services and third-party websites.
                            </li>
                            <li>You can usually change your browser's settings so that it will not accept cookies.</li>
                            <li>
                                By using our services with your browser set to accept cookies, you are consenting to our use of cookies in the manner described in this section.
                            </li>
                            </ul>
                        </div>
                        </div>


                    <div className='py-4'>
                        <h2 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-2">
                            Your Rights
                        </h2>
                        <p>You have the following rights regarding your personal data:</p>

                        <ul className="list-disc pl-6 space-y-4 mt-4">
                            <li>
                            <span className="font-bold">Access:</span> Request a copy of your data.
                            </li>
                            <li>
                            <span className="font-bold">Update:</span> Request changes to your profile data to update inaccuracies.
                            </li>
                            <li>
                            <span className="font-bold">Deletion:</span> You may request the deletion or obfuscation of your data, subject to legal requirements.  
                            Please note that identity proof and related data from past stays cannot be erased as it must be retained by law.  
                            However, your profile data can be cleared or obfuscated to prevent its use in future bookings and stays.
                            </li>
                        </ul>
                        </div>

                    <div className='py-4'>
                        <p>
                            To exercise your rights, please email us at{' '}
                            <a href='mailto:help@buteak.in' className='underline text-blue-600'>help@buteak.in</a>.  
                            If you have any questions or concerns about this Privacy Policy or your personal data, please contact us at{' '}
                            <a href='mailto:help@buteak.in' className='underline text-blue-600'>help@buteak.in</a>.
                        </p>
                        </div>
                </div>
            </div>
            <Footer />
        </div >
    )
}
