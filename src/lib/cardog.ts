/**
 * Every Cardog call this app makes lives in this file.
 *
 * The client is built once, on the server, from CARDOG_API_KEY. The key
 * never reaches the browser: pages, route handlers and server actions call
 * the functions below, and the browser only ever sees the trimmed call
 * records.
 *
 * With no key set, the app runs in fixture mode: each function serves a
 * response held for one of three sample VINs (src/fixtures), with the
 * latency it was read at. `pnpm record-fixtures` re-records them.
 */
import "server-only";
import { CardogClient, APIErrorV2, APIError } from "@cardog/api";
import { trimForDisplay, type CallRecord } from "./calls";
import { fixtureCall, FIXTURE_VINS, type FixtureKey } from "./fixtures";

const apiKey = process.env.CARDOG_API_KEY?.trim();

/** The one Cardog client. Server-side only. */
export const cardog: CardogClient | null = apiKey
  ? new CardogClient({ apiKey, appId: "larkspur-trade-in", baseUrl: process.env.CARDOG_BASE_URL || undefined })
  : null;

export const dataMode: "live" | "fixture" = cardog ? "live" : "fixture";
export { FIXTURE_VINS };

/** Where the store is: comparable listings are searched around it. */
export const DEALER_LOCATION = {
  lat: Number(process.env.DEALER_LAT ?? 43.5448),
  lng: Number(process.env.DEALER_LNG ?? -80.2482),
  radius: Number(process.env.DEALER_RADIUS_KM ?? 250),
};

// The v2 response types, read off the client's own method signatures.
type V2 = CardogClient["v2"];
export type VinIdentity = Awaited<ReturnType<V2["vin"]["getByVin"]>>;
export type MarketQuote = Awaited<ReturnType<V2["quotes"]["getByRef"]>>;
export type ListingSearch = Awaited<ReturnType<V2["listings"]["search"]>>;
export type WindowSticker = Awaited<ReturnType<V2["vin"]["windowSticker"]>>;
export type ModelYearRecalls = Awaited<ReturnType<V2["recalls"]["entity"]>>;
type ListingsV2SearchParams = NonNullable<Parameters<V2["listings"]["search"]>[0]>;

export interface Result<T> {
  data: T | null;
  call: CallRecord;
  error: string | null;
}

// ── The calls ─────────────────────────────────────────────────────────────

/**
 * VIN → identity card.
 * `cardog.v2.vin.getByVin(vin)` · GET /v2/vin/{vin}
 * Returns year, make, model, trim, the entity refs (`refs.model` and
 * `refs.modelYear` are what every other call here takes), and the build
 * grains `nano` and `squish`.
 */
export function decodeVin(vin: string, step: string) {
  return run<VinIdentity>({
    step,
    vin,
    key: "decode",
    method: "cardog.v2.vin.getByVin",
    args: [vin],
    http: `GET /v2/vin/${vin}`,
    returns: "Identity card: year, make, model, trim, refs, build grains",
    live: (c) => c.v2.vin.getByVin(vin),
  });
}

/**
 * Model year → live market quote.
 * `cardog.v2.quotes.getByRef(modelYearRef)` · GET /v2/quotes/{modelYearRef}
 * Returns asking-price p25 / median / p75 across live Canadian listings of
 * the model year, the live count, average days on market and `asOf`. The
 * website estimate starts from the middle half; the desk sees all of it.
 */
export function readMarketQuote(modelYearRef: string, vin: string, step: string) {
  return run<MarketQuote>({
    step,
    vin,
    key: "quote",
    method: "cardog.v2.quotes.getByRef",
    args: [modelYearRef],
    http: `GET /v2/quotes/${modelYearRef}`,
    returns: "Asking-price quartiles, live count and days on market for the model year",
    live: (c) => c.v2.quotes.getByRef(modelYearRef),
  });
}

/**
 * Model + year band + km band + the store's location → comparable live listings.
 * `cardog.v2.listings.search({ filters, pagination, sort })` · GET /v2/listings/search
 * Filters are refs (`models: ["model:toyota/rav4"]`) plus ranges, and
 * `location: { lat, lng, radius }` in kilometres. Returns listing rows with
 * price, odometer, year and trim: the desk's comparables.
 */
