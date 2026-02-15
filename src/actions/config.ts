import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { readConfig, saveConfig } from "@/config";
import { sincronizarDatos } from "@/libs/orthanc";

export const config = {
  updateConfig: defineAction({
    accept: "form",
    input: z.object({
      ORTHANC_URL: z.string().url(),
      ADMIN_USERNAME: z.string().min(3).max(64),
      ORTHANC_USERNAME: z.string().min(1).max(64),
      JWT_SECRET: z.union([z.string().min(32), z.literal("")]).optional(),
      ORTHANC_PASSWORD: z.union([z.string().min(2), z.literal("")]).optional(),
      ADMIN_PASSWORD: z.union([z.string().min(2), z.literal("")]).optional(),
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
