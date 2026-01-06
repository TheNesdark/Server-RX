/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      username: string;
      exp: number; 
    } | null;
  }
}
