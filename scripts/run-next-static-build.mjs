import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const result = spawnSync(process.execPath, [nextBin, "build"], {
  env: {
    ...process.env,
    NEXT_OUTPUT_MODE: "export",
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

for (let index = 1; index <= 4; index += 1) {
  fs.rmSync(path.join(process.cwd(), "out", "images", "property", `hero-${index}.jpg`), { force: true });
}

const verifyScript = path.join(process.cwd(), "scripts", "verify-static-export.mjs");
const verifyResult = spawnSync(process.execPath, [verifyScript], {
  stdio: "inherit",
});

if (verifyResult.error) {
  throw verifyResult.error;
}

process.exit(verifyResult.status ?? 1);
