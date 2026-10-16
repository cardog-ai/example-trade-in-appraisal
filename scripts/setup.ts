/**
 * pnpm db:setup — create the SQLite database, apply migrations, and seed
 * the review accounts and three trade-ins. Safe to run again: it only
 * seeds an empty database. `pnpm dev` runs it first, so a fresh clone
 * needs nothing else.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { hashPassword } from "better-auth/crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "../src/db/schema";
import { buildComps, buildTradeFacts, emptyChecklist, type Checklist } from "../src/lib/trade-file";
import { cad, defaultDeskInputs, instantEstimate, worksheet, type Condition } from "../src/lib/valuation";
import { reconTotal } from "../src/lib/trade-file";
import jeep from "../src/fixtures/1C4HJXDN0MW685120.json";
import rav4 from "../src/fixtures/2T3R1RFV9NW273162.json";
import civic from "../src/fixtures/2HGFC2F51MH015612.json";

const path = process.env.DATABASE_PATH ?? "data/larkspur.db";
mkdirSync(dirname(path), { recursive: true });
const sqlite = new Database(path);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: "drizzle" });

const ACCOUNTS = [
  { name: "Jordan Reyes", email: "customer@larkspur.example", password: "larkspur-customer", role: "customer" },
  { name: "Avery Lam", email: "appraiser@larkspur.example", password: "larkspur-appraiser", role: "appraiser" },
  { name: "Morgan Tate", email: "desk@larkspur.example", password: "larkspur-desk", role: "desk" },
  { name: "Alexis Brandt", email: "alexis@larkspur.example", password: "larkspur-customer", role: "customer" },
] as const;

type Fixture = { vin: string; calls: Record<string, { ok: boolean; response?: unknown } | null> };
const r = (fx: unknown, k: string) => {
  const f = fx as Fixture;
  return f.calls[k]?.ok ? f.calls[k]!.response : null;
};
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

function checklist(work: Record<string, number>): Checklist {
  const c = emptyChecklist();
  for (const id of Object.keys(c)) c[id] = work[id] != null ? { state: "work", cost: work[id] } : { state: "ok", cost: 0 };
  return c;
}

async function seed() {
  const ids: Record<string, string> = {};
  for (const a of ACCOUNTS) {
    const id = crypto.randomUUID();
    ids[a.role === "customer" && a.email.startsWith("alexis") ? "alexis" : a.role] = id;
    db.insert(schema.user).values({ id, name: a.name, email: a.email, emailVerified: true, role: a.role }).run();
    db.insert(schema.account)
      .values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(a.password) })
      .run();
  }
  const name = (role: string) => ACCOUNTS.find((a) => (role === "alexis" ? a.email.startsWith("alexis") : a.role === role))!.name;
  const event = (appraisalId: string, at: Date, who: string | null, actorName: string, kind: string, summary: string) =>
    db.insert(schema.appraisalEvent).values({ id: crypto.randomUUID(), appraisalId, at, actorId: who, actorName, kind, summary }).run();

  function base(fx: unknown, km: number, condition: Condition, withDesk: boolean) {
    const vin = (fx as Fixture).vin;
    const facts = buildTradeFacts(vin, {
      decode: r(fx, "decode"),
      quote: r(fx, "quote"),
      sticker: withDesk ? r(fx, "sticker") : null,
      recalls: withDesk ? r(fx, "recalls") : null,
    });
    const est = facts.market && facts.year ? instantEstimate(facts.market, facts.year, km, condition) : null;
    return { vin, facts, est };
  }

  // 1 · Jordan's Civic: booked online, walked, priced, offer out. Jordan can accept it.
  {
    const id = crypto.randomUUID();
    const { vin, facts, est } = base(civic, 71000, "good", true);
    const comps = buildComps(r(civic, "comps"), vin, "across Canada");
    const list = checklist({ tires: 900, paint: 600 });
    const odometerKm = 71420;
    const desk = defaultDeskInputs(comps.medianPrice, comps.rows.length, facts.market?.median ?? null);
    const ws = worksheet(desk, odometerKm, comps.medianKm ?? odometerKm, reconTotal(list));
    db.insert(schema.appraisal)
      .values({
        id, number: "LM-30418", customerId: ids.customer, customerName: name("customer"), customerPhone: "519-555-0142",
        vin, year: facts.year, make: facts.make, model: facts.model, trim: facts.trim, status: "offered",
        declaredKm: 71000, declaredCondition: "good", estimateLow: est?.low ?? null, estimateHigh: est?.high ?? null,
        facts, comps, marketReadAt: hoursAgo(20), calls: {}, odometerKm, checklist: list,
        lotNote: "Front tires at 3/32. Light scuff on rear bumper, buffs out.", appraiserId: ids.appraiser, walkedAt: hoursAgo(21),
        desk, offer: ws.offer, offerNote: "Two tires and a bumper refinish are in the number. Holds for 7 days.",
        offeredBy: ids.desk, offeredAt: hoursAgo(19), createdAt: hoursAgo(26), updatedAt: hoursAgo(19),
      })
      .run();
    event(id, hoursAgo(26), ids.customer, name("customer"), "booked", `Booked from the website estimate (${cad(est?.low)} to ${cad(est?.high)})`);
    event(id, hoursAgo(21.5), ids.appraiser, name("appraiser"), "walking", "Started the walk-around");
    event(id, hoursAgo(21), ids.appraiser, name("appraiser"), "walked", `Walk-around done: 71,420 km, ${cad(reconTotal(list))} reconditioning`);
    event(id, hoursAgo(20), ids.desk, name("desk"), "market", `Market read for the desk: ${comps.rows.length} comparable listings`);
    event(id, hoursAgo(19), ids.desk, name("desk"), "offered", `Offer of ${cad(ws.offer)} sent to ${name("customer")}`);
  }

  // 2 · Alexis's RAV4: booked from the website, waiting on the lot.
  {
    const id = crypto.randomUUID();
    const { vin, facts, est } = base(rav4, 48000, "excellent", false);
    db.insert(schema.appraisal)
      .values({
        id, number: "LM-30422", customerId: ids.alexis, customerName: name("alexis"), customerPhone: "226-555-0187",
        vin, year: facts.year, make: facts.make, model: facts.model, trim: facts.trim, status: "booked",
        declaredKm: 48000, declaredCondition: "excellent", estimateLow: est?.low ?? null, estimateHigh: est?.high ?? null,
        facts, comps: null, marketReadAt: hoursAgo(2), calls: {}, checklist: emptyChecklist(),
        createdAt: hoursAgo(2), updatedAt: hoursAgo(2),
      })
      .run();
    event(id, hoursAgo(2), ids.alexis, name("alexis"), "booked", `Booked from the website estimate (${cad(est?.low)} to ${cad(est?.high)})`);
  }

  // 3 · A walk-in Wrangler: walked, waiting for the desk. The desk's first open reads the market.
  {
    const id = crypto.randomUUID();
    const { vin, facts, est } = base(jeep, 60000, "good", false);
    const list = checklist({ tires: 1100, rims: 300, warnings: 250 });
    db.insert(schema.appraisal)
      .values({
        id, number: "LM-30425", customerId: null, customerName: "Priya Nand", customerPhone: "519-555-0109",
        vin, year: facts.year, make: facts.make, model: facts.model, trim: facts.trim, status: "desk",
        declaredKm: 59806, declaredCondition: "good", estimateLow: est?.low ?? null, estimateHigh: est?.high ?? null,
        facts, comps: null, marketReadAt: hoursAgo(1), calls: {}, odometerKm: 59806, checklist: list,
        lotNote: "All-terrains at about half. Tire pressure light on; likely a sensor.", appraiserId: ids.appraiser,
        walkedAt: hoursAgo(0.5), createdAt: hoursAgo(1), updatedAt: hoursAgo(0.5),
      })
      .run();
    event(id, hoursAgo(1), ids.appraiser, name("appraiser"), "walk-in", "Walk-in started on the lot for Priya Nand");
    event(id, hoursAgo(0.5), ids.appraiser, name("appraiser"), "walked", `Walk-around done: 59,806 km, ${cad(reconTotal(list))} reconditioning`);
  }

  console.log(`Database created at ${path}. Review logins:`);
  for (const a of ACCOUNTS.slice(0, 3)) console.log(`  ${a.role.padEnd(10)} ${a.email} / ${a.password}`);
}

if (db.select().from(schema.user).all().length > 0) {
  console.log(`Database ready at ${path}.`);
} else {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
