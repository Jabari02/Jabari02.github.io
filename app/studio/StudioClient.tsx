"use client";

import { parse as parseExif } from "exifr";
import Link from "next/link";
import { sitePath } from "@/lib/site-path";
import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_EDGE = 2400;
const JPEG_QUALITY = 0.88;

type GpsVisibility = "exact" | "coarse" | "hidden";
type DraftStatus = "preparing" | "ready" | "publishing" | "published" | "error";

type PhotoExif = {
  camera: string | null;
  lens: string | null;
  focalLength: number | null;
  focalLength35mm: number | null;
  aperture: number | null;
  exposureTime: number | null;
  iso: number | null;
  latitude: number | null;
  longitude: number | null;
};

type DraftPhoto = {
  clientId: string;
  file: File;
  previewUrl: string;
  webBlob: Blob | null;
  webWidth: number;
  webHeight: number;
  title: string;
  alt: string;
  location: string;
  theme: "city" | "nature" | "water" | "other";
  albumSlug: string;
  takenAt: string | null;
  exif: PhotoExif;
  gpsVisibility: GpsVisibility;
  status: DraftStatus;
  progress: number;
  statusText: string;
  error: string | null;
  recordId: string | null;
  upload: { originalUrl: string; webUrl: string } | null;
};

type StudioRecord = {
  id: string;
  title?: string | null;
  status?: "draft" | "published" | "archived" | string;
  originalFilename?: string | null;
  filename?: string | null;
  albumSlug?: string | null;
  location?: string | null;
  uploadedAt?: string | null;
  publishedAt?: string | null;
  exif?: Partial<PhotoExif> | null;
};

type StudioClientProps = {
  ownerEmail: string;
  localAuthEmail: string | null;
};

type RawExif = Record<string, unknown>;

const EMPTY_EXIF: PhotoExif = {
  camera: null,
  lens: null,
  focalLength: null,
  focalLength35mm: null,
  aperture: null,
  exposureTime: null,
  iso: null,
  latitude: null,
  longitude: null,
};

