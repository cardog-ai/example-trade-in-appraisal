import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type Role = "customer" | "appraiser" | "desk";
export interface Viewer {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const ROLES: Role[] = ["customer", "appraiser", "desk"];

/** Where each role lands after signing in. */
export const HOME: Record<Role, string> = { customer: "/trade", appraiser: "/lot", desk: "/desk" };

/** The signed-in user, or null. */
export async function getViewer(): Promise<Viewer | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const raw = (s.user as { role?: string }).role as Role;
  const role = ROLES.includes(raw) ? raw : "customer";
  return { id: s.user.id, name: s.user.name, email: s.user.email, role };
}

/** The signed-in user; sends anyone else to sign in. */
export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/sign-in");
  return v;
}

/**
 * The signed-in user in one of these roles; anyone else goes to their own
 * home. The desk can open every screen the lot can (a desk manager walks
 * cars too).
 */
export async function requireRole(...roles: Role[]): Promise<Viewer> {
  const v = await requireViewer();
  if (!roles.includes(v.role)) redirect(HOME[v.role]);
  return v;
}
