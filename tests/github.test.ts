/** Exercise the real Octokit transport with controlled fetch responses and no network or CLI calls. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Octokit } from "@octokit/rest";
import { githubClient, octokitClient } from "../audit/github.ts";
import type { CommandRunner, Release } from "../audit/github-types.ts";

/** Captured HTTP request after Octokit endpoint expansion and authentication. */
interface CapturedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: RequestInit["body"];
}

/** Create a genuine Octokit instance whose HTTP transport stays entirely in this test. */
function transport(handler: (request: CapturedRequest) => Response | Promise<Response>) {
  const requests: CapturedRequest[] = [];
  const fetchTransport: typeof fetch = async (input, init) => {
    const request = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: init?.body,
    };
    requests.push(request);
    return handler(request);
  };
  const client = octokitClient(
    new Octokit({
      auth: "synthetic-token",
      request: { fetch: fetchTransport },
      log: { debug() {}, info() {}, warn() {}, error() {} },
    }),
  );
  return { client, requests, fetchTransport };
}

/** Minimal Release fields actually consumed by the review workflow. */
function releaseFixture(id = 7): Release {
  return {
    id,
    tag_name: "audit-fixture",
    target_commitish: "abc123",
    name: "Fixture",
    body: "Fixture body",
    draft: true,
    html_url: "https://github.com/conveyal/acr/releases/7",
    assets: [{ id: 11, name: "evidence.tar.gz" }],
  };
}

/** Return the same JSON response shape used by the GitHub HTTP API. */
function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test("draft release lookup handles typed 404 then paginates and fetches full release detail", async () => {
  const fixture = releaseFixture();
  // The first page must not match the requested tag.
  const firstPageTag = "other-release";
  const otherFixture = releaseFixture(4);
  otherFixture.tag_name = firstPageTag;
  const paginated = transport(({ url }) => {
    if (url.includes("/tags/")) return json({ message: "Not Found" }, 404);
    if (url.endsWith("/releases/7")) return json(fixture);
    if (url.includes("page=2")) return json([fixture]);
    return json([otherFixture], 200, {
      link: '<https://api.github.com/repos/conveyal/acr/releases?per_page=100&page=2>; rel="next"',
    });
  });
  assert.deepEqual(await paginated.client.findRelease("conveyal/acr", "audit-fixture"), fixture);
  assert.equal(paginated.requests.length, 4);
  assert.match(paginated.requests[1].url, /per_page=100/);
  assert.match(paginated.requests[2].url, /page=2/);
  assert.match(paginated.requests[3].url, /releases\/7$/);
});

test("release absence returns null after typed 404, while 500 propagates without fallback", async () => {
  const missing = transport(({ url }) =>
    url.includes("/tags/") ? json({ message: "Not Found" }, 404) : json([]),
  );
  assert.equal(await missing.client.findRelease("conveyal/acr", "missing"), null);
  assert.equal(missing.requests.length, 2);
  const failed = transport(() => json({ message: "Unavailable" }, 500));
  await assert.rejects(failed.client.findRelease("conveyal/acr", "audit-fixture"), { status: 500 });
  assert.equal(failed.requests.length, 1);
});

