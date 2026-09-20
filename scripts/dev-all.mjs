#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(rootDir, "backend");

const PG_PORT = 5433;
const BACKEND_PORT = 8000;
const DEFAULT_FRONTEND_PORT = 3005;

// Parse CLI flags: --port 3005, --no-turbo, etc.
const args = process.argv.slice(2);
let frontendPort = DEFAULT_FRONTEND_PORT;
const portArgIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
if (portArgIndex !== -1 && args[portArgIndex + 1]) {
  frontendPort = parseInt(args[portArgIndex + 1], 10) || DEFAULT_FRONTEND_PORT;
}

const spawnedChildren = [];

function log(prefix, msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] [${prefix}] ${msg}`);
}

function checkPortOpen(port, host = "localhost") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPort(port, maxAttempts = 20, intervalMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    const isOpen = await checkPortOpen(port);
    if (isOpen) return true;
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  return false;
}

async function ensurePostgresRunning() {
  const isRunning = await checkPortOpen(PG_PORT);
  if (isRunning) {
    log("db", `PostgreSQL 18 is already running on port ${PG_PORT}`);
    return;
  }

  log("db", `Starting PostgreSQL 18 on port ${PG_PORT}...`);

  const pgDataDir = "C:\\Users\\Pankaj\\.vibehouse_pgdata";
  const pidPath = path.join(pgDataDir, "postmaster.pid");
  if (fs.existsSync(pidPath)) {
    try {
      fs.unlinkSync(pidPath);
      log("db", "Cleaned up stale postmaster.pid file");
    } catch {
      // ignore
    }
  }

  const pgExe = "C:\\Program Files\\PostgreSQL\\18\\bin\\postgres.exe";
  if (!fs.existsSync(pgExe)) {
    log("db", `WARNING: Postgres executable not found at ${pgExe}. Make sure Postgres is running.`);
    return;
  }

  const pgProcess = spawn(pgExe, ["-D", pgDataDir], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  pgProcess.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (text.includes("ready to accept connections")) {
      log("db", "PostgreSQL database is ready to accept connections.");
    }
  });

  pgProcess.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text.includes("FATAL") || text.includes("PANIC")) {
      log("db-error", text);
    }
  });

  spawnedChildren.push({ name: "PostgreSQL", process: pgProcess });

  const isUp = await waitForPort(PG_PORT);
  if (isUp) {
    log("db", `PostgreSQL successfully verified on port ${PG_PORT}`);
  } else {
    log("db", `WARNING: Timed out waiting for port ${PG_PORT}, continuing...`);
  }
}

async function ensureBackendRunning() {
  const isRunning = await checkPortOpen(BACKEND_PORT);
  if (isRunning) {
    log("backend", `NestJS backend is already active on port ${BACKEND_PORT}`);
    return;
  }

  log("backend", `Starting NestJS API on http://localhost:${BACKEND_PORT}...`);

  const mainDist = path.join(backendDir, "dist", "src", "main.js");
  if (!fs.existsSync(mainDist)) {
    log("backend", "dist/src/main.js not found. Running nest build first...");
    const build = spawn("npm run build", { cwd: backendDir, stdio: "inherit", shell: true });
    await new Promise((res) => build.on("exit", res));
  }

  const backendProcess = spawn(
    "node -r dotenv/config dist/src/main.js",
    {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: String(BACKEND_PORT),
        DATABASE_URL: `postgresql://postgres@localhost:${PG_PORT}/vibehouse`,
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    },
  );

  backendProcess.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (text.includes("running on http://localhost") || text.includes("Nest application successfully started")) {
      log("backend", text);
    }
  });

  backendProcess.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      log("backend-err", text);
    }
  });

  spawnedChildren.push({ name: "NestJS Backend", process: backendProcess });

  const isUp = await waitForPort(BACKEND_PORT);
  if (isUp) {
    log("backend", `NestJS backend successfully running on http://localhost:${BACKEND_PORT}`);
  } else {
    log("backend", `WARNING: Timed out waiting for port ${BACKEND_PORT}`);
  }
}

async function startFrontend() {
  log("frontend", `Launching Next.js frontend on http://localhost:${frontendPort} (Turbopack)...`);

  const feCmd = `npx next dev -p ${frontendPort} --turbopack`;
  const feProcess = spawn(feCmd, {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(frontendPort),
      NEXT_PUBLIC_API_BASE_URL: `http://localhost:${BACKEND_PORT}`,
    },
    stdio: "inherit",
    shell: true,
  });

  spawnedChildren.push({ name: "Next.js Frontend", process: feProcess });

  feProcess.on("exit", (code) => {
    log("frontend", `Frontend process exited with code ${code}`);
    cleanupAndExit(code || 0);
  });
}

function cleanupAndExit(exitCode = 0) {
  log("supervisor", "Shutting down child processes...");
  for (const child of spawnedChildren) {
    try {
      if (child.process && !child.process.killed) {
        log("supervisor", `Terminating ${child.name}...`);
        child.process.kill();
      }
    } catch {
      // ignore
    }
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => cleanupAndExit(0));
process.on("SIGTERM", () => cleanupAndExit(0));
process.on("uncaughtException", (err) => {
  console.error("[supervisor] Uncaught exception:", err);
  cleanupAndExit(1);
});

async function main() {
  console.log("=================================================");
  console.log("  VIBEHOUSE UNIFIED DEVELOPMENT RUNNER");
  console.log("=================================================");
  await ensurePostgresRunning();
  await ensureBackendRunning();
  await startFrontend();
}

main().catch((err) => {
  console.error("[supervisor] Startup error:", err);
  cleanupAndExit(1);
});
