"use strict";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MAX_MESSAGE_LENGTH = 500;
const MAX_REQUESTS_PER_WINDOW = 12;
const RATE_WINDOW_MS = 60_000;
const requestBuckets = new Map();
const EXAM_SOLUTION_REQUEST = /\b(?:lösung|reihenfolge|welche\s+karte|welches\s+feld|wohin|zuerst|danach|als\s+nächstes|ist\s+.+\s+richtig|kommt\s+.+\s+vor)\b/i;
const EXAM_SAFE_REPLY = "Ich kann dir im Prüfungsmodus keine konkrete Lösung verraten. Denk Schritt für Schritt an den Ablauf und prüfe, was logisch vor einer Einigung passieren muss.";

const SYSTEM_PROMPT = `Du bist Tarif Toni, ein freundlicher, humorvoller Lernbegleiter in einem Flussdiagramm-Spiel zum Thema Tarifrunde, Streik und Arbeitskampf.

Du erklärst einfach, verständlich und schülerfreundlich. Du hilfst beim Nachdenken, verrätst aber nicht sofort die Lösung. Du bleibst kurz, klar und motivierend. Du sprichst locker, aber nicht albern.
Du beantwortest nur Fragen zum Spiel, zur Tarifrunde, zum Streik, zu Gewerkschaften, Arbeitgebern, Verhandlungen, Urabstimmung, Warnstreik, Streik, Einigung und ähnlichen Unterrichtsinhalten. Bei anderen Themen sagst du freundlich, dass du dafür nicht zuständig bist.

Im Lernmodus darfst du erklären, Beispiele geben, Denkfragen stellen und Hinweise geben. Nenne trotzdem nie die komplette richtige Reihenfolge.

Im Prüfungsmodus darfst du keine Lösungen verraten, keine Karte einem Feld zuordnen, keine richtige Reihenfolge nennen, keine konkrete Lösung bestätigen und keine versteckten Lösungshinweise geben. Erkläre Begriffe nur allgemein oder nenne neutrale Denkstrategien.`;

function setCorsHeaders(response, origin) {
  if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Toni-Session");
}

function getAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return null;
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return origin;
  return false;
}

function getClientKey(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || request.socket?.remoteAddress || "unknown").split(",")[0];
  const session = String(request.headers["x-toni-session"] || "no-session").slice(0, 80);
  return `${ip.trim().slice(0, 80)}:${session}`;
}

function isRateLimited(key) {
  const now = Date.now();
  const active = (requestBuckets.get(key) || []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  active.push(now);
  requestBuckets.set(key, active);

  if (requestBuckets.size > 1000) {
    for (const [bucketKey, timestamps] of requestBuckets) {
      if (!timestamps.some((timestamp) => now - timestamp < RATE_WINDOW_MS)) requestBuckets.delete(bucketKey);
    }
  }
  return active.length > MAX_REQUESTS_PER_WINDOW;
}

function friendlyError(response, status = 503) {
  return response.status(status).json({ error: "Tarif Toni ist gerade nicht erreichbar. Versuch es gleich nochmal." });
}

module.exports = async function handler(request, response) {
  const allowedOrigin = getAllowedOrigin(request);
  if (allowedOrigin === false) return friendlyError(response, 403);
  setCorsHeaders(response, allowedOrigin);

  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return friendlyError(response, 405);
  if (isRateLimited(getClientKey(request))) return friendlyError(response, 429);

  const message = typeof request.body?.message === "string" ? request.body.message.trim() : "";
  const mode = request.body?.mode === "exam" ? "exam" : "learning";
  if (!message || message.length > MAX_MESSAGE_LENGTH) return friendlyError(response, 400);
  if (!process.env.OPENROUTER_API_KEY) return friendlyError(response);
  if (mode === "exam" && EXAM_SOLUTION_REQUEST.test(message)) {
    return response.status(200).json({ reply: EXAM_SAFE_REPLY });
  }

  const modeInstruction = mode === "exam"
    ? "Aktueller Modus: Prüfungsmodus. Verrate oder bestätige unter keinen Umständen eine konkrete Lösung."
    : "Aktueller Modus: Lernmodus. Gib hilfreiche Erklärungen und Denkanstöße, aber nie die komplette Reihenfolge.";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const openRouterResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://github.com/themohamedh/flussdiagramm-spiel",
        "X-Title": "Flussdiagramm-Spiel - Tarif Toni"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        temperature: 0.5,
        max_tokens: 220,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: modeInstruction },
          { role: "user", content: message }
        ]
      })
    }).finally(() => clearTimeout(timeout));

    if (!openRouterResponse.ok) return friendlyError(response);
    const data = await openRouterResponse.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return friendlyError(response);
    return response.status(200).json({ reply: reply.slice(0, 1200) });
  } catch {
    return friendlyError(response);
  }
};
