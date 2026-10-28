import { rename } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const releaseDir = path.join(appDir, "release");
const { version } = JSON.parse(
  await readFile(path.join(appDir, "package.json"), "utf8"),
);

await rename(
  path.join(releaseDir, `FrameCapture-Setup-${version}.exe`),
  path.join(releaseDir, `FrameCapture-Portable-${version}.exe`),
);
