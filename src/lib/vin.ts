/**
 * VIN checks that run as the person types, before any API call.
 * The check digit (position 9) is required on North American VINs; on
 * others it can legitimately fail, so a mismatch is a warning, not a stop.
 */

const VALUES: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Uppercase and drop spaces and dashes, as people paste them. */
export function normalizeVin(raw: string) {
  return raw.toUpperCase().replace(/[\s-]/g, "").slice(0, 17);
}

export function expectedCheckDigit(vin: string): string | null {
  if (vin.length !== 17) return null;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const v = /\d/.test(c) ? Number(c) : VALUES[c];
    if (v === undefined) return null;
    sum += v * WEIGHTS[i];
  }
  const r = sum % 11;
  return r === 10 ? "X" : String(r);
}

export type VinCheck =
  | { state: "empty" }
  | { state: "typing"; remaining: number }
  | { state: "invalid"; message: string }
  | { state: "check-mismatch"; message: string }
  | { state: "ok"; message: string };

export function checkVin(vin: string): VinCheck {
  if (!vin) return { state: "empty" };
  const bad = vin.match(/[IOQ]/);
  if (bad) {
    const hint = bad[0] === "I" ? "1" : "0";
    return { state: "invalid", message: `VINs never use the letter ${bad[0]}. It's probably the number ${hint}.` };
  }
  if (/[^A-HJ-NPR-Z0-9]/.test(vin)) return { state: "invalid", message: "Only letters and numbers." };
  if (vin.length < 17) return { state: "typing", remaining: 17 - vin.length };
  const expected = expectedCheckDigit(vin);
  if (expected && expected !== vin[8]) {
    return {
      state: "check-mismatch",
      message: `The 9th character should be ${expected} for this VIN. Check for a mistyped character.`,
    };
  }
  return { state: "ok", message: "17 characters, check digit matches." };
}
