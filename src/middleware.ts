/**
 * Edge middleware — two jobs:
 *
 * 1. Protect the ops surfaces (`/management/**`, `/eventmanagement/**`) behind a
 *    session, using the edge-safe auth config (no bcrypt/db).
 * 2. "Coming soon" gate: while enabled, anyone hitting the public domain sees
 *    ONLY /coming-soon. The real site stays reachable for:
 *      - logged-in team members (any role — a valid session unlocks everything),
 *      - anyone with the shareable preview link (`?preview=<SITE_PREVIEW_KEY>`,
 *        which drops an unlock cookie for stakeholders without accounts).
 *
 * Toggle the gate off (reveal the site to the world) by setting COMING_SOON=off
 * in the environment — no code change or redeploy of source needed.
 */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Gate is ON by default; only the literal "off" reveals the site to everyone.
const GATE_ON = process.env.COMING_SOON !== "off";
// Optional secret preview key for sharing the real site with people who can't
// log in. Unset (empty) → no preview-link bypass exists.
const PREVIEW_KEY = process.env.SITE_PREVIEW_KEY;
const PREVIEW_COOKIE = "sc_preview";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  const isPanel =
    pathname.startsWith("/management") ||
    pathname.startsWith("/eventmanagement");
  const isLogin = pathname.startsWith("/management/login");

  // 1) Panel protection (mirrors the old `authorized` callback). The login page
  //    stays open so the team can actually get in.
  if (isPanel && !isLogin && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/management/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Panels and the teaser page itself are always reachable.
  if (isPanel || pathname === "/coming-soon") return NextResponse.next();

  // 2) Coming-soon gate for the public surface.
  if (!GATE_ON) return NextResponse.next();

  // A) Preview key present in the URL → set the unlock cookie, then continue on
  //    a clean URL (strip the key so it isn't left lying around).
  if (PREVIEW_KEY && searchParams.get("preview") === PREVIEW_KEY) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("preview");
    const res = NextResponse.redirect(url);
    res.cookies.set(PREVIEW_COOKIE, PREVIEW_KEY, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  // B) Unlocked visitors: logged-in team OR holders of a valid preview cookie.
  const hasPreviewCookie =
    !!PREVIEW_KEY && req.cookies.get(PREVIEW_COOKIE)?.value === PREVIEW_KEY;
  if (isLoggedIn || hasPreviewCookie) return NextResponse.next();

  // Everyone else visiting the domain → the teaser.
  const url = req.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.rewrite(url);
});

export const config = {
  // Run on every page route. Skip API routes, Next internals, and any request
  // for a file with an extension (favicon.ico, /icon.png, /brand/*.png, …).
  matcher: ["/((?!api|_next/static|_next/image|.*\\.).*)"],
};
