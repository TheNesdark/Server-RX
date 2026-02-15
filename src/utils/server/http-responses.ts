export const assertAuthorizedJson = (hasUser: boolean): Response | null => {
  if (!hasUser) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
};

export const createUnauthorizedTextResponse = (): Response => {
  return new Response("No autorizado", {
    status: 401,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
};