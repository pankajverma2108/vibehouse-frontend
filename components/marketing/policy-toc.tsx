"use client";

import type { PolicySection } from "@/content/types";

type PolicyTocProps = {
  sections: PolicySection[];
};

export function PolicyToc({ sections }: PolicyTocProps) {
  return (
    <>
      <div className="hidden lg:block">
        <div className="border-l border-white/12 pl-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[1px] text-white">
            Table of Contents
          </h3>
          <div className="space-y-2">
            {sections.map((section) => (
              <a
                key={section.id}
                className="block py-1 text-sm text-white/70 hover:text-white"
                href={`#${section.id}`}
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <select
          className="vh-input bg-[var(--vh-surface)] text-white"
          defaultValue=""
          onChange={(event) => {
            const target = document.getElementById(event.target.value);
            target?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <option value="">Jump to section...</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.title}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
