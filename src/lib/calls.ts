/**
 * The call log: one record per Cardog SDK call, shared by server and
 * browser. The server records each call (lib/cardog.ts), trims the
 * response, and hands the records to the page, which shows them in the
 * "What the app called" pane. No secrets ever go in a record.
 */

export interface CallRecord {
  id: string;
  /** Which part of the app made the call, e.g. "Add your vehicle". */
  step: string;
  /** The SDK method, as you would write it: `cardog.v2.vin.getByVin`. */
  method: string;
  /** Arguments passed to the method. */
  args: unknown[];
  /** The HTTP request the SDK made for it. */
  http: string;
  /** What the call returns, in one line. */
  returns: string;
  ok: boolean;
  status: number | null;
  ms: number;
  /** "live" when the API was called; "fixture" when a stored response was served. */
  mode: "live" | "fixture";
  /** For fixtures: how the stored response was obtained. */
  provenance?: string;
  /** The response, trimmed for display. */
  response: unknown;
  at: string;
}

/** Shorten a JSON value for display: long arrays, deep objects, long strings. */
export function trimForDisplay(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") {
    if (typeof value === "string" && value.length > 140) return value.slice(0, 137) + "…";
    return value;
  }
  if (Array.isArray(value)) {
    const head = value.slice(0, 3).map((v) => trimForDisplay(v, depth + 1));
    return value.length > 3 ? [...head, `… ${value.length - 3} more`] : head;
  }
  if (depth >= 4) return "{…}";
  const entries = Object.entries(value as Record<string, unknown>);
  const keep = entries.slice(0, 14).map(([k, v]) => [k, trimForDisplay(v, depth + 1)] as const);
  const out: Record<string, unknown> = Object.fromEntries(keep);
  if (entries.length > 14) out["…"] = `${entries.length - 14} more keys`;
  return out;
}
