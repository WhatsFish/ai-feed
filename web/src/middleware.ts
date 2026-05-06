import { auth } from "@/lib/auth";

/**
 * Public-by-default. Only AI features (live calls to Foundry) are auth-gated:
 * - /api/interpret  — POST, hits Foundry, requires login
 *
 * Everything else (digest pages, /archive, /d/<date>, /api/auth/*) is open
 * so unauthenticated readers can browse the daily synthesis and switch
 * EN/中文 freely. The agent pre-generates both language versions.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const requiresAuth =
    pathname.startsWith("/api/interpret") || pathname.startsWith("/feed/api/interpret");

  if (!requiresAuth) return;

  if (!req.auth) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
