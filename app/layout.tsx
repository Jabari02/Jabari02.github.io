import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jabari — Personal Archive",
  description: "研究影像，记录生活。一个关于项目、文字与摄影的个人档案。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
