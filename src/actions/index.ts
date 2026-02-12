import { createToken } from "@/libs/auth";
import { defineAction, ActionError } from "astro:actions";
import { ADMIN_PASSWORD, ADMIN_USERNAME, PROD, saveConfig, readConfig } from "@/config"
import { z } from "astro:schema";
import { GetDNIbyStudyID, sincronizarDatos } from "@/libs/orthanc";
import { clearRateLimit, consumeRateLimit, getClientIdentifier } from "@/utils/rateLimit";

const ADMIN_LOGIN_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
  blockDurationMs: 15 * 60 * 1000,
};

const VIEWER_LITE_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 6,
  blockDurationMs: 20 * 60 * 1000,
};

const normalizeIdentity = (value: string) => value.trim().toUpperCase();


export const server = {
  login: defineAction({
    accept: "form",
    input: z.object({
      username: z.string(),
      password: z.string(),
    }),

    handler: async (input, context) => {
      const { cookies } = context;
      const { username, password } = input;
      const clientId = getClientIdentifier(context.request);
      const normalizedUsername = username.trim().toLowerCase();
      const rateLimitKey = `admin-login:${clientId}:${normalizedUsername}`;
      const rateLimit = consumeRateLimit(rateLimitKey, ADMIN_LOGIN_RATE_LIMIT);

      if (!rateLimit.allowed) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: `Demasiados intentos. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.`,
        });
      }

      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        clearRateLimit(rateLimitKey);
        const token = await createToken({ username });
        
        cookies.set("auth_token", token, {
          path: "/",
          httpOnly: true,
          secure: PROD,
          sameSite: "strict",
          maxAge: 60 * 60 * 24
        });

        return { success: true };
      }

      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "Credenciales incorrectas",
      });
    },
  }),

  verifyLiteAccess: defineAction({
    accept: "form",
    input: z.object({
      studyId: z.string().min(1),
      cedula: z.string().min(1),
    }),
    handler: async (input, context) => {
      const { studyId, cedula } = input;
      const normalizedStudyId = studyId.trim();
      const normalizedCedula = normalizeIdentity(cedula);

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

      if (normalizeIdentity(dni) !== normalizedCedula) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "La cédula ingresada no coincide con el estudio.",
        });
      }

      clearRateLimit(rateLimitKey);
      context.cookies.set(`auth_lite_${normalizedStudyId}`, dni, {
        path: "/",
        maxAge: 60 * 60 * 4,
        httpOnly: true,
        sameSite: "strict",
        secure: PROD,
      });

      return { success: true, studyId: normalizedStudyId };
    }
  }),

  updateConfig: defineAction({
    accept: "form",
    input: z.object({
      ORTHANC_URL: z.string().url(),
      ADMIN_USERNAME: z.string().min(3).max(64),
      ORTHANC_USERNAME: z.string().min(1).max(64),
      JWT_SECRET: z.union([z.string().min(32), z.literal("")]).optional(),
      ORTHANC_PASSWORD: z.union([z.string().min(8), z.literal("")]).optional(),
      ADMIN_PASSWORD: z.union([z.string().min(12), z.literal("")]).optional(),
      PROD: z.string().optional(),
    }),
    handler: async (input) => {
      const currentConfig = readConfig();
      
      const newConfig = {
        ...currentConfig,
        ORTHANC_URL: input.ORTHANC_URL,
        ADMIN_USERNAME: input.ADMIN_USERNAME,
        ORTHANC_USERNAME: input.ORTHANC_USERNAME,
        JWT_SECRET: input.JWT_SECRET || currentConfig.JWT_SECRET,
        ORTHANC_PASSWORD: input.ORTHANC_PASSWORD || currentConfig.ORTHANC_PASSWORD,
        ADMIN_PASSWORD: input.ADMIN_PASSWORD || currentConfig.ADMIN_PASSWORD,
        PROD: input.PROD === "on"
      };
      
      const success = saveConfig(newConfig);
      if (!success) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo guardar la configuración",
        });
      }
      return { success: true };
    }
  }),

  syncNow: defineAction({
    accept: "form",
    input: z.any().optional(),
    handler: async () => {
      try {
        const total = await sincronizarDatos();
        return { success: true, total };
      } catch (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al sincronizar la base de datos",
        });
      }
    }
  })
};
