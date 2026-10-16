import Link from "next/link";
import { notFound } from "next/navigation";
import { Frame } from "@/components/frame";
import { History, Section, StatusTrack, VehicleTitle } from "@/components/bits";
import { ShowCalls } from "@/kit/call-log";
import { eventsFor, getAppraisal, photosFor } from "@/lib/appraisals";
import { requireRole } from "@/lib/session";
import { CONDITIONS, km } from "@/lib/valuation";
import { StartButton, Walkaround } from "./walkaround";

export const metadata = { title: "Walk-around" };

export default async function LotCar({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("appraiser", "desk");
  const { id } = await params;
  const a = getAppraisal(id);
  if (!a) notFound();
  const photos = photosFor(id);
  const stamp = Object.fromEntries(photos.map((p) => [p.slot, p.updatedAt.getTime()]));

  return (
    <Frame me={me} sub="Lot" width={760}>
      <ShowCalls calls={a.calls.estimate ?? []} />
      <Link href="/lot" className="label hover:text-ink">
        ← The lot
      </Link>
      <div className="mt-3">
        <VehicleTitle a={a} />
      </div>
      <div className="mt-5">
        <StatusTrack status={a.status} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-px border-2 border-ink bg-ink sm:grid-cols-3">
        <Fact k="Customer" v={a.customerName} sub={a.customerPhone ?? undefined} />
        <Fact k="They said" v={km(a.declaredKm)} sub={CONDITIONS.find((c) => c.id === a.declaredCondition)?.label} />
        <Fact k="Build" v={a.facts.nano?.replace("nano:", "") ?? "—"} sub="Cardog build code" mono wide />
      </dl>

      <div className="mt-8">
        {a.status === "booked" ? (
          <div className="slab p-5">
            <p className="text-[1.0625rem]">Customer on site? Start the walk-around: odometer, thirteen checks, eight photos.</p>
            <div className="mt-4">
              <StartButton id={a.id} />
            </div>
          </div>
        ) : a.status === "walking" ? (
          <Walkaround
            id={a.id}
            initial={{ odometerKm: a.odometerKm, checklist: a.checklist, lotNote: a.lotNote ?? "" }}
            photos={stamp}
          />
        ) : (
          <div className="slab p-5">
            <p className="display text-[1.75rem] uppercase">Walked and sent to the desk</p>
            <p className="mt-1 text-[15px] text-muted">
              {km(a.odometerKm)} on the odometer · {photos.length} photos.{" "}
              {me.role === "desk" && (
                <Link href={`/desk/${a.id}`} className="link text-ink">
                  Open the desk sheet
                </Link>
              )}
            </p>
          </div>
        )}
      </div>

      <Section title="History" className="mt-10">
        <History events={eventsFor(id)} />
      </Section>
    </Frame>
  );
}

function Fact({ k, v, sub, mono, wide }: { k: string; v: string; sub?: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={`min-w-0 bg-card px-3 py-2.5 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <dt className="label">{k}</dt>
      <dd className={`mt-0.5 truncate text-[1.0625rem] font-semibold ${mono ? "font-mono text-[14px]" : ""}`}>{v}</dd>
      {sub && <dd className="truncate text-[13px] text-muted">{sub}</dd>}
    </div>
  );
}
