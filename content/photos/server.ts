import { buildFallbackAlbums } from "./albums";
import {
  mergePhotoCatalog,
  staticPhotos,
  type Album,
  type Photo,
} from "./catalog";

type PublishedCatalog = {
  photos: Photo[];
  albums: Album[];
};

function mergeAlbums(photos: Photo[], storedAlbums: Album[]) {
  const fallbackAlbums = buildFallbackAlbums(photos);
  const storedBySlug = new Map(storedAlbums.map((album) => [album.slug, album]));
  const merged: Album[] = fallbackAlbums.map((album) => ({
    ...album,
    ...storedBySlug.get(album.slug),
    photoCount: photos.filter((photo) => (photo.albumSlug || photo.theme) === album.slug).length,
  }));

  const existing = new Set(merged.map((album) => album.slug));
  for (const album of storedAlbums) {
    if (!existing.has(album.slug)) merged.push(album);
  }
  return merged;
}

/**
 * Reads the durable D1 catalog when the binding and schema are available, then
 * keeps the bundled photographs as an offline/first-deploy fallback. Uploaded
 * photographs win on id collisions and sort ahead by their publication time.
 */
export async function getPublicPhotoCatalog(): Promise<PublishedCatalog> {
  let stored: PublishedCatalog = { photos: [], albums: [] };
  try {
    const { getPublishedCatalog } = await import("@/lib/photos/repository");
    const catalog = await getPublishedCatalog();
    stored = catalog as PublishedCatalog;
  } catch {
    // Local previews and a brand-new deployment must remain readable before
    // the D1 binding has been initialized.
  }

  const photos = mergePhotoCatalog(stored.photos, staticPhotos);
  return { photos, albums: mergeAlbums(photos, stored.albums) };
}
