import type { APIRoute } from "astro";
import { getStudyCommentEntry, saveStudyComment } from "@/libs/db/studyComments";

const STUDY_ID_PATTERN = /^[a-zA-Z0-9-]+$/;
const MAX_COMMENT_LENGTH = 2000;

const sanitizeComment = (value: string): string => {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
    .slice(0, MAX_COMMENT_LENGTH)
    .trim();
};

const assertAuthorized = (hasUser: boolean): Response | null => {
  if (!hasUser) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
};

export const GET: APIRoute = async ({ params, locals }) => {
  const unauthorized = assertAuthorized(Boolean(locals.user));
  if (unauthorized) return unauthorized;

  const studyId = params.studyId?.trim();
  if (!studyId || !STUDY_ID_PATTERN.test(studyId)) {
    return new Response(JSON.stringify({ error: "studyId inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const commentEntry = getStudyCommentEntry(studyId);

  return new Response(
    JSON.stringify({
      studyId,
      comment: commentEntry.comment,
      updatedAt: commentEntry.updatedAt,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const unauthorized = assertAuthorized(Boolean(locals.user));
  if (unauthorized) return unauthorized;

  const studyId = params.studyId?.trim();
  if (!studyId || !STUDY_ID_PATTERN.test(studyId)) {
    return new Response(JSON.stringify({ error: "studyId inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawComment =
    typeof payload === "object" && payload !== null && "comment" in payload
      ? (payload as { comment?: unknown }).comment
      : "";

  if (typeof rawComment !== "string") {
    return new Response(JSON.stringify({ error: "El comentario debe ser texto" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const comment = sanitizeComment(rawComment);
  const saved = saveStudyComment(studyId, comment);

  return new Response(
    JSON.stringify({
      success: true,
      studyId,
      comment: saved.comment,
      updatedAt: saved.updatedAt,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
};
