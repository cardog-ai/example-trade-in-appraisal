#!/usr/bin/env node
/**
 * Records the fixtures the app serves when CARDOG_API_KEY is not set.
 *
 *   CARDOG_API_KEY=... node scripts/record-fixtures.mjs [VIN:km ...]
 *
 * It makes exactly the SDK calls the app makes for each VIN (decode, quote,
 * comparables, window sticker, recalls) and writes the responses plus
 * their latency to src/fixtures/<VIN>.json. No key is ever written to disk,
 * and the window sticker's signed link is dropped (it lasts 24 hours). Set
 * CARDOG_BASE_URL to record against another API origin.
 */
import { CardogClient } from "@cardog/api";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULTS = [
  "2T3R1RFV9NW273162:48000", // 2022 Toyota RAV4
  "1C4HJXDN0MW685120:60000", // 2021 Jeep Wrangler Unlimited (a window sticker is held)
  "2HGFC2F51MH015612:71000", // 2021 Honda Civic LX
];

const apiKey = process.env.CARDOG_API_KEY;
if (!apiKey) {
  console.error("Set CARDOG_API_KEY to record fixtures.");
  process.exit(1);
}
const client = new CardogClient({ apiKey, baseUrl: process.env.CARDOG_BASE_URL || undefined, appId: "larkspur-trade-in-recorder" });
const location = {
  lat: Number(process.env.DEALER_LAT ?? 43.5448),
  lng: Number(process.env.DEALER_LNG ?? -80.2482),
  radius: Number(process.env.DEALER_RADIUS_KM ?? 250),
};
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "fixtures");

async function timed(fn) {
  const t0 = performance.now();
  try {
    const response = await fn();
    return { ok: true, ms: Math.round(performance.now() - t0), provenance: `recorded ${new Date().toISOString().slice(0, 10)}`, response };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t0), provenance: "recorded", error: { status: e?.status ?? null, message: e?.message ?? String(e) } };
  }
}

const args = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;
for (const arg of args) {
  const [vin, kmText] = arg.split(":");
  const km = Number(kmText ?? 60000);
  const decode = await timed(() => client.v2.vin.getByVin(vin));
  if (!decode.ok) {
    console.error(vin, "decode failed", decode.error);
    continue;
  }
  const id = decode.response;
  const my = id.refs?.modelYear;
  const model = id.refs?.model;
  const [quote, comps, sticker, recalls] = await Promise.all([
    my ? timed(() => client.v2.quotes.getByRef(my)) : null,
    model && id.year
      ? timed(() =>
          client.v2.listings.search({
            filters: {
              models: [model],
              year: { min: id.year - 1, max: id.year + 1 },
              odometer: { min: Math.max(0, km - 40000), max: km + 40000 },
              location,
            },
            pagination: { page: 1, limit: 12 },
            sort: { field: "price", order: "asc" },
          })
        )
      : null,
    timed(() => client.v2.vin.windowSticker(vin)),
    my ? timed(() => client.v2.recalls.entity(my, { limit: 20 })) : null,
  ]);
  if (sticker?.ok && sticker.response.label) sticker.response.label.document.downloadUrl = null;
  const file = { vin, recordedAt: new Date().toISOString(), sdk: "@cardog/api", calls: { decode, quote, comps, sticker, recalls } };
  await writeFile(join(out, `${vin}.json`), JSON.stringify(file, null, 2) + "\n");
  console.log(vin, Object.entries(file.calls).map(([k, v]) => `${k}:${v ? (v.ok ? "ok" : v.error.status ?? "err") : "-"}`).join(" "));
}
