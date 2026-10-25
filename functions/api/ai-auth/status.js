import { hasAISession } from "../../_lib/ai-session.js";

export async function onRequestGet({ request, env }) {
  const authenticated = await hasAISession(request, env);

  return new Response(
    JSON.stringify({
      ok: true,
      authenticated
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    }
  );
}
