import "server-only";
import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Walk-around photos live on disk, one file per slot: PHOTOS_DIR/{appraisalId}/{slot}.jpg */
const ROOT = resolve(process.env.PHOTOS_DIR ?? "data/photos");

const safe = (s: string) => /^[a-z0-9-]+$/i.test(s);

export async function savePhoto(appraisalId: string, slot: string, bytes: Uint8Array) {
  if (!safe(appraisalId) || !safe(slot)) throw new Error("bad path");
  const dir = join(ROOT, appraisalId);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${slot}.jpg`);
  await writeFile(file, bytes);
  return file;
}

export async function readPhoto(appraisalId: string, slot: string) {
  if (!safe(appraisalId) || !safe(slot)) return null;
  return readFile(join(ROOT, appraisalId, `${slot}.jpg`)).catch(() => null);
}
