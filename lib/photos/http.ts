import {
  contentStatuses,
  gpsVisibilities,
  photoThemes,
  type ContentStatus,
  type GpsVisibility,
  type PhotoTheme,
} from "@/db/schema";

export const OWNER_EMAIL = "jabari0227@gmail.com";
export const LOCAL_OWNER_HEADER = "x-local-studio-owner";
export const MAX_ORIGINAL_BYTES = 50 * 1024 * 1024;
export const MAX_WEB_BYTES = 15 * 1024 * 1024;

export const ORIGINAL_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

export const WEB_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export function jsonError(error: string, status: number, detail?: string) {
  return Response.json(
    detail ? { error, detail } : { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function cleanRequiredString(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  if (!result || result.length > maxLength) return null;
  return result;
}

export function cleanOptionalString(value: unknown, maxLength = 500) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  if (result.length > maxLength) return undefined;
  return result || null;
}

export function finiteNumber(
  value: unknown,
  options: { min?: number; max?: number } = {},
) {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (options.min != null && value < options.min) return undefined;
  if (options.max != null && value > options.max) return undefined;
  return value;
}

export function finiteInteger(
  value: unknown,
  options: { min?: number; max?: number } = {},
) {
  const parsed = finiteNumber(value, options);
  if (parsed == null) return parsed;
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function isoDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function imageContentType(value: string | null) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

export function safeFilename(value: string) {
  const normalized = value.normalize("NFKC").replaceAll("\\", "/");
  const basename = normalized.split("/").pop()?.trim() ?? "";
  const withoutControls = Array.from(basename)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    })
    .join("");
  const safe = withoutControls
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  return safe || "photo";
}

export function slugify(value: string) {
  const result = value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return result || "photo";
}

export function isPhotoTheme(value: unknown): value is PhotoTheme {
  return typeof value === "string" && photoThemes.includes(value as PhotoTheme);
}

export function isGpsVisibility(value: unknown): value is GpsVisibility {
  return (
    typeof value === "string" &&
    gpsVisibilities.includes(value as GpsVisibility)
  );
}

export function isContentStatus(value: unknown): value is ContentStatus {
  return (
    typeof value === "string" &&
    contentStatuses.includes(value as ContentStatus)
  );
}

export function storageUnavailableMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (
    lower.includes("d1 binding") ||
    lower.includes("no such table") ||
    lower.includes("photos binding") ||
    lower.includes("not bound") ||
    lower.includes("no d1")
  ) {
    return "照片云存储尚未初始化；网站会继续使用本地影集，完成 D1/R2 绑定和迁移后会自动切换。";
  }
  return "照片目录暂时不可用，请稍后重试。";
}

type RequestLengthResult =
  | { ok: true; bytes: number }
  | { ok: false; error: string; status: 400 | 411 | 413 };

export function requestLength(
  request: Request,
  maxBytes: number,
): RequestLengthResult {
  const header = request.headers.get("content-length");
  if (!header) {
    return { ok: false, error: "Content-Length is required", status: 411 };
  }
  const bytes = Number(header);
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    return {
      ok: false,
      error: "Content-Length must be a positive integer",
      status: 400,
    };
  }
  if (bytes > maxBytes) {
    return {
      ok: false,
      error: `Image exceeds the ${Math.floor(maxBytes / 1024 / 1024)} MB limit`,
      status: 413,
    };
  }
  return { ok: true, bytes };
}
