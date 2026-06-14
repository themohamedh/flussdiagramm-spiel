import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/tarif-toni-chat.js");
process.env.OPENROUTER_API_KEY = "test-only";
process.env.ALLOWED_ORIGINS = "https://themohamedh.github.io";

function responseMock() {
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

async function call(body, options = {}) {
  const response = responseMock();
  await handler({
    method: options.method || "POST",
    body,
    headers: {
      origin: options.origin || "https://themohamedh.github.io",
      "x-forwarded-for": options.ip || `${Math.random()}`,
      "x-toni-session": options.session || `${Math.random()}`
    },
    socket: {}
  }, response);
  return response;
}

let lastOpenRouterRequest;
global.fetch = async (_url, options) => {
  lastOpenRouterRequest = JSON.parse(options.body);
  return {
    ok: true,
    async json() {
      return { choices: [{ message: { content: "Eine kurze Toni-Antwort." } }] };
    }
  };
};

const learning = await call({ message: "Was ist eine Urabstimmung?", mode: "learning" });
assert.equal(learning.statusCode, 200);
assert.equal(learning.body.reply, "Eine kurze Toni-Antwort.");
assert.match(lastOpenRouterRequest.messages[1].content, /Lernmodus/);
assert.equal(lastOpenRouterRequest.max_tokens, 220);

const exam = await call({ message: "Welche Karte kommt zuerst?", mode: "exam" });
assert.equal(exam.statusCode, 200);
assert.match(exam.body.reply, /keine konkrete Lösung/);

const examDefinition = await call({ message: "Was bedeutet Gewerkschaft?", mode: "exam" });
assert.equal(examDefinition.statusCode, 200);
assert.match(lastOpenRouterRequest.messages[1].content, /unter keinen Umständen/);

const tooLong = await call({ message: "x".repeat(501), mode: "learning" });
assert.equal(tooLong.statusCode, 400);

const foreignOrigin = await call({ message: "Hallo", mode: "learning" }, { origin: "https://example.com" });
assert.equal(foreignOrigin.statusCode, 403);

for (let index = 0; index < 12; index += 1) {
  const allowed = await call({ message: "Was ist ein Warnstreik?", mode: "learning" }, { ip: "rate-test", session: "rate-test" });
  assert.equal(allowed.statusCode, 200);
}
const limited = await call({ message: "Noch eine Frage", mode: "learning" }, { ip: "rate-test", session: "rate-test" });
assert.equal(limited.statusCode, 429);

console.log("Tarif-Toni-API: Modusregeln, Limits und CORS geprüft.");
