"use server";

/**
 * Server actions: every write the app makes. Each one checks the session
 * and the role itself; the browser never decides who may do what.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createAppraisal,
  getAppraisal,
  logEvent,
  photosFor,
  updateAppraisal,
  vehicleName,
} from "@/lib/appraisals";
import { readForDesk, readForEstimate } from "@/lib/reads";
import { requireRole } from "@/lib/session";
import { CHECK_ITEMS, checkedCount, reconTotal, type Checklist } from "@/lib/trade-file";
import { CONDITIONS, cad, instantEstimate, type Condition, type DeskInputs } from "@/lib/valuation";
import { checkVin, normalizeVin } from "@/lib/vin";

const isCondition = (c: string): c is Condition => CONDITIONS.some((x) => x.id === c);
const parseKm = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 && n < 1_500_000 ? Math.round(n) : null;
};

// ── Customer ─────────────────────────────────────────────────────────────

/** The customer books the estimate they just got: it lands in the lot's queue. */
export async function bookAppraisal(form: FormData) {
  const me = await requireRole("customer");
  const vin = normalizeVin(String(form.get("vin") ?? ""));
  const km = parseKm(form.get("km"));
  const condition = String(form.get("condition") ?? "");
  if (checkVin(vin).state === "invalid" || vin.length !== 17 || !km || !isCondition(condition)) {
    redirect("/?error=details");
  }
  const read = await readForEstimate(vin, "Book an appraisal");
  if (!read.facts) redirect("/?error=decode");
  const est = read.facts.market && read.facts.year ? instantEstimate(read.facts.market, read.facts.year, km, condition) : null;
  const row = createAppraisal({
    status: "booked",
    customerId: me.id,
    customerName: me.name,
    customerPhone: String(form.get("phone") ?? "").trim() || null,
    facts: read.facts,
    declaredKm: km,
    declaredCondition: condition,
    estimate: est ? { low: est.low, high: est.high } : null,
    calls: read.calls,
    actor: me,
  });
  redirect(`/trade/${row.id}`);
}

/** The customer answers the desk's offer. */
export async function respondToOffer(id: string, answer: "accepted" | "declined") {
  const me = await requireRole("customer");
  const a = getAppraisal(id);
  if (!a || a.customerId !== me.id || a.status !== "offered") return;
  updateAppraisal(id, { status: answer, respondedAt: new Date() });
  logEvent(id, me, answer, answer === "accepted" ? `Accepted the offer of ${cad(a.offer)}` : `Declined the offer of ${cad(a.offer)}`);
  revalidatePath(`/trade/${id}`);
}

// ── Lot ──────────────────────────────────────────────────────────────────

/** A car that drove in without a website estimate. */
export async function startWalkIn(form: FormData) {
  const me = await requireRole("appraiser", "desk");
  const vin = normalizeVin(String(form.get("vin") ?? ""));
  const km = parseKm(form.get("km"));
  const name = String(form.get("customer") ?? "").trim();
  if (vin.length !== 17 || checkVin(vin).state === "invalid" || !km || !name) redirect("/lot?error=details");
  const read = await readForEstimate(vin, "Walk-in");
  if (!read.facts) redirect(`/lot?error=decode&vin=${vin}`);
  const est = read.facts.market && read.facts.year ? instantEstimate(read.facts.market, read.facts.year, km, "good") : null;
  const row = createAppraisal({
    status: "walking",
    customerId: null,
    customerName: name,
    customerPhone: String(form.get("phone") ?? "").trim() || null,
    appraiserId: me.id,
    facts: read.facts,
    declaredKm: km,
    declaredCondition: "good",
    estimate: est ? { low: est.low, high: est.high } : null,
    calls: read.calls,
    actor: me,
  });
  updateAppraisal(row.id, { odometerKm: km });
  redirect(`/lot/${row.id}`);
}

export async function startWalkaround(id: string) {
  const me = await requireRole("appraiser", "desk");
  const a = getAppraisal(id);
  if (!a || a.status !== "booked") return;
  updateAppraisal(id, { status: "walking", appraiserId: me.id });
  logEvent(id, me, "walking", "Started the walk-around");
  revalidatePath(`/lot/${id}`);
}

