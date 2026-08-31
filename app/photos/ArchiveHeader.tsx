import Link from "next/link";
import { sitePath } from "@/lib/site-path";

export function ArchiveHeader({ index = "02" }: { index?: string }) {
  return <header className="photos-route-header">
    <Link className="photos-route-mark" href={sitePath("/")}>J / 26</Link>
    <nav aria-label="影集导航">
      <Link href={sitePath("/photos")}>影集目录</Link>
      <Link href={sitePath("/#work")}>工作</Link>
      <Link href={sitePath("/#notes")}>随笔</Link>
      <Link href={sitePath("/#about")}>关于</Link>
    </nav>
    <span>{index} / PHOTO ARCHIVE</span>
  </header>;
}
