/** Explicit review, publication, and evidence-restoration CLI; collection invokes none of these commands. */
import { ReviewWorkflow } from "../audit/review.ts";
import { restoreEvidence } from "../audit/evidence.ts";
const [command, id, ...extra] = process.argv.slice(2);
try {
  if (!id || extra.length > 0 || !["prepare", "release", "evidence"].includes(command)) {
    throw Error("Use audit:prepare, audit:release, or audit:evidence with YYYY-MM-DD.N");
  }
  if (command === "evidence") {
    await restoreEvidence(id);
    console.log("Local evidence restored and verified");
  } else if (command === "prepare") {
    console.log(await new ReviewWorkflow().prepare(id));
  } else {
    console.log(await new ReviewWorkflow().release(id));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && "stderr" in error && error.stderr) {
    console.error(String(error.stderr));
  }
  process.exitCode = 1;
}
