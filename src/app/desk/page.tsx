import Link from "next/link";
import { Frame } from "@/components/frame";
import { Empty, Section, StatusTag, when } from "@/components/bits";
import { listByStatus, vehicleName } from "@/lib/appraisals";
import { requireRole } from "@/lib/session";
import { reconTotal } from "@/lib/trade-file";
import { cad, km } from "@/lib/valuation";
import type { AppraisalRow } from "@/db/schema";

export const metadata = { title: "Desk" };

export default async function Desk() {
  const me = await requireRole("desk");
  const waiting = listByStatus(["desk"]);
  const out = listByStatus(["offered"]);
  const closed = listByStatus(["accepted", "declined"]).slice(0, 12);
  const lot = listByStatus(["booked", "walking"]);

  return (
    <Frame me={me} sub="Desk" width={1040}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-[3rem] uppercase">The desk</h1>
        <p className="text-[15px] text-muted">
          {lot.length} on the lot or booked ·{" "}
          <Link href="/lot" className="link text-ink">
            Go to the lot
          </Link>
        </p>
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-3">
        <Section title="Needs an offer" aside={`${waiting.length}`}>
          {waiting.length ? <Cards rows={waiting} /> : <Empty title="All caught up">Cars the lot sends over land here.</Empty>}
        </Section>
        <Section title="Offer out" aside={`${out.length}`}>
          {out.length ? <Cards rows={out} /> : <Empty title="No offers out" />}
        </Section>
        <Section title="Closed" aside={`${closed.length}`}>
          {closed.length ? <Cards rows={closed} /> : <Empty title="Nothing closed yet" />}
        </Section>
      </div>
    </Frame>
  );
}

function Cards({ rows }: { rows: AppraisalRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((a) => (
        <li key={a.id}>
          <Link href={`/desk/${a.id}`} className="slab block p-4 hover:bg-spruce-soft">
            <div className="flex items-start justify-between gap-2">
              <p className="display text-[1.5rem] uppercase leading-[1]">{vehicleName(a)}</p>
              <StatusTag status={a.status} />
            </div>
            <p className="mt-2 text-[15px] font-medium">{a.customerName}</p>
            <p className="text-[14px] text-muted">
              {km(a.odometerKm ?? a.declaredKm)} · recon {cad(reconTotal(a.checklist))}
            </p>
            <div className="mt-3 flex items-end justify-between">
              <p className="num text-[1.75rem] leading-none">{a.offer != null ? cad(a.offer) : "—"}</p>
              <p className="text-[13px] text-muted">{when(a.updatedAt)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
