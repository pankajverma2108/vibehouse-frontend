import type { PolicyPageContent } from "@/content/types";

export const policies: Record<string, PolicyPageContent> = {
  guest: {
    title: "Guest Policies",
    lastUpdated: "March 1, 2026",
    sections: [
      {
        id: "check-in-out",
        title: "Check-In & Check-Out",
        content: [
          "Check-in time is 2:00 PM. Early check-in may be available upon request, subject to availability.",
          "Check-out time is 11:00 AM. Late check-out may be available for an additional fee, subject to availability.",
          "Valid government-issued photo ID is mandatory for all guests during check-in.",
          "Guests under 18 must be accompanied by a parent or legal guardian.",
        ],
      },
      {
        id: "payment",
        title: "Payment & Cancellation",
        content: [
          "Full payment is required at the time of booking unless otherwise specified.",
          "We accept cash, cards, UPI, and online bank transfers.",
          "Free cancellation is available up to 7 days before arrival.",
          "No-shows may be charged the full booking amount.",
        ],
      },
      {
        id: "house-rules",
        title: "House Rules",
        content: [
          "Quiet hours are enforced between 11:00 PM and 7:00 AM in dorm areas.",
          "Smoking is prohibited inside the hostel. Designated smoking areas are available.",
          "Outside guests are not permitted in dorm rooms without prior approval from management.",
          "Harassment of any kind will result in immediate eviction without refund.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "March 1, 2026",
    sections: [
      {
        id: "info-collection",
        title: "Information We Collect",
        content: [
          "Personal information may include name, email, phone number, date of birth, and ID details supplied during booking.",
          "Payment information is processed securely through third-party payment gateways.",
          "Usage data may include IP address, browser type, device information, and page visits.",
        ],
      },
      {
        id: "info-use",
        title: "How We Use Your Information",
        content: [
          "To process bookings and provide hostel services.",
          "To communicate reservation updates and service messages.",
          "To improve our services and site functionality.",
          "To comply with legal obligations and fraud-prevention needs.",
        ],
      },
      {
        id: "data-sharing",
        title: "Data Sharing & Security",
        content: [
          "We do not sell or rent personal information to third parties.",
          "We may share data with trusted service providers that support booking or payment operations.",
          "You may request access, correction, or deletion of your personal data by contacting us.",
        ],
      },
    ],
  },
  refund: {
    title: "Refund Policy",
    lastUpdated: "March 1, 2026",
    sections: [
      {
        id: "cancellation-terms",
        title: "Cancellation Terms",
        content: [
          "Cancel up to 7 days before check-in for a full refund.",
          "Cancellations made 3 to 6 days before check-in may receive a partial refund.",
          "Cancellations within 72 hours of check-in are non-refundable.",
          "No-shows or early check-outs are not eligible for refunds.",
        ],
      },
      {
        id: "refund-process",
        title: "Refund Processing",
        content: [
          "Refunds are processed within 7 to 10 business days.",
          "Refunds are issued to the original payment method where possible.",
          "For cash bookings, refunds are processed via bank transfer or UPI.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    lastUpdated: "March 1, 2026",
    sections: [
      {
        id: "acceptance",
        title: "Acceptance of Terms",
        content: [
          "By making a booking at The Daily Social, you agree to these terms and conditions.",
          "We may revise these terms over time and publish updates on the website.",
        ],
      },
      {
        id: "guest-conduct",
        title: "Guest Conduct",
        content: [
          "Guests must respect house rules, staff, and fellow travelers.",
          "Illegal activities, violence, and harassment are prohibited.",
          "Guests are liable for damages caused to hostel property.",
        ],
      },
      {
        id: "liability",
        title: "Limitation of Liability",
        content: [
          "The Daily Social is not responsible for loss, theft, or damage to personal belongings.",
          "Use of facilities is at your own risk unless harm is caused by our negligence.",
          "Travel insurance is strongly recommended.",
        ],
      },
    ],
  },
};

export const policySlugs = Object.keys(policies);
