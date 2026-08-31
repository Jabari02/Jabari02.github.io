import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const staticRoot = resolve(projectRoot, "dist/client");
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").at(-1) ?? "";
const inferredBasePath = repositoryName && !repositoryName.endsWith(".github.io")
  ? `/${repositoryName}`
  : "";
const siteBasePath = (process.env.GITHUB_PAGES_BASE_PATH ?? inferredBasePath).replace(/\/+$/, "");

await mkdir(staticRoot, { recursive: true });
await writeFile(resolve(staticRoot, ".nojekyll"), "", "utf8");

// GitHub Pages serves extensionless URLs most reliably when each route also
// has a directory-style index.html. Keep the original .html files as well so
// the artifact remains inspectable and compatible with other static hosts.
async function materializeDirectoryRoutes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const source = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      await materializeDirectoryRoutes(source);
      return;
    }

    if (!entry.name.endsWith(".html") || entry.name === "index.html" || entry.name === "404.html") {
      return;
    }

    const routeDirectory = resolve(directory, entry.name.slice(0, -5));
    await mkdir(routeDirectory, { recursive: true });
    await copyFile(source, resolve(routeDirectory, "index.html"));
  }));
}

await materializeDirectoryRoutes(staticRoot);

if (siteBasePath) {
  const staticAssetPattern = /(["'(=])\/(_next|favicon\.svg|file\.svg|globe\.svg|window\.svg)/g;
  const textFiles = [];

  async function collectTextFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const filePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await collectTextFiles(filePath);
      } else if (entry.name.endsWith(".html") || entry.name.endsWith(".rsc")) {
        textFiles.push(filePath);
      }
    }));
  }

  await collectTextFiles(staticRoot);
  await Promise.all(textFiles.map(async (filePath) => {
    const source = await readFile(filePath, "utf8");
    const rewritten = source.replace(staticAssetPattern, `$1${siteBasePath}/$2`);
    if (rewritten !== source) await writeFile(filePath, rewritten, "utf8");
  }));
}

const customDomain = process.env.GITHUB_PAGES_CNAME?.trim();
if (customDomain) {
  await writeFile(resolve(staticRoot, "CNAME"), `${customDomain}\n`, "utf8");
}

console.log(`GitHub Pages artifact finalized at ${staticRoot}`);