test("binary assets preserve bytes and octet-stream response parsing through the real SDK", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "acr-github-assets-"));
  const bytes = Buffer.from([0x1f, 0x8b, 0, 255, 128, 195, 40]);
  const filename = path.join(directory, "evidence.tar.gz");
  fs.writeFileSync(filename, bytes);
  let arrayBufferReads = 0;
  const { client, requests } = transport(({ url, method }) => {
    if (method === "POST") return json({ id: 11 });
    if (url.endsWith("/releases/7")) return json(releaseFixture());
    const response = new Response(bytes, {
      headers: { "content-type": "application/octet-stream; charset=utf-8" },
    });
    const readArrayBuffer = response.arrayBuffer.bind(response);
    response.arrayBuffer = () => {
      arrayBufferReads += 1;
      return readArrayBuffer();
    };
    return response;
  });
  try {
    await client.uploadAsset("conveyal/acr", releaseFixture(), filename);
    const upload = requests[0];
    assert.equal(upload.headers.get("content-type"), "application/gzip");
    assert.equal(upload.headers.get("content-length"), String(bytes.length));
    assert.equal(upload.headers.get("authorization"), "token synthetic-token");
    assert.match(upload.url, /^https:\/\/uploads.github.com\//);
    assert.match(upload.url, /name=evidence.tar.gz/);
    assert.deepEqual(upload.body, bytes);
    fs.rmSync(filename);
    await client.downloadAsset("conveyal/acr", releaseFixture(), "evidence.tar.gz", directory);
    assert.deepEqual(fs.readFileSync(filename), bytes);
    assert.equal(requests[2].headers.get("accept"), "application/octet-stream");
    assert.equal(arrayBufferReads, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("GraphQL review lookup flattens latest review nodes and supplies repository variables", async () => {
  const pr = {
    url: "https://github.com/conveyal/acr/pull/23",
    number: 23,
    state: "MERGED",
    isDraft: false,
    baseRefName: "main",
    headRefName: "audit/fixture",
    headRefOid: "abc123",
    mergeCommit: { oid: "def456" },
    reviewDecision: null,
    latestReviews: { nodes: [{ state: "APPROVED" }, { state: "COMMENTED" }] },
  };
  const { client, requests } = transport(() => json({ data: { repository: { pullRequest: pr } } }));
  const result = await client.readPullRequest("conveyal/acr", 23);
  const { url, ...fields } = pr;
  assert.deepEqual(result, { ...fields, html_url: url, latestReviews: pr.latestReviews.nodes });
  const payload = JSON.parse(String(requests[0].body));
  assert.deepEqual(payload.variables, { owner: "conveyal", repo: "acr", number: 23 });
  assert.match(payload.query, /number url state/);
  assert.match(payload.query, /latestReviews\(first: 100\)/);
});

test("write failures and lost responses are sent once without automatic retries", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "acr-github-write-"));
  const filename = path.join(directory, "evidence.tar.gz");
  fs.writeFileSync(filename, Buffer.from([31, 139, 0, 255]));
  try {
    for (const failure of ["server", "lost-response"]) {
      const writes = [
        {
          method: "POST",
          run: (client: ReturnType<typeof octokitClient>) =>
            client.createRelease("conveyal/acr", { tag_name: "audit-fixture", draft: true }),
        },
        {
          method: "PATCH",
          run: (client: ReturnType<typeof octokitClient>) =>
            client.updateRelease("conveyal/acr", 7, { draft: false }),
        },
        {
          method: "DELETE",
          run: (client: ReturnType<typeof octokitClient>) => client.deleteAsset("conveyal/acr", 11),
        },
        {
          method: "POST",
          run: (client: ReturnType<typeof octokitClient>) =>
            client.createPullRequest("conveyal/acr", {
              head: "audit/fixture",
              base: "main",
              title: "Fixture",
              body: "Fixture",
            }),
        },
        {
          method: "PATCH",
          run: (client: ReturnType<typeof octokitClient>) =>
            client.updatePullRequest("conveyal/acr", 23, "Updated fixture"),
        },
        {
          method: "POST",
          run: (client: ReturnType<typeof octokitClient>) =>
            client.uploadAsset("conveyal/acr", releaseFixture(), filename),
        },
      ];
      for (const write of writes) {
        const { client, requests } = transport(() => {
          if (failure === "lost-response") throw new TypeError("Connection ended after write");
          return json({ message: "Unavailable" }, 500);
        });
        await assert.rejects(write.run(client));
        assert.equal(requests.length, 1, `${failure} ${write.method}`);
        assert.equal(requests[0].method, write.method);
      }
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("credential resolution prefers GH_TOKEN, then GITHUB_TOKEN, then the injected gh command", async () => {
  for (const fixture of [
    {
      environment: { GH_TOKEN: "gh-token", GITHUB_TOKEN: "github-token" },
      token: "gh-token",
      cliCalls: 0,
    },
    { environment: { GITHUB_TOKEN: "github-token" }, token: "github-token", cliCalls: 0 },
    { environment: {}, token: "cli-token", cliCalls: 1 },
  ]) {
    const calls: { tool: string; args: string[]; directory: string }[] = [];
    const run: CommandRunner = (tool, args, directory) => {
      calls.push({ tool, args, directory });
      return "cli-token";
    };
    const { requests, fetchTransport } = transport(() => json(releaseFixture()));
    const client = githubClient("/synthetic/repository", run, fixture.environment, fetchTransport);
    await client.getRelease("conveyal/acr", 7);
    assert.equal(requests[0].headers.get("authorization"), `token ${fixture.token}`);
    assert.equal(calls.length, fixture.cliCalls);
    if (fixture.cliCalls)
      assert.deepEqual(calls[0], {
        tool: "gh",
        args: ["auth", "token"],
        directory: "/synthetic/repository",
      });
  }
});
