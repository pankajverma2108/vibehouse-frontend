import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'


function TermsConditions() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <div className='container mx-auto pt-4 py-8'>
                <h1 className='text-center font-bold py-8'>Terms & Conditions</h1>
                <h2 className="md:text-2xl text-[22px] font-bold  text-[#494949]  mb-2">Acceptance of Terms</h2>
                <p>To complete your booking on our website, you’ll need to click “I Accept.” Without this, your booking cannot be confirmed. By doing so, you acknowledge that you’ve read and agreed to these Terms and Conditions.</p>
                <p>We strongly recommend that you read the terms before accepting.</p>
                <div className='py-4'>
                    <h2 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Our Contract</h2>
                    <ul className="list-disc pl-6 space-y-2 text-[18px] text-[#494949]">
                        <li>
                        <span className='font-bold'>Consumer Bookings: </span>
                        If you are a consumer (i.e., not dealing as a business with us), ButeakSuites (“we,” “us,” or “our”) provides all rooms and extras under these Terms and Conditions.
                        </li>
                        <li>
                        <span className='font-bold'>Contract Formation: </span>
                        A contract is formed between you and ButeakSuites when we issue you a booking reference number for your room and extras (if applicable). No booking is binding on ButeakSuites until this reference number is issued.
                        </li>
                        <li>
                        <span className='font-bold'>Right to Cancel: </span>
                        Management reserves the right to cancel any booking.
                        </li>
                    </ul>
                </div>

                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Your Booking</h3>
                    <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                        <li>
                        <span className="font-semibold">Transfers and Resales: </span>  
                        Bookings cannot be transferred or resold, in whole or in part. Any attempt to do so may result in cancellation of your booking by ButeakSuites, with no refund of amounts already paid.
                        </li>
                        <li>
                        <span className="font-semibold">Bookings on Behalf of Others: </span>  
                        You may make a booking on someone else’s behalf. However, you are responsible for ensuring that all guests included in your booking follow these terms as if they had made the booking themselves.
                        </li>
                        <li>
                        <span className="font-semibold">Age Requirement: </span>  
                        Bookings can only be made by individuals aged 18 or older. Guests under 18 may not stay alone at the hotel.
                        </li>
                        <li>
                        <span className="font-semibold">Booking Details: </span>  
                        Please ensure that the name on a booking is correct at the time of booking. Changes to names cannot usually be made once the booking is confirmed (see Section 7 for exceptions).
                        </li>
                        <li>
                        <span className="font-semibold">Group Bookings: </span>  
                        Reservations of five or more rooms for the same night will be treated as a Group Booking. Group Bookings are subject to additional terms, particularly for changes and cancellations.
                        </li>
                        <li>
                        <span className="font-semibold">Extras: </span>  
                        Additional services or items (“extras”) may be available when making your booking. Unless expressly included, extras are not part of the room rate and are subject to availability. Extras cannot be transferred to another booking. If you have prepaid for an extra that is unavailable upon arrival, we will refund the amount paid. All extras are provided in line with these terms.
                        </li>
                    </ul>
                    </div>

                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Rates and Payment</h3>
                    <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                        <li>
                        <span className="font-semibold">Room Rates: </span>
                        As shown on our website at the time of booking, or for telephone bookings, as communicated to you.
                        </li>
                        <li>
                        <span className="font-semibold">Payment: </span>
                        Full payment is required at the time of booking unless otherwise specified by ButeakSuites.
                        </li>
                        <li>
                        <span className="font-semibold">Walk-in Bookings / Cash Payments: </span>
                        Guests must present valid photo identification (passport or driver’s license) or a valid credit/debit card.
                        </li>
                    </ul>
                </div>


                {/* Check-in and Check-out */}
                <div className='py-4'>
                <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Check-in and Check-out</h3>
                <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                    <li>
                    <span className="font-semibold">Foreign Guests: </span>
                    Must present a valid passport with visa at check-in, as required by law.
                    </li>
                    <li>
                    <span className="font-semibold">Domestic Guests: </span>
                    Must provide government-issued photo ID with address proof (Voter ID, Driving License, Passport, or Masked Aadhaar Card).
                    </li>
                    <li>
                    <span className="font-semibold">Check-in Time: </span>
                    From 2:00 PM on the scheduled day. Early check-in may be possible subject to availability and must be discussed with the Duty Manager.
                    </li>
                    <li>
                    <span className="font-semibold">Walk-in Payments: </span>
                    For cash payments, valid photo ID (passport or driver’s license) or a valid credit/debit card is required.
                    </li>
                </ul>
                </div>

                {/* Hotel Policy */}
                <div className='py-4'>
                <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Hotel Policy</h3>
                <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                    <li>
                    <span className="font-semibold">Valuables: </span>
                    Money, jewelry, and other valuables should be placed in the in-room safe. Management cannot be held responsible for loss.
                    </li>
                    <li>
                    <span className="font-semibold">Liability: </span>
                    You are personally liable if charges incurred are not paid by the designated guest, company, or association.
                    </li>
                    <li>
                    <span className="font-semibold">Visitors: </span>
                    Guests are not permitted in rooms to ensure safety and security.
                    </li>
                    <li>
                    <span className="font-semibold">Check-in / Check-out: </span>
                    Standard timings are 2:00 PM / 11:00 AM.
                    </li>
                    <li>
                    <span className="font-semibold">Damages & Prohibited Activities: </span>
                    Any damage to property will incur charges. Activities prohibited by law, including prostitution and drug-related offenses, are strictly forbidden.
                    </li>
                    <li>
                    <span className="font-semibold">Room Sharing: </span>
                    If sharing a room, you agree that your stay is based on mutual consent with your roommate.
                    </li>
                </ul>
                </div>

                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Rooms</h3>
                    <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                        <li>
                        <span className="font-semibold">Occupancy: </span>
                        Maximum occupancy for rooms is clearly stated online at buteaksuites.in during the booking process. Guests exceeding these limits must book an additional room at the published daily rate.
                        </li>
                        <li>
                        <span className="font-semibold">Visitors: </span>
                        For safety and security, visitors are not allowed in guest rooms.
                        </li>
                        <li>
                        <span className="font-semibold">Children: </span>
                        In addition to the maximum room occupancy, one child under the age of 8 years is permitted per room. Children must not be left unattended in rooms or public areas at any time.
                        </li>
                        <li>
                        <span className="font-semibold">Smoking Prohibition: </span>
                        Smoking is strictly prohibited in all hotel areas. Interfering with fire detection systems is not allowed. Violation may result in immediate termination of your booking without refund.
                        </li>
                        <li>
                        <span className="font-semibold">Smoking Charges & Damages: </span>
                        Guests will be charged for any damages caused by smoking, including specialist cleaning and room costs if the room becomes unusable. Charges will be applied to the payment card used for booking, and a breakdown will be sent within 10 working days. Future bookings may be refused.
                        </li>
                    </ul>
                </div>


                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Booking Cancellation</h3>
                    <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                        <li>
                        <span className="font-semibold">Free Cancellation: </span>
                        Cancellations can be made free of charge up to 10 days prior to check-in, which starts at 2:00 PM local time on the date of stay.
                        </li>
                        <li>
                        <span className="font-semibold">Late Cancellation: </span>
                        Cancellations made less than 10 days prior to check-in may incur a penalty. Any add-on purchases (non-room items) will be fully refunded.
                        </li>
                        <li>
                        <span className="font-semibold">Refund Timeline: </span>
                        Refunds may take up to 20 working days to reflect in your account.
                        </li>
                        <li>
                        <span className="font-semibold">Hotel Right to Cancel: </span>
                        The hotel reserves the right to cancel a booking in case of guest misconduct, rude behavior, fraud, possession of weapons, involvement in unlawful activities, or blacklisted profiles.
                        </li>
                    </ul>
                </div>

                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Booking Modification</h3>
                    <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                        <li>
                        <span className="font-semibold">Modifying Reservations: </span>
                        You may cancel or modify your reservation by reducing the number of rooms or nights, either prior to arrival or during your stay.
                        </li>
                        <li>
                        <span className="font-semibold">General Modifications: </span>
                        All modifications (except room upgrades) are treated as a cancellation and a new booking. All clauses of the Cancellation Policy apply. For date changes, the same rates as at the time of booking cannot be guaranteed.
                        </li>
                        <li>
                        <span className="font-semibold">Room Upgrades: </span>
                        Upgrades are provided on request where possible. Cancellation Policy does not apply to upgrades. You will be charged the difference between the original booking rate and the upgraded room rate at the time of modification.
                        </li>
                    </ul>
                </div>


                {/* No Show Policy */}
                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">No Show Policy</h3>
                    <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                        <li>
                        <span className="font-semibold">Full Charge: </span>
                        If no cancellation or amendments are made by the final booking date, the entire booking will be charged at 100%.
                        </li>
                    </ul>
                    </div>

                    {/* GST */}
                    <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">GST</h3>
                    <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                        <li>
                        <span className="font-semibold">GST Invoice: </span>
                        To receive a GST invoice, please provide your GST number at the time of check-in. Once submitted, the GST number cannot be changed.
                        </li>
                        <li>
                        <span className="font-semibold">Liability: </span>
                        ButeakSuites is not liable for any loss incurred due to failure to provide correct GST details.
                        </li>
                    </ul>
                </div>

                {/* Group Bookings */}
                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Group Bookings</h3>
                    <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                        <li>
                        <span className="font-semibold">Definition: </span>
                        Reservations of five or more rooms are considered Group Bookings.
                        </li>
                        <li>
                        <span className="font-semibold">Cancellation / Reduction: </span>
                        If you cancel or reduce the number of rooms or nights within 30 days of arrival, no refunds will be issued for payments already made.
                        </li>
                        <li>
                        <span className="font-semibold">Adding Nights: </span>
                        Subject to availability and payment, additional night(s) may be added to a Group Booking at the room rate prevailing at the time of the amendment.
                        </li>
                    </ul>
                </div>

                {/* Questions and Complaints */}
                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Questions and Complaints</h3>
                    <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                        <li>
                        <span className="font-semibold">Contact: </span>
                        For any questions or complaints regarding your booking or these terms, please visit our website and click the ‘Contact Us’ link. We aim to respond within 24 hours.
                        </li>
                    </ul>
                </div>


                {/* ButeakSuites Guarantee */}
                <div className='py-4'>
                <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">ButeakSuites Guarantee</h3>
                <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                    <li>
                    <span className="font-semibold">Customer Protection: </span>
                    In a world where many hotels talk the talk but few actually walk the walk, we understand how frustrating it is to pay for something you didn’t expect or enjoy. The ButeakSuites guarantee exists to protect our customers.
                    </li>
                    <li>
                    <span className="font-semibold">Commitment: </span>
                    We provide this guarantee as a demonstration of our commitment to serving our customers’ needs every day to the best of our abilities.
                    </li>
                </ul>
                </div>

                {/* Our Promise */}
                <div className='py-4'>
                <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Our Promise</h3>
                <ul className="list-disc pl-6 space-y-4 text-[18px] text-[#494949]">
                    <li>
                    <span className="font-semibold">Money-Back Guarantee: </span>
                    If you don’t sleep well and start your day fresh, we’ll provide a full refund.
                    </li>
                </ul>
                </div>

                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Definition</h3>
                    <p className="text-[18px] text-[#494949] mb-4">
                        Simply put, we want to ensure you get a good night’s sleep and a great shower in the morning. Of course, we all have our own broader ideas of what this may constitute, which is why we have put together a list of factors we need to meet each time you stay with us. Failure to meet these factors will result in the guarantee becoming redeemable.
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-[18px] text-[#494949]">
                        <li><span className='font-bold'>Bed Cleanliness: </span>Sheets should be clean & smell fresh. No visible dirt on the bed sheets or pillows.</li>
                        <li><span className='font-bold'>Bed Comfort: </span>Sheets should be crisp & comfy. They should be completely dry to the touch of the hand.</li>
                        <li><span className='font-bold'>Dirty Shower: </span>Shower area should be visibly clean. There should be no evidence of the previous guest.</li>
                        <li><span className='font-bold'>Shower Quality: </span>The shower should provide adequate pressure and hot water consistently.</li>
                    </ul>
                    <p className="text-[18px] text-[#494949] mt-4">
                        It’s very simple and we hope you’ll never need to use our guarantee, but we don’t live in a perfect world and sometimes things go wrong. That’s why we’ll be there to make them right and continue to serve your best interests.
                    </p>
                </div>


                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Process</h3>
                    <p className="text-[18px] text-[#494949] mb-4">
                        We like to be fair and expect our customers to do the same. That’s why we have a clear framework for when the guarantee can be redeemed.
                    </p>
                    <p className="text-[18px] text-[#494949] mb-4">
                        The terms & conditions of our guarantee are as follows:
                    </p>
                    <ol className="list-decimal pl-6 space-y-2 text-[18px] text-[#494949]">
                        <li>
                        <span className='font-bold'>Immediate Notification: </span>
                        Guests must alert the hotel manager to the precise issue immediately upon discovery.
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Factors 1, 2 & 3 must be reported within 30 minutes of check-in. They cannot be reported later.</li>
                            <li>Factor 4 can be reported at any stage of the stay, but must be reported immediately upon discovery to prove the issue beyond doubt.</li>
                        </ul>
                        </li>
                        <li><span className='font-bold'>Inspection of Factors 1, 2 & 3: </span>A meeting will be held immediately with the Housekeeping Manager to inspect the room and the reported issue.</li>
                        <li><span className='font-bold'>Inspection of Factor 4: </span>The onsite Engineer will be called immediately to assess the issue in the room.</li>
                        <li><span className='font-bold'>Evidence Collection: </span>Photos will be taken as evidence and documented in a full report to be sent to ButeakSuites HQ.</li>
                        <li><span className='font-bold'>Hotel Manager Discretion: </span>It is at the Hotel Manager’s discretion whether the guarantee is redeemable.</li>
                        <li><span className='font-bold'>Room Replacement: </span>Guests redeeming the guarantee will be offered another room of the same type, charged at the same rate for the same duration. If the new room is unsatisfactory, guests may vacate the property. Where possible, we will assist in finding a new hotel.</li>
                        <li><span className='font-bold'>Full Refund at Check-in: </span>If the guarantee is redeemed at check-in, the guest will be refunded for their full stay.</li>
                        <li><span className='font-bold'>Refund During Stay (Factor 4): </span>If the guarantee is redeemed during the stay (only applicable to Factor 4), no refund will be given for nights prior to the incident. A full refund will be given for the remainder of the stay.</li>
                    </ol>
                </div>

                <div className='py-4'>
                    <h3 className="md:text-2xl text-[22px] font-bold text-[#494949] mb-4">Payment</h3>
                    <p className="text-[18px] text-[#494949]">
                        Refunds will be made only to the registered booking credit or debit card. There will be no cash payments.
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default TermsConditions