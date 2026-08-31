import type { NextConfig } from "next";

const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").at(-1) ?? "";
const inferredBasePath = repositoryName && !repositoryName.endsWith(".github.io")
  ? `/${repositoryName}`
  : "";
// Vinext's export pre-renderer currently expects requests at the root path.
// The Pages repository prefix is injected into browser URLs during finalization.
const githubPagesBasePath = process.env.GITHUB_PAGES_BASE_PATH ?? "";
const publicSiteBasePath = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? (isGitHubPagesBuild ? inferredBasePath : "");

const nextConfig: NextConfig = {
  ...(isGitHubPagesBuild
    ? {
        output: "export" as const,
        basePath: githubPagesBasePath,
        env: {
          NEXT_PUBLIC_SITE_BASE_PATH: publicSiteBasePath,
        },
      }
    : {}),
};

export default nextConfig;
