import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

const path = process.env.DATABASE_PATH ?? "data/larkspur.db";

function open() {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

// One connection per server process, kept across dev hot reloads.
const g = globalThis as unknown as { __larkspurDb?: ReturnType<typeof open> };
export const db = g.__larkspurDb ?? (g.__larkspurDb = open());
export { schema };
