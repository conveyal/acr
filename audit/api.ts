/** Authenticated requests, polling, and target preflight checks. */
import { backendDocumentSchema } from "./types.ts";
import type { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { root } from "./config.ts";
import type { Page } from "@playwright/test";
import type { TargetConfiguration } from "./types.ts";
export interface RequestOptions {
  method?: string;
  data?: unknown;
  files?: { field: string; file: string }[];
  fields?: Record<string, unknown>;
  backend?: boolean;
  missingOK?: boolean;
}
export interface PreflightPage {
  request: {
    get: (
      url: string,
      options: { maxRedirects: number; timeout: number },
    ) => Promise<{ status: () => number; text: () => Promise<string> }>;
  };
  goto: (url: string) => Promise<unknown> | unknown;
  url: () => string;
  evaluate: (check: () => boolean) => Promise<boolean>;
}
/** Execute a browser-origin request; a missing resource is nullable only when explicitly permitted. */
export function request<T = unknown>(
  page: Page | null,
  config: TargetConfiguration,
  route: string,
  options: RequestOptions & { missingOK: true; schema?: z.ZodType<T> },
): Promise<T | null>;
export function request<T = unknown>(
  page: Page | null,
  config: TargetConfiguration,
  route: string,
  options?: RequestOptions & { missingOK?: false; schema?: z.ZodType<T> },
): Promise<T>;
/** Submit fixture uploads or JSON from the browser origin and validate every successful read. */
export async function request<T = unknown>(
  page: Page | null,
  config: TargetConfiguration,
  route: string,
  {
    method = "GET",
    data,
    files,
    fields,
    backend = false,
    missingOK = false,
    schema,
  }: RequestOptions & { schema?: z.ZodType<T> } = {},
): Promise<T | null> {
  if (!page) {
    throw Error("A browser page is required for application requests");
  }
  const url = backend ? config.backendURL + route : new URL(route, config.baseURL).href;
  const upload = files?.map(({ field, file }) => ({
    bytes: fs.readFileSync(path.resolve(root, "fixtures", file)).toString("base64"),
    field,
    name: path.basename(file),
  }));
  const result = await page.evaluate(
    async ({ url, method, data, upload, fields, backend, timeout }) => {
      const headers: Record<string, string> = {};
      if (backend) {
        const user = JSON.parse(document.querySelector("#__NEXT_DATA__")?.textContent ?? "{}").props
          ?.pageProps?.user;
        headers.Authorization = `bearer ${
          user?.idToken ?? (user?.accessGroup === "local" ? "idToken" : "")
        }`;
        if (window.__user?.adminTempAccessGroup) {
          headers["X-Conveyal-Access-Group"] = window.__user.adminTempAccessGroup;
        }
      }
      let body;
      if (upload || fields) {
        body = new FormData();
        for (const [fieldName, fieldValue] of Object.entries(fields ?? {})) {
          body.append(fieldName, String(fieldValue));
        }
        for (const fileUpload of upload ?? []) {
          body.append(
            fileUpload.field,
            new File(
              [Uint8Array.from(atob(fileUpload.bytes), (c) => c.charCodeAt(0))],
              fileUpload.name,
            ),
          );
        }
      } else if (data !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(data);
      }
      const options: RequestInit = {
        credentials: backend ? "omit" : "include",
        headers,
        method,
        signal: AbortSignal.timeout(timeout),
      };
      if (method !== "GET" && method !== "HEAD") {
        options.body = body;
      }
      const response = await fetch(url, options);
      const text = await response.text();
      let value;
      let json = true;
      try {
        value = JSON.parse(text);
      } catch {
        value = null;
        json = false;
      }
      return { status: response.status, value, json };
    },
    {
      backend,
      data,
      fields,
      method: method.toUpperCase(),
      timeout: config.timeouts.upload,
      upload,
      url,
    },
  );
  if (missingOK && result.status === 404) {
    return null;
  }
  if (result.status < 200 || result.status >= 300) {
    throw Error(
      `${method} ${backend ? "backend" : "UI"} ${route.split("?")[0]} returned ${result.status}`,
    );
  }
  if (!result.json && method.toUpperCase() !== "DELETE") {
    throw Error(`${method} ${route.split("?")[0]} returned a non-JSON response`);
  }
  if (result.json && result.value === null && method.toUpperCase() !== "DELETE") {
    throw Error(`${method} ${route.split("?")[0]} returned null instead of a resource`);
  }
  return schema ? schema.parse(result.value) : result.value;
}
/** Read database documents with the minimal identity contract. */
export const find = (
  page: Page | null,
  config: TargetConfiguration,
  collection: string,
  query: Record<string, unknown>,
) =>
  request(
    page,
    config,
    `/api/db/${collection}?query=${encodeURIComponent(JSON.stringify(query))}`,
    { schema: backendDocumentSchema.array() },
  );
/** Wait for a ready value without exceeding the configured polling policy. */
export async function poll<T>(
  read: () => Promise<T>,
  ready: (value: T) => boolean,
  timeout: number,
  label: string,
) {
  const end = Date.now() + timeout;
  do {
    const value = await read();
    if (ready(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (Date.now() < end);
  throw new Error(`Timed out waiting for ${label}`);
}
/** Confirm the selected origin and authentication before provisioning. */
export async function preflight(page: PreflightPage, config: TargetConfiguration) {
  // Load only the explicitly selected origin. The local preflight never follows redirects.
  if (config.local) {
    const response = await page.request.get(config.baseURL, {
      maxRedirects: 0,
      timeout: 10_000,
    });
    const match = (await response.text()).match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    const user = match && JSON.parse(match[1]).props?.pageProps?.user;
    if (response.status() !== 200 || user?.email !== "local" || user?.accessGroup !== "local") {
      throw Error("Target requires unauthenticated local mode");
    }
  }
  await page.goto(config.baseURL);
  if (new URL(page.url()).origin !== config.baseURL) {
    throw Error("Authentication redirected away from configured origin");
  }
  const authenticated = await page.evaluate(() => {
    const user = JSON.parse(document.querySelector("#__NEXT_DATA__")?.textContent ?? "{}").props
      ?.pageProps?.user;
    return Boolean(user?.email && user?.accessGroup);
  });
  if (!authenticated || /\/login(?:\/|$)/.test(new URL(page.url()).pathname)) {
    throw Error("Saved session is missing or expired");
  }
}