export function StudioClient({ ownerEmail, localAuthEmail }: StudioClientProps) {
  const [drafts, setDrafts] = useState<DraftPhoto[]>([]);
  const [records, setRecords] = useState<StudioRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [publishingAll, setPublishingAll] = useState(false);
  const [globalStatus, setGlobalStatus] = useState("工作台已就绪");
  const inputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef<DraftPhoto[]>([]);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    return () => {
      for (const draft of draftsRef.current) URL.revokeObjectURL(draft.previewUrl);
    };
  }, []);

  const apiRequest = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const headers = new Headers(init.headers);
      if (localAuthEmail) headers.set("x-local-studio-owner", localAuthEmail);
      if (typeof init.body === "string" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(path, { ...init, headers, cache: "no-store" });
      if (!response.ok) throw new Error(await readResponseError(response));
      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    },
    [localAuthEmail],
  );

  const refreshRecords = useCallback(async () => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const result = await apiRequest<StudioRecord[] | { photos?: StudioRecord[]; records?: StudioRecord[] }>(
        "/api/studio/photos",
      );
      setRecords(Array.isArray(result) ? result : (result.photos ?? result.records ?? []));
    } catch (error) {
      setRecordsError(errorMessage(error));
    } finally {
      setRecordsLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<StudioRecord[] | { photos?: StudioRecord[]; records?: StudioRecord[] }>(
      "/api/studio/photos",
      { signal: controller.signal },
    )
      .then((result) => {
        setRecords(Array.isArray(result) ? result : (result.photos ?? result.records ?? []));
        setRecordsError(null);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setRecordsError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecordsLoading(false);
      });
    return () => controller.abort();
  }, [apiRequest]);

  const updateDraft = useCallback(
    (clientId: string, patch: Partial<DraftPhoto> | ((draft: DraftPhoto) => Partial<DraftPhoto>)) => {
      setDrafts((current) =>
        current.map((draft) => {
          if (draft.clientId !== clientId) return draft;
          const nextPatch = typeof patch === "function" ? patch(draft) : patch;
          return { ...draft, ...nextPatch };
        }),
      );
    },
    [],
  );

  const prepareFiles = useCallback(
    async (files: File[]) => {
      const unsupported = files.filter((file) => !ACCEPTED_TYPES.has(file.type));
      const supported = files.filter((file) => ACCEPTED_TYPES.has(file.type));

      if (unsupported.length) {
        setGlobalStatus(
          `已拒绝 ${unsupported.length} 个不支持的文件：仅接受 JPEG、PNG 与 WebP。`,
        );
      }
      if (!supported.length) return;

      setGlobalStatus(`正在准备 ${supported.length} 张照片…`);

      for (const file of supported) {
        const clientId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);
        const initial: DraftPhoto = {
          clientId,
          file,
          previewUrl,
          webBlob: null,
          webWidth: 0,
          webHeight: 0,
          title: titleFromFilename(file.name),
          alt: "",
          location: "",
          theme: "other",
          albumSlug: "other",
          takenAt: null,
          exif: EMPTY_EXIF,
          gpsVisibility: "hidden",
          status: "preparing",
          progress: 5,
          statusText: "读取照片与 EXIF",
          error: null,
          recordId: null,
          upload: null,
        };
        setDrafts((current) => [...current, initial]);

        try {
          const [rawExif, derivative] = await Promise.all([
            extractExif(file),
            createSanitizedDerivative(file),
          ]);
          const exif = normalizeExif(rawExif);
          const takenAt = normalizeExifDate(
            rawExif?.DateTimeOriginal ?? rawExif?.CreateDate ?? rawExif?.DateTime,
          );
          const hasGps = exif.latitude != null && exif.longitude != null;

          updateDraft(clientId, {
            webBlob: derivative.blob,
            webWidth: derivative.width,
            webHeight: derivative.height,
            exif,
            takenAt,
            location:
              exif.latitude != null && exif.longitude != null
                ? formatGps(exif.latitude, exif.longitude, 4)
                : "",
            gpsVisibility: hasGps ? "exact" : "hidden",
            status: "ready",
            progress: 0,
            statusText: "等待填写与发布",
          });
        } catch (error) {
          updateDraft(clientId, {
            status: "error",
            progress: 0,
            statusText: "照片准备失败",
            error: errorMessage(error),
          });
        }
      }

      setGlobalStatus(`${supported.length} 张照片已加入发布队列`);
    },
    [updateDraft],
  );

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void prepareFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void prepareFiles(Array.from(event.dataTransfer.files));
  };

  const removeDraft = (clientId: string) => {
    setDrafts((current) => {
      const target = current.find((draft) => draft.clientId === clientId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((draft) => draft.clientId !== clientId);
    });
  };

  const uploadBlob = useCallback(
    async (url: string, blob: Blob, contentType: string) => {
      const headers = new Headers({ "Content-Type": contentType });
      const isRelative = url.startsWith("/");
      const isSameOrigin = !isRelative && new URL(url, window.location.href).origin === window.location.origin;
      if (localAuthEmail && (isRelative || isSameOrigin)) {
        headers.set("x-local-studio-owner", localAuthEmail);
      }
      const response = await fetch(url, { method: "PUT", headers, body: blob });
      if (!response.ok) throw new Error(await readResponseError(response));
    },
    [localAuthEmail],
  );

  const publishDraft = useCallback(
    async (clientId: string) => {
      const getCurrent = () => draftsRef.current.find((item) => item.clientId === clientId);
      let draft = getCurrent();
      if (!draft || draft.status === "publishing" || draft.status === "published") return false;
      if (!draft.webBlob) {
        updateDraft(clientId, { status: "error", error: "网页版本尚未准备完成。" });
        return false;
      }
      if (!draft.title.trim() || !draft.alt.trim() || !draft.albumSlug.trim()) {
        updateDraft(clientId, {
          status: "error",
          statusText: "请补全必填字段",
          error: "标题、替代文字和影集标识不能为空。",
        });
        return false;
      }

      updateDraft(clientId, {
        status: "publishing",
        progress: 12,
        statusText: "创建草稿记录",
        error: null,
      });

      try {
        let recordId = draft.recordId;
        let upload = draft.upload;

        if (!recordId || !upload) {
          const result = await apiRequest<{
            photo: StudioRecord;
            upload: { originalUrl: string; webUrl: string };
          }>("/api/studio/photos", {
            method: "POST",
            body: JSON.stringify({
              filename: draft.file.name,
              contentType: draft.file.type,
              size: draft.file.size,
              title: draft.title.trim(),
              alt: draft.alt.trim(),
              location: draft.location.trim() || "未标记",
              theme: draft.theme,
              albumSlug: draft.albumSlug.trim(),
              takenAt: draft.takenAt,
              width: draft.webWidth,
              height: draft.webHeight,
              exif: draft.exif,
              gpsVisibility: draft.gpsVisibility,
            }),
          });
          recordId = result.photo.id;
          upload = result.upload;
          updateDraft(clientId, { recordId, upload, progress: 28, statusText: "上传原片" });
        }

        await uploadBlob(upload.originalUrl, draft.file, draft.file.type);
        updateDraft(clientId, { progress: 58, statusText: "上传安全网页版本" });

        draft = getCurrent() ?? draft;
        await uploadBlob(upload.webUrl, draft.webBlob ?? new Blob(), "image/jpeg");
        updateDraft(clientId, { progress: 84, statusText: "发布到影集" });

        await apiRequest(`/api/studio/photos/${encodeURIComponent(recordId)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "published" }),
        });
        updateDraft(clientId, {
          status: "published",
          progress: 100,
          statusText: "已发布",
          upload: null,
        });
        setGlobalStatus(`${draft.title} 已发布，并进入最新照片排序。`);
        await refreshRecords();
        return true;
      } catch (error) {
        updateDraft(clientId, {
          status: "error",
          progress: 0,
          statusText: "发布中断",
          error: errorMessage(error),
        });
        return false;
      }
    },
    [apiRequest, refreshRecords, updateDraft, uploadBlob],
  );

  const publishReady = async () => {
    setPublishingAll(true);
    const readyIds = draftsRef.current
      .filter((draft) => draft.status === "ready" || draft.status === "error")
      .map((draft) => draft.clientId);
    for (const clientId of readyIds) await publishDraft(clientId);
    setPublishingAll(false);
  };

  const changeRecordStatus = async (record: StudioRecord, status: "draft" | "published") => {
    setGlobalStatus(`正在更新「${record.title ?? "未命名照片"}」…`);
    try {
      await apiRequest(`/api/studio/photos/${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refreshRecords();
      setGlobalStatus(status === "published" ? "照片已发布" : "照片已撤回为草稿");
    } catch (error) {
      setGlobalStatus(`更新失败：${errorMessage(error)}`);
    }
  };

  const archiveRecord = async (record: StudioRecord) => {
    if (!window.confirm(`将「${record.title ?? "未命名照片"}」移入归档？`)) return;
    setGlobalStatus("正在归档照片…");
    try {
      await apiRequest(`/api/studio/photos/${encodeURIComponent(record.id)}`, { method: "DELETE" });
      await refreshRecords();
      setGlobalStatus("照片已移入归档");
    } catch (error) {
      setGlobalStatus(`归档失败：${errorMessage(error)}`);
    }
  };

  const readyCount = drafts.filter((draft) => draft.status === "ready" || draft.status === "error").length;

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <Link className="studio-mark" href={sitePath("/")}>J / 26</Link>
        <div>
          <span>PRIVATE PUBLISHING DESK</span>
          <strong>影像工作台</strong>
        </div>
        <div className="studio-owner">
          <span className="studio-owner-dot" aria-hidden="true" />
          <span>{ownerEmail}</span>
        </div>
      </header>

      <section className="studio-intro" aria-labelledby="studio-title">
        <div>
          <span className="studio-kicker">/ STUDIO / FRAME INTAKE</span>
          <h1 id="studio-title">原片进来，<br /><em>档案留下。</em></h1>
        </div>
        <div className="studio-intro-copy">
          <p>读取 EXIF，检查地点隐私，再把干净的网页版本送进影集。原片不会出现在公开页面。</p>
          <dl>
            <div><dt>输出</dt><dd>最长边 2400px</dd></div>
            <div><dt>格式</dt><dd>Sanitized JPEG</dd></div>
          </dl>
        </div>
      </section>

      <section className="studio-workbench">
        <div className="studio-queue-column">
          <div className="studio-section-heading">
            <span>01 / 上传与校对</span>
            <span>{drafts.length.toString().padStart(2, "0")} FRAMES</span>
          </div>

          <input
            ref={inputRef}
            className="studio-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileInput}
            aria-label="选择要上传的照片"
          />
          <datalist id="studio-album-slugs">
            {Array.from(new Set(records.map((record) => record.albumSlug).filter(Boolean))).map((slug) => <option key={slug} value={slug ?? undefined} />)}
          </datalist>
          <button
            className={`studio-dropzone${isDragging ? " is-dragging" : ""}`}
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
            }}
            onDrop={handleDrop}
            aria-describedby="studio-file-help"
          >
            <span className="studio-drop-index">＋</span>
            <strong>{isDragging ? "松开，加入冲洗队列" : "拖入原片，或点击选择"}</strong>
            <span id="studio-file-help">JPEG · PNG · WEBP / 可多选</span>
          </button>

          <div className="studio-live-status" role="status" aria-live="polite">
            <span aria-hidden="true">●</span>{globalStatus}
          </div>

          {drafts.length === 0 ? (
            <div className="studio-queue-empty">
              <span>NO FRAMES ON THE RAIL</span>
              <p>照片加入后会在这里完成 EXIF 检查、文字校对与 GPS 隐私设置。</p>
            </div>
          ) : (
            <div className="studio-draft-list">
              {drafts.map((draft, index) => (
                <DraftCard
                  key={draft.clientId}
                  draft={draft}
                  index={index}
                  disabled={publishingAll}
                  onChange={(patch) => updateDraft(draft.clientId, patch)}
                  onRemove={() => removeDraft(draft.clientId)}
                  onPublish={() => void publishDraft(draft.clientId)}
                />
              ))}
            </div>
          )}

          {drafts.length > 1 && (
            <div className="studio-batch-bar">
              <span>{readyCount} 张等待发布</span>
              <button type="button" disabled={!readyCount || publishingAll} onClick={() => void publishReady()}>
                {publishingAll ? "正在依次发布…" : "发布全部可用照片 ↗"}
              </button>
            </div>
          )}
        </div>

        <aside className="studio-library" aria-labelledby="studio-library-title">
          <div className="studio-section-heading">
            <span id="studio-library-title">02 / 档案记录</span>
            <button type="button" onClick={() => void refreshRecords()} disabled={recordsLoading}>
              {recordsLoading ? "同步中" : "刷新"}
            </button>
          </div>

          {recordsLoading && records.length === 0 ? (
            <div className="studio-library-state">正在读取档案记录…</div>
          ) : recordsError ? (
            <div className="studio-library-state is-error" role="alert">
              <strong>暂时无法读取记录</strong>
              <span>{recordsError}</span>
            </div>
          ) : records.length === 0 ? (
            <div className="studio-library-state">
              <strong>还没有线上记录</strong>
              <span>第一张发布完成的照片会出现在这里。</span>
            </div>
          ) : (
            <ol className="studio-record-list">
              {records.map((record, index) => (
                <li key={record.id}>
                  <div className="studio-record-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="studio-record-copy">
                    <strong>{record.title || "未命名照片"}</strong>
                    <span>{record.albumSlug || "未归入影集"} / {record.status || "draft"}</span>
                    <span>{formatRecordDate(record.publishedAt ?? record.uploadedAt)}</span>
                  </div>
                  <div className="studio-record-actions">
                    {record.status === "published" ? (
                      <button type="button" onClick={() => void changeRecordStatus(record, "draft")}>撤回</button>
                    ) : (
                      <button type="button" onClick={() => void changeRecordStatus(record, "published")}>发布</button>
                    )}
                    <button className="is-danger" type="button" onClick={() => void archiveRecord(record)}>归档</button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="studio-privacy-note">
            <span>PRIVACY NOTE</span>
            <p>公开网页只使用重新生成的 JPEG。GPS 是否显示由每张照片的设置决定，原片地址不会写进页面。</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function DraftCard({
  draft,
  index,
  disabled,
  onChange,
  onRemove,
  onPublish,
}: {
  draft: DraftPhoto;
  index: number;
  disabled: boolean;
  onChange: (patch: Partial<DraftPhoto>) => void;
  onRemove: () => void;
  onPublish: () => void;
}) {
  const locked = draft.status === "publishing" || disabled;
  const canPublish = draft.status !== "preparing" && draft.status !== "published";
  const fieldId = (name: string) => `${name}-${draft.clientId}`;

  return (
    <article className={`studio-draft-card is-${draft.status}`}>
      <div className="studio-draft-photo">
        {/* Local object URLs are previews only; the public site never receives the original. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={draft.previewUrl} alt="待发布照片预览" />
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div className="studio-draft-editor">
        <div className="studio-draft-head">
          <div>
            <span>{draft.file.name}</span>
            <strong>{formatBytes(draft.file.size)} / {draft.webWidth || "—"} × {draft.webHeight || "—"}</strong>
          </div>
          <button type="button" onClick={onRemove} disabled={locked} aria-label={`从队列移除 ${draft.file.name}`}>移除</button>
        </div>

        <div className="studio-fields-grid">
          <label htmlFor={fieldId("title")}>
            <span>标题 *</span>
            <input id={fieldId("title")} value={draft.title} disabled={locked} onChange={(event) => onChange({ title: event.target.value })} />
          </label>
          <label htmlFor={fieldId("album")}>
            <span>影集标识 *</span>
            <input id={fieldId("album")} list="studio-album-slugs" value={draft.albumSlug} disabled={locked} onChange={(event) => onChange({ albumSlug: slugify(event.target.value) })} />
          </label>
          <label className="is-wide" htmlFor={fieldId("alt")}>
            <span>替代文字 * <small>描述画面，而不是重复标题</small></span>
            <input id={fieldId("alt")} value={draft.alt} disabled={locked} onChange={(event) => onChange({ alt: event.target.value })} placeholder="例如：夕阳下，行人从潮湿的岸边经过" />
          </label>
          <label htmlFor={fieldId("location")}>
            <span>地点</span>
            <input id={fieldId("location")} value={draft.location} disabled={locked} onChange={(event) => onChange({ location: event.target.value })} placeholder="城市、区域或坐标" />
          </label>
          <label htmlFor={fieldId("theme")}>
            <span>主题</span>
            <select id={fieldId("theme")} value={draft.theme} disabled={locked} onChange={(event) => onChange({ theme: event.target.value as DraftPhoto["theme"] })}>
              <option value="city">城市</option>
              <option value="nature">自然</option>
              <option value="water">水面</option>
              <option value="other">其他</option>
            </select>
          </label>
        </div>

        <fieldset className="studio-gps-field" disabled={locked || draft.exif.latitude == null}>
          <legend>GPS 展示</legend>
          <label><input type="radio" name={fieldId("gps")} value="exact" checked={draft.gpsVisibility === "exact"} onChange={() => onChange({ gpsVisibility: "exact" })} />精确</label>
          <label><input type="radio" name={fieldId("gps")} value="coarse" checked={draft.gpsVisibility === "coarse"} onChange={() => onChange({ gpsVisibility: "coarse" })} />模糊</label>
          <label><input type="radio" name={fieldId("gps")} value="hidden" checked={draft.gpsVisibility === "hidden"} onChange={() => onChange({ gpsVisibility: "hidden" })} />隐藏</label>
          {draft.exif.latitude == null && <span>原片没有可读取的坐标</span>}
        </fieldset>

        <ExifReadout draft={draft} />

        {draft.error && <div className="studio-draft-error" role="alert">{draft.error}</div>}
        <div className="studio-publish-row">
          <div className="studio-progress" aria-live="polite">
            <span>{draft.statusText}</span>
            {(draft.status === "publishing" || draft.status === "preparing") && (
              <span className="studio-progress-track" aria-label={`进度 ${draft.progress}%`}>
                <i style={{ width: `${draft.progress}%` }} />
              </span>
            )}
          </div>
          {draft.status === "published" ? (
            <button className="studio-publish-button is-complete" type="button" onClick={onRemove}>已发布 · 清除</button>
          ) : (
            <button className="studio-publish-button" type="button" disabled={locked || !canPublish} onClick={onPublish}>
              {draft.status === "publishing" ? "发布中…" : draft.status === "error" ? "检查并重试 ↗" : "发布这张照片 ↗"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ExifReadout({ draft }: { draft: DraftPhoto }) {
  const { exif } = draft;
  return (
    <dl className="studio-exif" aria-label="读取到的 EXIF 信息">
      <div><dt>相机</dt><dd>{exif.camera ?? "—"}</dd></div>
      <div><dt>镜头</dt><dd>{exif.lens ?? "—"}</dd></div>
      <div><dt>焦距</dt><dd>{formatFocalLength(exif)}</dd></div>
      <div><dt>光圈</dt><dd>{exif.aperture ? `ƒ/${formatNumber(exif.aperture)}` : "—"}</dd></div>
      <div><dt>快门</dt><dd>{formatExposure(exif.exposureTime)}</dd></div>
      <div><dt>ISO</dt><dd>{exif.iso ?? "—"}</dd></div>
      <div><dt>拍摄时间</dt><dd>{formatRecordDate(draft.takenAt)}</dd></div>
      <div><dt>坐标</dt><dd>{exif.latitude == null || exif.longitude == null ? "—" : formatGps(exif.latitude, exif.longitude, 4)}</dd></div>
    </dl>
  );
}

async function extractExif(file: File): Promise<RawExif | null> {
  try {
    return (await parseExif(file, {
      tiff: true,
      exif: true,
      gps: true,
      translateValues: true,
      reviveValues: true,
    })) as RawExif | null;
  } catch {
    return null;
  }
}

async function createSanitizedDerivative(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("浏览器无法建立图片处理画布。");
    context.fillStyle = "#f1efe8";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("无法生成安全网页版本。"));
    }, type, quality);
  });
}

function normalizeExif(raw: RawExif | null): PhotoExif {
  if (!raw) return EMPTY_EXIF;
  const camera = compactText(raw.Make, raw.Model);
  return {
    camera: camera || textValue(raw.Model),
    lens: textValue(raw.LensModel ?? raw.Lens ?? raw.LensInfo),
    focalLength: finiteNumber(raw.FocalLength),
    focalLength35mm: finiteNumber(raw.FocalLengthIn35mmFormat),
    aperture: finiteNumber(raw.FNumber ?? raw.ApertureValue),
    exposureTime: finiteNumber(raw.ExposureTime),
    iso: finiteNumber(raw.ISO ?? raw.ISOSpeedRatings),
    latitude: finiteNumber(raw.latitude ?? raw.GPSLatitude),
    longitude: finiteNumber(raw.longitude ?? raw.GPSLongitude),
  };
}

function compactText(...values: unknown[]) {
  return values.map(textValue).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function textValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.map(String).join(" ");
  return null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeExifDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value !== "string") return null;
  const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function titleFromFilename(filename: string) {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const words = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return /^img\s?\d+$/i.test(words) ? "未命名照片" : words || "未命名照片";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-");
}

function formatGps(latitude: number, longitude: number, precision: number) {
  return `${Math.abs(latitude).toFixed(precision)}° ${latitude >= 0 ? "N" : "S"} · ${Math.abs(longitude).toFixed(precision)}° ${longitude >= 0 ? "E" : "W"}`;
}

function formatFocalLength(exif: PhotoExif) {
  if (!exif.focalLength && !exif.focalLength35mm) return "—";
  const focal = exif.focalLength ? `${formatNumber(exif.focalLength)}mm` : "";
  const equivalent = exif.focalLength35mm ? `${formatNumber(exif.focalLength35mm)}mm EQ` : "";
  return [focal, equivalent].filter(Boolean).join(" / ");
}

function formatExposure(value: number | null) {
  if (!value) return "—";
  if (value >= 1) return `${formatNumber(value)}s`;
  return `1/${Math.max(1, Math.round(1 / value))}s`;
}

function formatNumber(value: number) {
  return Number(value.toFixed(1));
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRecordDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replaceAll("/", ".");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "发生了未知错误。";
}

async function readResponseError(response: Response) {
  try {
    const body = await response.json() as { error?: string; message?: string };
    return body.error ?? body.message ?? `请求失败（${response.status}）`;
  } catch {
    return `请求失败（${response.status}）`;
  }
}
