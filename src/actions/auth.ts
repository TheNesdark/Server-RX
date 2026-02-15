import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { ADMIN_PASSWORD, ADMIN_USERNAME, PROD } from "@/config";
import { createToken } from "@/libs/auth";
import { clearRateLimit, consumeRateLimit, getClientIdentifier } from "@/utils/server";

const ADMIN_LOGIN_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
  blockDurationMs: 15 * 60 * 1000,
};

export const auth = {
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

      // Comparación segura: Convertimos el username a minúsculas para coincidir
      if (normalizedUsername === ADMIN_USERNAME.toLowerCase() && password === ADMIN_PASSWORD) {
        clearRateLimit(rateLimitKey);
        const token = await createToken({ 
          username: normalizedUsername,
          type: 'admin_session'
        });
        
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
};
