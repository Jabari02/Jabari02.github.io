import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/", requestHeaders = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html", ...requestHeaders } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the personal archive shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Jabari — Personal Archive<\/title>/i);
  assert.match(html, /研究影像，.*记录.*生活/);
  assert.match(html, /aria-label="项目选择"/);
  assert.match(html, /把模型结果推进成可复现、可解释的医学影像研究工作流/);
  assert.doesNotMatch(html, /<a href="#archive" class="work-row"/);
  assert.match(html, /id="archive"/);
  assert.match(html, /PHOTO ARCHIVE/);
  assert.match(html, /LATEST UPLOADS \/ 03/);
  assert.match(html, /EXIF FROM ORIGINAL FILES/);
  assert.match(html, /岸边的人/);
  assert.match(html, /光落在墙上/);
  assert.match(html, /桥与日落/);
  assert.match(html, /RICOH GR III HDF/);
  assert.match(html, /ISO/);
  assert.match(html, /故事模式/);
  assert.match(html, /审片模式/);
  assert.match(html, /DRYING RACK \/ STORY MODE/);
  assert.match(html, /暗房晾晒照片/);
  assert.match(html, /SAFE LIGHT/);
  assert.match(html, /2025—现在/);
  assert.match(html, /mailto:jabari0227@gmail\.com/);
  assert.match(html, /jabari0227@gmail\.com/);
  assert.match(html, /aria-controls="mobile-navigation"/);
  assert.match(html, /阅读这篇笔记/);
  assert.match(html, /photos\/(sunset-water|shanghai-skyline-bw|bridge-sunset)\.jpg/);
  assert.doesNotMatch(html, /photos\/(architecture|mountain|water|coast|forest|city)\.jpg/);
  assert.doesNotMatch(html, /hello@example\.com/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|codex-preview/i);
});

test("ships the user photo set and removes the starter preview", async () => {
  const root = new URL("../", import.meta.url);
  const source = await readFile(new URL("app/PersonalSite.tsx", root), "utf8");
  const register = await readFile(new URL("assets/licenses/asset-register.csv", root), "utf8");
  assert.equal((source.match(/period: "2022—现在"/g) ?? []).length, 2);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /SAFE LIGHT ON/);
  assert.match(source, /film-clip/);
  assert.match(source, /film-weight/);
  assert.match(source, /film-negative-strip/);
  assert.doesNotMatch(source, /drying-clip/);
  assert.doesNotMatch(source, /drying-tape/);
  assert.match(source, /FRAME REVIEW/);
  assert.match(source, /照片胶片索引/);
  assert.match(source, /SWIPE/);
  assert.match(source, /drying-print-body/);
  assert.match(source, /\["相机",/);
  assert.match(source, /\["快门",/);
  assert.match(source, /\["ISO",/);
  assert.match(source, /\["地点",/);
  assert.doesNotMatch(source, /table-viewport|table-canvas|zoom-controls/);
  assert.match(register, /user-sunset-water/);
  assert.match(register, /User-owned photograph/);
  assert.doesNotMatch(register, /Unsplash/);
  for (const file of ["sunset-water.jpg", "sunset-portrait.jpg", "shanghai-skyline-bw.jpg", "shanghai-street-bw.jpg", "ferris-wheel.jpg", "shadow-wall.jpg", "bund-crowd.jpg", "bridge-sunset.jpg", "riverside-buildings.jpg", "coastline.jpg"]) {
    await access(new URL(`public/photos/${file}`, root));
  }
  await assert.rejects(access(new URL("app/_sites-preview", root)));
});

test("generates a newest-first photo catalog with EXIF metadata", async () => {
  const root = new URL("../", import.meta.url);
  const catalog = JSON.parse(await readFile(new URL("content/photos/photos.generated.json", root), "utf8"));
  assert.deepEqual(catalog.slice(0, 3).map((photo) => photo.id), ["bund-crowd", "shadow-wall", "bridge-sunset"]);
  assert.equal(catalog[0].exif.camera, "RICOH GR III HDF");
  assert.equal(catalog[0].exif.iso, 200);
  assert.equal(catalog[0].exif.aperture, 3.2);
  assert.equal(catalog[0].exif.exposureTime, 0.008);
  assert.match(catalog.find((photo) => photo.id === "sunset-water").uploadedAt, /^2026-08-13T/);
  assert.equal(typeof catalog.find((photo) => photo.id === "sunset-water").exif.latitude, "number");
});

test("server-renders stable public photo routes with the local catalog fallback", async () => {
  const index = await render("/photos");
  assert.equal(index.status, 200);
  const indexHtml = await index.text();
  assert.match(indexHtml, /<title>影集 — Jabari Personal Archive<\/title>/i);
  assert.match(indexHtml, /href="\/photos\/city"/);
  assert.match(indexHtml, /href="\/photos\/water"/);

  const album = await render("/photos/city");
  assert.equal(album.status, 200);
  const albumHtml = await album.text();
  assert.match(albumHtml, /<title>城市与留白 — Jabari 影集<\/title>/i);
  assert.match(albumHtml, /href="\/photos\/city\/bund-crowd"/);

  const frame = await render("/photos/city/bund-crowd");
  assert.equal(frame.status, 200);
  const frameHtml = await frame.text();
  assert.match(frameHtml, /<title>岸边的人 — Jabari 影像档案<\/title>/i);
  assert.match(frameHtml, /RICOH GR III HDF/);

  const missing = await render("/photos/city/does-not-exist");
  assert.equal(missing.status, 404);
});

test("keeps the public API and Studio writes behind their intended boundaries", async () => {
  const root = new URL("../", import.meta.url);
  const publicApi = await readFile(new URL("app/api/photos/route.ts", root), "utf8");
  const studioApi = await readFile(new URL("app/api/studio/photos/route.ts", root), "utf8");
  const studioAuth = await readFile(new URL("lib/photos/auth.ts", root), "utf8");
  assert.match(publicApi, /getPublishedCatalog/);
  assert.match(publicApi, /available: false/);
  assert.match(studioApi, /requireStudioOwner/);
  assert.match(studioApi, /originalUrl/);
  assert.match(studioApi, /webUrl/);
  assert.match(studioAuth, /LOCAL_OWNER_HEADER/);
  assert.match(studioAuth, /NODE_ENV !== "production"/);
});
