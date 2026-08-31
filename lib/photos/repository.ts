import { and, asc, desc, eq, sql } from "drizzle-orm";
import { ensurePhotoSchema, getDb } from "@/db";
import {
  albums,
  photos,
  type Album,
  type NewPhoto,
  type Photo,
  type PhotoTheme,
} from "@/db/schema";
import { slugify } from "./http";

type Db = ReturnType<typeof getDb>;

export async function getReadyDb() {
  await ensurePhotoSchema();
  return getDb();
}

function publicCoordinates(photo: Photo) {
  if (
    photo.gpsVisibility === "hidden" ||
    photo.latitude == null ||
    photo.longitude == null
  ) {
    return { latitude: undefined, longitude: undefined };
  }
  if (photo.gpsVisibility === "coarse") {
    return {
      latitude: Math.round(photo.latitude * 10) / 10,
      longitude: Math.round(photo.longitude * 10) / 10,
    };
  }
  return { latitude: photo.latitude, longitude: photo.longitude };
}

function publicAlbum(album: Album, photoCount = 0) {
  return {
    id: album.id,
    slug: album.slug,
    title: album.title,
    description: album.description,
    location: album.location,
    period: album.period,
    theme: album.theme,
    coverPhotoId: album.coverPhotoId,
    sortOrder: album.sortOrder,
    publishedAt: album.publishedAt,
    photoCount,
  };
}

export function publicPhoto(photo: Photo, album?: Album | null) {
  const coordinates = publicCoordinates(photo);
  const takenAt = photo.takenAt ?? photo.uploadedAt;
  return {
    id: photo.id,
    slug: photo.slug,
    albumSlug: album?.slug ?? null,
    src: `/media/photos/${encodeURIComponent(photo.id)}`,
    title: photo.title,
    alt: photo.alt,
    location: photo.location,
    theme: photo.theme,
    className: "",
    width: photo.width ?? 1600,
    height: photo.height ?? 1200,
    year: takenAt.slice(0, 4),
    uploadedAt: photo.uploadedAt,
    takenAt,
    publishedAt: photo.publishedAt,
    gpsVisibility: photo.gpsVisibility,
    status: photo.status,
    sortOrder: photo.sortOrder,
    exif: {
      camera: photo.camera ?? undefined,
      lens: photo.lens ?? undefined,
      focalLength: photo.focalLength ?? undefined,
      focalLength35mm: photo.focalLength35mm ?? undefined,
      aperture: photo.aperture ?? undefined,
      exposureTime: photo.exposureTime ?? undefined,
      iso: photo.iso ?? undefined,
      ...coordinates,
    },
  };
}

export function studioPhoto(photo: Photo, album?: Album | null) {
  return {
    ...photo,
    albumSlug: album?.slug ?? null,
    src: photo.webContentType
      ? `/media/photos/${encodeURIComponent(photo.id)}`
      : null,
    exif: {
      camera: photo.camera,
      lens: photo.lens,
      focalLength: photo.focalLength,
      focalLength35mm: photo.focalLength35mm,
      aperture: photo.aperture,
      exposureTime: photo.exposureTime,
      iso: photo.iso,
      latitude: photo.latitude,
      longitude: photo.longitude,
    },
  };
}

export async function getPublishedCatalog() {
  const db = await getReadyDb();
  const [photoRows, albumRows] = await Promise.all([
    db
      .select()
      .from(photos)
      .where(eq(photos.status, "published"))
      .orderBy(
        desc(sql`coalesce(${photos.publishedAt}, ${photos.uploadedAt})`),
        desc(photos.uploadedAt),
        asc(photos.sortOrder),
      ),
    db
      .select()
      .from(albums)
      .where(eq(albums.status, "published"))
      .orderBy(asc(albums.sortOrder), desc(albums.publishedAt)),
  ]);
  const albumById = new Map(albumRows.map((album) => [album.id, album]));
  const photoCounts = new Map<string, number>();
  for (const photo of photoRows) {
    if (photo.albumId) {
      photoCounts.set(photo.albumId, (photoCounts.get(photo.albumId) ?? 0) + 1);
    }
  }
  return {
    photos: photoRows.map((photo) =>
      publicPhoto(photo, photo.albumId ? albumById.get(photo.albumId) : null),
    ),
    albums: albumRows
      .filter((album) => (photoCounts.get(album.id) ?? 0) > 0)
      .map((album) => publicAlbum(album, photoCounts.get(album.id) ?? 0)),
  };
}