/** Autosave from the walk-around screen. Returns the recon total it stored. */
export async function saveWalkaround(
  id: string,
  input: { odometerKm: number | null; checklist: Checklist; lotNote: string }
): Promise<{ ok: boolean; recon: number }> {
  await requireRole("appraiser", "desk");
  const a = getAppraisal(id);
  if (!a || a.status !== "walking") return { ok: false, recon: 0 };
  const checklist: Checklist = {};
  for (const item of CHECK_ITEMS) {
    const c = input.checklist[item.id];
    const state = c && ["unchecked", "ok", "work"].includes(c.state) ? c.state : "unchecked";
    const cost = state === "work" ? Math.max(0, Math.min(50_000, Math.round(Number(c?.cost) || 0))) : 0;
    checklist[item.id] = { state, cost };
  }
  const odometerKm =
    input.odometerKm && input.odometerKm > 0 && input.odometerKm < 1_500_000 ? Math.round(input.odometerKm) : null;
  updateAppraisal(id, { checklist, odometerKm, lotNote: input.lotNote.slice(0, 2000) || null });
  return { ok: true, recon: reconTotal(checklist) };
}

export async function sendToDesk(id: string): Promise<{ error: string } | void> {
  const me = await requireRole("appraiser", "desk");
  const a = getAppraisal(id);
  if (!a || a.status !== "walking") return { error: "This appraisal is not on the lot." };
  if (!a.odometerKm) return { error: "Enter the odometer reading." };
  if (checkedCount(a.checklist) < CHECK_ITEMS.length) return { error: "Check every item first." };
  const shots = photosFor(id).map((p) => p.slot);
  const missing = ["front", "rear", "odometer"].filter((s) => !shots.includes(s));
  if (missing.length) return { error: "Add the front, rear and odometer photos." };
  updateAppraisal(id, { status: "desk", walkedAt: new Date() });
  logEvent(
    id,
    me,
    "walked",
    `Walk-around done: ${a.odometerKm.toLocaleString("en-CA")} km, ${cad(reconTotal(a.checklist))} reconditioning, ${shots.length} photos`
  );
  redirect("/lot?sent=" + encodeURIComponent(vehicleName(a)));
}

// ── Desk ─────────────────────────────────────────────────────────────────

/** Reads the market again: quote, comparables, window sticker, recalls. */
export async function refreshMarket(id: string) {
  const me = await requireRole("desk");
  const a = getAppraisal(id);
  if (!a) return;
  const read = await readForDesk(a.facts, a.odometerKm ?? a.declaredKm, "Desk sheet · refresh");
  updateAppraisal(id, {
    facts: read.facts,
    comps: read.comps,
    marketReadAt: new Date(),
    calls: { ...a.calls, desk: read.calls },
  });
  logEvent(id, me, "market", `Market read again: ${read.comps?.rows.length ?? 0} comparable listings`);
  revalidatePath(`/desk/${id}`);
}

/** A customer answering in person (or a walk-in without an account): the desk records it. */
export async function recordAnswer(id: string, answer: "accepted" | "declined") {
  const me = await requireRole("desk");
  const a = getAppraisal(id);
  if (!a || a.status !== "offered") return;
  updateAppraisal(id, { status: answer, respondedAt: new Date() });
  logEvent(id, me, answer, `${a.customerName} ${answer} ${cad(a.offer)} in person`);
  revalidatePath(`/desk/${id}`);
}

export async function sendOffer(
  id: string,
  input: { offer: number; note: string; desk: DeskInputs }
): Promise<{ error: string } | void> {
  const me = await requireRole("desk");
  const a = getAppraisal(id);
  if (!a || !["desk", "offered", "declined"].includes(a.status)) return { error: "This appraisal is not at the desk." };
  const offer = Math.round(Number(input.offer));
  if (!Number.isFinite(offer) || offer < 0 || offer > 2_000_000) return { error: "Enter the offer in dollars." };
  const revised = a.status !== "desk";
  updateAppraisal(id, {
    status: "offered",
    offer,
    offerNote: input.note.trim().slice(0, 1000) || null,
    desk: {
      anchor: Math.round(input.desk.anchor) || 0,
      anchorSource: input.desk.anchorSource,
      perKm: Number(input.desk.perKm) || 0,
      pack: Math.round(input.desk.pack) || 0,
      gross: Math.round(input.desk.gross) || 0,
    },
    offeredBy: me.id,
    offeredAt: new Date(),
    respondedAt: null,
  });
  logEvent(
    id,
    me,
    revised ? "revised" : "offered",
    revised ? `Offer revised from ${cad(a.offer)} to ${cad(offer)}` : `Offer of ${cad(offer)} sent to ${a.customerName}`
  );
  revalidatePath(`/desk/${id}`);
}
