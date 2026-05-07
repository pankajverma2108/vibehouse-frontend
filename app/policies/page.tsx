import type { Metadata } from "next";

import { PolicyJumpSelect } from "@/components/marketing/policy-jump-select";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FadeIn } from "@/components/shared/motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { siteMeta } from "@/content/site";

export const dynamic = "force-static";

const lastUpdated = "April 23, 2026";

const policyAnchors = [
  { id: "general-policy", label: "General Policy" },
  { id: "check-in-check-out-id", label: "Check-In, Check-Out & ID" },
  { id: "payment-pricing-billing", label: "Payment, Pricing & Billing" },
  { id: "cancellation-refund-policy", label: "Cancellation & Refund Policy" },
  { id: "guest-conduct-safety", label: "Guest Conduct, Safety & Prohibited Activities" },
  { id: "privacy-policy", label: "Privacy Policy" },
  { id: "data-sharing-retention-rights", label: "Data Sharing, Retention & Data Rights" },
  { id: "event-activity-terms", label: "Event & Activity Terms" },
  { id: "terms-liability-governing-law", label: "Terms, Liability & Governing Law" },
  { id: "grievance-redressal-contact", label: "Grievance Redressal & Contact" },
  { id: "policy-faqs", label: "Policy FAQs" },
] as const;

const policyFaqs = [
  {
    question: "What is your age policy for bookings?",
    answer:
      "The lead guest must be at least 18 years old at check-in. Minors may stay only where allowed by property-level and local regulations, and only with a parent or legal guardian in an eligible room category.",
  },
  {
    question: "Do you allow unmarried couples?",
    answer:
      "Yes. We are couple-friendly where permitted by law. Both guests must carry valid, original government-issued photo identification and must comply with house rules.",
  },
  {
    question: "Can I cancel a booking made on an OTA platform?",
    answer:
      "Bookings made through third-party travel platforms must be cancelled or modified on the same platform. Their cancellation terms and timelines apply in addition to this policy.",
  },
  {
    question: "How long do refunds usually take?",
    answer:
      "Once approved, refunds are initiated promptly and usually credited within 7 to 10 business days, depending on payment network and banking timelines.",
  },
  {
    question: "Are local IDs accepted?",
    answer:
      "Local ID acceptance may vary by property and prevailing law-enforcement guidance. Please contact support before booking if you are unsure.",
  },
  {
    question: "Can non-resident visitors enter guest rooms?",
    answer:
      "No. Non-resident visitors are generally limited to approved common areas during visitor hours and cannot enter dorms or private guest rooms unless explicitly approved by management.",
  },
  {
    question: "Do you permit smoking, alcohol, or prohibited substances?",
    answer:
      "Smoking is allowed only in designated zones. Illegal drugs, weapons, and unlawful conduct are strictly prohibited. Alcohol is regulated by local law and property rules.",
  },
  {
    question: "Are guests responsible for damaged property?",
    answer:
      "Yes. Guests are liable for loss, breakage, or damage caused by negligence or misconduct. Assessed charges may be recovered using the original payment method.",
  },
  {
    question: "How do I exercise my privacy rights?",
    answer:
      "You can request access, correction, erasure, or consent withdrawal by writing to our privacy and grievance contact channels listed below. We verify identity before processing such requests.",
  },
  {
    question: "What happens during force majeure situations?",
    answer:
      "In cases such as natural disasters, government restrictions, or operational shutdowns, we may offer date changes, credits, relocation options, or refunds based on feasibility, safety, and applicable law.",
  },
] as const;

export const metadata: Metadata = {
  title: "Policies",
  description:
    "Read The Daily Social Policies: general guest policy, check-in and ID rules, cancellation and refund policy, privacy policy, terms and conditions, and policy FAQs for stays in India.",
  keywords: [
    "hostel policies",
    "guest policy",
    "cancellation policy",
    "refund policy",
    "privacy policy",
    "terms and conditions",
    "hostel booking policy india",
    "check in policy",
    "data privacy policy india",
  ],
  alternates: {
    canonical: "/policies",
  },
  openGraph: {
    title: "Policies | The Daily Social",
    description:
      "Unified policy hub for guest rules, cancellation and refunds, privacy, terms, and FAQs.",
    url: "https://thedailysocial.co.in/policies",
    siteName: "The Daily Social",
    type: "website",
  },
};

