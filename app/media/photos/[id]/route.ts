import { jsonError, storageUnavailableMessage } from "@/lib/photos/http";
import { getPhotoById } from "@/lib/photos/repository";
import { getPhotoObject } from "@/lib/photos/storage";

export const dynamic = "force-dynamic";

async function serve(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  headOnly: boolean,
) {
  const { id } = await params;
  try {
    const photo = await getPhotoById(id);
    if (!photo || photo.status !== "published" || !photo.webContentType) {
      return jsonError("Photo not found", 404);
    }
    const object = await getPhotoObject(photo.webR2Key);
    if (!object) return jsonError("Photo file not found", 404);

    const etag = object.httpEtag || `"${object.etag}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    const headers = new Headers();
    object.writeHttpMetadata?.(headers);
    headers.set("Content-Type", photo.webContentType);
    headers.set("Content-Length", String(object.size));
    headers.set("Content-Disposition", "inline");
    headers.set("ETag", etag);
    headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(headOnly ? null : object.body, { status: 200, headers });
  } catch (error) {
    return jsonError("Photo media unavailable", 503, storageUnavailableMessage(error));
  }
}

export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return serve(request, context, false);
}

export function HEAD(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return serve(request, context, true);
}
