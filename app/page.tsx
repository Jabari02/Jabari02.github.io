import type { Metadata } from "next";
import { PersonalSite } from "./PersonalSite";

export const metadata: Metadata = {
  title: "Jabari — Personal Archive",
  description: "研究影像，记录生活。一个关于项目、文字与摄影的个人档案。",
};

export default function Home() {
  return <PersonalSite />;
}

