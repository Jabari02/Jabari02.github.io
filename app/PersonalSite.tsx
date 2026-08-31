"use client";

/* Dynamic R2 media and local photo URLs are intentionally rendered with img. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  filterLabels,
  formatExposure,
  formatFocalLength,
  formatLocation,
  formatPhotoDate,
  mergePhotoCatalog,
  sortPhotosNewest,
  staticPhotos,
  type Photo,
  type PhotoTheme,
} from "@/content/photos/catalog";
import { sitePath } from "@/lib/site-path";

type Note = {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  body: string;
};

type Work = {
  id: string;
  index: string;
  title: string;
  meta: string;
  period: string;
  summary: string;
  description: string;
  focus: string[];
  role: string;
  output: string;
  action?: { href: string; label: string };
};

function ExifDetails({ photo, compact = false }: { photo: Photo; compact?: boolean }) {
  const items = [
    ["相机", photo.exif.camera ?? "—"],
    ["镜头", photo.exif.lens ?? "—"],
    ["焦距", formatFocalLength(photo)],
    ["光圈", photo.exif.aperture ? `f/${Number(photo.exif.aperture.toFixed(1))}` : "—"],
    ["快门", formatExposure(photo.exif.exposureTime)],
    ["ISO", photo.exif.iso ? String(photo.exif.iso) : "—"],
    ["地点", formatLocation(photo)],
    ["拍摄时间", formatPhotoDate(photo)],
  ];

  return <dl className={`photo-exif-grid${compact ? " compact" : ""}`}>
    {items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>;
}

const notes: Note[] = [
  {
    id: "return",
    date: "08.13.26",
    title: "把一个网站做成可以回来的地方",
    excerpt: "关于个人空间、真实照片，以及为什么一个页面不需要一直向你解释自己。",
    body: "我想把这里做成一个慢速更新的档案，而不是一张把所有事情都说完的名片。项目、照片和随笔可以并排出现，偶尔互相照亮，也允许各自保持沉默。",
  },
  {
    id: "screen",
    date: "07.29.26",
    title: "在屏幕之外，重新学习观看",
    excerpt: "当照片不再只是内容，而变成抵达一个地方的方式。",
    body: "拍摄之前先走一段路，常常比寻找一个漂亮的构图更重要。留下来的不一定是最完整的画面，而是那些让我愿意停下来的瞬间。",
  },
  {
    id: "archive",
    date: "06.18.26",
    title: "关于档案、秩序和偶然",
    excerpt: "我们怎样给不断增长的生活留出一点可回看的秩序。",
    body: "档案不是把一切归档，而是承认有些东西值得被再次遇见。排序、命名和筛选都只是暂时的手势，真正重要的是它们还能否唤回当时的感受。",
  },
];

const navItems = [
  { href: "#work", label: "01 工作" },
  { href: "#archive", label: "02 影集" },
  { href: "#notes", label: "03 随笔" },
  { href: "#about", label: "04 关于" },
];

const works: Work[] = [
  {
    id: "medical-imaging-ai",
    index: "01",
    title: "医学影像与 AI",
    meta: "RESEARCH / ONGOING",
    period: "2025—现在",
    summary: "把模型结果推进成可复现、可解释的医学影像研究工作流。",
    description: "关注医学影像分割、模型验证和结果呈现。这里展示的是持续中的研究方向；正式案例将在确认可公开范围后逐步补充。",
    focus: ["医学影像分割", "模型评估", "研究流程"],
    role: "研究设计 / 工程实现",
    output: "可复现的实验、验证与演示流程",
  },
  {
    id: "personal-digital-archive",
    index: "02",
    title: "个人数字档案",
    meta: "DESIGN / BUILDING",
    period: "2022—现在",
    summary: "为项目、文字和真实照片建立一个能长期维护的个人空间。",
    description: "从内容架构、视觉系统到前端交互独立搭建。当前版本已经形成无照片首页、主题影集、暗房故事浏览和单张审片体验。",
    focus: ["内容架构", "交互设计", "长期维护"],
    role: "产品设计 / 前端开发",
    output: "正在运行的个人网站与可持续内容系统",
  },
  {
    id: "notes-on-seeing",
    index: "03",
    title: "关于观看的笔记",
    meta: "WRITING / 03 NOTES",
    period: "2022—现在",
    summary: "记录研究、摄影与日常观察之间那些尚未定型的连接。",
    description: "用短篇随笔保存还不适合被归纳成结论的想法。它们与项目和影像并列，但不承担说明书的角色。",
    focus: ["观看", "档案", "研究日常"],
    role: "写作 / 编辑",
    output: "持续更新的结构化随笔",
    action: { href: "#notes", label: "进入随笔 ↘" },
  },
];

export function PersonalSite({ initialPhotos = staticPhotos }: { initialPhotos?: Photo[] }) {
  const [photos, setPhotos] = useState(() => sortPhotosNewest(initialPhotos));
  const [view, setView] = useState<"story" | "viewer">("story");
  const [filter, setFilter] = useState<"all" | Photo["theme"]>("all");
  const [selected, setSelected] = useState<Photo | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeWorkId, setActiveWorkId] = useState(works[0].id);
  const [currentTime, setCurrentTime] = useState("21:48");
  const [viewerIndex, setViewerIndex] = useState(0);
  const [darkroomReady, setDarkroomReady] = useState(false);
  const [safelightOn, setSafelightOn] = useState(false);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const viewerPointerStart = useRef<{ x: number; y: number } | null>(null);
  const viewerDidSwipe = useRef(false);
  const introRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const latestPhotos = useMemo(() => photos.slice(0, 3), [photos]);
  const photoFilters = useMemo<Array<{ id: "all" | PhotoTheme; label: string }>>(
    () => (["all", "city", "nature", "water", "other"] as const)
      .filter((item) => item === "all" || photos.some((photo) => photo.theme === item))
      .map((item) => ({ id: item, label: filterLabels[item] })),
    [photos],
  );
  const filteredPhotos = useMemo(
    () => (filter === "all" ? photos : photos.filter((photo) => photo.theme === filter)),
    [filter, photos],
  );
  const activeWork = works.find((work) => work.id === activeWorkId) ?? works[0];
  const activeViewerPhoto = filteredPhotos[viewerIndex] ?? filteredPhotos[0];

  useEffect(() => {
    const controller = new AbortController();
    fetch(sitePath("/api/photos"), { signal: controller.signal, headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { photos?: Photo[] } | null) => {
        if (payload?.photos?.length) setPhotos(mergePhotoCatalog(payload.photos, initialPhotos));
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("Unable to refresh published photos; using the bundled catalog.");
        }
      });
    return () => controller.abort();
  }, [initialPhotos]);

  useEffect(() => {
    if (!introRef.current) return;
    document.documentElement.classList.add("reveal-ready");
    const nodes = Array.from(introRef.current.querySelectorAll<HTMLElement>("[data-reveal]"));
    const frame = window.requestAnimationFrame(() => nodes.forEach((node, index) => {
      window.setTimeout(() => node.classList.add("is-revealed"), 120 + index * 80);
    }));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    };
    updateTime();
    const timer = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !("IntersectionObserver" in window)) {
      setDarkroomReady(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setDarkroomReady(true);
        observer.disconnect();
      }
    }, { threshold: 0.16 });
    observer.observe(viewer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const modalOpen = Boolean(selected || activeNote);
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeNote, selected]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setActiveNote(null);
        setMenuOpen(false);
      }
      if (selected) {
        const index = filteredPhotos.findIndex((photo) => photo.id === selected.id);
        if (event.key === "ArrowRight") setSelected(filteredPhotos[(index + 1) % filteredPhotos.length]);
        if (event.key === "ArrowLeft") setSelected(filteredPhotos[(index - 1 + filteredPhotos.length) % filteredPhotos.length]);
        return;
      }
      if (view === "viewer" && event.key === "ArrowRight") setViewerIndex((index) => (index + 1) % filteredPhotos.length);
      if (view === "viewer" && event.key === "ArrowLeft") setViewerIndex((index) => (index - 1 + filteredPhotos.length) % filteredPhotos.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [filteredPhotos, selected, view]);

  useEffect(() => {
    if (view !== "viewer") return;
    const activeThumb = filmstripRef.current?.querySelector<HTMLElement>(`[data-viewer-index="${viewerIndex}"]`);
    activeThumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [view, viewerIndex]);

  const applyFilter = (nextFilter: "all" | Photo["theme"]) => {
    setFilter(nextFilter);
    setSelected(null);
    setViewerIndex(0);
  };

  const moveSelection = (direction: 1 | -1) => {
    if (!selected) return;
    const index = filteredPhotos.findIndex((photo) => photo.id === selected.id);
    const nextIndex = index < 0 ? 0 : (index + direction + filteredPhotos.length) % filteredPhotos.length;
    setSelected(filteredPhotos[nextIndex]);
  };

  const moveViewer = (direction: 1 | -1) => {
    setViewerIndex((index) => (index + direction + filteredPhotos.length) % filteredPhotos.length);
  };

  const startViewerSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    viewerDidSwipe.current = false;
    viewerPointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const endViewerSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = viewerPointerStart.current;
    viewerPointerStart.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) > 52 && Math.abs(deltaX) > Math.abs(deltaY)) {
      viewerDidSwipe.current = true;
      moveViewer(deltaX < 0 ? 1 : -1);
    }
  };

  const openActiveViewerPhoto = () => {
    if (viewerDidSwipe.current) {
      viewerDidSwipe.current = false;
      return;
    }
    if (activeViewerPhoto) setSelected(activeViewerPhoto);
  };

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="回到首页">J / 26</a>
        <nav className="nav-links" aria-label="主导航">
          {navItems.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <span>{menuOpen ? "CLOSE" : "MENU"}</span><span aria-hidden="true">{menuOpen ? "×" : "+"}</span>
        </button>
        <div className="top-meta"><span>SH / CN</span><span className="live-dot" /> <span aria-live="polite">{currentTime}</span></div>
        {menuOpen && <nav className="mobile-menu" id="mobile-navigation" aria-label="移动端主导航">
          {navItems.map((item) => <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}<span aria-hidden="true">↗</span></a>)}
        </nav>}
      </header>

      <section className="hero" id="top" ref={introRef}>
        <div className="hero-kicker" data-reveal>PERSONAL ARCHIVE / 2026</div>
        <div className="hero-copy">
          <h1 data-reveal>研究影像，<em>记录</em>生活。</h1>
          <p data-reveal>我是 Jabari，关注医学影像、人工智能与那些值得被慢慢看见的日常。</p>
        </div>
        <div className="hero-index" data-reveal>
          <span>SCROLL TO EXPLORE</span>
          <span className="arrow-down">↓</span>
        </div>
        <div className="hero-note" data-reveal>NOT A PORTFOLIO<br />A PLACE TO RETURN TO</div>
      </section>

      <section className="intro-grid section-pad">
        <div className="section-label">/ 00 — 现在</div>
        <div className="intro-statement">
          <p className="display-text">我在做的事情，通常介于结构和偶然之间。</p>
          <div className="intro-columns">
            <p>白天，我把复杂的问题拆成可以验证的工作；下班后，我带着相机穿过城市，收集还没有名字的片段。</p>
            <p>这里是一个慢速更新的个人档案。项目、笔记与影像并列出现，彼此不必解释，但可以互相照亮。</p>
          </div>
        </div>
      </section>

      <section className="section-pad work-section" id="work">
        <div className="section-heading"><span>/ 01 — 工作</span><span>SELECTED PROJECTS / 2023—26</span></div>
        <div className="work-showcase">
          <div className="work-list" role="tablist" aria-label="项目选择">
            {works.map((work) => {
              const isActive = work.id === activeWork.id;
              return <button
                type="button"
                className={`work-row${isActive ? " active" : ""}`}
                role="tab"
                aria-selected={isActive}
                aria-controls="work-detail"
                key={work.id}
                onClick={() => setActiveWorkId(work.id)}
              >
                <span>{work.index}</span>
                <strong>{work.title}</strong>
                <span>{work.meta}</span>
                <span className="work-row-arrow" aria-hidden="true">{isActive ? "−" : "+"}</span>
              </button>;
            })}
          </div>
          <article className="work-detail" id="work-detail" role="tabpanel" aria-live="polite" key={activeWork.id}>
            <div className="work-detail-lead">
              <span className="work-detail-number">PROJECT / {activeWork.index}</span>
              <h3>{activeWork.summary}</h3>
              <p>{activeWork.description}</p>
            </div>
            <dl className="work-facts">
              <div><dt>时间</dt><dd>{activeWork.period}</dd></div>
              <div><dt>职责</dt><dd>{activeWork.role}</dd></div>
              <div><dt>关注</dt><dd>{activeWork.focus.join(" / ")}</dd></div>
              <div><dt>当前产出</dt><dd>{activeWork.output}</dd></div>
            </dl>
            {activeWork.action
              ? <a className="work-detail-action" href={sitePath(activeWork.action.href)}>{activeWork.action.label}</a>
              : <span className="work-detail-status">项目资料持续整理中</span>}
          </article>
        </div>
      </section>

      <section className={`archive-section ${safelightOn ? "safelight-active" : ""}`} id="archive">
        <div className="archive-intro section-pad">
          <div className="section-heading light"><span>/ 02 — 影集</span><span>SELECTED IMAGES</span></div>
          <div className="archive-title-row"><h2>进入暗房<br /><em>慢一点。</em></h2><div className="archive-title-copy"><p>照片不在首页出现。它们在这里，按照时间、地点和记忆重新排列。</p><Link className="archive-directory-link" href={sitePath("/photos")}>浏览独立影集与照片网址 ↗</Link></div></div>
        </div>
        <div className="latest-photo-heading section-pad"><span>LATEST UPLOADS / 03</span><span>EXIF FROM ORIGINAL FILES</span></div>
        <div className="album-strip latest-photo-strip">
          {latestPhotos.map((photo, index) => <button className={`album-card album-${index + 1}`} type="button" onClick={() => setSelected(photo)} key={photo.id} aria-label={`打开最新照片：${photo.title}`}>
            <div className="album-image-wrap"><img src={sitePath(photo.src)} alt={photo.alt} width={photo.width} height={photo.height} /></div>
            <div className="album-caption"><span>{photo.title}</span><span>{formatPhotoDate(photo)}</span><span>{photo.exif.camera ?? `ISO ${photo.exif.iso ?? "—"}`}</span></div>
          </button>)}
        </div>

        <div className="archive-viewer" ref={viewerRef}>
        <div className={`darkroom-atmosphere ${darkroomReady ? "is-visible" : ""}`} aria-label="暗房环境">
          <span className="darkroom-flash" aria-hidden="true" />
          <span className="film-strip-unfurl" aria-hidden="true" />
          <span className="film-reel film-reel-one" aria-hidden="true" />
          <span className="film-reel film-reel-two" aria-hidden="true" />
          <span className="enlarger-silhouette" aria-hidden="true"><span /><b>ENLARGER</b></span>
          <button className="safelight-switch" type="button" aria-pressed={safelightOn} onClick={() => setSafelightOn((active) => !active)}>
            <span className="safelight-bulb" aria-hidden="true" />
            <span>{safelightOn ? "SAFE LIGHT ON" : "SAFE LIGHT"}</span>
          </button>
          <span className="darkroom-atmosphere-note" aria-hidden="true">CONTACT SHEET / 01</span>
        </div>
        <div className="archive-controls section-pad" id="table">
          <div className="control-title"><span>PHOTO ARCHIVE</span><span>{filteredPhotos.length.toString().padStart(2, "0")} / {photos.length.toString().padStart(2, "0")}</span></div>
          <div className="controls-row">
            <div className="control-tabs" role="tablist" aria-label="影集浏览模式">
              <button role="tab" aria-selected={view === "story"} className={view === "story" ? "active" : ""} onClick={() => setView("story")}>故事模式</button>
              <button role="tab" aria-selected={view === "viewer"} className={view === "viewer" ? "active" : ""} onClick={() => setView("viewer")}>审片模式</button>
            </div>
            <div className="filter-tabs" role="group" aria-label="照片主题筛选">
              {photoFilters.map((item) => <button key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? "active" : ""} onClick={() => applyFilter(item.id)}>{item.label}</button>)}
            </div>
          </div>
        </div>

        {view === "story" ? <div className={`drying-rack section-pad ${darkroomReady ? "is-visible" : ""}`} id="story-view" aria-label="暗房晾晒照片">
          <div className="drying-rack-heading"><span>DRYING RACK / STORY MODE</span><span>CLICK A PRINT TO DEVELOP</span></div>
          <div className="drying-photo-grid">
            {filteredPhotos.map((photo, index) => <button type="button" className={`drying-photo ${photo.className}`} key={photo.id} onClick={() => setSelected(photo)} aria-label={`打开照片：${photo.title}`}>
              <span className="drying-hardware" aria-hidden="true">
                <span className="drying-line-segment" />
                <span className="film-hook" />
                <span className="film-clip" />
                <span className="film-negative-strip" />
                <span className="film-weight" />
              </span>
              <span className="drying-print-body">
                <span className="drying-photo-frame"><img src={sitePath(photo.src)} alt={photo.alt} width={photo.width} height={photo.height} loading={index > 1 ? "lazy" : "eager"} /></span>
                <span className="drying-photo-meta"><span>{photo.title}</span><span>{formatLocation(photo)} · {photo.year}</span><span>{photo.exif.camera ?? "CAMERA —"} · ISO {photo.exif.iso ?? "—"}</span></span>
              </span>
            </button>)}
          </div>
        </div> : activeViewerPhoto && <div className="frame-viewer section-pad" id="viewer-view" aria-label="单张照片审片模式">
          <div className="frame-viewer-heading">
            <span>FRAME REVIEW / {String(viewerIndex + 1).padStart(2, "0")}</span>
            <span>← → KEYBOARD / SWIPE</span>
          </div>
          <div className="frame-viewer-stage" onPointerDown={startViewerSwipe} onPointerUp={endViewerSwipe} onPointerCancel={() => { viewerPointerStart.current = null; }}>
            <button className="frame-viewer-arrow frame-viewer-prev" type="button" onClick={() => moveViewer(-1)} aria-label="查看上一张照片">←</button>
            <button className={`frame-viewer-main ${activeViewerPhoto.className}`} type="button" key={activeViewerPhoto.id} onClick={openActiveViewerPhoto} aria-label={`放大照片：${activeViewerPhoto.title}`}>
              <span className="frame-viewer-image">
                <img src={sitePath(activeViewerPhoto.src)} alt={activeViewerPhoto.alt} width={activeViewerPhoto.width} height={activeViewerPhoto.height} />
                <span className="frame-viewer-focus" aria-hidden="true"><i /><i /><i /><i /></span>
              </span>
            </button>
            <button className="frame-viewer-arrow frame-viewer-next" type="button" onClick={() => moveViewer(1)} aria-label="查看下一张照片">→</button>
            <div className="frame-viewer-caption" aria-live="polite">
              <span><strong>{activeViewerPhoto.title}</strong><small>{activeViewerPhoto.location} · {activeViewerPhoto.year}</small></span>
              <span>{String(viewerIndex + 1).padStart(2, "0")} / {String(filteredPhotos.length).padStart(2, "0")}</span>
            </div>
          </div>
          <div className="frame-viewer-progress" aria-hidden="true"><span style={{ width: `${((viewerIndex + 1) / filteredPhotos.length) * 100}%` }} /></div>
          <ExifDetails photo={activeViewerPhoto} />
          <div className="frame-filmstrip" ref={filmstripRef} aria-label="照片胶片索引">
            {filteredPhotos.map((photo, index) => <button
              className={`frame-filmstrip-item${index === viewerIndex ? " active" : ""}`}
              type="button"
              aria-current={index === viewerIndex ? "true" : undefined}
              aria-label={`查看第 ${index + 1} 张照片：${photo.title}`}
              data-viewer-index={index}
              key={photo.id}
              onClick={() => setViewerIndex(index)}
            >
              <span className="frame-number">{String(index + 1).padStart(2, "0")}</span>
              <img src={sitePath(photo.src)} alt="" width={photo.width} height={photo.height} loading="lazy" />
              <span className="frame-mark" aria-hidden="true" />
            </button>)}
          </div>
        </div>}
        </div>
      </section>

      <section className="notes-section section-pad" id="notes">
        <div className="section-heading"><span>/ 03 — 随笔</span><span>LATEST NOTES</span></div>
        <div className="note-feature"><span className="note-date">{notes[0].date}</span><h2>{notes[0].title}</h2><p>{notes[0].excerpt}</p><button className="note-open" type="button" onClick={() => setActiveNote(notes[0])}>阅读这篇笔记 ↗</button></div>
        <div className="note-list">{notes.slice(1).map((note) => <button className="note-list-item" type="button" key={note.id} onClick={() => setActiveNote(note)}><span>{note.date}</span><span>{note.title}</span><span aria-hidden="true">↗</span></button>)}</div>
      </section>

      <section className="about-section section-pad" id="about">
        <div className="section-heading light"><span>/ 04 — 关于</span><span>CONTACT / 2026</span></div>
        <div className="about-grid"><h2>如果你也在<br /><em>慢慢建造一些东西</em></h2><div><p>欢迎来信。可以聊研究、影像、网站，或者一张最近舍不得删掉的照片。</p><a className="email-link" href="mailto:jabari0227@gmail.com">jabari0227@gmail.com</a></div></div>
        <div className="footer-line"><span>© JABARI / PERSONAL ARCHIVE</span><span>MADE WITH TIME</span><a href="#top">BACK TO TOP ↑</a></div>
      </section>

      {selected && <div className="lightbox" role="dialog" aria-modal="true" aria-label={selected.title}>
        <button className="lightbox-backdrop" onClick={() => setSelected(null)} aria-label="关闭照片预览" />
        <button className="lightbox-close" onClick={() => setSelected(null)} aria-label="关闭照片">关闭 ×</button>
        <button className="lightbox-nav lightbox-prev" onClick={() => moveSelection(-1)} aria-label="上一张照片">←</button>
        <div className="lightbox-image"><img src={sitePath(selected.src)} alt={selected.alt} width={selected.width} height={selected.height} /></div>
        <button className="lightbox-nav lightbox-next" onClick={() => moveSelection(1)} aria-label="下一张照片">→</button>
        <div className="lightbox-details">
          <div className="lightbox-caption"><span>{selected.title}</span><span>{formatLocation(selected)} · {selected.year}</span></div>
          <ExifDetails photo={selected} compact />
        </div>
      </div>}
      {activeNote && <div className="note-modal" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
        <button className="note-modal-backdrop" onClick={() => setActiveNote(null)} aria-label="关闭随笔背景" />
        <article className="note-modal-card">
          <button className="note-modal-close" type="button" onClick={() => setActiveNote(null)} aria-label="关闭随笔">关闭 ×</button>
          <div className="note-modal-meta">{activeNote.date} / NOTE</div>
          <h2 id="note-modal-title">{activeNote.title}</h2>
          <p>{activeNote.body}</p>
        </article>
      </div>}
    </main>
  );
}
