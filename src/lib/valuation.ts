/**
 * The store's trade-in math. Pure, so the website, the desk sheet and the
 * seed all use the same numbers.
 *
 * Every offer is worked back from what the car will retail for:
 *
 *   retail anchor          what comparable cars are asking
 * + kilometre adjustment   this car's km against the comparables'
 * − reconditioning         what it costs to make it front-line ready
 * − pack                   the store's fixed cost per used car (detail, safety, certification)
 * − target gross           what the store needs to make on the resale
 * = the offer
 */

export const CONDITIONS = [
  {
    id: "excellent",
    label: "Excellent",
    detail: "No marks you can see, tires like new, nothing to fix.",
    recon: 400,
    retail: 1.02,
  },
  {
    id: "good",
    label: "Good",
    detail: "Normal wear. A few small chips or scuffs, tires with life left.",
    recon: 1100,
    retail: 1,
  },
  {
    id: "fair",
    label: "Fair",
    detail: "Dents or scratches that need work, tires or brakes due soon.",
    recon: 2400,
    retail: 0.96,
  },
  {
    id: "rough",
    label: "Rough",
    detail: "Body damage, warning lights on, or it needs mechanical work.",
    recon: 4200,
    retail: 0.9,
  },
] as const;
export type Condition = (typeof CONDITIONS)[number]["id"];
export const conditionOf = (id: string) => CONDITIONS.find((c) => c.id === id) ?? CONDITIONS[1];

/** The store's defaults; the desk can change them per car. */
export const DEFAULTS = {
  pack: 750,
  gross: 2500,
  /** Dollars per kilometre above or below the comparables. */
  perKm: 0.06,
  /** Kilometres a year a typical car covers, for the website estimate. */
  kmPerYear: 18_000,
};

const round = (n: number, to = 250) => Math.round(n / to) * to;

/** Kilometre adjustment, capped at 15% of the anchor either way. */
export function kmAdjustment(anchor: number, km: number, referenceKm: number, perKm = DEFAULTS.perKm) {
  const raw = (referenceKm - km) * perKm;
  const cap = anchor * 0.15;
  return Math.round(Math.max(-cap, Math.min(cap, raw)));
}

/** Kilometres a car of this year would typically show today. */
export function typicalKm(year: number, now = new Date()) {
  const age = Math.max(0.5, now.getFullYear() - year + (now.getMonth() + 1) / 12 - 0.5);
  return Math.round(age * DEFAULTS.kmPerYear);
}

export interface Estimate {
  low: number;
  high: number;
  basis: { p25: number; p75: number; kmAdj: number; recon: number; pack: number; gross: number; factor: number };
}

/**
 * The website's instant estimate: the middle half of the market for the
 * model year, adjusted for kilometres and the condition the customer chose,
 * less the store's usual costs. A range, not an offer.
 */
export function instantEstimate(
  m: { p25: number | null; p75: number | null; median: number | null },
  year: number,
  km: number,
  condition: Condition
): Estimate | null {
  if (m.p25 == null || m.p75 == null || m.median == null) return null;
  const c = conditionOf(condition);
  const kmAdj = kmAdjustment(m.median, km, typicalKm(year));
  const costs = c.recon + DEFAULTS.pack + DEFAULTS.gross;
  const low = Math.max(500, round(m.p25 * c.retail + kmAdj - costs));
  const high = Math.max(low + 500, round(m.p75 * c.retail + kmAdj - costs));
  return {
    low,
    high,
    basis: { p25: m.p25, p75: m.p75, kmAdj, recon: c.recon, pack: DEFAULTS.pack, gross: DEFAULTS.gross, factor: c.retail },
  };
}

/** What the desk can change on the sheet. */
export interface DeskInputs {
  anchor: number;
  anchorSource: "comps" | "market" | "manual";
  perKm: number;
  pack: number;
  gross: number;
}

export interface Worksheet {
  anchor: number;
  kmAdj: number;
  recon: number;
  pack: number;
  gross: number;
  offer: number;
  referenceKm: number;
}

/** The desk's sheet: anchor ± km − recon − pack − gross, rounded to $100. */
export function worksheet(i: DeskInputs, km: number, referenceKm: number, recon: number): Worksheet {
  const kmAdj = kmAdjustment(i.anchor, km, referenceKm, i.perKm);
  const offer = Math.max(0, round(i.anchor + kmAdj - recon - i.pack - i.gross, 100));
  return { anchor: i.anchor, kmAdj, recon, pack: i.pack, gross: i.gross, offer, referenceKm };
}

/** The desk's starting inputs: the comparables' median when there are three or more, else the market median. */
export function defaultDeskInputs(compsMedian: number | null, compsCount: number, marketMedian: number | null): DeskInputs {
  if (compsMedian != null && compsCount >= 3) {
    return { anchor: compsMedian, anchorSource: "comps", perKm: DEFAULTS.perKm, pack: DEFAULTS.pack, gross: DEFAULTS.gross };
  }
  return {
    anchor: marketMedian ?? 0,
    anchorSource: marketMedian != null ? "market" : "manual",
    perKm: DEFAULTS.perKm,
    pack: DEFAULTS.pack,
    gross: DEFAULTS.gross,
  };
}

export const cad = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
export const km = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("en-CA")} km`);
export const signed = (n: number) => (n > 0 ? `+ ${cad(n)}` : n < 0 ? `− ${cad(-n)}` : cad(0));
