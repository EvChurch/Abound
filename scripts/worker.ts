import "dotenv/config";

import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";

type WorkerSpec = {
  entry: string;
  name: string;
};

const workers: WorkerSpec[] = [
  { entry: "sync-worker", name: "sync" },
  {
    entry: "communication-automation-worker",
    name: "communications",
  },
];

const compiled = process.argv[1].endsWith(".mjs");
const children = workers.map(startWorker);
let shuttingDown = false;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    shutdown(signal);
  });
}

function startWorker(worker: WorkerSpec) {
  const command = compiled ? process.execPath : "tsx";
  const args = [
    compiled
      ? join(dirname(process.argv[1]), `${worker.entry}.mjs`)
      : `scripts/${worker.entry}.ts`,
  ];
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  pipeOutput(child, worker.name, "stdout");
  pipeOutput(child, worker.name, "stderr");

  child.on("error", (error) => {
    console.error(`${worker.name} worker could not start: ${error.message}`);
    shutdown("SIGTERM");
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.error(
      `${worker.name} worker exited unexpectedly with ${formatExit(code, signal)}.`,
    );
    shutdown("SIGTERM");
    process.exitCode = code || 1;
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
