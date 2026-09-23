// All of Frank's settings come from the environment (ADR-001). Nothing else in
// src/ reads process.env, so this file is the complete list.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// <package root> is server/ locally and /app in the image; src/ and dist/ both
// sit one level below it.
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const pkg = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
  version: string;
};

export interface Config {
  port: number;
  version: string;
  // Where the console's static build lives, or null when there is none yet
  // (the console is optional, ADR-003).
  publicDir: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got "${env.PORT}"`);
  }
  const publicDir = resolve(packageRoot, "public");
  return {
    port,
    version: pkg.version,
    publicDir: existsSync(resolve(publicDir, "index.html")) ? publicDir : null,
  };
}
