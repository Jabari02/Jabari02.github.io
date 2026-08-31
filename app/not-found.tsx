import Link from "next/link";
import { sitePath } from "@/lib/site-path";

export default function NotFound() {
  return <main className="not-found-page">
    <div className="not-found-meta"><span>404 / FRAME NOT FOUND</span><span>JABARI / PERSONAL ARCHIVE</span></div>
    <div className="not-found-copy"><span>这张底片没有被找到。</span><h1>回到仍然<br /><em>有光的地方。</em></h1><p>网址可能已经移动，照片也可能还没有公开。</p></div>
    <nav aria-label="返回入口"><Link href={sitePath("/")}>返回首页 ←</Link><Link href={sitePath("/photos")}>进入影集 ↗</Link></nav>
  </main>;
}
