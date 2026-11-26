/**
 * Edge middleware: protects the ops surfaces (`/management/**`,
 * `/eventmanagement/**`, `/club-management/**`) behind a session, redirects
 * legacy URLs, and pins `/oval` to the current service date.
 */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { getOvalServiceDate } from "@/lib/oval-date";
import {
  requiredPasswordDestination,
  restrictedPanelDestination,
} from "@/lib/panel-access";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;
  if (pathname === "/clubsignup") return NextResponse.next();

  const isPanel =
    pathname.startsWith("/management") ||
    pathname.startsWith("/eventmanagement") ||
    pathname.startsWith("/club-management");
  const isLogin = pathname.startsWith("/management/login");

  // 1) Panel protection (mirrors the old `authorized` callback). The login page
  //    stays open so the team can actually get in.
  if (isPanel && !isLogin && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/management/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const passwordDestination = isLoggedIn
    ? requiredPasswordDestination(req.auth?.user?.mustChangePassword, pathname)
    : null;
  if (passwordDestination) {
    const url = req.nextUrl.clone();
    url.pathname = passwordDestination;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Narrowly scoped roles get exactly one panel destination. Server-side role
  // guards remain authoritative for direct actions and API requests.
  const restrictedDestination =
    isPanel && !isLogin && pathname !== "/management/change-password"
      ? restrictedPanelDestination(role, req.auth?.user?.clubId, pathname)
      : null;
  if (restrictedDestination) {
    const url = req.nextUrl.clone();
    url.pathname = restrictedDestination;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isPanel) return NextResponse.next();

  if (pathname === "/coming-soon") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url, 308);
  }

  const legacyYear = searchParams.get("year");
  if (
    legacyYear &&
    /^\d{4}$/.test(legacyYear) &&
    (pathname === "/sports" || pathname === "/sports/calendar")
  ) {
    const url = req.nextUrl.clone();
    url.pathname =
      pathname === "/sports"
        ? `/sports/year/${legacyYear}`
        : `/sports/calendar/${legacyYear}`;
    url.searchParams.delete("year");
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/oval") {
    return NextResponse.rewrite(
      new URL(`/oval/${getOvalServiceDate()}`, req.nextUrl),
    );
  }

  return NextResponse.next();
});

export const config = {
  // Run on every page route. Skip API routes, Next internals (starting with _),
  // and any request for a file with an extension (favicon.ico, /icon.png, etc).
  matcher: ["/((?!api|_|.*\\.).*)"],
};
