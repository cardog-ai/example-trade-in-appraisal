import { getAppraisal } from "@/lib/appraisals";
import { readPhoto } from "@/lib/photos";
import { getViewer } from "@/lib/session";

/** GET /api/appraisals/{id}/photos/{slot}: the photo, for staff and for the customer whose car it is. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; slot: string }> }) {
  const me = await getViewer();
  const { id, slot } = await params;
  const a = getAppraisal(id);
  if (!me || !a || (me.role === "customer" && a.customerId !== me.id)) return new Response("Not found", { status: 404 });
  const bytes = await readPhoto(id, slot);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=31536000, immutable" },
  });
}
