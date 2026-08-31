import { requireStudioOwner } from "@/lib/photos/auth";
import {
  imageContentType,
  jsonError,
  MAX_ORIGINAL_BYTES,
  requestLength,
  storageUnavailableMessage,
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

    const length = requestLength(request, MAX_ORIGINAL_BYTES);
    if (!length.ok) return jsonError(length.error, length.status);
    if (length.bytes !== photo.originalSize) {
      return jsonError(
        `Upload size does not match the declared ${photo.originalSize} bytes`,
        409,
      );
    }
    const contentType = imageContentType(request.headers.get("content-type"));
    if (contentType !== photo.originalContentType) {
      return jsonError("Upload content type does not match the draft", 415);
    }
    if (!request.body) return jsonError("Image body is required", 400);

    const object = await putPhotoObject({
      key: photo.originalR2Key,
      body: request.body,
      contentType,
      filename: photo.originalFilename,
      photoId: photo.id,
      kind: "original",
    });
    await updatePhoto(photo.id, { updatedAt: new Date().toISOString() });
    return Response.json(
      { ok: true, size: length.bytes, etag: object.etag },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError("Unable to store original photo", 503, storageUnavailableMessage(error));
  }
}
