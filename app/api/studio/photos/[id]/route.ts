import type { NewPhoto, PhotoTheme } from "@/db/schema";
import { requireStudioOwner } from "@/lib/photos/auth";
import {
  cleanOptionalString,
  cleanRequiredString,
  finiteInteger,
  finiteNumber,
  isContentStatus,
  isGpsVisibility,
  isPhotoTheme,
  isRecord,
  isoDate,
  jsonError,
  storageUnavailableMessage,
} from "@/lib/photos/http";
import {
  ensureUniquePhotoSlug,
  getOrCreateAlbum,
  getReadyDb,
  getPhotoById,
  studioPhoto,
  updateAlbum,
  updatePhoto,
} from "@/lib/photos/repository";
import { headPhotoObject } from "@/lib/photos/storage";

export const dynamic = "force-dynamic";

function has(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function exifPayload(payload: Record<string, unknown>) {
  return isRecord(payload.exif) ? payload.exif : {};
}

function exifField(
  payload: Record<string, unknown>,
  exif: Record<string, unknown>,
  key: string,
) {
  return has(payload, key) ? payload[key] : exif[key];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireStudioOwner(request);
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  try {
    const photo = await getPhotoById(id);
    if (!photo) return jsonError("Photo not found", 404);
    return Response.json(
      { photo: studioPhoto(photo) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError("Unable to read photo", 503, storageUnavailableMessage(error));
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireStudioOwner(request);
  if (!authorization.ok) return authorization.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }
  if (!isRecord(payload)) return jsonError("Request body must be an object", 400);

  const { id } = await params;
  try {
    const current = await getPhotoById(id);
    if (!current) return jsonError("Photo not found", 404);

    const values: Partial<NewPhoto> = { updatedAt: new Date().toISOString() };
    let selectedAlbumId: string | null | undefined;
    if (has(payload, "title")) {
      const value = cleanRequiredString(payload.title, 160);
      if (!value) return jsonError("title is required", 400);
      values.title = value;
    }
    if (has(payload, "alt")) {
      const value = cleanOptionalString(payload.alt, 300);
      if (value === undefined) return jsonError("alt is invalid", 400);
      values.alt = value ?? "";
    }
    if (has(payload, "location")) {
      const value = cleanOptionalString(payload.location, 160);
      if (value === undefined) return jsonError("location is invalid", 400);
      values.location = value ?? "未标记";
    }
    if (has(payload, "albumId")) {
      const value = cleanOptionalString(payload.albumId, 100);
      if (value === undefined) return jsonError("albumId is invalid", 400);
      values.albumId = value;
      selectedAlbumId = value;
    }
    if (has(payload, "albumSlug")) {
      const value = cleanOptionalString(payload.albumSlug, 100);
      if (value === undefined) return jsonError("albumSlug is invalid", 400);
      if (value) {
        const theme: PhotoTheme = isPhotoTheme(values.theme)
          ? values.theme
          : (isPhotoTheme(current.theme) ? current.theme : "other");
        const album = await getOrCreateAlbum(await getReadyDb(), value, theme);
        values.albumId = album.id;
        selectedAlbumId = album.id;
      } else {
        values.albumId = null;
        selectedAlbumId = null;
      }
    }
    if (has(payload, "slug")) {
      const value = cleanRequiredString(payload.slug, 100);
      if (!value) return jsonError("slug is required", 400);
      values.slug = await ensureUniquePhotoSlug(await getReadyDb(), value, current.id);
    }
    if (has(payload, "theme")) {
      if (!isPhotoTheme(payload.theme)) return jsonError("theme is invalid", 400);
      values.theme = payload.theme;
    }
    if (has(payload, "gpsVisibility")) {
      if (!isGpsVisibility(payload.gpsVisibility)) {
        return jsonError("gpsVisibility is invalid", 400);
      }
      values.gpsVisibility = payload.gpsVisibility;
    }
    if (has(payload, "sortOrder")) {
      const value = finiteInteger(payload.sortOrder, {
        min: -1_000_000,
        max: 1_000_000,
      });
      if (value == null) return jsonError("sortOrder must be an integer", 400);
      values.sortOrder = value;
    }
    if (has(payload, "takenAt")) {
      const value = isoDate(payload.takenAt);
      if (value === undefined) return jsonError("takenAt is invalid", 400);
      values.takenAt = value;
    }
    if (has(payload, "width")) {
      const value = finiteInteger(payload.width, { min: 1, max: 100_000 });
      if (value === undefined) return jsonError("width is invalid", 400);
      values.width = value;
    }
    if (has(payload, "height")) {
      const value = finiteInteger(payload.height, { min: 1, max: 100_000 });
      if (value === undefined) return jsonError("height is invalid", 400);
      values.height = value;
    }

    const exif = exifPayload(payload);
    const textExif = ["camera", "lens"] as const;
    for (const key of textExif) {
      if (has(payload, key) || has(exif, key)) {
        const value = cleanOptionalString(exifField(payload, exif, key), 200);
        if (value === undefined) return jsonError(`${key} is invalid`, 400);
        values[key] = value;
      }
    }
    const numberExif = [
      ["focalLength", 0, undefined],
      ["focalLength35mm", 0, undefined],
      ["aperture", 0, undefined],
      ["exposureTime", 0, undefined],
      ["latitude", -90, 90],
      ["longitude", -180, 180],
    ] as const;
    for (const [key, min, max] of numberExif) {
      if (has(payload, key) || has(exif, key)) {
        const value = finiteNumber(exifField(payload, exif, key), { min, max });
        if (value === undefined) return jsonError(`${key} is invalid`, 400);
        values[key] = value;
      }
    }
    if (has(payload, "iso") || has(exif, "iso")) {
      const value = finiteInteger(exifField(payload, exif, "iso"), { min: 0 });
      if (value === undefined) return jsonError("iso is invalid", 400);
      values.iso = value;
    }

    if (has(payload, "publishedAt")) {
      const value = isoDate(payload.publishedAt);
      if (value === undefined) return jsonError("publishedAt is invalid", 400);
      values.publishedAt = value;
    }
    if (has(payload, "status")) {
      if (!isContentStatus(payload.status)) return jsonError("status is invalid", 400);
      values.status = payload.status;
      if (payload.status === "published") {
        const effectiveTitle = values.title ?? current.title;
        const effectiveAlt = values.alt ?? current.alt;
        if (!effectiveTitle || !effectiveAlt) {
          return jsonError("Published photos require a title and alt text", 400);
        }
        if (!current.webContentType || !(await headPhotoObject(current.webR2Key))) {
          return jsonError("Upload the sanitized web image before publishing", 409);
        }
        values.publishedAt = values.publishedAt ?? current.publishedAt ?? new Date().toISOString();
        const albumId = selectedAlbumId ?? current.albumId;
        if (albumId) {
          await updateAlbum(albumId, {
            status: "published",
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (payload.status === "draft" && !has(payload, "publishedAt")) {
        values.publishedAt = null;
      }
    }

    const photo = await updatePhoto(id, values);
    return Response.json(
      { photo: photo ? studioPhoto(photo) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError("Unable to update photo", 503, storageUnavailableMessage(error));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireStudioOwner(request);
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  try {
    const current = await getPhotoById(id);
    if (!current) return jsonError("Photo not found", 404);
    const photo = await updatePhoto(id, {
      status: "archived",
      updatedAt: new Date().toISOString(),
    });
    return Response.json(
      { photo: photo ? studioPhoto(photo) : null, recoverable: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError("Unable to archive photo", 503, storageUnavailableMessage(error));
  }
}
