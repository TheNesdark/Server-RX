import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { readConfig, saveConfig, type AppConfig } from "@/config";
import { sincronizarDatos } from "@/libs/orthanc";

// H3: Bloquea todos los rangos de IP privados/reservados para prevenir SSRF completo
const BLOCKED_PATTERNS = [
  /^localhost$/i,                                // localhost
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,         // IPv4 loopback
  /^0\.0\.0\.0$/,                               // todas las interfaces
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,          // RFC 1918 clase A
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // RFC 1918 clase B
  /^192\.168\.\d{1,3}\.\d{1,3}$/,             // RFC 1918 clase C
  /^169\.254\./,                                // link-local / AWS metadata
  /^::1$/,                                      // IPv6 loopback
  /^fc[0-9a-f]{2}:/i,                           // IPv6 ULA
  /^fe80:/i,                                    // IPv6 link-local
];
const BLOCKED_HOSTS = new Set(['100.100.100.200', 'metadata.google.internal', '[::1]', '::1']);

const isBlockedHost = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    if (BLOCKED_HOSTS.has(hostname)) return true;
    return BLOCKED_PATTERNS.some(re => re.test(hostname));
  } catch {
    return true;
  }
};

export const config = {
  updateConfig: defineAction({
    accept: "form",
    input: z.object({
      ORTHANC_URL: z.string().url().refine(
        (url) => !isBlockedHost(url),
        { message: "ORTHANC_URL no puede apuntar a una dirección IP reservada o de metadatos" }
      ),
      ADMIN_USERNAME: z.string().min(3).max(64),
      ORTHANC_USERNAME: z.string().min(1).max(64),
      JWT_SECRET: z.union([z.string().min(32), z.literal("")]).optional(),
      ORTHANC_PASSWORD: z.union([z.string().min(2), z.literal("")]).optional(),
      ADMIN_PASSWORD: z.union([z.string().min(2), z.literal("")]).optional(),
      PROD: z.string().optional(),
    }),
    handler: async (input, context) => {
      // H8: Defensa en profundidad — verificar sesión aunque el middleware ya proteja la ruta
      if (!context.locals.user) {
        throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
      }
      const currentConfig = readConfig();
      
      const newConfig: AppConfig = {
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
    handler: async (_input, context) => {
      // H8: Defensa en profundidad — verificar sesión aunque el middleware ya proteja la ruta
      if (!context.locals.user) {
        throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
      }
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
