import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/main.ts", "src/preload.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "cjs",
  outExtension: { ".js": ".cjs" },
  target: "node20",
  external: ["electron"],
  sourcemap: true,
  logLevel: "info",
});