export async function getStudioCatalog() {
  const db = await getReadyDb();
  const [photoRows, albumRows] = await Promise.all([
    db
      .select()
      .from(photos)
      .orderBy(desc(photos.uploadedAt), asc(photos.sortOrder)),
    db.select().from(albums).orderBy(asc(albums.sortOrder), asc(albums.title)),
  ]);
  const albumById = new Map(albumRows.map((album) => [album.id, album]));
  return {
    photos: photoRows.map((photo) =>
      studioPhoto(photo, photo.albumId ? albumById.get(photo.albumId) : null),
    ),
    albums: albumRows,
  };
}

export async function getPhotoById(id: string) {
  const [photo] = await (await getReadyDb())
    .select()
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1);
  return photo ?? null;
}

export async function getPublishedPhotoBySlug(slug: string) {
  const db = await getReadyDb();
  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.slug, slug), eq(photos.status, "published")))
    .limit(1);
  if (!photo) return null;
  const [album] = photo.albumId
    ? await db.select().from(albums).where(eq(albums.id, photo.albumId)).limit(1)
    : [];
  return { photo, album: album ?? null };
}

export async function getPublishedAlbumBySlug(slug: string) {
  const db = await getReadyDb();
  const [album] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.slug, slug), eq(albums.status, "published")))
    .limit(1);
  if (!album) return null;
  const photoRows = await db
    .select()
    .from(photos)
    .where(and(eq(photos.albumId, album.id), eq(photos.status, "published")))
    .orderBy(asc(photos.sortOrder), desc(photos.publishedAt));
  if (photoRows.length === 0) return null;
  return {
    album: publicAlbum(album, photoRows.length),
    photos: photoRows.map((photo) => publicPhoto(photo, album)),
  };
}

export async function createPhoto(values: NewPhoto) {
  const [photo] = await (await getReadyDb())
    .insert(photos)
    .values(values)
    .returning();
  return photo;
}

export async function getOrCreateAlbum(
  db: Db,
  requestedSlug: string,
  theme: PhotoTheme,
) {
  const slug = slugify(requestedSlug);
  const [existing] = await db
    .select()
    .from(albums)
    .where(eq(albums.slug, slug))
    .limit(1);
  if (existing) return existing;

  const now = new Date().toISOString();
  const [album] = await db
    .insert(albums)
    .values({
      id: crypto.randomUUID(),
      slug,
      title: slug.replaceAll("-", " "),
      description: "持续收录中的个人影像影集。",
      theme,
      status: "draft",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!album) throw new Error("Unable to create album");
  return album;
}

export async function updateAlbum(
  id: string,
  values: Partial<typeof albums.$inferInsert>,
) {
  const [album] = await (await getReadyDb())
    .update(albums)
    .set(values)
    .where(eq(albums.id, id))
    .returning();
  return album ?? null;
}

export async function ensureUniquePhotoSlug(
  db: Db,
  requested: string,
  currentId?: string,
) {
  const base = slugify(requested);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [existing] = await db
      .select({ id: photos.id })
      .from(photos)
      .where(eq(photos.slug, candidate))
      .limit(1);
    if (!existing || existing.id === currentId) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function updatePhoto(
  id: string,
  values: Partial<typeof photos.$inferInsert>,
) {
  const [photo] = await (await getReadyDb())
    .update(photos)
    .set(values)
    .where(eq(photos.id, id))
    .returning();
  return photo ?? null;
}
