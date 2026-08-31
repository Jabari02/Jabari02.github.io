import type { Album, Photo, PhotoTheme } from "./catalog";

const themeAlbumCopy: Record<PhotoTheme, Omit<Album, "id" | "slug" | "photoCount" | "coverPhotoId">> = {
  city: {
    title: "城市与留白",
    description: "街道、建筑和人在城市光线里留下的短暂停顿。",
    location: "上海 / 城市",
    period: "2025—26",
  },
  nature: {
    title: "光线与边界",
    description: "河岸、海岸与黄昏之间，不断改变的边界。",
    location: "河岸 / 海岸",
    period: "2024—26",
  },
  water: {
    title: "落日入水",
    description: "潮汐、浅水和太阳离开地平线前的几分钟。",
    location: "海边",
    period: "2023—24",
  },
  other: {
    title: "尚未归档",
    description: "刚刚进入档案、还在等待名字和位置的照片。",
    location: "未分类",
    period: "持续更新",
  },
};

export function albumSlugForPhoto(photo: Photo) {
  return photo.albumSlug || photo.theme;
}

export function buildFallbackAlbums(photos: Photo[]): Album[] {
  const grouped = new Map<string, Photo[]>();
  for (const photo of photos) {
    const slug = albumSlugForPhoto(photo);
    grouped.set(slug, [...(grouped.get(slug) ?? []), photo]);
  }

  return [...grouped.entries()].map(([slug, albumPhotos]) => {
    const theme = albumPhotos[0]?.theme ?? "other";
    const copy = themeAlbumCopy[theme];
    return {
      id: `fallback-${slug}`,
      slug,
      ...copy,
      coverPhotoId: albumPhotos[0]?.id ?? null,
      photoCount: albumPhotos.length,
    };
  });
}

export function photosForAlbum(photos: Photo[], albumSlug: string) {
  return photos.filter((photo) => albumSlugForPhoto(photo) === albumSlug);
}
