import { createToken } from "@/libs/auth";
import { defineAction, ActionError } from "astro:actions";
import { ADMIN_PASSWORD, ADMIN_USERNAME, PROD, saveConfig, readConfig } from "@/config"
import { z } from "astro:schema";
import { sincronizarDatos } from "@/libs/orthanc";


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

      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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

  updateConfig: defineAction({
    accept: "form",
    input: z.object({
      ORTHANC_URL: z.string().url(),
      ADMIN_USERNAME: z.string(),
      ORTHANC_USERNAME: z.string(),
      JWT_SECRET: z.string().optional(),
      ORTHANC_PASSWORD: z.string().optional(),
      ADMIN_PASSWORD: z.string().optional(),
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
