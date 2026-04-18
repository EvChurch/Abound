import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

export const auth0 = new Auth0Client({
  async onCallback(error, ctx) {
    const appBaseUrl = ctx.appBaseUrl ?? process.env.APP_BASE_URL;

    if (error) {
      const errorUrl = new URL("/auth/error", appBaseUrl);
      errorUrl.searchParams.set("reason", error.name);
      return NextResponse.redirect(errorUrl);
    }

    return NextResponse.redirect(new URL(ctx.returnTo ?? "/", appBaseUrl));
  },
});
