import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getChatGPTUser, requireChatGPTUser } from "@/app/chatgpt-auth";
import { StudioClient } from "./StudioClient";
import "./studio.css";

const STUDIO_OWNER_EMAIL = "jabari0227@gmail.com";

export const dynamic = process.env.GITHUB_PAGES === "true" ? "force-static" : "force-dynamic";

export const metadata: Metadata = {
  title: "Studio — Jabari Personal Archive",
  description: "Jabari 个人影像档案的私有发布工作台。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioPage() {
  if (process.env.GITHUB_PAGES === "true") notFound();

  if (process.env.NODE_ENV !== "production") {
    const localUser = await getChatGPTUser();

    if (!localUser) {
      return (
        <StudioClient
          ownerEmail={STUDIO_OWNER_EMAIL}
          localAuthEmail={STUDIO_OWNER_EMAIL}
        />
      );
    }

    if (localUser.email.toLowerCase() !== STUDIO_OWNER_EMAIL) notFound();

    return <StudioClient ownerEmail={localUser.email} localAuthEmail={null} />;
  }

  const user = await requireChatGPTUser("/studio");
  if (user.email.toLowerCase() !== STUDIO_OWNER_EMAIL) notFound();

  return <StudioClient ownerEmail={user.email} localAuthEmail={null} />;
}
