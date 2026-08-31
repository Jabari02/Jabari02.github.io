import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { jsonError, LOCAL_OWNER_HEADER, OWNER_EMAIL } from "./http";

type StudioOwner = Pick<ChatGPTUser, "userId" | "email"> & {
  localDevelopment: boolean;
};

type OwnerResult =
  | { ok: true; owner: StudioOwner }
  | { ok: false; response: Response };

export async function requireStudioOwner(request: Request): Promise<OwnerResult> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return { ok: false, response: jsonError("Cross-origin write rejected", 403) };
  }

  const user = await getChatGPTUser();
  const configuredOwnerId = process.env.STUDIO_OWNER_USER_ID?.trim();
  if (
    user &&
    (user.email.trim().toLowerCase() === OWNER_EMAIL ||
      (configuredOwnerId && user.userId === configuredOwnerId))
  ) {
    return {
      ok: true,
      owner: {
        userId: user.userId,
        email: user.email,
        localDevelopment: false,
      },
    };
  }

  const localHeader = request.headers
    .get(LOCAL_OWNER_HEADER)
    ?.trim()
    .toLowerCase();
  if (process.env.NODE_ENV !== "production" && localHeader === OWNER_EMAIL) {
    return {
      ok: true,
      owner: {
        userId: `local:${OWNER_EMAIL}`,
        email: OWNER_EMAIL,
        localDevelopment: true,
      },
    };
  }

  if (user) {
    return { ok: false, response: jsonError("This account is not the site owner", 403) };
  }
  return { ok: false, response: jsonError("Owner authentication required", 401) };
}
