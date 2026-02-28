import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { readConfig, saveConfig, type AppConfig } from "@/config";
import { sincronizarDatos } from "@/libs/orthanc";

// H3: Bloquea loopback y endpoints de metadatos cloud para prevenir SSRF hacia el propio servidor.
// NOTA: Las IPs privadas RFC-1918 (10.x, 172.16.x, 192.168.x) están PERMITIDAS intencionalmente
// porque el servidor Orthanc reside en la red local del hospital.
const BLOCKED_PATTERNS = [
  /^localhost\.?$/i,                       // localhost y localhost. (trailing dot bypass)
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,   // IPv4 loopback 127.0.0.0/8
  /^0\.0\.0\.0$/,                         // INADDR_ANY
  /^169\.254\./,                           // link-local / AWS EC2 metadata (169.254.169.254)
  /^::1$/,                                 // IPv6 loopback
  /^::ffff:7f/i,                           // IPv6 mapped 127.x.x.x (hex: ::ffff:7f00:x)
  /^::ffff:a9fe/i,                         // IPv6 mapped 169.254.x.x
  /^fe80:/i,                               // IPv6 link-local
];
const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',   // GCP metadata
  '100.100.100.200',            // Alibaba Cloud metadata
]);

const isBlockedHost = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    // Node.js devuelve hostnames IPv6 con brackets: [::1] → strip para matching uniforme
    const host = hostname.replace(/^\[/, '').replace(/\]$/, '');
    if (BLOCKED_HOSTS.has(host)) return true;
    return BLOCKED_PATTERNS.some(re => re.test(host));
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
