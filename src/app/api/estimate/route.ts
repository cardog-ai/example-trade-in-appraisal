import { NextResponse } from "next/server";
import { readForEstimate } from "@/lib/reads";
import { CONDITIONS, instantEstimate, type Condition } from "@/lib/valuation";
import { checkVin, normalizeVin } from "@/lib/vin";

/**
 * POST /api/estimate { vin, km, condition }
 * The website's instant estimate. Public: anyone on the store's site can
 * ask. Two Cardog calls (decode, quote), held for an hour per VIN.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { vin?: string; km?: number; condition?: string };
  const vin = normalizeVin(String(body.vin ?? ""));
  const km = Math.round(Number(body.km));
  const condition = String(body.condition ?? "") as Condition;
  const check = checkVin(vin);
  if (vin.length !== 17 || check.state === "invalid") {
    return NextResponse.json({ error: "Enter the 17-character VIN." }, { status: 400 });
  }
  if (!Number.isFinite(km) || km <= 0 || km > 1_500_000) {
    return NextResponse.json({ error: "Enter the kilometres on the odometer." }, { status: 400 });
  }
  if (!CONDITIONS.some((c) => c.id === condition)) {
    return NextResponse.json({ error: "Pick the condition that fits best." }, { status: 400 });
  }

  const read = await readForEstimate(vin, "Instant estimate");
  const f = read.facts;
  const estimate = f?.market && f.year ? instantEstimate(f.market, f.year, km, condition) : null;
  return NextResponse.json({
    facts: f,
    estimate,
    calls: read.calls,
    error: read.error ?? (f && !estimate ? "There are not enough live listings to price this one online. Book it and we will look in person." : null),
  });
}
