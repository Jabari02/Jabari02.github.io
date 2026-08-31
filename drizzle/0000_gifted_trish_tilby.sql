CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`location` text,
	`period` text,
	`theme` text DEFAULT 'other' NOT NULL,
	`cover_photo_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text,
	CONSTRAINT "albums_status_check" CHECK("albums"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "albums_theme_check" CHECK("albums"."theme" in ('city', 'nature', 'water', 'other'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_albums_slug` ON `albums` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_albums_public_order` ON `albums` (`status`,`sort_order`,`published_at`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`album_id` text,
	`title` text NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '未标记' NOT NULL,
	`theme` text DEFAULT 'other' NOT NULL,
	`original_filename` text NOT NULL,
	`original_r2_key` text NOT NULL,
	`original_content_type` text NOT NULL,
	`original_size` integer NOT NULL,
	`web_r2_key` text NOT NULL,
	`web_content_type` text,
	`web_size` integer,
	`width` integer,
	`height` integer,
	`uploaded_at` text NOT NULL,
	`taken_at` text,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`camera` text,
	`lens` text,
	`focal_length` real,
	`focal_length_35mm` real,
	`aperture` real,
	`exposure_time` real,
	`iso` integer,
	`latitude` real,
	`longitude` real,
	`gps_visibility` text DEFAULT 'exact' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "photos_status_check" CHECK("photos"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "photos_theme_check" CHECK("photos"."theme" in ('city', 'nature', 'water', 'other')),
	CONSTRAINT "photos_gps_visibility_check" CHECK("photos"."gps_visibility" in ('exact', 'coarse', 'hidden')),
	CONSTRAINT "photos_original_size_check" CHECK("photos"."original_size" > 0),
	CONSTRAINT "photos_dimensions_check" CHECK(("photos"."width" is null or "photos"."width" > 0) and ("photos"."height" is null or "photos"."height" > 0)),
	CONSTRAINT "photos_latitude_check" CHECK("photos"."latitude" is null or ("photos"."latitude" >= -90 and "photos"."latitude" <= 90)),
	CONSTRAINT "photos_longitude_check" CHECK("photos"."longitude" is null or ("photos"."longitude" >= -180 and "photos"."longitude" <= 180))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_photos_slug` ON `photos` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_photos_public_newest` ON `photos` (`status`,`published_at`,`uploaded_at`);--> statement-breakpoint
CREATE INDEX `idx_photos_album_order` ON `photos` (`album_id`,`status`,`sort_order`);