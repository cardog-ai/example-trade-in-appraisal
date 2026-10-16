import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AppraisalRow, Status } from "@/db/schema";
import type { CallRecord } from "./calls";
import { emptyChecklist, type TradeFacts } from "./trade-file";
import type { Condition } from "./valuation";

const { appraisal, appraisalEvent, photo } = schema;

/** A short number people can read over the phone: LM-48213. */
export function newNumber() {
  return `LM-${Math.floor(10000 + Math.random() * 90000)}`;
}

export interface Actor {
  id: string | null;
  name: string;
}

export function logEvent(appraisalId: string, actor: Actor, kind: string, summary: string) {
  db.insert(appraisalEvent)
    .values({ id: crypto.randomUUID(), appraisalId, actorId: actor.id, actorName: actor.name, kind, summary })
    .run();
}

export function createAppraisal(input: {
  status: Extract<Status, "booked" | "walking">;
  customerId: string | null;
  customerName: string;
  customerPhone?: string | null;
  appraiserId?: string | null;
  facts: TradeFacts;
  declaredKm: number;
  declaredCondition: Condition;
  estimate: { low: number; high: number } | null;
  calls: CallRecord[];
  actor: Actor;
}): AppraisalRow {
  const id = crypto.randomUUID();
  const row = db
    .insert(appraisal)
    .values({
      id,
      number: newNumber(),
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone ?? null,
      vin: input.facts.vin,
      year: input.facts.year,
      make: input.facts.make,
      model: input.facts.model,
      trim: input.facts.trim,
      status: input.status,
      declaredKm: input.declaredKm,
      declaredCondition: input.declaredCondition,
      estimateLow: input.estimate?.low ?? null,
      estimateHigh: input.estimate?.high ?? null,
      facts: input.facts,
      comps: null,
      marketReadAt: new Date(),
      calls: { estimate: input.calls },
      checklist: emptyChecklist(),
      appraiserId: input.appraiserId ?? null,
    })
    .returning()
    .get();
  logEvent(
    id,
    input.actor,
    input.status === "booked" ? "booked" : "walk-in",
    input.status === "booked"
      ? `Booked from the website estimate${input.estimate ? ` (${range(input.estimate)})` : ""}`
      : `Walk-in started on the lot for ${input.customerName}`
  );
  return row;
}

const range = (e: { low: number; high: number }) =>
  `${e.low.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })} to ${e.high.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })}`;

export function getAppraisal(id: string) {
  return db.select().from(appraisal).where(eq(appraisal.id, id)).get() ?? null;
}

export function listForCustomer(userId: string) {
  return db.select().from(appraisal).where(eq(appraisal.customerId, userId)).orderBy(desc(appraisal.createdAt)).all();
}

export function listByStatus(statuses: Status[]) {
  return db
    .select()
    .from(appraisal)
    .where(inArray(appraisal.status, statuses))
    .orderBy(desc(appraisal.updatedAt))
    .all();
}

export function eventsFor(id: string) {
  return db.select().from(appraisalEvent).where(eq(appraisalEvent.appraisalId, id)).orderBy(asc(appraisalEvent.at)).all();
}

export function photosFor(id: string) {
  return db.select().from(photo).where(eq(photo.appraisalId, id)).all();
}

export function photoFor(id: string, slot: string) {
  return db
    .select()
    .from(photo)
    .where(and(eq(photo.appraisalId, id), eq(photo.slot, slot)))
    .get();
}

export function updateAppraisal(id: string, values: Partial<typeof appraisal.$inferInsert>) {
  db.update(appraisal)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(appraisal.id, id))
    .run();
}

export const STATUS_LABEL: Record<Status, string> = {
  booked: "Booked",
  walking: "On the lot",
  desk: "At the desk",
  offered: "Offer out",
  accepted: "Accepted",
  declined: "Declined",
};

export function vehicleName(a: Pick<AppraisalRow, "year" | "make" | "model">) {
  return [a.year, a.make, a.model].filter(Boolean).join(" ") || "Vehicle";
}
