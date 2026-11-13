import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const url = process.env.SECURITY_TEST_DATABASE_URL;
assert.ok(url && url === process.env.DATABASE_URL);
const database = new URL(url);
assert.ok(database.pathname.endsWith("_test"));
assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const userId = "security-authenticated-serving-fixture";
const subject = "auth0|security-fixture";
const secret = "a".repeat(64);
let userCreated = false;
let child;
try {
  assert.equal(await prisma.appUser.count({ where: { id: userId } }), 0);
  await prisma.appUser.create({
    data: {
      id: userId,
      auth0Subject: subject,
      name: "Security Fixture",
      active: true,
    },
  });
  userCreated = true;
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  child = spawn("pnpm", ["start"], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: String(port),
      AUTH0_SECRET: secret,
      AUTH0_DOMAIN: "example.us.auth0.com",
      AUTH0_CLIENT_ID: "ci-placeholder",
      AUTH0_CLIENT_SECRET: "ci-placeholder",
      APP_BASE_URL: base,
    },
  });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    assert.equal(child.exitCode, null, "production server exited early");
    try {
      const r = await fetch(base, {
        redirect: "manual",
        signal: AbortSignal.timeout(1000),
      });
      ready = r.status === 307;
      await r.body?.cancel();
      if (ready) break;
    } catch {}
    await delay(500);
  }
  assert.ok(ready);
  const require = createRequire(import.meta.url);
  const sdk = require.resolve("@auth0/nextjs-auth0/server");
  const { encrypt } = await import(new URL("./cookies.js", `file://${sdk}`));
  const now = Math.floor(Date.now() / 1000);
  const token = await encrypt(
    {
      user: { sub: subject, name: "Security Fixture" },
      tokenSet: {
        accessToken: "synthetic-not-a-credential",
        expiresAt: now + 600,
        scope: "openid profile email",
      },
      internal: { sid: "security-fixture", createdAt: now },
    },
    secret,
    now + 600,
  );
  const read = async (cookie) => {
    const r = await fetch(base + "/api/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({
        query: "{ viewer { id name } }",
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(r.status, 200);
    return r.json();
  };
  assert.equal((await read()).errors[0].extensions.code, "UNAUTHENTICATED");
  const cookie = `__session=${token}`;
  const result = await read(cookie);
  assert.equal(result.errors, undefined);
  assert.equal(result.data.viewer.id, userId);
  const page = await fetch(base, {
    headers: { cookie },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(page.status, 200);
  assert.doesNotMatch(
    await page.text(),
    /Application error:|NEXT_HTTP_ERROR_FALLBACK;500/,
  );
  assert.equal(
    (await read(`__session=${token}x`)).errors[0].extensions.code,
    "UNAUTHENTICATED",
  );
  await prisma.appUser.update({
    where: { id: userId },
    data: { active: false },
  });
  assert.equal((await read(cookie)).errors[0].extensions.code, "FORBIDDEN");
  console.log(
    "PASS: production HTTP/session/Prisma viewer and dashboard read; unsigned/tampered sessions and inactive local user denied; only synthetic identity and loopback database used",
  );
} finally {
  if (child?.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
    await Promise.race([
      new Promise((resolve) => child.once("close", resolve)),
      delay(5000),
    ]);
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  }
  if (userCreated) await prisma.appUser.delete({ where: { id: userId } });
  assert.equal(await prisma.appUser.count({ where: { id: userId } }), 0);
  await prisma.$disconnect();
  console.log("PASS: isolated application user removed");
}
