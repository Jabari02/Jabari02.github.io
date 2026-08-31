import generatedCatalog from "./photos.generated.json";

export type PhotoTheme = "city" | "nature" | "water" | "other";
export type GpsVisibility = "exact" | "coarse" | "hidden";
export type PhotoStatus = "draft" | "published" | "archived";

export type PhotoExif = {
  camera?: string;
  lens?: string;
  focalLength?: number;
  focalLength35mm?: number;
  aperture?: number;
  exposureTime?: number;
  iso?: number;
  latitude?: number;
  longitude?: number;
};

export type Photo = {
  id: string;
  slug?: string;
  albumSlug?: string | null;
  originalFilename?: string;
  webFilename?: string;
  src: string;
  alt: string;
  title: string;
  location: string;
  year: string;
  theme: PhotoTheme;
  className: string;
  width: number;
  height: number;
  uploadedAt: string;
  takenAt: string;
  publishedAt?: string | null;
  gpsVisibility?: GpsVisibility;
  status?: PhotoStatus;
  exif: PhotoExif;
};

export type Album = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  location?: string | null;
  period?: string | null;
  coverPhotoId?: string | null;
  photoCount?: number;
};

export const staticPhotos = sortPhotosNewest(generatedCatalog as unknown as Photo[]);

export const filterLabels: Record<"all" | PhotoTheme, string> = {
  all: "全部",
  city: "城市",
  nature: "自然",
  water: "水面",
  other: "其他",
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai",
});

export function sortPhotosNewest(input: Photo[]) {
  return [...input].sort((a, b) => {
    const uploadDelta = Date.parse(b.publishedAt ?? b.uploadedAt) - Date.parse(a.publishedAt ?? a.uploadedAt);
    return uploadDelta || Date.parse(b.takenAt) - Date.parse(a.takenAt);
  });
}

export function mergePhotoCatalog(primary: Photo[], fallback: Photo[] = staticPhotos) {
  const seen = new Set<string>();
  const merged: Photo[] = [];

  for (const photo of [...primary, ...fallback]) {
    const identity = photo.id || `${photo.albumSlug ?? photo.theme}/${photo.slug ?? photo.src}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    merged.push(photo);
  }

  return sortPhotosNewest(merged);
}

export function formatExposure(value?: number) {
  if (!value) return "—";
  if (value >= 1) return `${Number(value.toFixed(1))}s`;
  return `1/${Math.max(1, Math.round(1 / value))}s`;
}

export function formatFocalLength(photo: Photo) {
  const { focalLength, focalLength35mm } = photo.exif;
  if (!focalLength && !focalLength35mm) return "—";
  if (focalLength && focalLength35mm && Math.round(focalLength) !== Math.round(focalLength35mm)) {
    return `${Number(focalLength.toFixed(1))}mm / ${Math.round(focalLength35mm)}mm EQ`;
  }
  return `${Number((focalLength ?? focalLength35mm ?? 0).toFixed(1))}mm`;
}

export function formatCoordinates(photo: Photo) {
  const { latitude, longitude } = photo.exif;
  if (photo.gpsVisibility === "hidden" || latitude == null || longitude == null) return null;
  const precision = photo.gpsVisibility === "coarse" ? 2 : 4;
  return `${Math.abs(latitude).toFixed(precision)}° ${latitude >= 0 ? "N" : "S"} · ${Math.abs(longitude).toFixed(precision)}° ${longitude >= 0 ? "E" : "W"}`;
}

export function formatLocation(photo: Photo) {
  const coordinates = formatCoordinates(photo);
  if (coordinates && photo.location !== "未标记") return `${photo.location} / ${coordinates}`;
  return coordinates ?? photo.location;
}

export function formatPhotoDate(photo: Photo) {
  return dateFormatter.format(new Date(photo.takenAt)).replaceAll("/", ".");
}

export function photoHref(photo: Photo) {
  return `/photos/${encodeURIComponent(photo.albumSlug || photo.theme)}/${encodeURIComponent(photo.slug ?? photo.id)}`;
}
