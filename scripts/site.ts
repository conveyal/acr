/** Build a dependency-free, links-only website from maintained reports and documents. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

/** Public repository used for immutable document links and published evidence. */
const repository = "https://github.com/conveyal/acr";
/** Served report formats; Markdown, YAML, JSON and raw evidence remain off the site. */
const assetPattern = /\.(?:html|css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf)$/i;
function escapeHTML(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Enumerate regular files without following symlinks into private or unrelated content. */
function files(directory: string, prefix = ""): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw Error(`Symlink is not a site input: ${relative}`);
    return entry.isDirectory() ? files(path.join(directory, entry.name), relative) : [relative];
  });
}

/** Require recorded content and evidence approval while permitting unknown interim criteria. */
function requireReview(assessment: Record<string, unknown>) {
  const latest = assessment.latestAudit as Record<string, unknown> | undefined;
  const review = assessment.reportReview as Record<string, unknown> | undefined;
  if (
    latest?.reviewed !== true ||
    !review ||
    ["approved", "findingsReconciled", "scopeReviewed", "publicDistributionApproved"].some(
      (key) => review[key] !== true,
    ) ||
    typeof review.reviewer !== "string" ||
    !review.reviewer.trim() ||
    typeof review.reviewedAt !== "string" ||
    Number.isNaN(Date.parse(review.reviewedAt)) ||
    typeof assessment.distributionLicense !== "string" ||
    !assessment.distributionLicense.trim()
  ) {
    throw Error("Production site requires recorded assessment and evidence-review approval");
  }
}

/** Validate all links before replacing the served directory; never copy raw evidence. */
export function buildSite(
  options: { directory?: string; revision?: string; production?: boolean } = {},
) {
  const directory = options.directory ?? fileURLToPath(new URL("../", import.meta.url));
  const revision =
    options.revision ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(revision))
    throw Error("A full deployed commit SHA is required");
  const assessment = JSON.parse(fs.readFileSync(path.join(directory, "assessment.json"), "utf8"));
  if (options.production ?? process.env.VERCEL_ENV === "production") requireReview(assessment);
  const reportFiles = files(path.join(directory, "reports")).filter((file) =>
    assetPattern.test(file),
  );
  const documents = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
  const outputs = new Map<string, string | Buffer>();
  const blob = (file: string) =>
    `${repository}/blob/${revision}/${file.split("/").map(encodeURIComponent).join("/")}`;
  for (const file of reportFiles) {
    const source = fs.readFileSync(path.join(directory, "reports", file));
    if (!file.endsWith(".html")) {
      outputs.set(`reports/${file}`, source);
      continue;
    }
    const rewritten = source
      .toString()
      .replace(
        /\b(href|src|poster)=("|')([^"']*)\2/g,
        (_match, attribute: string, quote: string, encoded: string) => {
          const url = encoded.replaceAll("&amp;", "&");
          if (!url || url.startsWith("#") || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url))
            return `${attribute}=${quote}${encoded}${quote}`;
          const split = url.search(/[?#]/);
          const pathname = split < 0 ? url : url.slice(0, split);
          const suffix = split < 0 ? "" : url.slice(split);
          const resolved = path.resolve(
            directory,
            "reports",
            path.dirname(file),
            decodeURIComponent(pathname!),
          );
          const relative = path.relative(directory, resolved).split(path.sep).join("/");
          if (
            relative.startsWith("../") ||
            !fs.existsSync(resolved) ||
            !fs.lstatSync(resolved).isFile() ||
            fs.lstatSync(resolved).isSymbolicLink()
          )
            throw Error(`Missing or unsafe report link: ${url}`);
          if (relative.endsWith(".md")) {
            if (
              suffix.startsWith("#") &&
              relative === "evidence/README.md" &&
              !fs.readFileSync(resolved, "utf8").includes(`id="${suffix.slice(1)}"`)
            )
              throw Error(`Missing evidence anchor: ${url}`);
            return `${attribute}=${quote}${escapeHTML(blob(relative) + suffix)}${quote}`;
          }
          if (!relative.startsWith("reports/") || !reportFiles.includes(relative.slice(8)))
            throw Error(`Unserved report link: ${url}`);
          return `${attribute}=${quote}${encoded}${quote}`;
        },
      );
    outputs.set(`reports/${file}`, rewritten);
  }
  const list = (entries: [string, string][]) =>
    `<ul>${entries.map(([href, label]) => `<li><a href="${escapeHTML(href)}">${escapeHTML(label)}</a></li>`).join("")}</ul>`;
  const html = reportFiles.filter((file) => file.endsWith(".html"));
  if (!html.length) throw Error("No HTML reports found");
  outputs.set(
    "index.html",
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conveyal Analysis Accessibility Reports</title><style>body{font:1.1rem/1.6 system-ui,sans-serif;margin:0;color:#172235;background:#fff}main{max-width:48rem;margin:auto;padding:2rem 1rem}h1{line-height:1.2}a{color:#174d98;text-decoration:underline;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #172235;outline-offset:4px}li{margin:.75rem 0}</style></head><body><main><h1>Conveyal Analysis Accessibility Reports</h1><h2>HTML reports</h2>${list(html.map((file) => [`reports/${file}`, String(outputs.get(`reports/${file}`)).match(/<title>([^<]+)<\/title>/i)?.[1] ?? file]))}<h2>Documents on GitHub</h2>${list(documents.map((file) => [blob(file), file.replace(/\.md$/, "").replaceAll("-", " ")]))}<h2>Published audit and evidence</h2>${list([[`${repository}/releases/latest`, "Latest published audit and evidence"]])}<p>The latest published audit may precede the current repository assessment.</p><p>EBP, Inc.</p></main></body></html>\n`,
  );
  const dist = path.join(directory, "dist");
  fs.mkdirSync(dist, { recursive: true });
  const staged = fs.mkdtempSync(path.join(dist, "site-"));
  for (const [file, content] of outputs) {
    const target = path.join(staged, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  fs.rmSync(path.join(dist, "site"), { recursive: true, force: true });
  fs.renameSync(staged, path.join(dist, "site"));
  return path.join(dist, "site");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({
      options: { production: { type: "boolean" }, revision: { type: "string" } },
    });
    console.log(buildSite({ revision: values.revision, production: values.production }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