export default function PoliciesPage() {
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: policyFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <section className="vh-section pt-28 md:pt-32">
        <div className="vh-container">
          <FadeIn className="text-center">
            <h1 className="vh-retro-3d mt-6 font-['Suez_One'] text-[3rem] leading-none md:text-[5.5rem] lg:text-[6.5rem]">
              Policies
            </h1>
            <p className="mt-4 text-sm text-white/60">Last updated: {lastUpdated}</p>
          </FadeIn>
        </div>
      </section>

      <section className="vh-section vh-section-alt">
        <div className="vh-container grid grid-cols-1 gap-8 lg:grid-cols-[minmax(220px,28%)_minmax(0,1fr)] lg:items-start">
          <aside className="relative hidden self-start lg:sticky lg:top-28 lg:block">
            <div className="vh-panel rounded-2xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-[1px] text-white/90">Policy Menu</h2>
              <nav className="mt-5 space-y-2">
                {policyAnchors.map((item) => (
                  <a
                    key={item.id}
                    className="block rounded-md border border-white/10 px-3 py-2 text-sm text-white/75 hover:border-white/20 hover:bg-white/6 hover:text-white"
                    href={`#${item.id}`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
          <div className="min-w-0 space-y-6 lg:pr-2">
            <div className="vh-panel rounded-2xl p-5 lg:hidden">
              <h2 className="text-sm font-bold uppercase tracking-[1px] text-white/90">Quick Jump</h2>
              <div className="mt-4">
                <PolicyJumpSelect items={policyAnchors} />
              </div>
            </div>

            <article className="space-y-8">
              <section className="vh-panel rounded-2xl p-6 md:p-8" id="general-policy">
                <SectionHeading align="left" title="General Policy" />
                <p className="text-sm leading-7 text-white/82 md:text-base">
                  The Daily Social is a social stay and community hospitality brand. The policies below
                  define fair use, guest eligibility, safety standards, and booking responsibilities for
                  all users of our website, booking channels, and on-property services.
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-white/82 md:text-base">
                  <li>
                    The lead guest must be legally eligible to contract and complete check-in.
                  </li>
                  <li>
                    Couple-friendly stays are permitted subject to valid IDs, lawful conduct, and
                    compliance with property rules.
                  </li>
                  <li>
                    The right of admission is reserved in cases involving safety risk, policy breaches,
                    incomplete documents, or unlawful conduct.
                  </li>
                  <li>
                    Property-level restrictions may apply for select room categories, city-specific rules,
                    event dates, or regulatory advisories.
                  </li>
                </ul>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="check-in-check-out-id">
                <SectionHeading align="left" title="Check-In, Check-Out & ID" />
                <p className="text-sm leading-7 text-white/82 md:text-base">
                  We prioritize fast, compliant, and contact-light check-ins. The table below summarizes
                  standard operating policy.
                </p>
                <div className="mt-4 overflow-x-auto rounded-lg border border-white/12">
                  <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                    <thead className="bg-white/8 text-white">
                      <tr>
                        <th className="border-b border-white/12 px-4 py-3">Topic</th>
                        <th className="border-b border-white/12 px-4 py-3">Standard Policy</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/82">
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Check-in time</td>
                        <td className="border-b border-white/10 px-4 py-3">From 2:00 PM onwards</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Check-out time</td>
                        <td className="border-b border-white/10 px-4 py-3">Up to 11:00 AM</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Early check-in</td>
                        <td className="border-b border-white/10 px-4 py-3">
                          Subject to availability; may be chargeable based on timing and inventory
                        </td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Late check-out</td>
                        <td className="border-b border-white/10 px-4 py-3">
                          Subject to approval and operational load; additional charges may apply
                        </td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Accepted IDs (India)</td>
                        <td className="border-b border-white/10 px-4 py-3">
                          Original government photo ID such as Aadhaar, Passport, Driving License, or
                          Voter ID
                        </td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Foreign nationals</td>
                        <td className="border-b border-white/10 px-4 py-3">
                          Original passport and valid visa documents are mandatory
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Visitors</td>
                        <td className="px-4 py-3">
                          Non-resident visitors are typically limited to common areas during approved hours
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-white/82 md:text-base">
                  <li>Digital pre-check-in may be required before arrival for identity validation.</li>
                  <li>Failure to provide valid ID can result in denied admission without refund.</li>
                  <li>
                    Local address ID acceptance can vary by property and legal advisories.
                  </li>
                </ul>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="payment-pricing-billing">
                <SectionHeading align="left" title="Payment, Pricing & Billing" />
                <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-white/82 md:text-base">
                  <li>
                    Booking confirmation may require full or partial advance payment based on fare type.
                  </li>
                  <li>
                    We may accept UPI, cards, bank transfer, and other approved payment rails subject to
                    network uptime.
                  </li>
                  <li>
                    Tariffs are dynamic and can change by demand, season, room category, occupancy, and
                    promotions.
                  </li>
                  <li>
                    Applicable taxes, including GST, are charged as per law and shown on invoice.
                  </li>
                  <li>
                    A security deposit may be collected in specific scenarios such as events, long stays,
                    or high-demand dates.
                  </li>
                </ul>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="cancellation-refund-policy">
                <SectionHeading align="left" title="Cancellation & Refund Policy" />
                <p className="text-sm leading-7 text-white/82 md:text-base">
                  Refund eligibility depends on fare type, booking source, and timing of cancellation.
                  Please review the booking confirmation for the exact rule applicable to your reservation.
                </p>
                <div className="mt-4 overflow-x-auto rounded-lg border border-white/12">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-white/8 text-white">
                      <tr>
                        <th className="border-b border-white/12 px-4 py-3">Booking Type</th>
                        <th className="border-b border-white/12 px-4 py-3">Cancellation Window</th>
                        <th className="border-b border-white/12 px-4 py-3">Refund Outcome</th>
                        <th className="border-b border-white/12 px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/82">
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Flexible rate</td>
                        <td className="border-b border-white/10 px-4 py-3">5+ days before check-in</td>
                        <td className="border-b border-white/10 px-4 py-3">Up to 100% refund</td>
                        <td className="border-b border-white/10 px-4 py-3">Gateway or partner fees may apply</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Partially refundable rate</td>
                        <td className="border-b border-white/10 px-4 py-3">48 hours to 5 days</td>
                        <td className="border-b border-white/10 px-4 py-3">Up to 50% refund</td>
                        <td className="border-b border-white/10 px-4 py-3">Exact value shown at booking checkout</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Non-refundable / promo rate</td>
                        <td className="border-b border-white/10 px-4 py-3">Any time after confirmation</td>
                        <td className="border-b border-white/10 px-4 py-3">No refund</td>
                        <td className="border-b border-white/10 px-4 py-3">Date change may be offered only if explicitly allowed</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">No-show or denied check-in due to invalid docs</td>
                        <td className="border-b border-white/10 px-4 py-3">After check-in cut-off</td>
                        <td className="border-b border-white/10 px-4 py-3">No refund</td>
                        <td className="border-b border-white/10 px-4 py-3">Includes non-compliance with ID or policy conditions</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Events and partner activities</td>
                        <td className="px-4 py-3">As per event-specific terms</td>
                        <td className="px-4 py-3">Varies by operator</td>
                        <td className="px-4 py-3">Partner policy can override standard window</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-white/82 md:text-base">
                  <li>
                    Direct bookings can be cancelled through official support channels or the booking flow
                    where enabled.
                  </li>
                  <li>
                    OTA bookings must be cancelled on the same third-party platform used to book.
                  </li>
                  <li>
                    Approved refunds are normally credited within 7 to 10 business days after initiation.
                  </li>
                  <li>
                    In force majeure scenarios, alternative dates, credits, relocation, or special refunds
                    may be considered case by case.
                  </li>
                </ol>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="guest-conduct-safety">
                <SectionHeading align="left" title="Guest Conduct, Safety & Prohibited Activities" />
                <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-white/82 md:text-base">
                  <li>
                    Harassment, intimidation, discrimination, violence, and non-consensual behavior are
                    strictly prohibited.
                  </li>
                  <li>
                    Illegal drugs, unlawful items, and prohibited weapons are not allowed on premises.
                  </li>
                  <li>
                    Quiet hours must be respected to protect sleep quality in shared spaces.
                  </li>
                  <li>
                    Smoking is restricted to designated zones. Indoor non-smoking rules are mandatory.
                  </li>
                  <li>
                    Guests are responsible for personal belongings and should use lockers where available.
                  </li>
                  <li>
                    Damage to property, fixtures, or equipment will be chargeable after assessment.
                  </li>
                  <li>
                    CCTV may operate in designated common areas for safety, compliance, and incident review.
                  </li>
                </ul>
                <p className="mt-4 text-sm leading-7 text-white/82 md:text-base">
                  Policy enforcement may include warning, restricted access, immediate eviction without
                  refund, blacklisting of future bookings, and legal escalation where required.
                </p>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="privacy-policy">
                <SectionHeading align="left" title="Privacy Policy" />
                <p className="text-sm leading-7 text-white/82 md:text-base">
                  We process personal data for booking delivery, guest support, safety, and legal
                  compliance. This privacy section is designed in line with applicable data-protection
                  obligations, including principles under India&apos;s Digital Personal Data Protection Act,
                  2023.
                </p>
                <div className="mt-4 overflow-x-auto rounded-lg border border-white/12">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-white/8 text-white">
                      <tr>
                        <th className="border-b border-white/12 px-4 py-3">Data Category</th>
                        <th className="border-b border-white/12 px-4 py-3">Examples</th>
                        <th className="border-b border-white/12 px-4 py-3">Why We Process It</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/82">
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Identity and contact</td>
                        <td className="border-b border-white/10 px-4 py-3">Name, phone, email, ID details</td>
                        <td className="border-b border-white/10 px-4 py-3">Booking validation, check-in, support, legal compliance</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Booking and stay data</td>
                        <td className="border-b border-white/10 px-4 py-3">Room type, dates, guest count, preferences</td>
                        <td className="border-b border-white/10 px-4 py-3">Reservation fulfillment and service operations</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Payment records</td>
                        <td className="border-b border-white/10 px-4 py-3">Transaction IDs, payment status, invoice data</td>
                        <td className="border-b border-white/10 px-4 py-3">Payments, accounting, tax and fraud prevention</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Usage and device data</td>
                        <td className="border-b border-white/10 px-4 py-3">IP address, browser, device logs, cookies</td>
                        <td className="border-b border-white/10 px-4 py-3">Site security, analytics, and product improvements</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Support interactions</td>
                        <td className="px-4 py-3">Emails, chats, call summaries, complaint records</td>
                        <td className="px-4 py-3">Issue resolution, quality checks, and grievance handling</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="data-sharing-retention-rights">
                <SectionHeading align="left" title="Data Sharing, Retention & Data Rights" />
                <p className="text-sm leading-7 text-white/82 md:text-base">
                  We do not sell personal data. We only share data with contracted processors and
                  partners where needed to deliver services or comply with law.
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-white/82 md:text-base">
                  <li>Service processors: payment gateways, communication tools, and cloud infrastructure.</li>
                  <li>
                    Legal disclosures: where required by courts, law-enforcement, or applicable government orders.
                  </li>
                  <li>
                    Business continuity: mergers or restructuring events with lawful notice and safeguards.
                  </li>
                </ul>
                <div className="mt-4 overflow-x-auto rounded-lg border border-white/12">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-white/8 text-white">
                      <tr>
                        <th className="border-b border-white/12 px-4 py-3">Record Type</th>
                        <th className="border-b border-white/12 px-4 py-3">Typical Retention Window</th>
                        <th className="border-b border-white/12 px-4 py-3">Retention Basis</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/82">
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Booking and invoice records</td>
                        <td className="border-b border-white/10 px-4 py-3">Up to 8 years</td>
                        <td className="border-b border-white/10 px-4 py-3">Tax, accounting, and audit requirements</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Support and grievance records</td>
                        <td className="border-b border-white/10 px-4 py-3">Up to 24 months</td>
                        <td className="border-b border-white/10 px-4 py-3">Service quality and legal defense</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Marketing consent and preferences</td>
                        <td className="border-b border-white/10 px-4 py-3">Until withdrawal or inactivity cycle</td>
                        <td className="border-b border-white/10 px-4 py-3">Consent-based communication controls</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Security logs and analytics</td>
                        <td className="px-4 py-3">As operationally required and legally permissible</td>
                        <td className="px-4 py-3">Platform security and abuse prevention</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-sm leading-7 text-white/82 md:text-base">
                  Subject to applicable law, you may request access, correction, erasure, grievance
                  review, consent withdrawal, and related data-right actions by contacting our support.
                </p>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="event-activity-terms">
                <SectionHeading align="left" title="Event & Activity Terms" />
                <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-white/82 md:text-base">
                  <li>
                    Some experiences are hosted by third-party operators and may have separate terms,
                    eligibility rules, and cancellation windows.
                  </li>
                  <li>
                    Certain activities involve inherent risk. Guests are expected to follow all safety
                    briefings and instructions.
                  </li>
                  <li>
                    Late arrival, non-eligibility, intoxication, or misconduct may result in denial of
                    participation without refund.
                  </li>
                  <li>
                    If an event is cancelled due to weather, safety, or operational constraints, reschedule
                    or refund options will be communicated per applicable event terms.
                  </li>
                </ul>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="terms-liability-governing-law">
                <SectionHeading align="left" title="Terms, Liability & Governing Law" />
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-white/82 md:text-base">
                  <li>
                    Use of our website, app flows, and booking channels implies acceptance of these
                    policies and related service terms.
                  </li>
                  <li>
                    All brand names, visuals, and website content are protected by applicable intellectual
                    property law.
                  </li>
                  <li>
                    To the extent legally permitted, liability for indirect or consequential loss is
                    excluded.
                  </li>
                  <li>
                    Force majeure events may impact booking performance and can require alternate handling.
                  </li>
                  <li>
                    These policies are governed by applicable laws of India. Courts and forums with
                    competent jurisdiction shall apply.
                  </li>
                </ol>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="grievance-redressal-contact">
                <SectionHeading align="left" title="Grievance Redressal & Contact" />
                <p className="text-sm leading-7 text-white/82 md:text-base">
                  For booking, policy, privacy, or grievance matters, contact us through the channels below.
                </p>
                <div className="mt-4 overflow-x-auto rounded-lg border border-white/12">
                  <table className="w-full min-w-[660px] border-collapse text-left text-sm">
                    <thead className="bg-white/8 text-white">
                      <tr>
                        <th className="border-b border-white/12 px-4 py-3">Channel</th>
                        <th className="border-b border-white/12 px-4 py-3">Details</th>
                        <th className="border-b border-white/12 px-4 py-3">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/82">
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Email</td>
                        <td className="border-b border-white/10 px-4 py-3">
                          <a className="underline decoration-white/25 underline-offset-4 hover:text-white" href={siteMeta.contact.emailHref}>
                            {siteMeta.contact.email}
                          </a>
                        </td>
                        <td className="border-b border-white/10 px-4 py-3">Policy clarifications and grievance submissions</td>
                      </tr>
                      <tr>
                        <td className="border-b border-white/10 px-4 py-3">Phone / WhatsApp</td>
                        <td className="border-b border-white/10 px-4 py-3">
                          <a className="underline decoration-white/25 underline-offset-4 hover:text-white" href={siteMeta.contact.phoneHref}>
                            {siteMeta.contact.phoneDisplay}
                          </a>
                        </td>
                        <td className="border-b border-white/10 px-4 py-3">Urgent booking and in-stay support</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Support timeline</td>
                        <td className="px-4 py-3">Acknowledgement target within 48 hours</td>
                        <td className="px-4 py-3">Resolution target within 15 working days, subject to complexity</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="vh-panel rounded-2xl p-6 md:p-8" id="policy-faqs">
                <SectionHeading
                  align="left"
                  title="Policy FAQs"
                  subtitle="Quick answers to the most common policy and booking questions"
                />
                <Accordion className="space-y-3" collapsible type="single">
                  {policyFaqs.map((faq, index) => (
                    <AccordionItem
                      key={faq.question}
                      className="rounded-lg border border-white/12 bg-white/4 px-4"
                      value={`faq-${index + 1}`}
                    >
                      <AccordionTrigger className="text-left text-sm leading-6 md:text-base">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-7 text-white/80 md:text-base">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            </article>
          </div>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        type="application/ld+json"
      />
    </>
  );
}
