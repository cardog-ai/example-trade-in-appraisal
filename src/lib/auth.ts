import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";

/**
 * better-auth: email and password, database sessions in SQLite.
 * `role` is a user field the sign-up form cannot set (input: false), so
 * anyone who signs up is a customer. The seed makes the appraiser and the
 * desk manager; promote staff by hand (see README).
 */
export const auth = betterAuth({
  appName: "Larkspur Motors",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3022",
  // Without BETTER_AUTH_SECRET a fixed development secret is used, so the
  // app runs on a fresh clone. Set your own anywhere that is not your laptop.
  secret: process.env.BETTER_AUTH_SECRET ?? "larkspur-development-secret-change-me-0000",
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
