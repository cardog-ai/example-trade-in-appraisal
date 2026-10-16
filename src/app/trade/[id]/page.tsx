import Link from "next/link";
import { notFound } from "next/navigation";
import { Frame } from "@/components/frame";
import { History, Section, StatusTrack, VehicleTitle, when } from "@/components/bits";
import { ShowCalls } from "@/kit/call-log";
import { eventsFor, getAppraisal } from "@/lib/appraisals";
import { requireRole } from "@/lib/session";
import { CONDITIONS, cad, km } from "@/lib/valuation";
import { OfferAnswer } from "./offer-answer";

export const metadata = { title: "My trade" };

const NEXT: Record<string, string> = {
  booked: "Bring the car in. An appraiser walks it with you and takes photos; about ten minutes.",
  walking: "The appraiser is looking it over now.",
  desk: "The walk-around is done. The desk is working out your offer.",
  offered: "The desk has made an offer. It holds for 7 days.",
  accepted: "You accepted. Bring the ownership and both keys when you pick up your next car.",
  declined: "You declined this offer. The car is yours; come back any time.",
};

export default async function TradeDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("customer");
  const { id } = await params;
  const a = getAppraisal(id);
  if (!a || a.customerId !== me.id) notFound();
  const events = eventsFor(id);
  const offerOut = a.status === "offered" || a.status === "accepted" || a.status === "declined";

  return (
    <Frame me={me} sub="Trade-in" width={720}>
      <ShowCalls calls={a.calls.estimate ?? []} />
      <Link href="/trade" className="label hover:text-ink">
        ← My trade
      </Link>
      <div className="mt-3">
        <VehicleTitle a={a} />
      </div>
      <div className="mt-6">
        <StatusTrack status={a.status} />
        <p className="mt-3 text-[1.0625rem] text-ink-2">{NEXT[a.status]}</p>
      </div>

      <div className="slab mt-6 overflow-hidden">
        {offerOut && a.offer != null ? (
          <div className="bg-spruce px-4 py-5 text-white sm:px-6">
            <p className="font-display text-[0.875rem] font-semibold uppercase tracking-[0.1em] text-white/70">
              Firm offer · {when(a.offeredAt)}
            </p>
            <p className="num mt-1 text-[3.5rem] leading-none text-pencil sm:text-[4.5rem]">{cad(a.offer)}</p>
            {a.offerNote && <p className="mt-3 max-w-[52ch] text-[15px] text-white/85">&ldquo;{a.offerNote}&rdquo;</p>}
          </div>
        ) : (
          <div className="px-4 py-5 sm:px-6">
            <p className="label">Your estimate</p>
            <p className="num mt-1 text-[2.5rem] leading-none">
              {a.estimateLow != null ? `${cad(a.estimateLow)} to ${cad(a.estimateHigh)}` : "—"}
            </p>
            <p className="mt-2 text-[15px] text-muted">The firm offer replaces this after the walk-around.</p>
          </div>
        )}
        {a.status === "offered" && (
          <div className="border-t-2 border-ink p-4 sm:p-6">
            <OfferAnswer id={a.id} />
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <Section title="What you told us">
          <dl className="space-y-2 text-[15px]">
            <Row k="Kilometres" v={km(a.declaredKm)} />
            <Row k="Condition" v={CONDITIONS.find((c) => c.id === a.declaredCondition)?.label ?? "—"} />
            {a.odometerKm != null && a.status !== "booked" && a.status !== "walking" && (
              <Row k="Odometer on the lot" v={km(a.odometerKm)} />
            )}
          </dl>
        </Section>
        <Section title="History">
          <History events={events} />
        </Section>
      </div>
    </Frame>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-rule pb-2">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
