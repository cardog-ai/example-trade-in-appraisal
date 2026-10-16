/**
 * Cardog responses → the facts an appraisal works from. Pure functions, no
 * I/O: the server builds these after a read, the seed script builds them
 * from the fixtures, and the database stores the result.
 */

type Obj = Record<string, unknown>;
const o = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

export interface Market {
  liveCount: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  best: number | null;
  avgDomDays: number | null;
  asOf: string | null;
}

export type Sticker =
  | { held: true; issuer: string | null; retrievedAt: string | null; vinVerified: boolean; sha256: string | null; downloadUrl: string | null; readAt: string }
  | { held: false; reason: string; issuer: string | null };

export interface RecallLine {
  ref: string;
  authority: string;
  campaign: string;
  component: string | null;
  summary: string | null;
  date: string | null;
}

export interface TradeFacts {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  refs: { model: string | null; modelYear: string | null };
  nano: string | null;
  market: Market | null;
  sticker: Sticker | null;
  recalls: { total: number; canada: RecallLine[] } | null;
}

/** A decode and a quote are enough for the website estimate; the rest arrives at the desk. */
export function buildTradeFacts(
  vin: string,
  r: { decode: unknown; quote?: unknown; sticker?: unknown; recalls?: unknown },
  readAt = new Date().toISOString()
): TradeFacts {
  const d = o(r.decode);
  const refs = o(d.refs);
  return {
    vin,
    year: num(d.year),
    make: str(d.make),
    model: str(d.model),
    trim: str(d.trim),
    refs: { model: str(refs.model), modelYear: str(refs.modelYear) },
    nano: str(d.nano),
    market: r.quote ? marketOf(r.quote) : null,
    sticker: r.sticker ? stickerOf(r.sticker, readAt) : null,
    recalls: r.recalls ? recallsOf(r.recalls) : null,
  };
}

export function marketOf(q: unknown): Market {
  const x = o(q);
  return {
    liveCount: num(x.liveCount),
    p25: num(x.priceP25),
    median: num(x.priceMedian),
    p75: num(x.priceP75),
    best: num(x.bestPrice),
    avgDomDays: num(x.avgDomDays),
    asOf: str(x.asOf),
  };
}

export function stickerOf(s: unknown, readAt: string): Sticker {
  const x = o(s);
  if (x.label) {
    const l = o(x.label);
    const doc = o(l.document);
    return {
      held: true,
      issuer: str(l.issuer),
      retrievedAt: str(l.retrievedAt),
      vinVerified: l.vinVerified === true,
      sha256: str(doc.sha256),
      downloadUrl: str(doc.downloadUrl),
      readAt,
    };
  }
  const u = o(x.unavailable);
  return { held: false, reason: str(u.reason) ?? "unknown", issuer: str(u.issuer) };
}

export function recallsOf(r: unknown): { total: number; canada: RecallLine[] } {
  const x = o(r);
  const list = Array.isArray(x.recalls) ? x.recalls.map(o) : [];
  const canada = list
    .filter((c) => c.authority === "tc")
    .map((c) => ({
      ref: String(c.ref ?? ""),
      authority: "Transport Canada",
      campaign: String(c.campaignNumber ?? ""),
      component: str(c.component),
      summary: str(c.defectSummary)?.replace(/^Issue:\s*/i, "").split(/\r?\n\r?\n/)[0].trim() ?? null,
      date: str(c.recallDate),
    }));
  return { total: num(x.total) ?? list.length, canada };
}

/** Plain words for the reasons a window sticker is not held. */
export const STICKER_REASON: Record<string, string> = {
  not_yet_harvested: "Not collected yet for this VIN. Worth checking again later.",
  no_lane: "Not collected for this manufacturer.",
  lane_us_only: "Collected for US-sold vehicles only.",
  issuer_has_no_record: "The manufacturer has no sticker on file for this VIN.",
  pre_lane_model_year: "This model year predates the collection.",
};

// ── Comparables ──────────────────────────────────────────────────────────

export interface Comp {
  id: string;
  year: number;
  model: string;
  trim: string | null;
  km: number | null;
  price: number;
}

export interface Comps {
  rows: Comp[];
  medianPrice: number | null;
  medianKm: number | null;
  readAt: string;
  near: string;
}

/** Listing rows → comparables. The trade-in's own listing, if it is for sale somewhere, is left out. */
export function buildComps(search: unknown, excludeVin: string, near: string, readAt = new Date().toISOString()): Comps {
  const rows = (Array.isArray(o(search).listings) ? (o(search).listings as unknown[]) : [])
    .map(o)
    .filter((l) => String(l.vin ?? "").toUpperCase() !== excludeVin.toUpperCase() && num(l.price))
    .map((l) => ({
      id: String(l.id ?? l.vin),
      year: num(l.year) ?? 0,
      model: String(l.model ?? ""),
      trim: str(l.trim),
      km: num(l.odometer),
      price: num(l.price)!,
    }))
    .sort((a, b) => a.price - b.price);
  return {
    rows,
    medianPrice: median(rows.map((r) => r.price)),
    medianKm: median(rows.map((r) => r.km).filter((k): k is number => k !== null)),
    readAt,
    near,
  };
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// ── The walk-around checklist ────────────────────────────────────────────

export interface CheckItem {
  id: string;
  area: string;
  label: string;
  /** What the store usually spends when this needs work. */
  typical: number;
}

export const CHECK_ITEMS: CheckItem[] = [
  { id: "paint", area: "Outside", label: "Paint and panels", typical: 850 },
  { id: "glass", area: "Outside", label: "Windshield and glass", typical: 450 },
  { id: "lights", area: "Outside", label: "Lights and lenses", typical: 180 },
  { id: "tires", area: "Wheels", label: "Tire tread", typical: 900 },
  { id: "brakes", area: "Wheels", label: "Brakes", typical: 550 },
  { id: "rims", area: "Wheels", label: "Rims and curb rash", typical: 300 },
  { id: "seats", area: "Inside", label: "Seats and upholstery", typical: 350 },
  { id: "dash", area: "Inside", label: "Dash, screens and switches", typical: 250 },
  { id: "odour", area: "Inside", label: "Smoke or pet odour", typical: 300 },
  { id: "start", area: "Drive", label: "Cold start and idle", typical: 600 },
  { id: "warnings", area: "Drive", label: "Warning lights", typical: 400 },
  { id: "drive", area: "Drive", label: "Road test", typical: 500 },
  { id: "keys", area: "Paper", label: "Second key", typical: 350 },
];

export type CheckState = { state: "unchecked" | "ok" | "work"; cost: number };
export type Checklist = Record<string, CheckState>;

export function emptyChecklist(): Checklist {
  return Object.fromEntries(CHECK_ITEMS.map((i) => [i.id, { state: "unchecked", cost: 0 }]));
}

export function reconTotal(c: Checklist): number {
  return Object.values(c).reduce((sum, i) => sum + (i.state === "work" ? i.cost : 0), 0);
}

export function checkedCount(c: Checklist): number {
  return Object.values(c).filter((i) => i.state !== "unchecked").length;
}

// ── Photo slots ──────────────────────────────────────────────────────────

export const PHOTO_SLOTS = [
  { id: "front", label: "Front three-quarter" },
  { id: "rear", label: "Rear three-quarter" },
  { id: "driver", label: "Driver side" },
  { id: "passenger", label: "Passenger side" },
  { id: "interior", label: "Front seats" },
  { id: "odometer", label: "Odometer" },
  { id: "tire", label: "Tire tread" },
  { id: "damage", label: "Damage close-up" },
] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number]["id"];
