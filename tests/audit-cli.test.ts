/** Characterize collector CLI parsing without launching a browser or reserving evidence. */
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { parseAuditArguments } from "../scripts/audit.ts";

test("collector options resolve an explicit target and retain the recovery path", () => {
  assert.deepEqual(parseAuditArguments(["--config", "audit/target.local.json"]), {
    config: path.resolve("audit/target.local.json"),
    cleanup: undefined,
  });
  assert.deepEqual(parseAuditArguments(["--cleanup", "recovery.json", "--config=target.json"]), {
    config: path.resolve("target.json"),
    cleanup: "recovery.json",
  });
});

test("collector CLI rejects absent targets, unknown flags, positionals, and missing values", () => {
  for (const args of [
    [],
    ["--cleanup", "recovery.json"],
    ["--config", ""],
    ["--config"],
    ["--config", "--cleanup"],
    ["--config=target.json", "--cleanup"],
    ["--config=target.json", "--unknown"],
    ["--config=target.json", "extra"],
  ]) {
    assert.throws(() => parseAuditArguments(args));
  }
});
