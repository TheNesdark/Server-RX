import { createToken } from '@/libs/auth';
import { defineAction, ActionError } from 'astro:actions';
import { ADMIN_PASSWORD, ADMIN_USERNAME, PROD} from '@/config'
import { z } from 'astro:schema';


export const server = {
  login: defineAction({
    accept: 'form',
    input: z.object({
      username: z.string(),
      password: z.string(),
    }),

    handler: async (input, context) => {
      const { cookies } = context;
      const { username, password } = input;

      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = await createToken({ username });
        
        cookies.set('auth_token', token, {
          path: '/',
          httpOnly: true,
          secure: PROD,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24
        });

        return { success: true };
      }

      throw new ActionError({
        code: 'UNAUTHORIZED',
        message: 'Credenciales incorrectas',
      });
    },
  }),
};