export function searchComparables(
  q: { modelRef: string; year: number; km: number },
  vin: string,
  step: string
) {
  const params: ListingsV2SearchParams = {
    filters: {
      models: [q.modelRef as `model:${string}`],
      year: { min: q.year - 1, max: q.year + 1 },
      odometer: { min: Math.max(0, q.km - 40_000), max: q.km + 40_000 },
      location: DEALER_LOCATION,
    },
    pagination: { page: 1, limit: 12 },
    sort: { field: "price", order: "asc" },
  };
  const f = params.filters!;
  return run<ListingSearch>({
    step,
    vin,
    key: "comps",
    method: "cardog.v2.listings.search",
    args: [params],
    http:
      `GET /v2/listings/search?models=${q.modelRef}&year=${f.year!.min}-${f.year!.max}` +
      `&odometer=${f.odometer!.min}-${f.odometer!.max}&lat=${DEALER_LOCATION.lat}&lng=${DEALER_LOCATION.lng}` +
      `&radius=${DEALER_LOCATION.radius}&sort=price&order=asc&limit=12`,
    returns: "Live listings of the same model, a year either side, within 40,000 km, near the store",
    live: (c) => c.v2.listings.search(params),
  });
}

/**
 * VIN → the factory window sticker, or why there is none.
 * `cardog.v2.vin.windowSticker(vin)` · GET /v2/vin/{vin}/window-sticker
 * Exactly one of `label` (issuer, retrievedAt, vinVerified, and a document
 * with a signed `downloadUrl` good for 24 hours) or `unavailable.reason`.
 * The desk opens the original sticker to confirm the build and options.
 */
export function readWindowSticker(vin: string, step: string) {
  return run<WindowSticker>({
    step,
    vin,
    key: "sticker",
    method: "cardog.v2.vin.windowSticker",
    args: [vin],
    http: `GET /v2/vin/${vin}/window-sticker`,
    returns: "The factory window sticker held for this VIN, or the reason there is none",
    live: (c) => c.v2.vin.windowSticker(vin),
  });
}

/**
 * Model year → recall campaigns issued for it.
 * `cardog.v2.recalls.entity(modelYearRef)` · GET /v2/recalls/entity/{modelYearRef}
 * Transport Canada and NHTSA campaigns that list the model year. They are
 * matched by model year, not by VIN, and say nothing about whether a given
 * car has had the work done: the desk sheet labels them that way.
 */
export function readModelYearRecalls(modelYearRef: string, vin: string, step: string) {
  return run<ModelYearRecalls>({
    step,
    vin,
    key: "recalls",
    method: "cardog.v2.recalls.entity",
    args: [modelYearRef, { limit: 20 }],
    http: `GET /v2/recalls/entity/${modelYearRef}?limit=20`,
    returns: "Recall campaigns issued for the model year (Transport Canada and NHTSA)",
    live: (c) => c.v2.recalls.entity(modelYearRef, { limit: 20 }),
  });
}

// ── Plumbing: time the call, or serve the fixture, and log it ────────────

interface Spec<T> {
  step: string;
  vin: string;
  key: FixtureKey;
  method: string;
  args: unknown[];
  http: string;
  returns: string;
  live: (c: CardogClient) => Promise<T>;
}

async function run<T>(s: Spec<T>): Promise<Result<T>> {
  const base = {
    id: crypto.randomUUID(),
    step: s.step,
    method: s.method,
    args: s.args,
    http: s.http,
    returns: s.returns,
    at: new Date().toISOString(),
  };

  if (!cardog) {
    const f = fixtureCall(s.vin, s.key);
    const call: CallRecord = {
      ...base,
      mode: "fixture",
      ok: f.ok,
      status: f.ok ? 200 : f.status,
      ms: f.ms,
      provenance: f.provenance,
      response: trimForDisplay(f.ok ? f.response : { error: f.message }),
    };
    return { data: f.ok ? (f.response as T) : null, call, error: f.ok ? null : f.message };
  }

  const t0 = performance.now();
  try {
    const data = await s.live(cardog);
    const call: CallRecord = {
      ...base,
      mode: "live",
      ok: true,
      status: 200,
      ms: ms(t0),
      response: trimForDisplay(data),
    };
    return { data, call, error: null };
  } catch (e) {
    const status = e instanceof APIErrorV2 || e instanceof APIError ? e.status : null;
    const message = e instanceof Error ? e.message : String(e);
    const body = e instanceof APIErrorV2 ? { code: e.code, message, hint: e.hint } : { message };
    const call: CallRecord = { ...base, mode: "live", ok: false, status, ms: ms(t0), response: trimForDisplay(body) };
    return { data: null, call, error: message };
  }
}

const ms = (t0: number) => Math.round(performance.now() - t0);
