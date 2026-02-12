import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";

const WORKERS_DIR = path.resolve(process.cwd(), "node_modules", "dwv", "dist", "assets", "workers");
const WORKER_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

const noCacheHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export const GET: APIRoute = async ({ params }) => {
  const worker = params.worker;

  if (!worker || !WORKER_NAME_PATTERN.test(worker)) {
    return new Response("Worker inválido", { status: 400 });
  }

  const fileName = `${worker}.js`;
  const filePath = path.resolve(WORKERS_DIR, fileName);

  if (!filePath.startsWith(WORKERS_DIR)) {
    return new Response("Ruta no permitida", { status: 400 });
  }

  try {
    const content = await fs.readFile(filePath);
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        ...noCacheHeaders,
      },
    });
  } catch (error) {
    console.error(`Worker no encontrado: ${fileName}`, error);
    return new Response("Worker no encontrado", {
      status: 404,
      headers: noCacheHeaders,
    });
  }
};
