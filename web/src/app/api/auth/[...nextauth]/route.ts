import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

// Next.js strips its app-level basePath ("/feed") from request.url before
// calling the route handler, but Auth.js's configured basePath is
// "/feed/api/auth" — both inbound action parsing and outbound OAuth callback
// URL generation depend on the full path. Re-prepend "/feed" so the two ends
// agree. (Same workaround as the vpn-monitor portal.)
function withBasePath(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/feed")) {
      url.pathname = "/feed" + url.pathname;
    }
    const init: RequestInit & { duplex?: string } = {
      method: req.method,
      headers: req.headers,
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req.body;
      init.duplex = "half";
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proxied = new NextRequest(url, init as any);
    return handler(proxied);
  };
}

export const GET = withBasePath(handlers.GET);
export const POST = withBasePath(handlers.POST);
