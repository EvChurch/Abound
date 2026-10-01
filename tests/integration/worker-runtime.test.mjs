import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

// Keep fixtures under the repository so the real supervisor resolves dotenv.
async function runSupervisor({ unexpectedExit = false } = {}) {
  const directory = await mkdtemp(join(process.cwd(), "tmp/worker-runtime-"));
  let child;
  let timer;
  try {
    await copyFile("dist/workers/worker.mjs", join(directory, "worker.mjs"));
    for (const entry of ["sync-worker", "communication-automation-worker"]) {
      await writeFile(
        join(directory, `${entry}.mjs`),
        `
        console.log('ready:${entry}');
        process.on('SIGTERM', () => {
          console.log('stopped:${entry}');
          process.exit(0);
        });
        setInterval(() => {}, 1000);
        ${unexpectedExit && entry === "sync-worker" ? "setTimeout(() => process.exit(0), 500);" : ""}
        `,
      );
    }
    child = spawn(process.execPath, [join(directory, "worker.mjs")], {
      detached: true,
      env: { PATH: process.env.PATH, DOTENV_CONFIG_PATH: "/dev/null" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let signalled = false;
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (
        !unexpectedExit &&
        !signalled &&
        output.includes("ready:sync-worker") &&
        output.includes("ready:communication-automation-worker")
      ) {
        signalled = true;
        child.kill("SIGTERM");
      }
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    timer = setTimeout(() => killProcessGroup(child), 10000);
    const [code, signal] = await once(child, "close");
    assert.equal(signal, null, output);
    assert.equal(code, unexpectedExit ? 1 : 0, output);
    assert.match(output, /ready:sync-worker/);
    assert.match(output, /ready:communication-automation-worker/);
    assert.match(output, /stopped:communication-automation-worker/);
    if (!unexpectedExit) assert.match(output, /stopped:sync-worker/);
  } finally {
    clearTimeout(timer);
    if (child) killProcessGroup(child);
    await rm(directory, { recursive: true, force: true });
  }
}

function killProcessGroup(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

test("compiled supervisor starts both workers and forwards shutdown", () =>
  runSupervisor());

test("unexpected successful child exit stops its sibling and fails the service", () =>
  runSupervisor({ unexpectedExit: true }));
