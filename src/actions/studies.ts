import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { PROD } from "@/config";
import { GetDNIbyStudyID } from "@/libs/orthanc";
import { getStudyCommentEntry, saveStudyComment } from "@/libs/db/studyComments";
import { isValidStudyId, sanitizeStudyComment } from "@/utils/client";
import { consumeRateLimit, getClientIdentifier } from "@/utils/server";

const VIEWER_LITE_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 6,
  blockDurationMs: 20 * 60 * 1000,
};

export const studies = {
  verifyLiteAccess: defineAction({
    accept: "form",
    input: z.object({
      studyId: z.string().min(1),
      cedula: z.string().min(1),
    }),
    handler: async (input, context) => {
      const { studyId, cedula } = input;
      const normalizedStudyId = studyId.trim();
      const normalizedCedula = cedula.trim();

      if (!normalizedStudyId || !normalizedCedula) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Debes ingresar una cédula válida.",
        });
      }

      const clientId = getClientIdentifier(context.request);
      const rateLimitKey = `viewer-lite:${normalizedStudyId}:${clientId}`;
      const rateLimit = consumeRateLimit(rateLimitKey, VIEWER_LITE_RATE_LIMIT);

      if (!rateLimit.allowed) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: `Demasiados intentos. Intenta nuevamente en ${rateLimit.retryAfterSeconds} segundos.`,
        });
      }

      const dni = await GetDNIbyStudyID(normalizedStudyId);
      if (!dni) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "No existe ese estudio.",
        });
      }

      if (normalizedCedula !== dni.trim()) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Cédula incorrecta.",
        });
      }

      context.cookies.set(`auth_lite_${normalizedStudyId}`, normalizedCedula, {
        path: "/",
        maxAge: 60 * 60 * 4,
        httpOnly: true,
        sameSite: "strict",
        secure: PROD,
      });

      return { success: true, studyId: normalizedStudyId };
    }
  }),

  saveComment: defineAction({
    accept: "json",
    input: z.object({
      studyId: z.string(),
      comment: z.string().max(2000),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "No autorizado",
        });
      }

      if (!isValidStudyId(input.studyId)) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "ID de estudio inválido",
        });
      }

      const comment = sanitizeStudyComment(input.comment);
      const saved = saveStudyComment(input.studyId, comment);

      return {
        success: true,
        studyId: input.studyId,
        comment: saved.comment,
        updatedAt: saved.updatedAt,
      };
    },
  }),

  getComment: defineAction({
    input: z.object({
      studyId: z.string(),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "No autorizado",
        });
      }

      if (!isValidStudyId(input.studyId)) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "ID de estudio inválido",
        });
      }

      return getStudyCommentEntry(input.studyId);
    },
  }),
};
