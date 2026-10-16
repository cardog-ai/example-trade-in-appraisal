import { NextResponse, type NextRequest } from "next/server";

/**
 * A fast cookie check in front of the signed-in routes. It only says
 * whether better-auth's session cookie exists; every page and route still
 * verifies the session and the role itself (lib/session.ts).
 */
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

export function middleware(req: NextRequest) {
  if (!SESSION_COOKIES.some((name) => req.cookies.has(name))) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/trade/:path*", "/lot/:path*", "/desk/:path*"],
};
