import {
  formatExposure,
  formatFocalLength,
  formatLocation,
  formatPhotoDate,
  type Photo,
} from "@/content/photos/catalog";

export function PhotoMetadata({ photo }: { photo: Photo }) {
  const rows = [
    ["相机", photo.exif.camera ?? "—"],
    ["镜头", photo.exif.lens ?? "—"],
    ["焦距", formatFocalLength(photo)],
    ["光圈", photo.exif.aperture ? `f/${Number(photo.exif.aperture.toFixed(1))}` : "—"],
    ["快门", formatExposure(photo.exif.exposureTime)],
    ["ISO", photo.exif.iso ? String(photo.exif.iso) : "—"],
    ["地点", formatLocation(photo)],
    ["拍摄时间", formatPhotoDate(photo)],
  ];

  return <dl className="route-photo-metadata">
    {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>;
}
