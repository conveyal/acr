/** GitHub API and asset transport; credentials stay in memory and writes are never retried. */
import { execFileSync } from "node:child_process";
import { Octokit } from "@octokit/rest";
import fs from "node:fs";
import path from "node:path";
import type { CommandRunner, PullRequest, Release } from "./github-types.ts";

/** The remote operations needed by review and recovery; tests inject an in-memory adapter. */
export interface GitHubClient {
  findRelease(repo: string, tag: string): Promise<Release | null>;
  getRelease(repo: string, id: number): Promise<Release>;
  createRelease(repo: string, data: ReleaseInput): Promise<Release>;
  updateRelease(repo: string, id: number, data: ReleaseInput): Promise<Release>;
  deleteAsset(repo: string, id: number): Promise<void>;
  listPullRequests(repo: string, head: string): Promise<PullRequest[]>;
  createPullRequest(repo: string, data: PullInput): Promise<PullRequest>;
  updatePullRequest(repo: string, number: number, body: string): Promise<PullRequest>;
  readPullRequest(repo: string, number: number): Promise<PullRequest>;
  uploadAsset(repo: string, release: Release, file: string): Promise<void>;
  downloadAsset(repo: string, release: Release, name: string, directory: string): Promise<void>;
}
/** Fields changed when preparing or publishing a dated Release. */
export interface ReleaseInput {
  tag_name?: string;
  target_commitish?: string;
  name?: string;
  draft?: boolean;
  body?: string;
}
/** Report PR creation fields; updates only replace its review description. */
export interface PullInput {
  base: string;
  body: string;
  head: string;
  title: string;
}
/** Resolve existing authentication without prompting, persisting, or printing the token. */
export function githubClient(
  directory: string,
  run: CommandRunner,
  environment = process.env,
  fetchTransport = globalThis.fetch,
): GitHubClient {
  const token =
    environment.GH_TOKEN || environment.GITHUB_TOKEN || run("gh", ["auth", "token"], directory);
  return octokitClient(new Octokit({ auth: token, request: { fetch: fetchTransport } }));
}
/** Adapt SDK responses to the small operations consumed by this repository. */
export function octokitClient(client: Octokit): GitHubClient {
  const repository = (name: string) => {
    const [owner, repo] = name.split("/");
    return { owner, repo };
  };
  return {
    /** Find published or paginated draft Releases, treating only HTTP 404 as absence. */
    async findRelease(repo, tag) {
      try {
        return (await client.rest.repos.getReleaseByTag({ ...repository(repo), tag })).data;
      } catch (error) {
        if (!(error instanceof Error && "status" in error && error.status === 404)) throw error;
      }
      // Draft Releases are not available through the published by-tag lookup.
      for await (const response of client.paginate.iterator(client.rest.repos.listReleases, {
        ...repository(repo),
        per_page: 100,
      })) {
        const release = response.data.find((candidate) => candidate.tag_name === tag);
        if (release)
          return (
            await client.rest.repos.getRelease({ ...repository(repo), release_id: release.id })
          ).data;
      }
      return null;
    },
    async getRelease(repo, id) {
      return (await client.rest.repos.getRelease({ ...repository(repo), release_id: id })).data;
    },
    async createRelease(repo, data) {
      if (!data.tag_name) throw new Error("Release tag is required");
      return (
        await client.rest.repos.createRelease({
          ...repository(repo),
          ...data,
          tag_name: data.tag_name,
        })
      ).data;
    },
    async updateRelease(repo, id, data) {
      return (
        await client.rest.repos.updateRelease({ ...repository(repo), release_id: id, ...data })
      ).data;
    },
    async deleteAsset(repo, id) {
      await client.rest.repos.deleteReleaseAsset({ ...repository(repo), asset_id: id });
    },
    async listPullRequests(repo, head) {
      return client.paginate(client.rest.pulls.list, {
        ...repository(repo),
        head,
        base: "main",
        state: "all",
      });
    },
    async createPullRequest(repo, data) {
      return (await client.rest.pulls.create({ ...repository(repo), ...data })).data;
    },
    async updatePullRequest(repo, number, body) {
      return (await client.rest.pulls.update({ ...repository(repo), pull_number: number, body }))
        .data;
    },
    /** Read merged revision and latest reviewer decisions used by the explicit publication gates. */
    async readPullRequest(repo, number) {
      const result = await client.graphql<{
        repository: {
          pullRequest: Omit<PullRequest, "latestReviews" | "html_url"> & {
            url: string;
            latestReviews: { nodes: { state: string }[] };
          };
        };
      }>(
        `
        query($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $number) {
              number url state isDraft baseRefName headRefName headRefOid
              mergeCommit { oid } reviewDecision
              latestReviews(first: 100) { nodes { state } }
            }
          }
        }`,
        { ...repository(repo), number },
      );
      const { url, latestReviews, ...pr } = result.repository.pullRequest;
      return { ...pr, html_url: url, latestReviews: latestReviews.nodes };
    },
    async uploadAsset(repo, release, file) {
      const bytes = fs.readFileSync(file);
      await client.rest.repos.uploadReleaseAsset({
        ...repository(repo),
        release_id: release.id,
        name: path.basename(file),
        headers: { "content-type": "application/gzip", "content-length": bytes.length },
        // Octokit's generated endpoint type declares string, while its transport accepts binary bytes.
        data: bytes as unknown as string,
      });
    },
    /** Download exact binary bytes; the caller must verify checksums before trusting or replacing evidence. */
    async downloadAsset(repo, release, name, directory) {
      const current = await client.rest.repos.getRelease({
        ...repository(repo),
        release_id: release.id,
      });
      const asset = current.data.assets.find((candidate) => candidate.name === name);
      if (!asset) throw new Error("Evidence asset is missing");
      const response = await client.rest.repos.getReleaseAsset({
        ...repository(repo),
        asset_id: asset.id,
        headers: { accept: "application/octet-stream" },
      });
      // The binary response uses the same endpoint as asset metadata; the SDK's declared data type is metadata.
      const bytes = response.data as unknown;
      if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes))
        throw new Error("Expected binary evidence asset");
      const buffer =
        bytes instanceof ArrayBuffer
          ? Buffer.from(bytes)
          : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      fs.writeFileSync(path.join(directory, name), buffer);
    },
  };
}

/** Run a local Git command or read CLI configuration without shell interpolation. */
export function command(tool: string, args: string[], directory: string, input?: string): string {
  return execFileSync(tool, args, {
    cwd: directory,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}
