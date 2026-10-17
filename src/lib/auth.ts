import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";

/**
 * The secret that signs sessions.
 *
 * - Set BETTER_AUTH_SECRET and it is used, always.
 * - In development, and while `next build` runs (it signs nothing), a
 *   missing secret falls back to DEV_SECRET, so a fresh clone runs and builds.
 * - In a production server a missing secret stops the app, and the
 *   development placeholder from .env.example logs a warning on every start.
 */
export const DEV_SECRET = "larkspur-dev-only-secret-replace-before-deploying";

function authSecret(): string {
  const set = process.env.BETTER_AUTH_SECRET?.trim();
  const production = process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";
  if (set) {
    if (production && set === DEV_SECRET) {
      console.warn("[larkspur] BETTER_AUTH_SECRET is the development placeholder. Replace it before deploying.");
    }
    return set;
  }
  if (!production) return DEV_SECRET;
  throw new Error("[larkspur] BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.");
}

/**
 * better-auth: email and password, database sessions in SQLite.
 * `role` is a user field the sign-up form cannot set (input: false), so
 * anyone who signs up is a customer. The seed makes the appraiser and the
 * desk manager; promote staff by hand (see README).
 */
export const auth = betterAuth({
  appName: "Larkspur Motors",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3022",
  secret: authSecret(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
