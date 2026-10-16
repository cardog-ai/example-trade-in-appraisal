import Link from "next/link";
import { Frame } from "@/components/frame";
import { Empty, StatusTag, StatusTrack } from "@/components/bits";
import { listForCustomer, vehicleName } from "@/lib/appraisals";
import { requireRole } from "@/lib/session";
import { cad } from "@/lib/valuation";

export const metadata = { title: "My trade" };

export default async function MyTrade() {
  const me = await requireRole("customer");
  const rows = listForCustomer(me.id);
  return (
    <Frame me={me} sub="Trade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[3rem] uppercase">My trade</h1>
        <Link href="/" className="btn btn-line btn-sm">
          New estimate
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="mt-8">
          <Empty title="No trade booked yet">
            Get an estimate on the{" "}
            <Link href="/" className="link text-ink">
              trade-in page
            </Link>{" "}
            and book an appraisal. It shows up here with the desk&rsquo;s offer.
          </Empty>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((a) => (
            <li key={a.id}>
              <Link href={`/trade/${a.id}`} className="slab block p-4 hover:bg-spruce-soft sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="display text-[1.75rem] uppercase">{vehicleName(a)}</p>
                    <p className="mt-0.5 font-mono text-[13px] text-muted">{a.number}</p>
                  </div>
                  <StatusTag status={a.status} />
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="label">{a.offer != null && a.status !== "desk" ? "Offer" : "Estimate"}</p>
                    <p className="num text-[2rem] leading-none">
                      {a.offer != null && a.status !== "desk"
                        ? cad(a.offer)
                        : a.estimateLow != null
                          ? `${cad(a.estimateLow)} to ${cad(a.estimateHigh)}`
                          : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <StatusTrack status={a.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}
