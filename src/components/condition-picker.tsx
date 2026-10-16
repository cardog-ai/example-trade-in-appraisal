"use client";

import { CONDITIONS, type Condition } from "@/lib/valuation";

/**
 * Four full-width rows, one per condition, each a real radio input. The
 * chosen row turns spruce; the others stay put, so nothing reflows.
 */
export function ConditionPicker({
  value,
  onChange,
  name,
}: {
  value: Condition;
  onChange: (c: Condition) => void;
  name: string;
}) {
  return (
    <div className="mt-2 divide-y-2 divide-ink border-2 border-ink">
      {CONDITIONS.map((c) => {
        const on = c.id === value;
        return (
          <label
            key={c.id}
            className={`flex cursor-pointer items-start gap-3 px-3.5 py-3 ${on ? "bg-spruce text-white" : "bg-card hover:bg-spruce-soft"}`}
          >
            <input
              type="radio"
              name={name}
              value={c.id}
              checked={on}
              onChange={() => onChange(c.id)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`mt-1 flex size-5 shrink-0 items-center justify-center border-2 ${on ? "border-pencil" : "border-ink"}`}
            >
              <span className={`size-2.5 ${on ? "bg-pencil" : ""}`} />
            </span>
            <span className="min-w-0">
              <span className="display block text-[1.375rem] uppercase">{c.label}</span>
              <span className={`block text-[14px] leading-snug ${on ? "text-white/80" : "text-muted"}`}>{c.detail}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
