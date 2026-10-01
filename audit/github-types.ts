/** Git command injection and the compact GitHub responses needed by review orchestration. */
import type { Octokit } from "@octokit/rest";
import type { FinalizedCollection } from "./types.ts";
export type CommandRunner = (
  tool: string,
  args: string[],
  directory: string,
  input?: string,
) => string;
/** SDK-derived Release fields retained by the evidence workflow. */
type SDKRelease = Awaited<ReturnType<Octokit["rest"]["repos"]["getRelease"]>>["data"];
export type ReleaseAsset = Pick<SDKRelease["assets"][number], "id" | "name">;
export type Release = Pick<
  SDKRelease,
  "id" | "tag_name" | "target_commitish" | "name" | "body" | "draft" | "html_url"
> & { assets: ReleaseAsset[] };
/** PR fields shared between REST preparation and GraphQL merged-revision checks. */
export interface PullRequest {
  number: number;
  html_url: string;
  state: string;
  isDraft?: boolean;
  baseRefName?: string;
  headRefName?: string;
  headRefOid?: string;
  mergeCommit?: { oid: string };
}
export interface ReviewContext {
  id: string;
  directory: string;
  record: FinalizedCollection;
  bundle: string;
  repo: string;
  branch: string;
  tag: string;
}
