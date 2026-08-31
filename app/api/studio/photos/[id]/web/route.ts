import { requireStudioOwner } from "@/lib/photos/auth";
import {
  finiteInteger,
  imageContentType,
  jsonError,
  MAX_WEB_BYTES,
  requestLength,
  safeFilename,
  storageUnavailableMessage,
  WEB_IMAGE_TYPES,
} from "@/lib/photos/http";
import { getPhotoById, updatePhoto } from "@/lib/photos/repository";
import { putPhotoObject } from "@/lib/photos/storage";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireStudioOwner(request);
  if (!authorization.ok) return authorization.response;

  const { id } = await params;
  try {
    const photo = await getPhotoById(id);
    if (!photo) return jsonError("Photo draft not found", 404);
    if (photo.status === "archived") {
      return jsonError("Archived photos cannot accept uploads", 409);
    }

    const length = requestLength(request, MAX_WEB_BYTES);
    if (!length.ok) return jsonError(length.error, length.status);
    const contentType = imageContentType(request.headers.get("content-type"));
    if (!WEB_IMAGE_TYPES.has(contentType)) {
      return jsonError("Web image must be JPEG, PNG, WebP, or AVIF", 415);
    }
    if (!request.body) return jsonError("Image body is required", 400);

    const widthHeader = request.headers.get("x-image-width");
    const heightHeader = request.headers.get("x-image-height");
    const width = widthHeader
      ? finiteInteger(Number(widthHeader), { min: 1, max: 100_000 })
      : null;
    const height = heightHeader
      ? finiteInteger(Number(heightHeader), { min: 1, max: 100_000 })
      : null;
    if (width === undefined || height === undefined) {
      return jsonError("Invalid image dimensions", 400);
    }

    const extension =
      contentType === "image/jpeg" ? "jpg" : contentType.replace("image/", "");
    const object = await putPhotoObject({
      key: photo.webR2Key,
      body: request.body,
      contentType,
      filename: safeFilename(`${photo.slug}.${extension}`),
      photoId: photo.id,
      kind: "web",
    });
    const updated = await updatePhoto(photo.id, {
      webContentType: contentType,
      webSize: length.bytes,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      updatedAt: new Date().toISOString(),
    });
    return Response.json(
      { ok: true, size: length.bytes, etag: object.etag, photo: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError("Unable to store web photo", 503, storageUnavailableMessage(error));
  }
}
