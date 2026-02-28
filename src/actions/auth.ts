import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { ADMIN_PASSWORD, ADMIN_USERNAME, PROD } from "@/config";
import { createToken } from "@/libs/auth";
import { checkRateLimit, clearRateLimit, getClientIP } from "@/utils/server";
import crypto from 'node:crypto';

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

      const ip = getClientIP(context.request, context.clientAddress);
      const rateLimitKey = `login:${ip}:${username}`;
      const rateLimit = await checkRateLimit(rateLimitKey, { points: 5, duration: 60 * 15 });

      if (!rateLimit.allowed) {
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: `Demasiados intentos. Intenta de nuevo en ${rateLimit.retryAfter} segundos.`,
        });
      }

      // H4: Comparación en tiempo constante para prevenir Timing Attacks
      const normalizedInput = username.toLowerCase();
      const normalizedAdmin = ADMIN_USERNAME.toLowerCase();
      const usernameMatch =
        normalizedInput.length === normalizedAdmin.length &&
        crypto.timingSafeEqual(Buffer.from(normalizedInput), Buffer.from(normalizedAdmin));

      const passwordMatch =
        password.length === ADMIN_PASSWORD.length &&
        crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD));

      if (usernameMatch && passwordMatch) {
        await clearRateLimit(rateLimitKey);
        const token = await createToken({ 
          username: username,
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
