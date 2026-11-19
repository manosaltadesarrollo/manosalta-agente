import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "@netlify/functions";
import { SYSTEM_PROMPT } from "./lib/prompt";

// La clave se lee de la variable de entorno ANTHROPIC_API_KEY (configurada en Netlify).
const client = new Anthropic();

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const MAX_MESSAGES = 20; // últimos mensajes de la conversación que se envían
const MAX_CHARS = 2000; // largo máximo de cada mensaje del paciente
const FALLBACK_TEXT =
  "Disculpá, no puedo responder eso por acá. Podés escribirnos por WhatsApp al +54 387 5515111 y te ayudamos.";

// Orígenes permitidos (separados por coma). Ej: https://cirugiademanosalta.com,https://www.cirugiademanosalta.com
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "https://cirugiademanosalta.com,https://www.cirugiademanosalta.com"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0] ?? "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(status: number, body: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

// Valida y normaliza el historial que manda el navegador: solo texto,
// roles alternados, empieza y termina con un mensaje del usuario.
function sanitize(input: unknown): Anthropic.MessageParam[] | null {
  if (!Array.isArray(input)) return null;
  const out: Anthropic.MessageParam[] = [];
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content !== "string") return null;
    const text = m.content.trim().slice(0, MAX_CHARS);
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${text}`;
    } else {
      out.push({ role: m.role, content: text });
    }
  }
  while (out.length && out[0].role !== "user") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}

export default async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Método no permitido" }, cors);

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" }, cors);
  }
  const messages = sanitize(body.messages);
  if (!messages) return json(400, { error: "Conversación inválida" }, cors);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let wroteText = false;
      try {
        const response = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 2048, // respuestas de chat deliberadamente breves
          output_config: { effort: "low" },
          // Si un clasificador de seguridad rechaza la consulta, la API reintenta con otro modelo.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            wroteText = true;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const final = await response.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode((wroteText ? "\n\n" : "") + FALLBACK_TEXT));
        }
      } catch (err) {
        console.error("Error llamando a Claude:", err);
        const msg = wroteText
          ? "\n\n(Se cortó la respuesta. Probá de nuevo en un momento.)"
          : "Hubo un problema técnico. Probá de nuevo en un momento o escribinos por WhatsApp al +54 387 5515111.";
        controller.enqueue(encoder.encode(msg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...cors,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};

export const config: Config = {
  path: "/api/chat",
};
