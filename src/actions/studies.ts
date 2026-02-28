import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { PROD } from "@/config";
import crypto from 'node:crypto';
import { GetDNIbyStudyID } from "@/libs/orthanc";
import { createToken } from "@/libs/auth";
import { saveStudyComment } from "@/libs/db/studyComments";
import { sanitizeStudyComment } from "@/utils/client";
import { checkRateLimit, clearRateLimit, getClientIP } from "@/utils/server";

export const studies = {
  verifyLiteAccess: defineAction({
    accept: "form",
    input: z.object({
      // Regex: solo letras, números y guiones — previene cookie name injection (RFC 6265)
      studyId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9-]+$/, "studyId inválido"),
      cedula: z.string().min(1).max(32),
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

      // Rate limit global por IP: previene bypass rotando entre múltiples studyIds
      const globalRateLimitKey = `verify-lite:global:${ip}`;
      const globalRateLimit = await checkRateLimit(globalRateLimitKey, { points: 20, duration: 60 * 20 });
      if (!globalRateLimit.allowed) {
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: `Demasiados intentos. Intenta nuevamente en ${globalRateLimit.retryAfter} segundos.`,
        });
      }

      // Rate limit por estudio+IP: limita intentos sobre un estudio específico
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

      // H: Comparación en tiempo constante para prevenir Timing Oracle en DNI
      const dniTrimmed = dni.trim();
      const dniMatch =
        normalizedCedula.length === dniTrimmed.length &&
        crypto.timingSafeEqual(Buffer.from(normalizedCedula), Buffer.from(dniTrimmed));
      if (!dniMatch) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Cédula incorrecta.",
        });
      }

      // Limpiar ambos rate limits tras éxito
      await clearRateLimit(rateLimitKey);
      await clearRateLimit(globalRateLimitKey);

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
      studyId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9-]+$/, "studyId inválido"),
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
