import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const base = "http://127.0.0.1:3111";
const child = spawn("pnpm", ["start"], {
  detached: true,
  stdio: "ignore",
  env: {
    ...process.env,
    PORT: "3111",
    DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused_test",
    AUTH0_DOMAIN: "example.us.auth0.com",
    AUTH0_CLIENT_ID: "ci-placeholder",
    AUTH0_CLIENT_SECRET: "ci-placeholder",
    AUTH0_SECRET: "0".repeat(64),
    APP_BASE_URL: base,
  },
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    assert.equal(child.exitCode, null, "production server exited early");
    try {
      const response = await fetch(base, {
        redirect: "manual",
        signal: AbortSignal.timeout(1_000),
      });
      ready =
        response.status === 307 &&
        new URL(response.headers.get("location"), base).pathname ===
          "/auth/login";
      await response.body?.cancel();
      if (ready) break;
    } catch {}
    await delay(500);
  }
  assert.ok(ready, "production image should serve the anonymous login guard");
  const error = await fetch(`${base}/auth/error?reason=fixture`);
  assert.equal(error.status, 200);
  const html = await error.text();
  assert.match(html, /Sign in could not be completed/);
  const assetPath = html.match(
    /(?:src|href)="([^"?]*\/_next\/static\/[^"?]+\.js)(?:\?[^" ]*)?"/,
  )?.[1];
  assert.ok(assetPath, "production error page should include static assets");
  const asset = await fetch(new URL(assetPath, base));
  assert.equal(asset.status, 200);
  assert.ok((await asset.text()).length > 0);
  console.log(
    "PASS: actual production start command, anonymous access guard, auth error page and static asset",
  );
} finally {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
}
