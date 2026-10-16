import { NextResponse } from "next/server";
import { HOME, getViewer } from "@/lib/session";

/** GET /home: each role's own screen, or sign-in. Where sign-in lands. */
export async function GET(req: Request) {
  const me = await getViewer();
  return NextResponse.redirect(new URL(me ? HOME[me.role] : "/sign-in", req.url));
}
