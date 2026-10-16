import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { getAppraisal, photoFor } from "@/lib/appraisals";
import { savePhoto } from "@/lib/photos";
import { getViewer } from "@/lib/session";
import { PHOTO_SLOTS } from "@/lib/trade-file";
import { eq } from "drizzle-orm";

/** POST /api/appraisals/{id}/photos (multipart: slot, file). Staff only, while the car is on the lot. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getViewer();
  if (!me || me.role === "customer") return NextResponse.json({ error: "Staff only." }, { status: 403 });
  const { id } = await params;
  const a = getAppraisal(id);
  if (!a || a.status !== "walking") return NextResponse.json({ error: "Not on the lot." }, { status: 409 });

  const form = await req.formData();
  const slot = String(form.get("slot") ?? "");
  const file = form.get("file");
  if (!PHOTO_SLOTS.some((s) => s.id === slot)) return NextResponse.json({ error: "Unknown slot." }, { status: 400 });
  if (!(file instanceof Blob) || file.size === 0 || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "One image, up to 8 MB." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = await savePhoto(id, slot, bytes);

  const existing = photoFor(id, slot);
  if (existing) {
    db.update(schema.photo)
      .set({ file: path, bytes: bytes.length, updatedAt: new Date() })
      .where(eq(schema.photo.id, existing.id))
      .run();
  } else {
    db.insert(schema.photo).values({ id: crypto.randomUUID(), appraisalId: id, slot, file: path, bytes: bytes.length }).run();
  }
  return NextResponse.json({ ok: true });
}
