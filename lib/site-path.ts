const configuredBasePath = (process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "").replace(/\/+$/, "");

/** Prefix internal browser URLs for GitHub Pages project sites. */
export function sitePath(path: string) {
  if (!configuredBasePath || !path.startsWith("/") || path.startsWith("//") || path.startsWith(configuredBasePath + "/") || path === configuredBasePath) {
    return path;
  }
  return `${configuredBasePath}${path}`;
}
