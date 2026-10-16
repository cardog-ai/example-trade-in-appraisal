import Link from "next/link";
import { redirect } from "next/navigation";
import { bookAppraisal } from "@/app/actions";
import { Frame } from "@/components/frame";
import { ShowCalls } from "@/kit/call-log";
import { readForEstimate } from "@/lib/reads";
import { requireRole } from "@/lib/session";
import { CONDITIONS, cad, instantEstimate, km as fmtKm, type Condition } from "@/lib/valuation";
import { normalizeVin } from "@/lib/vin";

export const metadata = { title: "Book an appraisal" };

/**
 * The step between the estimate and the queue: the customer confirms the
 * car and leaves a phone number. Reached from the estimate's "Book my
 * appraisal", after sign-in or sign-up when needed.
 */
export default async function Book({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireRole("customer");
  const sp = await searchParams;
  const vin = normalizeVin(sp.vin ?? "");
  const km = Math.round(Number(sp.km));
  const condition = (CONDITIONS.some((c) => c.id === sp.condition) ? sp.condition : "good") as Condition;
  if (vin.length !== 17 || !(km > 0)) redirect("/");

  const read = await readForEstimate(vin, "Book an appraisal");
  const f = read.facts;
  const est = f?.market && f.year ? instantEstimate(f.market, f.year, km, condition) : null;

  return (
    <Frame me={me} sub="Trade-in" width={640}>
      <ShowCalls calls={read.calls} />
      <h1 className="display text-[3rem] uppercase">Book your appraisal</h1>
      {!f ? (
        <p className="mt-4 text-[1.125rem] text-flag">{read.error}</p>
      ) : (
        <form action={bookAppraisal} className="slab mt-6 overflow-hidden">
          <input type="hidden" name="vin" value={vin} />
          <input type="hidden" name="km" value={km} />
          <input type="hidden" name="condition" value={condition} />
          <div className="bg-spruce px-4 py-5 text-white sm:px-6">
            <p className="display text-[1.75rem] uppercase">
              {[f.year, f.make, f.model].filter(Boolean).join(" ")} {f.trim && <span className="text-white/70">{f.trim}</span>}
            </p>
            <p className="mt-1 text-[15px] text-white/75">
              {fmtKm(km)} · {CONDITIONS.find((c) => c.id === condition)?.label} condition
            </p>
            {est && (
              <p className="num mt-4 text-[2.5rem] leading-none text-pencil">
                {cad(est.low)} <span className="text-white/60">to</span> {cad(est.high)}
              </p>
            )}
          </div>
          <div className="space-y-5 p-4 sm:p-6">
            <label className="block">
              <span className="label">Phone, so the lot can call when you arrive</span>
              <input name="phone" type="tel" className="field mt-2" autoComplete="tel" placeholder="Optional" />
            </label>
            <p className="text-[15px] text-ink-2">
              Bring the car and both keys. An appraiser walks it with you, and the desk sends a firm offer to this
              account, usually the same visit.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn btn-pencil">
                Book it
              </button>
              <Link href="/" className="btn btn-line">
                Back
              </Link>
            </div>
          </div>
        </form>
      )}
    </Frame>
  );
}
