import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const contentStatuses = ["draft", "published", "archived"] as const;
export const gpsVisibilities = ["exact", "coarse", "hidden"] as const;
export const photoThemes = ["city", "nature", "water", "other"] as const;

export type ContentStatus = (typeof contentStatuses)[number];
export type GpsVisibility = (typeof gpsVisibilities)[number];
export type PhotoTheme = (typeof photoThemes)[number];

export const albums = sqliteTable(
  "albums",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    period: text("period"),
    theme: text("theme", { enum: photoThemes }).notNull().default("other"),
    coverPhotoId: text("cover_photo_id"),
    status: text("status", { enum: contentStatuses })
      .notNull()
      .default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    publishedAt: text("published_at"),
  },
  (table) => [
    uniqueIndex("idx_albums_slug").on(table.slug),
    index("idx_albums_public_order").on(
      table.status,
      table.sortOrder,
      table.publishedAt,
    ),
    check(
      "albums_status_check",
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
    check(
      "albums_theme_check",
      sql`${table.theme} in ('city', 'nature', 'water', 'other')`,
    ),
  ],
);

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    albumId: text("album_id").references(() => albums.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    title: text("title").notNull(),
    alt: text("alt").notNull().default(""),
    location: text("location").notNull().default("未标记"),
    theme: text("theme", { enum: photoThemes }).notNull().default("other"),

    originalFilename: text("original_filename").notNull(),
    originalR2Key: text("original_r2_key").notNull(),
    originalContentType: text("original_content_type").notNull(),
    originalSize: integer("original_size").notNull(),
    webR2Key: text("web_r2_key").notNull(),
    webContentType: text("web_content_type"),
    webSize: integer("web_size"),
    width: integer("width"),
    height: integer("height"),

    uploadedAt: text("uploaded_at").notNull(),
    takenAt: text("taken_at"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),

    camera: text("camera"),
    lens: text("lens"),
    focalLength: real("focal_length"),
    focalLength35mm: real("focal_length_35mm"),
    aperture: real("aperture"),
    exposureTime: real("exposure_time"),
    iso: integer("iso"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    gpsVisibility: text("gps_visibility", { enum: gpsVisibilities })
      .notNull()
      .default("exact"),

    status: text("status", { enum: contentStatuses })
      .notNull()
      .default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("idx_photos_slug").on(table.slug),
    index("idx_photos_public_newest").on(
      table.status,
      table.publishedAt,
      table.uploadedAt,
    ),
    index("idx_photos_album_order").on(
      table.albumId,
      table.status,
      table.sortOrder,
    ),
    check(
      "photos_status_check",
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
    check(
      "photos_theme_check",
      sql`${table.theme} in ('city', 'nature', 'water', 'other')`,
    ),
    check(
      "photos_gps_visibility_check",
      sql`${table.gpsVisibility} in ('exact', 'coarse', 'hidden')`,
    ),
    check("photos_original_size_check", sql`${table.originalSize} > 0`),
    check(
      "photos_dimensions_check",
      sql`(${table.width} is null or ${table.width} > 0) and (${table.height} is null or ${table.height} > 0)`,
    ),
    check(
      "photos_latitude_check",
      sql`${table.latitude} is null or (${table.latitude} >= -90 and ${table.latitude} <= 90)`,
    ),
    check(
      "photos_longitude_check",
      sql`${table.longitude} is null or (${table.longitude} >= -180 and ${table.longitude} <= 180)`,
    ),
  ],
);

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
