import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const assets = [
  {
    name: "ffmpeg-win32-x64.gz",
    url: "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64.gz",
    sha256: "8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77",
    output: "ffmpeg.exe",
    transform: (bytes) => gunzipSync(bytes),
  },
  {
    name: "win32-x64.LICENSE",
    url: "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/win32-x64.LICENSE",
    sha256: "8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903",
    output: "FFmpeg-LICENSE.txt",
    transform: (bytes) => bytes,
  },
  {
    name: "win32-x64.README",
    url: "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/win32-x64.README",
    sha256: "a636a7183c58006351acbaf35303c0ed85c6e1320fd4e80de453ba6157de6311",
    output: "FFmpeg-BUILD-INFO.txt",
    transform: (bytes) => bytes,
  },
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(scriptDir, "../generated-artifacts");

await mkdir(outputDir, { recursive: true });

for (const asset of assets) {
  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(`Could not download ${asset.name}: HTTP ${response.status}`);
  }

  const archive = Buffer.from(await response.arrayBuffer());
  const actualHash = createHash("sha256").update(archive).digest("hex");
  if (actualHash !== asset.sha256) {
    throw new Error(`SHA-256 verification failed for ${asset.name}.`);
  }

  const content = asset.transform(archive);
  if (asset.output === "ffmpeg.exe" && content.subarray(0, 2).toString() !== "MZ") {
    throw new Error("The downloaded FFmpeg file is not a Windows executable.");
  }

  await writeFile(path.join(outputDir, asset.output), content);
  console.info(`Verified and prepared ${asset.output}.`);
}
