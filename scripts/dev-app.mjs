#!/usr/bin/env node
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE_PORT = Number(process.env.DEV_PORT ?? 3001);
const MAX_PORT = BASE_PORT + 20;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = path.join(ROOT, "artifacts/marketing-persona-app");

function pidsOnPort(port) {
  try {
    return execSync(`lsof -ti:${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function killPids(pids) {
  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGKILL");
    } catch {
      /* already gone */
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolvePort() {
  let occupants = pidsOnPort(BASE_PORT);

  if (occupants.length > 1) {
    console.log(`Port ${BASE_PORT}: ${occupants.length} processes — stopping all…`);
    killPids(occupants);
    await sleep(300);
    occupants = pidsOnPort(BASE_PORT);
  }

  if (occupants.length === 0) return BASE_PORT;

  for (let port = BASE_PORT + 1; port <= MAX_PORT; port++) {
    if (pidsOnPort(port).length === 0) {
      console.log(`Port ${BASE_PORT} in use — starting on http://localhost:${port}`);
      return port;
    }
  }

  throw new Error(`No free port between ${BASE_PORT} and ${MAX_PORT}`);
}

const port = await resolvePort();
const url = `http://localhost:${port}`;

if (port === BASE_PORT) {
  console.log(`Starting dev server at ${url}`);
}

const child = spawn("pnpm", ["exec", "next", "dev", "--port", String(port)], {
  cwd: APP_DIR,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(port),
    NEXTAUTH_URL: url,
  },
});

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
