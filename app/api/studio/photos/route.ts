import type { NewPhoto } from "@/db/schema";
import { requireStudioOwner } from "@/lib/photos/auth";
import {
  cleanOptionalString,
  cleanRequiredString,
  finiteInteger,
  finiteNumber,
  imageContentType,
  isGpsVisibility,
  isPhotoTheme,
  isRecord,
  isoDate,
  jsonError,
  MAX_ORIGINAL_BYTES,
  ORIGINAL_IMAGE_TYPES,
  safeFilename,
  storageUnavailableMessage,
} from "@/lib/photos/http";
import {
  createPhoto,
  ensureUniquePhotoSlug,
  getOrCreateAlbum,
  getReadyDb,
  getStudioCatalog,
  studioPhoto,
} from "@/lib/photos/repository";

export const dynamic = "force-dynamic";

function getExif(payload: Record<string, unknown>) {
  return isRecord(payload.exif) ? payload.exif : {};
}

function exifValue(
  payload: Record<string, unknown>,
  exif: Record<string, unknown>,
  name: string,
) {
  return payload[name] ?? exif[name];
}

export async function GET(request: Request) {
  const authorization = await requireStudioOwner(request);
  if (!authorization.ok) return authorization.response;
  try {
    const catalog = await getStudioCatalog();
    return Response.json(catalog, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jsonError("Studio photo catalog unavailable", 503, storageUnavailableMessage(error));
  }
}

export async function POST(request: Request) {
  const authorization = await requireStudioOwner(request);
  if (!authorization.ok) return authorization.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }
  if (!isRecord(payload)) return jsonError("Request body must be an object", 400);

  const submittedFilename = cleanRequiredString(payload.filename, 255);
  const submittedContentType = cleanRequiredString(payload.contentType, 100);
  const size = finiteInteger(payload.size, { min: 1 });
  if (!submittedFilename) return jsonError("filename is required", 400);
  if (!submittedContentType) return jsonError("contentType is required", 400);
  if (size == null) return jsonError("size must be a positive integer", 400);
  if (size > MAX_ORIGINAL_BYTES) {
    return jsonError("Original image exceeds the 50 MB limit", 413);
  }

  const contentType = imageContentType(submittedContentType);
  if (!ORIGINAL_IMAGE_TYPES.has(contentType)) {
    return jsonError("Unsupported original image type", 415);
  }

  const filename = safeFilename(submittedFilename);
  const titleFallback = filename.replace(/\.[^.]+$/, "").replaceAll(/[-_]+/g, " ");
  const title = cleanRequiredString(payload.title, 160) ?? titleFallback;
  const alt = cleanOptionalString(payload.alt, 300);
  const location = cleanOptionalString(payload.location, 160);
  if (alt === undefined) return jsonError("alt is too long or invalid", 400);
  if (location === undefined) return jsonError("location is too long or invalid", 400);
  if (payload.theme != null && !isPhotoTheme(payload.theme)) {
    return jsonError("theme must be city, nature, water, or other", 400);
  }
  if (payload.gpsVisibility != null && !isGpsVisibility(payload.gpsVisibility)) {
    return jsonError("gpsVisibility must be exact, coarse, or hidden", 400);
  }

  const exif = getExif(payload);
  const takenAt = isoDate(payload.takenAt);
  const width = finiteInteger(payload.width, { min: 1, max: 100_000 });
  const height = finiteInteger(payload.height, { min: 1, max: 100_000 });
  const focalLength = finiteNumber(exifValue(payload, exif, "focalLength"), {
    min: 0,
  });
  const focalLength35mm = finiteNumber(
    exifValue(payload, exif, "focalLength35mm"),
    { min: 0 },
  );
  const aperture = finiteNumber(exifValue(payload, exif, "aperture"), { min: 0 });
  const exposureTime = finiteNumber(exifValue(payload, exif, "exposureTime"), {
    min: 0,
  });
  const iso = finiteInteger(exifValue(payload, exif, "iso"), { min: 0 });
  const latitude = finiteNumber(exifValue(payload, exif, "latitude"), {
    min: -90,
    max: 90,
  });
  const longitude = finiteNumber(exifValue(payload, exif, "longitude"), {
    min: -180,
    max: 180,
  });
  if (
    [takenAt, width, height, focalLength, focalLength35mm, aperture, exposureTime, iso, latitude, longitude].some(
      (value) => value === undefined,
    )
  ) {
    return jsonError("One or more date, dimension, or EXIF fields are invalid", 400);
  }

  const camera = cleanOptionalString(exifValue(payload, exif, "camera"), 160);
  const lens = cleanOptionalString(exifValue(payload, exif, "lens"), 200);
  const albumIdInput = cleanOptionalString(payload.albumId, 100);
  const albumSlugInput = cleanOptionalString(payload.albumSlug, 100);
  if (camera === undefined || lens === undefined || albumIdInput === undefined || albumSlugInput === undefined) {
    return jsonError("One or more text metadata fields are invalid", 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const db = await getReadyDb();
    const theme = isPhotoTheme(payload.theme) ? payload.theme : "other";
    const album = albumSlugInput
      ? await getOrCreateAlbum(db, albumSlugInput, theme)
      : null;
    const albumId = album?.id ?? albumIdInput;
    const slugRequest = cleanOptionalString(payload.slug, 100);
    if (slugRequest === undefined) return jsonError("slug is invalid", 400);
    const slug = await ensureUniquePhotoSlug(db, slugRequest ?? title);
    const values: NewPhoto = {
      id,
      slug,
      albumId,
      title,
      alt: alt ?? title,
      location: location ?? "未标记",
      theme,
      originalFilename: filename,
      originalR2Key: `photos/${id}/original/${filename}`,
      originalContentType: contentType,
      originalSize: size,
      webR2Key: `photos/${id}/web`,
      width,
      height,
      uploadedAt: now,
      takenAt,
      camera,
      lens,
      focalLength,
      focalLength35mm,
      aperture,
      exposureTime,
      iso,
      latitude,
      longitude,
      gpsVisibility: isGpsVisibility(payload.gpsVisibility)
        ? payload.gpsVisibility
        : "exact",
      status: "draft",
      sortOrder: 0,
      updatedAt: now,
    };
    const photo = await createPhoto(values);
    return Response.json(
      {
        photo: studioPhoto(photo, album),
        upload: {
          originalUrl: `/api/studio/photos/${encodeURIComponent(id)}/original`,
          webUrl: `/api/studio/photos/${encodeURIComponent(id)}/web`,
          ownerHeader: authorization.owner.localDevelopment
            ? { "x-local-studio-owner": authorization.owner.email }
            : undefined,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError("Unable to create photo draft", 503, storageUnavailableMessage(error));
  }
}
