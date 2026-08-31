import { jsonError, storageUnavailableMessage } from "@/lib/photos/http";
import { getPublishedAlbumBySlug } from "@/lib/photos/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const album = await getPublishedAlbumBySlug(slug);
    if (!album) return jsonError("Album not found", 404);
    return Response.json(album, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=120" },
    });
  } catch (error) {
    return jsonError("Album catalog unavailable", 503, storageUnavailableMessage(error));
  }
}
