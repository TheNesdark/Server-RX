import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { PROD } from "@/config";
import { GetDNIbyStudyID } from "@/libs/orthanc";
import { createToken } from "@/libs/auth";
import { getStudyCommentEntry, saveStudyComment } from "@/libs/db/studyComments";
import {  sanitizeStudyComment } from "@/utils/client";
import { checkRateLimit, clearRateLimit, getClientIP } from "@/utils/server";

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

      const ip = getClientIP(context.request);
      const rateLimitKey = `verify-lite:${normalizedStudyId}:${ip}`;
      const rateLimit = await checkRateLimit(rateLimitKey, { points: 6, duration: 60 * 20 });

      if (!rateLimit.allowed) {
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: `Demasiados intentos. Intenta nuevamente en ${rateLimit.retryAfter} segundos.`,
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

      // Limpiar rate limit tras éxito
      await clearRateLimit(rateLimitKey);

      // Crear un JWT firmado que vincula la sesión con el estudio y el DNI
      const token = await createToken({
        studyId: normalizedStudyId,
        dni: normalizedCedula,
        type: 'lite_access'
      });

      context.cookies.set(`auth_patient_${normalizedStudyId}`, token, {
        path: `/`,
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

      const comment = sanitizeStudyComment(input.comment);
      const saved = saveStudyComment(input.studyId, comment);

      return {
        success: true,
        studyId: input.studyId,
        comment: saved.comment,
        updatedAt: saved.updatedAt,
      };
    },
  })
};
