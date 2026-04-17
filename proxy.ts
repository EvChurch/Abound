import type { NextRequest } from "next/server";

import { auth0 } from "@/lib/auth/auth0";

export async function proxy(request: NextRequest) {
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Auth0 v4 mounts auth routes through request middleware. Keep the proxy
     * broad, while excluding static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
