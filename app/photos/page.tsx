import type { Metadata } from "next";
import Link from "next/link";

/* The catalog contains runtime R2 URLs as well as local assets. */
/* eslint-disable @next/next/no-img-element */

import { photosForAlbum } from "@/content/photos/albums";
import { formatPhotoDate, photoHref } from "@/content/photos/catalog";
import { getPublicPhotoCatalog } from "@/content/photos/server";
import { sitePath } from "@/lib/site-path";
import { ArchiveHeader } from "./ArchiveHeader";

export const metadata: Metadata = {
  title: "影集 — Jabari Personal Archive",
  description: "按影集、时间和拍摄信息浏览 Jabari 的个人影像档案。",
};

export const dynamic = process.env.GITHUB_PAGES === "true" ? "force-static" : "force-dynamic";

export default async function PhotosIndexPage() {
  const { photos, albums } = await getPublicPhotoCatalog();
  const latest = photos.slice(0, 3);

  return <main>
    <ArchiveHeader />
    <section className="photos-index-hero">
      <span className="photos-route-kicker">/ SELECTED IMAGES / 2023—26</span>
      <h1>把照片放回<br /><em>时间里面。</em></h1>
      <p>这里不是无限滚动的信息流。先进入一组影集，再慢慢看一张照片如何靠近下一张。</p>
    </section>

    <section className="photos-route-section">
      <div className="photos-route-section-head"><span>最新发布 / 03</span><span>NEWEST FRAMES</span></div>
      <div className="photos-latest-grid">
        {latest.map((photo, index) => <Link className={`photos-latest-card latest-${index + 1}`} href={sitePath(photoHref(photo))} key={photo.id}>
          <span className="photos-latest-image"><img src={sitePath(photo.src)} alt={photo.alt} width={photo.width} height={photo.height} /></span>
          <span className="photos-card-meta"><strong>{photo.title}</strong><span>{formatPhotoDate(photo)}</span><span>{photo.exif.camera ?? `ISO ${photo.exif.iso ?? "—"}`}</span></span>
        </Link>)}
      </div>
    </section>

    <section className="photos-route-section album-directory">
      <div className="photos-route-section-head"><span>影集目录 / {String(albums.length).padStart(2, "0")}</span><span>ALBUM INDEX</span></div>
      {albums.map((album, index) => {
        const albumPhotos = photosForAlbum(photos, album.slug);
        const cover = albumPhotos.find((photo) => photo.id === album.coverPhotoId) ?? albumPhotos[0];
        return <Link className="album-directory-row" href={sitePath(`/photos/${album.slug}`)} key={album.slug}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span className="album-directory-cover">{cover && <img src={sitePath(cover.src)} alt="" width={cover.width} height={cover.height} loading="lazy" />}</span>
          <span><strong>{album.title}</strong><small>{album.description}</small></span>
          <span>{album.location}<br />{album.period}</span>
          <span>{String(album.photoCount ?? 0).padStart(2, "0")} IMAGES</span>
          <span aria-hidden="true">↗</span>
        </Link>;
      })}
    </section>

    <footer className="photos-route-footer"><Link href={sitePath("/")}>← 返回首页</Link><span>JABARI / PERSONAL ARCHIVE</span></footer>
  </main>;
}
