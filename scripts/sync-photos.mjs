import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, parse, relative } from "node:path";
import { fileURLToPath } from "node:url";

import exifr from "exifr";
import sharp from "sharp";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const originalsDir = join(projectRoot, "assets/originals/user-photos-2026");
const publicDir = join(projectRoot, "public/photos");
const overridesPath = join(projectRoot, "content/photos/photo-overrides.json");
const outputPath = join(projectRoot, "content/photos/photos.generated.json");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic"]);
const exifTags = [
  "DateTimeOriginal",
  "CreateDate",
  "Make",
  "Model",
  "LensModel",
  "FNumber",
  "ExposureTime",
  "ISO",
  "FocalLength",
  "FocalLengthIn35mmFormat",
  "latitude",
  "longitude",
];

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

function slugFromFilename(filename) {
  const ascii = parse(filename).name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  if (ascii) return ascii;
  return `photo-${createHash("sha1").update(filename).digest("hex").slice(0, 10)}`;
}

function cleanText(value) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return undefined;
}

function sortNewest(a, b) {
  const uploadDelta = Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt);
  if (uploadDelta) return uploadDelta;
  return Date.parse(b.takenAt) - Date.parse(a.takenAt);
}

async function writeWebDerivative(sourcePath, destinationPath) {
  const [sourceStats, destinationStats] = await Promise.all([
    stat(sourcePath),
    stat(destinationPath).catch(() => null),
  ]);
  if (destinationStats && destinationStats.mtimeMs >= sourceStats.mtimeMs) return false;

  await sharp(sourcePath)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(destinationPath);
  return true;
}

await mkdir(publicDir, { recursive: true });
await mkdir(dirname(outputPath), { recursive: true });

const overrides = await readJson(overridesPath, {});
const previous = await readJson(outputPath, []);
const previousByOriginal = new Map(previous.map((photo) => [photo.originalFilename, photo]));
const sourceFiles = await readdir(originalsDir).catch((error) => {
  if (error?.code === "ENOENT" && previous.length) return [];
  throw error;
});
const filenames = sourceFiles
  .filter((filename) => supportedExtensions.has(extname(filename).toLowerCase()))
  .sort((a, b) => a.localeCompare(b));

if (!filenames.length) {
  if (previous.length) {
    console.log(`No local originals found; keeping ${previous.length} generated catalog entries.`);
    process.exit(0);
  }
  throw new Error(`No source photos or generated catalog found in ${relative(projectRoot, originalsDir)}`);
}

const synchronizedAt = new Date().toISOString();
const photos = [];
let generatedCount = 0;

for (const originalFilename of filenames) {
  const sourcePath = join(originalsDir, originalFilename);
  const override = overrides[originalFilename] ?? {};
  const previousPhoto = previousByOriginal.get(originalFilename);
  const id = override.id ?? previousPhoto?.id ?? slugFromFilename(originalFilename);
  const webFilename = override.webFilename ?? previousPhoto?.webFilename ?? `${id}.jpg`;
  const destinationPath = join(publicDir, webFilename);
  const [rawExif, image] = await Promise.all([
    exifr.parse(sourcePath, exifTags).catch(() => ({})),
    sharp(sourcePath).metadata(),
  ]);
  const gps = override.hideGps
    ? undefined
    : await exifr.gps(sourcePath).catch(() => undefined);
  const capturedAt = isoDate(rawExif?.DateTimeOriginal ?? rawExif?.CreateDate);
  const fallbackYear = String(override.year ?? previousPhoto?.year ?? new Date().getFullYear());
  const takenAt = capturedAt ?? `${fallbackYear}-01-01T00:00:00+08:00`;
  const width = image.autoOrient?.width ?? image.width ?? 1;
  const height = image.autoOrient?.height ?? image.height ?? 1;
  const ratio = width / height;
  const generated = await writeWebDerivative(sourcePath, destinationPath);
  if (generated) generatedCount += 1;

  const model = cleanText(rawExif?.Model);
  const make = cleanText(rawExif?.Make);
  const camera = model ?? make;
  const uploadedAt = override.uploadedAt ?? previousPhoto?.uploadedAt ?? synchronizedAt;
  const year = String(override.year ?? new Date(takenAt).getUTCFullYear());

  photos.push({
    id,
    originalFilename,
    webFilename,
    src: `/photos/${webFilename}`,
    alt: override.alt ?? `Jabari 上传的照片：${parse(originalFilename).name}`,
    title: override.title ?? parse(originalFilename).name.replace(/[-_]+/g, " "),
    location: override.location ?? "未标记",
    year,
    theme: override.theme ?? "other",
    className: ratio > 1.12 ? "photo-wide" : ratio < 0.88 ? "photo-tall" : "photo-square",
    width,
    height,
    uploadedAt,
    takenAt,
    exif: {
      camera,
      lens: cleanText(rawExif?.LensModel),
      focalLength: asNumber(rawExif?.FocalLength),
      focalLength35mm: asNumber(rawExif?.FocalLengthIn35mmFormat),
      aperture: asNumber(rawExif?.FNumber),
      exposureTime: asNumber(rawExif?.ExposureTime),
      iso: asNumber(rawExif?.ISO),
      latitude: asNumber(gps?.latitude),
      longitude: asNumber(gps?.longitude),
    },
  });
}

photos.sort(sortNewest);
await writeFile(outputPath, `${JSON.stringify(photos, null, 2)}\n`);
console.log(`Synced ${photos.length} photos (${generatedCount} web derivatives updated).`);
