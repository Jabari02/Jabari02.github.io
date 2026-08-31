import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/* The catalog contains runtime R2 URLs as well as local assets. */
/* eslint-disable @next/next/no-img-element */

import { buildFallbackAlbums, photosForAlbum } from "@/content/photos/albums";
import { formatPhotoDate, staticPhotos } from "@/content/photos/catalog";
import { getPublicPhotoCatalog } from "@/content/photos/server";
import { sitePath } from "@/lib/site-path";
import { ArchiveHeader } from "../ArchiveHeader";

type AlbumPageProps = { params: Promise<{ albumSlug: string }> };

export function generateStaticParams() {
  return buildFallbackAlbums(staticPhotos).map((album) => ({ albumSlug: album.slug }));
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const { albumSlug } = await params;
  const { albums } = await getPublicPhotoCatalog();
  const album = albums.find((item) => item.slug === albumSlug);
  return album ? {
    title: `${album.title} — Jabari 影集`,
    description: album.description ?? "Jabari 的个人摄影影集。",
  } : { title: "影集未找到 — Jabari" };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { albumSlug } = await params;
  const { photos: allPhotos, albums } = await getPublicPhotoCatalog();
  const album = albums.find((item) => item.slug === albumSlug);
  if (!album) notFound();
  const photos = photosForAlbum(allPhotos, albumSlug);

  return <main>
    <ArchiveHeader index={String(albums.findIndex((item) => item.slug === albumSlug) + 1).padStart(2, "0")} />
    <section className="album-route-hero">
      <div><span className="photos-route-kicker">/ ALBUM / {album.period}</span><h1>{album.title}</h1></div>
      <div><p>{album.description}</p><dl><div><dt>地点</dt><dd>{album.location}</dd></div><div><dt>照片</dt><dd>{photos.length} 张</dd></div></dl></div>
    </section>

    <section className="editorial-photo-flow" aria-label={`${album.title}照片列表`}>
      {photos.map((photo, index) => <Link className={`editorial-photo-item ${photo.className}`} href={sitePath(`/photos/${albumSlug}/${encodeURIComponent(photo.slug ?? photo.id)}`)} key={photo.id}>
        <span className="editorial-photo-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="editorial-photo-image"><img src={sitePath(photo.src)} alt={photo.alt} width={photo.width} height={photo.height} loading={index > 1 ? "lazy" : "eager"} /></span>
        <span className="editorial-photo-caption"><strong>{photo.title}</strong><span>{photo.location} · {formatPhotoDate(photo)}</span><span>{photo.exif.camera ?? "CAMERA —"} / ISO {photo.exif.iso ?? "—"}</span></span>
      </Link>)}
    </section>

    <footer className="photos-route-footer"><Link href={sitePath("/photos")}>← 返回影集目录</Link><Link href={sitePath("/#archive")}>进入暗房模式 ↗</Link></footer>
  </main>;
}
