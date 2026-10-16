/**
 * The database: better-auth's four tables, then the store's three.
 *
 * SQLite through Drizzle, so the app clones and runs with no server to set
 * up. `pnpm db:generate` writes a migration after a change here;
 * `pnpm db:setup` applies migrations and seeds the review logins.
 */
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { CallRecord } from "@/lib/calls";
import type { Checklist, Comps, TradeFacts } from "@/lib/trade-file";
import type { Condition, DeskInputs } from "@/lib/valuation";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
};

// ── better-auth ───────────────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  /** "customer", "appraiser" or "desk". Set by the seed or by hand, never by sign-up. */
  role: text("role").notNull().default("customer"),
  ...timestamps,
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps,
});

// ── Larkspur ──────────────────────────────────────────────────────────────

export const STATUSES = ["booked", "walking", "desk", "offered", "accepted", "declined"] as const;
export type Status = (typeof STATUSES)[number];

/**
 * One trade-in. A customer books it from the website estimate (`booked`),
 * or an appraiser starts a walk-in (`walking`). The walk-around sends it to
 * the desk (`desk`), the desk sets the offer (`offered`), and the customer
 * accepts or declines it.
 *
 * `facts` is what Cardog returned, boiled down (lib/trade-file.ts); `comps`
 * is the comparable-listings read the desk works from; `calls` holds the
 * SDK call records behind each read, so the developer pane can replay them.
 */
export const appraisal = sqliteTable(
  "appraisal",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull().unique(),
    customerId: text("customer_id").references(() => user.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    vin: text("vin").notNull(),
    year: integer("year"),
    make: text("make"),
    model: text("model"),
    trim: text("trim"),
    status: text("status", { enum: STATUSES }).notNull(),
    /** What the customer told the website. */
    declaredKm: integer("declared_km").notNull(),
    declaredCondition: text("declared_condition").$type<Condition>().notNull(),
    estimateLow: integer("estimate_low"),
    estimateHigh: integer("estimate_high"),
    facts: text("facts", { mode: "json" }).$type<TradeFacts>().notNull(),
    comps: text("comps", { mode: "json" }).$type<Comps | null>(),
    marketReadAt: integer("market_read_at", { mode: "timestamp_ms" }).notNull(),
    calls: text("calls", { mode: "json" }).$type<Record<string, CallRecord[]>>().notNull(),
    /** What the appraiser found on the lot. */
    odometerKm: integer("odometer_km"),
    checklist: text("checklist", { mode: "json" }).$type<Checklist>().notNull(),
    lotNote: text("lot_note"),
    appraiserId: text("appraiser_id").references(() => user.id, { onDelete: "set null" }),
    walkedAt: integer("walked_at", { mode: "timestamp_ms" }),
    /** What the desk decided. */
    desk: text("desk", { mode: "json" }).$type<DeskInputs | null>(),
    offer: integer("offer"),
    offerNote: text("offer_note"),
    offeredBy: text("offered_by").references(() => user.id, { onDelete: "set null" }),
    offeredAt: integer("offered_at", { mode: "timestamp_ms" }),
    respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("appraisal_status_idx").on(t.status), index("appraisal_customer_idx").on(t.customerId)]
);

/** Who did what, when: the appraisal's history, oldest first. */
export const appraisalEvent = sqliteTable(
  "appraisal_event",
  {
    id: text("id").primaryKey(),
    appraisalId: text("appraisal_id")
      .notNull()
      .references(() => appraisal.id, { onDelete: "cascade" }),
    at: integer("at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    actorId: text("actor_id"),
    actorName: text("actor_name").notNull(),
    kind: text("kind").notNull(),
    summary: text("summary").notNull(),
  },
  (t) => [index("event_appraisal_idx").on(t.appraisalId)]
);

/** One photo per slot per appraisal. The file is on disk under PHOTOS_DIR. */
export const photo = sqliteTable(
  "photo",
  {
    id: text("id").primaryKey(),
    appraisalId: text("appraisal_id")
      .notNull()
      .references(() => appraisal.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
    file: text("file").notNull(),
    bytes: integer("bytes").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("photo_slot_idx").on(t.appraisalId, t.slot)]
);

export type AppraisalRow = typeof appraisal.$inferSelect;
export type EventRow = typeof appraisalEvent.$inferSelect;
export type PhotoRow = typeof photo.$inferSelect;
