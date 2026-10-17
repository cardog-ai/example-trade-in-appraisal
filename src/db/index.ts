import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

const path = process.env.DATABASE_PATH || "data/larkspur.db";

function open() {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
type Db = ReturnType<typeof open>;

// One connection per server process, kept across dev hot reloads, and opened
// on first use: `next build` imports this file from several workers at once
// and never queries it, so it should not open the file either.
const g = globalThis as unknown as { __larkspurDb?: Db };
const get = () => g.__larkspurDb ?? (g.__larkspurDb = open());
export const db = new Proxy({} as Db, {
  get: (_, key) => Reflect.get(get(), key),
});
export { schema };
