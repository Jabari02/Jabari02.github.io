import { env } from "cloudflare:workers";

type PhotoObject = {
  body: ReadableStream<Uint8Array>;
  etag: string;
  httpEtag: string;
  size: number;
  uploaded: Date;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
    contentDisposition?: string;
  };
  writeHttpMetadata?: (headers: Headers) => void;
};

type PhotoObjectHead = Omit<PhotoObject, "body">;

type PhotoBucket = {
  get(key: string): Promise<PhotoObject | null>;
  head(key: string): Promise<PhotoObjectHead | null>;
  put(
    key: string,
    body: ReadableStream<Uint8Array>,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
        contentDisposition?: string;
      };
      customMetadata?: Record<string, string>;
    },
  ): Promise<PhotoObjectHead>;
};

export function getPhotoBucket(): PhotoBucket {
  const bucket = (env as unknown as { PHOTOS?: PhotoBucket }).PHOTOS;
  if (!bucket) {
    throw new Error(
      "Cloudflare R2 `PHOTOS` binding is unavailable. Set the `r2` field in .openai/hosting.json to `PHOTOS`.",
    );
  }
  return bucket;
}

export async function putPhotoObject(options: {
  key: string;
  body: ReadableStream<Uint8Array>;
  contentType: string;
  filename: string;
  photoId: string;
  kind: "original" | "web";
}) {
  return getPhotoBucket().put(options.key, options.body, {
    httpMetadata: {
      contentType: options.contentType,
      contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(options.filename)}`,
      ...(options.kind === "web"
        ? { cacheControl: "public, max-age=3600, s-maxage=86400" }
        : {}),
    },
    customMetadata: {
      photoId: options.photoId,
      kind: options.kind,
    },
  });
}

export function getPhotoObject(key: string) {
  return getPhotoBucket().get(key);
}

export function headPhotoObject(key: string) {
  return getPhotoBucket().head(key);
}
