import type { AppraisalRow, EventRow, Status } from "@/db/schema";
import { STATUS_LABEL, vehicleName } from "@/lib/appraisals";

/** The five stops every trade makes, as a row of blocks. Fixed width per block, so it never reflows. */
const TRACK: { label: string; at: Status[] }[] = [
  { label: "Booked", at: ["booked"] },
  { label: "Lot", at: ["walking"] },
  { label: "Desk", at: ["desk"] },
  { label: "Offer", at: ["offered"] },
  { label: "Done", at: ["accepted", "declined"] },
];

export function StatusTrack({ status }: { status: Status }) {
  const now = TRACK.findIndex((t) => t.at.includes(status));
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label={`Status: ${STATUS_LABEL[status]}`}>
      {TRACK.map((t, i) => (
        <li key={t.label} className="min-w-0">
          <span className={`block h-2 ${i < now ? "bg-spruce" : i === now ? "bg-pencil" : "bg-rule"}`} />
          <span
            className={`mt-1.5 block truncate font-display text-[0.8125rem] font-semibold uppercase tracking-[0.06em] ${
              i === now ? "text-ink" : "text-faint"
            }`}
          >
            {i === 4 && (status === "accepted" || status === "declined") ? STATUS_LABEL[status] : t.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function StatusTag({ status }: { status: Status }) {
  const tone =
    status === "offered"
      ? "bg-pencil text-ink"
      : status === "accepted"
        ? "bg-spruce text-white"
        : status === "declined"
          ? "bg-flag text-white"
          : status === "desk"
            ? "bg-ink text-white"
            : "border-2 border-ink text-ink";
  return (
    <span className={`inline-flex h-7 items-center px-2 font-display text-[0.875rem] font-semibold uppercase tracking-[0.06em] ${tone}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function VehicleTitle({ a, size = "lg" }: { a: AppraisalRow; size?: "lg" | "md" }) {
  return (
    <div className="min-w-0">
      <p className={`display uppercase ${size === "lg" ? "text-[2.25rem] sm:text-[3rem]" : "text-[1.625rem]"}`}>
        {vehicleName(a)}
        {a.trim && <span className="text-muted"> {a.trim}</span>}
      </p>
      <p className="mt-1 font-mono text-[13px] tracking-[0.06em] text-muted">
        {a.vin} · {a.number}
      </p>
    </div>
  );
}

export function History({ events }: { events: EventRow[] }) {
  if (!events.length) return <p className="text-[15px] text-muted">Nothing yet.</p>;
  return (
    <ol className="border-l-2 border-ink">
      {events.map((e) => (
        <li key={e.id} className="relative pb-4 pl-5 last:pb-0">
          <span aria-hidden className="absolute -left-[7px] top-1.5 size-3 bg-ink" />
          <p className="text-[15px] leading-snug">{e.summary}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {e.actorName} · {when(e.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function when(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function Section({ title, aside, children, className = "" }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b-2 border-ink pb-2">
        <h2 className="display text-[1.5rem] uppercase">{title}</h2>
        {aside && <div className="text-[14px] text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-ink/40 px-5 py-10 text-center">
      <p className="display text-[1.75rem] uppercase text-ink-2">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-[420px] text-[15px] text-muted">{children}</div>}
    </div>
  );
}
