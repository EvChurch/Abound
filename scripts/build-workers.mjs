import { build } from "esbuild";

await build({
  entryPoints: [
    "scripts/worker.ts",
    "scripts/sync-worker.ts",
    "scripts/communication-automation-worker.ts",
  ],
  bundle: true,
  packages: "external",
  platform: "node",
  target: "node22",
  format: "esm",
  outdir: "dist/workers",
  outExtension: { ".js": ".mjs" },
  sourcemap: true,
});
