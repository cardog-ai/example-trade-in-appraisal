import "server-only";
import type { CallRecord } from "./calls";
import {
  DEALER_LOCATION,
  dataMode,
  decodeVin,
  readMarketQuote,
  readModelYearRecalls,
  readWindowSticker,
  searchComparables,
} from "./cardog";
import { buildComps, buildTradeFacts, type Comps, type TradeFacts } from "./trade-file";

/**
 * The reads behind an appraisal, in two rounds:
 *
 *   estimate   decode → quote                          (the website, the walk-in)
 *   desk       quote, comparables, sticker, recalls     (the desk sheet, in parallel)
 *
 * Estimate reads are held for an hour per VIN, so a customer who books
 * right after the estimate does not pay for the same calls twice.
 */

export interface EstimateRead {
  facts: TradeFacts | null;
  calls: CallRecord[];
  error: string | null;
}

const held = new Map<string, { at: number; read: EstimateRead }>();
const HOUR = 60 * 60 * 1000;

export async function readForEstimate(vin: string, step: string): Promise<EstimateRead> {
  const hit = held.get(vin);
  if (hit && Date.now() - hit.at < HOUR) return hit.read;

  const decode = await decodeVin(vin, step);
  const calls = [decode.call];
  if (!decode.data) return { facts: null, calls, error: decode.error ?? "That VIN did not decode." };
  const modelYear = decode.data.refs?.modelYear;
  if (!modelYear) {
    return {
      facts: buildTradeFacts(vin, { decode: decode.data }),
      calls,
      error: "We could not place this VIN's model year, so there is no market to price it from.",
    };
  }
  const quote = await readMarketQuote(modelYear, vin, step);
  calls.push(quote.call);
  const read: EstimateRead = {
    facts: buildTradeFacts(vin, { decode: decode.data, quote: quote.data }),
    calls,
    error: quote.data ? null : quote.error,
  };
  if (!read.error) held.set(vin, { at: Date.now(), read });
  return read;
}

export interface DeskRead {
  facts: TradeFacts;
  comps: Comps | null;
  calls: CallRecord[];
}

/** Everything the desk sheet needs, read fresh. Keeps the decode it already has. */
export async function readForDesk(prev: TradeFacts, km: number, step: string): Promise<DeskRead> {
  const { vin } = prev;
  const my = prev.refs.modelYear;
  const model = prev.refs.model;
  const [quote, comps, sticker, recalls] = await Promise.all([
    my ? readMarketQuote(my, vin, step) : null,
    model && prev.year ? searchComparables({ modelRef: model, year: prev.year, km }, vin, step) : null,
    readWindowSticker(vin, step),
    my ? readModelYearRecalls(my, vin, step) : null,
  ]);
  const near =
    dataMode === "fixture"
      ? "across Canada"
      : `within ${DEALER_LOCATION.radius} km of the store`;
  const fresh = buildTradeFacts(vin, {
    decode: null,
    quote: quote?.data,
    sticker: sticker.data,
    recalls: recalls?.data,
  });
  return {
    facts: {
      ...prev,
      market: fresh.market ?? prev.market,
      sticker: fresh.sticker ?? prev.sticker,
      recalls: fresh.recalls ?? prev.recalls,
    },
    comps: comps?.data ? buildComps(comps.data, vin, near) : null,
    calls: [quote, comps, sticker, recalls].filter((r) => r !== null).map((r) => r.call),
  };
}
