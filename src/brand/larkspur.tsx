/**
 * Larkspur Motors: the store's mark, wordmark and the line that credits the
 * vehicle data. The mark is a plain figure (a diamond over a bar, in a
 * rounded square) in the store's deep spruce.
 */

export const LARKSPUR = {
  name: "Larkspur Motors",
  brand: "#14574A",
  brandSoft: "#E9F2EF",
} as const;

export function LarkspurMark({ className = "size-7", color = LARKSPUR.brand, knock = "white" }: {
  className?: string;
  color?: string;
  knock?: string;
}) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`shrink-0 ${className}`}>
      <rect x="1" y="1" width="18" height="18" rx="5" fill={color} />
      <path d="M10 4.5 14 9l-4 4.5L6 9z" fill={knock} />
      <rect x="6" y="14.5" width="8" height="1.6" rx=".8" fill={knock} opacity=".75" />
    </svg>
  );
}

/** The wordmark on the spruce header bar: white mark, white name. */
export function LarkspurWordmark({ sub }: { sub?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LarkspurMark className="size-8" color="#ffffff" knock={LARKSPUR.brand} />
      <span className="flex flex-col leading-none">
        <span className="display whitespace-nowrap text-[1.125rem] uppercase tracking-[0.01em] text-white sm:text-[1.375rem]">Larkspur Motors</span>
        {sub && <span className="mt-0.5 font-display text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-pencil">{sub}</span>}
      </span>
    </span>
  );
}

export function CardogCredit({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://cardog.app/docs"
      target="_blank"
      rel="noreferrer"
      className={`text-[13px] text-faint hover:text-muted ${className}`}
    >
      Vehicle data by Cardog
    </a>
  );
}
