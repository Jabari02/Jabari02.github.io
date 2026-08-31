import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

/* The catalog contains runtime R2 URLs as well as local assets. */
/* eslint-disable @next/next/no-img-element */

import { buildFallbackAlbums, photosForAlbum } from "@/content/photos/albums";
import { formatLocation, formatPhotoDate, staticPhotos, type Album, type Photo } from "@/content/photos/catalog";
import { getPublicPhotoCatalog } from "@/content/photos/server";
import { sitePath } from "@/lib/site-path";
import { ArchiveHeader } from "../../ArchiveHeader";
import { PhotoMetadata } from "../../PhotoMetadata";

type PhotoPageProps = { params: Promise<{ albumSlug: string; photoSlug: string }> };

export function generateStaticParams() {
  const albums = buildFallbackAlbums(staticPhotos);
  return albums.flatMap((album) => photosForAlbum(staticPhotos, album.slug).map((photo) => ({
    albumSlug: album.slug,
    photoSlug: photo.slug ?? photo.id,
  })));
}

function resolvePhoto(allPhotos: Photo[], albums: Album[], albumSlug: string, photoSlug: string) {
  const photos = photosForAlbum(allPhotos, albumSlug);
  const index = photos.findIndex((photo) => (photo.slug ?? photo.id) === photoSlug);
  return { photos, index, photo: photos[index], album: albums.find((item) => item.slug === albumSlug) };
}

export async function generateMetadata({ params }: PhotoPageProps): Promise<Metadata> {
  const { albumSlug, photoSlug } = await params;
  const catalog = await getPublicPhotoCatalog();
  const { photo } = resolvePhoto(catalog.photos, catalog.albums, albumSlug, photoSlug);
  if (!photo) return { title: "照片未找到 — Jabari" };
  const imageUrl = process.env.GITHUB_PAGES === "true"
    ? photo.src
    : await getRuntimeImageUrl(photo.src);
  return {
    title: `${photo.title} — Jabari 影像档案`,
    description: `${formatLocation(photo)}，拍摄于 ${formatPhotoDate(photo)}。`,
    openGraph: { title: photo.title, description: `${formatLocation(photo)} · ${formatPhotoDate(photo)}`, images: [imageUrl] },
    twitter: { card: "summary_large_image", title: photo.title, description: `${formatLocation(photo)} · ${formatPhotoDate(photo)}`, images: [imageUrl] },
  };
}

async function getRuntimeImageUrl(src: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return new URL(src, `${protocol}://${host}`).toString();
}

export default async function PhotoPage({ params }: PhotoPageProps) {
  const { albumSlug, photoSlug } = await params;
  const catalog = await getPublicPhotoCatalog();
  const { photos, index, photo, album } = resolvePhoto(catalog.photos, catalog.albums, albumSlug, photoSlug);
  if (!photo) notFound();
  const previous = photos[(index - 1 + photos.length) % photos.length];
  const next = photos[(index + 1) % photos.length];

  return <main className="single-photo-route">
    <ArchiveHeader index={String(index + 1).padStart(2, "0")} />
    <section className="single-photo-stage">
      <div className="single-photo-stage-head"><span>{album?.title ?? "影像档案"}</span><span>{String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span></div>
      <div className={`single-photo-frame ${photo.className}`}><img src={sitePath(photo.src)} alt={photo.alt} width={photo.width} height={photo.height} /></div>
      <div className="single-photo-title"><div><span className="photos-route-kicker">/ FRAME / {photo.year}</span><h1>{photo.title}</h1></div><p>{formatLocation(photo)}<br />{formatPhotoDate(photo)}</p></div>
      <PhotoMetadata photo={photo} />
      <nav className="single-photo-nav" aria-label="照片前后切换">
        <Link href={sitePath(`/photos/${albumSlug}/${encodeURIComponent(previous.slug ?? previous.id)}`)}>← <span>上一张</span><strong>{previous.title}</strong></Link>
        <Link href={sitePath(`/photos/${albumSlug}`)}>返回影集</Link>
        <Link href={sitePath(`/photos/${albumSlug}/${encodeURIComponent(next.slug ?? next.id)}`)}><span>下一张</span><strong>{next.title}</strong> →</Link>
      </nav>
    </section>
  </main>;
}
