import { renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath (not URL.pathname) so this resolves correctly on Windows,
// where `new URL(import.meta.url).pathname` yields an invalid "/C:/..." path.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

for (const file of ["main.js", "preload.js"]) {
  const src = path.join(dist, file);
  const dst = path.join(dist, file.replace(".js", ".cjs"));
  renameSync(src, dst);
}
