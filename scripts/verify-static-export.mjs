import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const outDir = path.join(process.cwd(), "out");
const requiredFiles = [
  "index.html",
  "404.html",
  "property.html",
  "events.html",
  "rooms.html",
  path.join("bookings", "__static_shell__", "confirmed.html"),
  path.join("bookings", "__static_shell__", "web-check-in.html"),
  path.join("breakfast", "__static_shell__.html"),
  path.join("feedback", "__static_shell__.html"),
  path.join("__static_shell__", "guest.html"),
  path.join("__static_shell__", "guest", "services.html"),
  path.join("images", "property", "hero-1-768.avif"),
  path.join("images", "property", "hero-1-1600.webp"),
];

const missingFiles = requiredFiles.filter((relativePath) => !fs.existsSync(path.join(outDir, relativePath)));
if (missingFiles.length > 0) {
  console.error(`Static export is missing required files:\n${missingFiles.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

if (fs.existsSync(path.join(outDir, "api", "cx"))) {
  console.error("Static export unexpectedly contains the removed /api/cx runtime route.");
  process.exit(1);
}

for (const relativePath of [
  path.join("bookings", "__static_shell__", "confirmed.html"),
  path.join("bookings", "__static_shell__", "web-check-in.html"),
  path.join("breakfast", "__static_shell__.html"),
  path.join("feedback", "__static_shell__.html"),
  path.join("__static_shell__", "guest", "services.html"),
]) {
  const html = fs.readFileSync(path.join(outDir, relativePath), "utf8");
  if (!html.includes('name="robots" content="noindex, nofollow"')) {
    console.error(`${relativePath} is missing noindex, nofollow metadata.`);
    process.exit(1);
  }
}

console.log(`Static export verified (${requiredFiles.length} critical artifacts).`);
