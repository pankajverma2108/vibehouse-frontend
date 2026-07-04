import type { Metadata } from "next";
import Link from "next/link";

import {
  FEEDBACK_PREVIEW_SCENARIOS,
  getFeedbackPreviewConfig,
} from "@/lib/feedback-preview";

export const metadata: Metadata = {
  title: "Feedback Preview",
  description: "Local preview links for feedback route scenarios.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FeedbackPreviewIndexPage() {
  return (
    <main className="min-h-screen bg-[#07070a] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="border-b border-dashed border-white/14 pb-5">
          <p className="font-caption text-white/55">Local Preview</p>
          <h1 className="font-sectiontitle mt-3 text-[34px] leading-[1.05] text-white sm:text-[42px]">
            Feedback route scenarios
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
            These routes bypass the backend and render mocked TDS feedback states for local design review.
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          {FEEDBACK_PREVIEW_SCENARIOS.map((scenario) => {
            const preview = getFeedbackPreviewConfig(scenario);

            return (
              <Link
                className="rounded-[18px] border border-dashed border-white/20 bg-white/[0.03] px-5 py-4 transition hover:border-white/35 hover:bg-white/[0.05]"
                href={`/feedback/preview/${scenario}`}
                key={scenario}
              >
                <p className="font-bodyfocus text-base text-white">{preview.label}</p>
                <p className="mt-1 text-sm leading-6 text-white/62">{preview.description}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[#f9cb37]">
                  /feedback/preview/{scenario}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

