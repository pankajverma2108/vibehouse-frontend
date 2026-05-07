"use client";

type PolicyJumpItem = {
  id: string;
  label: string;
};

type PolicyJumpSelectProps = {
  items: readonly PolicyJumpItem[];
};

export function PolicyJumpSelect({ items }: PolicyJumpSelectProps) {
  return (
    <select
      aria-label="Jump to policy section"
      className="vh-input bg-[var(--vh-surface)] text-white"
      defaultValue=""
      onChange={(event) => {
        const targetId = event.target.value;
        if (!targetId) {
          return;
        }
        const section = document.getElementById(targetId);
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <option value="">Select a section...</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  );
}