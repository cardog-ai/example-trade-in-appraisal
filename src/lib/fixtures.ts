import "server-only";
import jeep from "@/fixtures/1C4HJXDN0MW685120.json";
import rav4 from "@/fixtures/2T3R1RFV9NW273162.json";
import civic from "@/fixtures/2HGFC2F51MH015612.json";

/** The three VINs fixture mode knows. */
export const FIXTURE_VINS = [
  { vin: "2T3R1RFV9NW273162", label: "2022 Toyota RAV4", km: 48000 },
  { vin: "1C4HJXDN0MW685120", label: "2021 Jeep Wrangler Unlimited", km: 60000 },
  { vin: "2HGFC2F51MH015612", label: "2021 Honda Civic LX", km: 71000 },
] as const;

export type FixtureKey = "decode" | "quote" | "comps" | "sticker" | "recalls";

type Stored = {
  ok: boolean;
  ms: number;
  provenance?: string;
  response?: unknown;
  error?: { status: number | null; message: string };
};
type FixtureFile = { vin: string; calls: Record<string, Stored | null> };

const files = new Map<string, FixtureFile>(([jeep, rav4, civic] as unknown as FixtureFile[]).map((f) => [f.vin, f]));

export type FixtureCall =
  | { ok: true; ms: number; provenance: string; response: unknown }
  | { ok: false; ms: number; provenance: string; status: number | null; message: string };

export function fixtureCall(vin: string, key: FixtureKey): FixtureCall {
  const file = files.get(vin.toUpperCase());
  if (!file) {
    return {
      ok: false,
      ms: 0,
      provenance: "fixture mode",
      status: 404,
      message: `Fixture mode holds three VINs (${FIXTURE_VINS.map((v) => v.vin).join(
        ", "
      )}). Set CARDOG_API_KEY to read any VIN.`,
    };
  }
  const c = file.calls[key];
  if (!c) return { ok: false, ms: 0, provenance: "not recorded", status: null, message: "Not recorded for this VIN." };
  if (c.ok) return { ok: true, ms: c.ms, provenance: c.provenance ?? "recorded", response: c.response };
  return {
    ok: false,
    ms: c.ms,
    provenance: c.provenance ?? "recorded",
    status: c.error?.status ?? null,
    message: c.error?.message ?? "Failed",
  };
}
