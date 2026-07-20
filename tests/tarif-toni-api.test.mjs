import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/tarif-toni-chat.js";

const originalEnvironment = {
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL
};
const originalFetch = global.fetch;

process.env.ALLOWED_ORIGINS = "https://spiel.example";
process.env.OPENROUTER_API_KEY = "test-key-not-secret";
process.env.OPENROUTER_MODEL = "openrouter/free";

test.after(() => {
  global.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; }
  };
}

let requestCounter = 0;

async function callApi(body, options = {}) {
  requestCounter += 1;
  const response = createResponse();
  await handler({
    method: options.method || "POST",
    body,
    headers: {
      origin: options.origin ?? "https://spiel.example",
      host: "toni.example",
      "x-forwarded-for": options.ip || `192.0.2.${requestCounter}`,
      "x-forwarded-proto": "https"
    },
    socket: {}
  }, response);
  return response;
}

test("exam mode never calls OpenRouter", async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error("OpenRouter must not be called in exam mode");
  };

  const response = await callApi({ message: "Welche Karte kommt zuerst?", mode: "exam" });

  assert.equal(response.statusCode, 200);
  assert.equal(fetchCalls, 0);
  assert.equal(response.body.kind, "exam");
  assert.match(response.body.reply, /KI aus/);
  assert.equal(response.headers["Cache-Control"], "no-store");
});

test("learning mode uses only the free router and vetted source context", async () => {
  let requestBody;
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      async json() {
        return {
          model: "example/free-model:free",
          choices: [{ message: { content: "Ein Warnstreik ist ein kurzes Drucksignal während eines Tarifkonflikts." } }]
        };
      }
    };
  };

  const response = await callApi({ message: "Was ist ein Warnstreik?", mode: "learn" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.kind, "ai");
  assert.equal(response.body.model, "example/free-model:free");
  assert.match(response.body.source.url, /^https:\/\/www\.bpb\.de\//);
  assert.equal(requestBody.model, "openrouter/free");
  assert.equal(requestBody.provider.data_collection, "deny");
  assert.equal(requestBody.provider.zdr, true);
  assert.match(requestBody.messages[1].content, /Verbindliche Quelle/);
  assert.match(requestBody.messages[1].content, /Warnstreiks sind zeitlich begrenzte Arbeitsniederlegungen/);
  assert.equal(requestBody.messages[2].content, "Was ist ein Warnstreik?");
});

test("paid model configuration is rejected before any provider request", async () => {
  process.env.OPENROUTER_MODEL = "openai/gpt-4o-mini";
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; };

  const response = await callApi({ message: "Was ist ein Tarifvertrag?", mode: "learn" });

  assert.equal(response.statusCode, 503);
  assert.equal(fetchCalls, 0);
  assert.match(response.body.error, /nur kostenlose/);
  process.env.OPENROUTER_MODEL = "openrouter/free";
});

test("off-topic questions stay local and do not consume the free quota", async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; };

  const response = await callApi({ message: "Wie wird das Wetter morgen?", mode: "learn" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.kind, "local");
  assert.equal(fetchCalls, 0);
  assert.match(response.body.reply, /keine verlässliche Quelle/);
});

test("a generated full solution is replaced with a safe local hint", async () => {
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        model: "example/free-model:free",
        choices: [{
          message: {
            content: "Kündigung → Warnstreik → Verhandlungsrunde → Urabstimmung → Streik → Aussperrung → Schlichtung → Einigung → Tarifvertrag"
          }
        }]
      };
    }
  });

  const response = await callApi({ message: "Erkläre mir den Tarifvertrag", mode: "learn" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.kind, "local");
  assert.doesNotMatch(response.body.reply, /→/);
  assert.match(response.body.reply, /Gewerkschaften und Arbeitgeber/);
});

test("foreign origins and oversized messages are rejected", async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; };

  const foreign = await callApi({ message: "Was ist ein Streik?", mode: "learn" }, { origin: "https://evil.example" });
  const tooLong = await callApi({ message: "x".repeat(241), mode: "learn" });

  assert.equal(foreign.statusCode, 403);
  assert.equal(foreign.headers["Access-Control-Allow-Origin"], undefined);
  assert.equal(tooLong.statusCode, 400);
  assert.equal(fetchCalls, 0);
});

test("provider failures return a generic error for the local frontend fallback", async () => {
  global.fetch = async () => ({
    ok: false,
    status: 503,
    headers: { get() { return null; } },
    async json() { return {}; }
  });

  const response = await callApi({ message: "Was ist eine Schlichtung?", mode: "learn" });

  assert.equal(response.statusCode, 503);
  assert.equal(response.headers["X-Tarif-Toni-Upstream-Status"], "503");
  assert.match(response.body.error, /ausgelastet/);
  assert.doesNotMatch(JSON.stringify(response.body), /test-key-not-secret/);
});
