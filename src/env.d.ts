/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      username: string;
      exp: number; // Expiration time as Unix timestamp
      // Añade cualquier otra propiedad que incluyas en tu JWT payload
    } | null;
  }
}
