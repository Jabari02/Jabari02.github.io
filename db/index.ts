import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type D1PreparedStatement = object;
type D1Binding = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
};

let photoSchemaInitialization: Promise<void> | null = null;

function getD1Binding() {
  const binding = (env as unknown as { DB?: D1Binding }).DB;

  if (!binding) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }
  return binding;
}

export function getDb() {
  return drizzle(getD1Binding() as Parameters<typeof drizzle>[0], { schema });
}

/**
 * Makes a fresh local/preview D1 immediately usable. Hosted environments still
 * apply the checked-in Drizzle migration; these idempotent statements are a
 * first-request safety net, not a replacement for migrations.
 */
export function ensurePhotoSchema() {
  if (!photoSchemaInitialization) {
    const d1 = getD1Binding();
    const statements = [
      `CREATE TABLE IF NOT EXISTS albums (
        id text PRIMARY KEY NOT NULL,
        slug text NOT NULL,
        title text NOT NULL,
        description text,
        location text,
        period text,
        theme text DEFAULT 'other' NOT NULL,
        cover_photo_id text,
        status text DEFAULT 'draft' NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        published_at text,
        CONSTRAINT albums_status_check CHECK(status in ('draft', 'published', 'archived')),
        CONSTRAINT albums_theme_check CHECK(theme in ('city', 'nature', 'water', 'other'))
      )`,
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_albums_slug ON albums (slug)",
      "CREATE INDEX IF NOT EXISTS idx_albums_public_order ON albums (status, sort_order, published_at)",
      `CREATE TABLE IF NOT EXISTS photos (
        id text PRIMARY KEY NOT NULL,
        slug text NOT NULL,
        album_id text REFERENCES albums(id) ON UPDATE cascade ON DELETE set null,
        title text NOT NULL,
        alt text DEFAULT '' NOT NULL,
        location text DEFAULT '未标记' NOT NULL,
        theme text DEFAULT 'other' NOT NULL,
        original_filename text NOT NULL,
        original_r2_key text NOT NULL,
        original_content_type text NOT NULL,
        original_size integer NOT NULL,
        web_r2_key text NOT NULL,
        web_content_type text,
        web_size integer,
        width integer,
        height integer,
        uploaded_at text NOT NULL,
        taken_at text,
        published_at text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        camera text,
        lens text,
        focal_length real,
        focal_length_35mm real,
        aperture real,
        exposure_time real,
        iso integer,
        latitude real,
        longitude real,
        gps_visibility text DEFAULT 'exact' NOT NULL,
        status text DEFAULT 'draft' NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        CONSTRAINT photos_status_check CHECK(status in ('draft', 'published', 'archived')),
        CONSTRAINT photos_theme_check CHECK(theme in ('city', 'nature', 'water', 'other')),
        CONSTRAINT photos_gps_visibility_check CHECK(gps_visibility in ('exact', 'coarse', 'hidden')),
        CONSTRAINT photos_original_size_check CHECK(original_size > 0),
        CONSTRAINT photos_dimensions_check CHECK((width is null or width > 0) and (height is null or height > 0)),
        CONSTRAINT photos_latitude_check CHECK(latitude is null or (latitude >= -90 and latitude <= 90)),
        CONSTRAINT photos_longitude_check CHECK(longitude is null or (longitude >= -180 and longitude <= 180))
      )`,
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_slug ON photos (slug)",
      "CREATE INDEX IF NOT EXISTS idx_photos_public_newest ON photos (status, published_at, uploaded_at)",
      "CREATE INDEX IF NOT EXISTS idx_photos_album_order ON photos (album_id, status, sort_order)",
      "PRAGMA optimize",
    ].map((statement) => d1.prepare(statement));

    photoSchemaInitialization = d1.batch(statements).then(() => undefined);
    photoSchemaInitialization.catch(() => {
      photoSchemaInitialization = null;
    });
  }
  return photoSchemaInitialization;
}
