/** Target validation and shared collector budgets. */
import fs from "node:fs";
import path from "node:path";
import { targetInputSchema } from "./types.ts";
import type { TargetConfiguration } from "./types.ts";
/** Existing collector defaults shared by provisioning and Playwright contexts. */
export const defaultTimeouts = {
  action: 30_000,
  interactive: 300_000,
  regional: 600_000,
  upload: 240_000,
};
/** Standard desktop dimensions used for fixture setup and evidence collection. */
export const defaultViewport = { height: 720, width: 1280 };
/** Unauthenticated local UI origin supported by preflight. */
export const defaultBaseURL = "http://localhost:3000";
/** Derived budgets include the existing fixed allowance for UI transitions. */
export const setupBudget = (timeouts = defaultTimeouts) =>
  Math.max(1_800_000, timeouts.upload * 5 + timeouts.regional + 90_000);
/** Per-test interactive budget with the existing transition allowance. */
export const collectionBudget = (timeouts = defaultTimeouts) =>
  Math.max(120_000, timeouts.interactive + 90_000);
/** Repository directory used to locate maintained fixtures and manifests. */
export const root = path.resolve(import.meta.dirname, "..");
/** Reject credentials and paths before normalizing a UI origin. */
const origin = (value: string, label: string) => {
  const parsedURL = new URL(value);
  if (
    !["http:", "https:"].includes(parsedURL.protocol) ||
    parsedURL.username ||
    parsedURL.password ||
    parsedURL.pathname !== "/" ||
    parsedURL.search ||
    parsedURL.hash
  ) {
    throw Error(`${label} must be an HTTP(S) origin without credentials or a path`);
  }
  return parsedURL.origin;
};
/** Validate untrusted target input and normalize local paths and origins. */
export function configuration(input: unknown = {}, directory = root): TargetConfiguration {
  const parsed = targetInputSchema.safeParse(input);
  if (!parsed.success)
    throw Error(`Invalid target configuration or timeout: ${parsed.error.message}`);
  const targetInput = parsed.data;
  const baseURL = origin(targetInput.baseURL ?? defaultBaseURL, "baseURL");
  const local = baseURL === "http://localhost:3000" && !targetInput.storageState;
  if (!local && !targetInput.backendURL) {
    throw Error("Remote/authenticated targets require backendURL");
  }
  const backend = new URL(targetInput.backendURL ?? "http://localhost:7070/api");
  if (
    !["http:", "https:"].includes(backend.protocol) ||
    backend.username ||
    backend.password ||
    backend.search ||
    backend.hash
  ) {
    throw Error("Invalid backendURL");
  }
  let storageState;
  if (targetInput.storageState) {
    storageState = path.resolve(directory, targetInput.storageState);
    const state = JSON.parse(fs.readFileSync(storageState, "utf8"));
    if (!Array.isArray(state.cookies) || !Array.isArray(state.origins)) {
      throw Error("Invalid Playwright storage state");
    }
  }
  const timeouts = {
    ...defaultTimeouts,
    ...targetInput.timeouts,
  };
  for (const [key, value] of Object.entries(timeouts)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw Error(`Invalid ${key} timeout`);
  }
  if (typeof targetInput.disposable !== "boolean" || !targetInput.disposable) {
    throw Error("Explicit disposable: true target configuration is required");
  }
  const workerVersion = targetInput.workerVersion ?? "v7.6";
  if (!/^v\d+\.\d+(?:\.\d+)?$/.test(workerVersion)) {
    throw Error("Invalid workerVersion");
  }
  return {
    ...targetInput,
    backendURL: backend.href.replace(/\/$/, ""),
    baseURL,
    disposable: true,
    local,
    storageState,
    timeouts,
    trace: targetInput.trace === true,
    workerVersion,
  };
}
/** Load and validate a target file relative to its own directory. */
export function loadConfiguration(file: string) {
  const configurationPath = path.resolve(file);
  return configuration(
    JSON.parse(fs.readFileSync(configurationPath, "utf8")),
    path.dirname(configurationPath),
  );
}
/** Maintained small-area analysis settings shared by provisioning. */
export const fixtureSettings = JSON.parse(
  fs.readFileSync(path.join(root, "audit/fixture-manifest.json"), "utf8"),
).settings;
