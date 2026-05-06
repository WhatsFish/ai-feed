import { auth } from "@/lib/auth";

export default auth((req) => {
  const isAuthed = !!req.auth;
  const { pathname } = req.nextUrl;

  // basePath /feed is preserved in pathname here; check both the bare paths
  // (so the middleware also works in dev or if basePath ever changes) and the
  // /feed-prefixed forms.
  const open =
    pathname === "/login" ||
    pathname === "/feed/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/feed/api/auth");
  if (open) return;

  if (!isAuthed) {
    const loginPath = pathname.startsWith("/feed") ? "/feed/login" : "/login";
    const url = new URL(loginPath, req.nextUrl.origin);
    url.searchParams.set("from", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
