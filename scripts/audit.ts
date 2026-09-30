/** Collect local evidence or recover owned resources; this CLI never prepares or publishes a review. */
import path from "node:path";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import { loadConfiguration, root } from "../audit/config.ts";
import { Ownership, cleanup } from "../audit/lifecycle.ts";
import { preflight } from "../audit/api.ts";
import { finalizeCollection } from "../audit/finalize.ts";
import { reserveCollection } from "../audit/bundles.ts";
import type { TargetConfiguration } from "../audit/types.ts";

/** Parse explicit target/recovery paths without starting a browser or creating a collection. */
export function parseAuditArguments(args: string[]) {
  const { values } = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: { config: { type: "string" }, cleanup: { type: "string" } },
  });
  if (!values.config)
    throw new Error(
      "Supply --config audit/target.local.json or another explicit disposable target",
    );
  if (values.config.startsWith("--") || values.cleanup?.startsWith("--")) {
    throw new Error("Missing option value");
  }
  return { config: path.resolve(values.config), cleanup: values.cleanup };
}

/** Recover only a manifest whose origins match the selected disposable target. */
async function recover(config: TargetConfiguration, file: string) {
  const ownership = Ownership.read(path.resolve(file));
  if (
    config.baseURL !== ownership.manifest.target?.baseURL ||
    config.backendURL !== ownership.manifest.target?.backendURL
  ) {
    throw new Error("Cleanup target differs from recovery manifest");
  }
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ storageState: config.storageState });
    const page = await context.newPage();
    await preflight(page, config);
    await cleanup(page, config, ownership, undefined, { recoverInterrupted: true });
  } finally {
    await browser.close();
  }
  console.log("Recovery cleanup completed");
}

/** Run the isolated collector process; interrupted or failed runs retain their recovery manifest. */
async function collect(configPath: string, config: TargetConfiguration) {
  const runDir = reserveCollection(root);
  const runId = `acr-${path.basename(runDir)}`;
  // Authentication is supplied to Playwright separately and never persisted with evidence.
  const { storageState: _storageState, ...target } = config;
  new Ownership(path.join(runDir, "recovery.json"), {
    cleanupComplete: false,
    resources: [],
    runId,
    target,
    version: 1,
  });
  console.log(`Run ${runId}; recovery manifest: ${path.join(runDir, "recovery.json")}`);
  const child = spawn(
    process.execPath,
    [path.join(root, "node_modules", "@playwright", "test", "cli.js"), "test"],
    {
      cwd: root,
      env: { ...process.env, ACR_RUN_DIR: runDir, ACR_TARGET_CONFIG: configPath },
      stdio: "inherit",
    },
  );
  const interrupt = () => child.kill("SIGINT");
  const terminate = () => child.kill("SIGTERM");
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", terminate);
  try {
    const exitCode = await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
    });
    if (exitCode !== 0)
      throw new Error(
        `Audit collection failed; existing evidence unchanged. Recovery manifest: ${path.join(runDir, "recovery.json")}`,
      );
    const latest = finalizeCollection(runDir);
    console.log(
      `Collected ${latest.states.length} states in ${latest.bundle}. Draft ${latest.collection} awaits review; repository reports unchanged.`,
    );
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", terminate);
  }
}

/** Dispatch explicit cleanup or collection after validating its target configuration. */
async function main() {
  const options = parseAuditArguments(process.argv.slice(2));
  const config = loadConfiguration(options.config);
  if (options.cleanup) await recover(config, options.cleanup);
  else await collect(options.config, config);
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
