import "dotenv/config";

import { spawn, type ChildProcess } from "node:child_process";

type WorkerSpec = {
  command: string;
  name: string;
};

const workers: WorkerSpec[] = [
  { command: "tsx scripts/sync-worker.ts", name: "sync" },
  {
    command: "tsx scripts/communication-automation-worker.ts",
    name: "communications",
  },
];

const children = workers.map(startWorker);
let shuttingDown = false;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    shutdown(signal);
  });
}

function startWorker(worker: WorkerSpec) {
  const child = spawn(worker.command, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  pipeOutput(child, worker.name, "stdout");
  pipeOutput(child, worker.name, "stderr");

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.error(
      `${worker.name} worker exited unexpectedly with ${formatExit(code, signal)}.`,
    );
    shutdown("SIGTERM");
    process.exitCode = code ?? 1;
  });

  return child;
}

function pipeOutput(
  child: ChildProcess,
  workerName: string,
  streamName: "stdout" | "stderr",
) {
  child[streamName]?.on("data", (chunk: Buffer) => {
    const output = chunk.toString();
    for (const line of output.split(/\r?\n/)) {
      if (line.trim()) {
        console[streamName === "stderr" ? "error" : "log"](
          `[${workerName}] ${line}`,
        );
      }
    }
  });
}

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function formatExit(code: number | null, signal: NodeJS.Signals | null) {
  if (signal) {
    return `signal ${signal}`;
  }

  return `code ${code ?? "unknown"}`;
}
