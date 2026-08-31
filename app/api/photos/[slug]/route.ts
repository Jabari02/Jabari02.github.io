import { jsonError, storageUnavailableMessage } from "@/lib/photos/http";
import {
  getPublishedPhotoBySlug,
  publicPhoto,
} from "@/lib/photos/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const record = await getPublishedPhotoBySlug(slug);
    if (!record) return jsonError("Photo not found", 404);
    return Response.json(
      { photo: publicPhoto(record.photo, record.album) },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } },
    );
  } catch (error) {
    return jsonError("Photo catalog unavailable", 503, storageUnavailableMessage(error));
  }
}
