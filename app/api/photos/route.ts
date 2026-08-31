import { getPublishedCatalog } from "@/lib/photos/repository";
import { storageUnavailableMessage } from "@/lib/photos/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getPublishedCatalog();
    return Response.json(
      { ...catalog, available: true },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } },
    );
  } catch (error) {
    return Response.json(
      {
        photos: [],
        albums: [],
        available: false,
        message: storageUnavailableMessage(error),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
