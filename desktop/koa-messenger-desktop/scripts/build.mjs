import { renameSync } from "node:fs";
import path from "node:path";

const dist = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "dist");

for (const file of ["main.js", "preload.js"]) {
  const src = path.join(dist, file);
  const dst = path.join(dist, file.replace(".js", ".cjs"));
  renameSync(src, dst);
}
