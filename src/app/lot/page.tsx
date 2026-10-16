import Link from "next/link";
import { startWalkIn } from "@/app/actions";
import { Frame } from "@/components/frame";
import { Empty, Section, StatusTag, when } from "@/components/bits";
import { listByStatus, vehicleName } from "@/lib/appraisals";
import { FIXTURE_VINS, dataMode } from "@/lib/cardog";
import { requireRole } from "@/lib/session";
import type { AppraisalRow } from "@/db/schema";
import { CONDITIONS, km } from "@/lib/valuation";

export const metadata = { title: "Lot" };

export default async function Lot({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireRole("appraiser", "desk");
  const sp = await searchParams;
  const onLot = listByStatus(["walking"]);
  const booked = listByStatus(["booked"]);

  return (
    <Frame me={me} sub="Lot">
      {sp.sent && (
        <p className="mb-6 bg-spruce px-4 py-3 font-display text-[1.25rem] font-semibold uppercase tracking-[0.03em] text-white">
          {sp.sent} sent to the desk
        </p>
      )}
      <h1 className="display text-[3rem] uppercase">The lot</h1>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-10">
          <Section title="On the lot now" aside={`${onLot.length}`}>
            {onLot.length ? <Cards rows={onLot} /> : <Empty title="Nothing being walked">Start a booked car below, or a walk-in.</Empty>}
          </Section>
          <Section title="Booked from the website" aside={`${booked.length}`}>
            {booked.length ? (
              <Cards rows={booked} />
            ) : (
              <Empty title="No bookings waiting">Customers who book from the website estimate show up here.</Empty>
            )}
          </Section>
        </div>

        <Section title="Walk-in">
          <form action={startWalkIn} className="slab space-y-4 p-4">
            <label className="block">
              <span className="label">VIN</span>
              <input
                name="vin"
                className="field field-vin mt-2"
                required
                minLength={17}
                maxLength={17}
                autoCapitalize="characters"
                spellCheck={false}
                defaultValue={sp.vin ?? ""}
                placeholder="17 characters"
              />
            </label>
            <label className="block">
              <span className="label">Odometer</span>
              <input name="km" className="field num mt-2 text-[1.5rem]" inputMode="numeric" required placeholder="km" />
            </label>
            <label className="block">
              <span className="label">Customer</span>
              <input name="customer" className="field mt-2" required placeholder="Name" />
            </label>
            <label className="block">
              <span className="label">Phone</span>
              <input name="phone" type="tel" className="field mt-2" placeholder="Optional" />
            </label>
            <p className="min-h-[1.25rem] text-[14px] text-flag">
              {sp.error === "decode" && "That VIN did not decode. Check it against the door jamb."}
              {sp.error === "details" && "VIN, odometer and customer name, please."}
            </p>
            <button className="btn btn-go w-full">Start walk-around</button>
            {dataMode === "fixture" && (
              <p className="text-[13px] leading-snug text-muted">
                Fixture mode reads three VINs: {FIXTURE_VINS.map((v) => `${v.vin} (${v.label})`).join(", ")}.
              </p>
            )}
          </form>
        </Section>
      </div>
    </Frame>
  );
}

function Cards({ rows }: { rows: AppraisalRow[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {rows.map((a) => (
        <li key={a.id}>
          <Link href={`/lot/${a.id}`} className="slab block p-4 hover:bg-spruce-soft">
            <div className="flex items-start justify-between gap-2">
              <p className="display text-[1.625rem] uppercase leading-[1]">{vehicleName(a)}</p>
              <StatusTag status={a.status} />
            </div>
            <p className="mt-2 text-[15px] font-medium">{a.customerName}</p>
            <p className="text-[14px] text-muted">
              {km(a.declaredKm)} · {CONDITIONS.find((c) => c.id === a.declaredCondition)?.label} · since {when(a.createdAt)}
            </p>
            <p className="mt-2 font-mono text-[13px] tracking-[0.06em] text-muted">…{a.vin.slice(-8)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
