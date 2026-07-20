import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readUtf8(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function extractBalanced(source, marker, openChar, closeChar) {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing marker: ${marker}`);

  const openIndex = source.indexOf(openChar, markerIndex + marker.length);
  assert.notEqual(openIndex, -1, `Missing ${openChar} after marker: ${marker}`);

  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, index + 1);
    }
  }

  assert.fail(`Unclosed expression after marker: ${marker}`);
}

function extractConst(source, name, openChar, closeChar) {
  return extractBalanced(source, `const ${name} =`, openChar, closeChar);
}

function evaluateExpression(expression, label) {
  const value = vm.runInNewContext(`(${expression})`, {}, { filename: label });
  return JSON.parse(JSON.stringify(value));
}

function extractFunctionBody(source, name) {
  return extractBalanced(source, `function ${name}(`, "{", "}");
}

function numericSuffix(value) {
  return Number(value.replace(/^\D+/, ""));
}

function sortByNumericSuffix(left, right) {
  return numericSuffix(left) - numericSuffix(right);
}

function unique(values) {
  return [...new Set(values)];
}

function buttonSlotKeys(html) {
  const slotButtonPattern = /<button\b(?=[^>]*\bclass="[^"]*\bslot\b)(?=[^>]*\bdata-key="(?<key>s\d+)")[^>]*>/g;
  return [...html.matchAll(slotButtonPattern)].map((match) => match.groups.key);
}

function isExternalReference(value) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);
}

function normalizeLocalReference(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#") || isExternalReference(trimmed)) return null;

  const withoutQuery = trimmed.split(/[?#]/, 1)[0];
  if (!withoutQuery || withoutQuery === "." || withoutQuery === "./") return "index.html";
  if (withoutQuery.endsWith("/")) return path.join(withoutQuery, "index.html").replace(/\\/g, "/");
  return path.normalize(withoutQuery).replace(/\\/g, "/").replace(/^\.\//, "");
}

function extractHtmlAttributeReferences(source) {
  const references = [];
  const pattern = /\b(?:href|src)\s*=\s*(["'])(?<value>.*?)\1/gi;
  for (const match of source.matchAll(pattern)) {
    const normalized = normalizeLocalReference(match.groups.value);
    if (normalized) references.push({ label: "index.html attribute", path: normalized });
  }
  return references;
}

function extractCssUrlReferences(source, label) {
  const references = [];
  const pattern = /url\(\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|(?<bare>[^)"']+))\s*\)/gi;
  for (const match of source.matchAll(pattern)) {
    const rawValue = match.groups.double ?? match.groups.single ?? match.groups.bare ?? "";
    const normalized = normalizeLocalReference(rawValue);
    if (normalized) references.push({ label, path: normalized });
  }
  return references;
}

function evaluateServiceWorkerAppShell(serviceWorkerSource) {
  const appShellUrlsIndex = serviceWorkerSource.indexOf("const APP_SHELL_URLS");
  assert.notEqual(appShellUrlsIndex, -1, "service-worker.js must define APP_SHELL_URLS after APP_SHELL");

  return vm.runInNewContext(
    `${serviceWorkerSource.slice(0, appShellUrlsIndex)}\nAPP_SHELL`,
    {},
    { filename: "service-worker.js APP_SHELL" },
  );
}

function assertReferencesExist(references) {
  const missing = references
    .map((reference) => ({ ...reference, key: `${reference.label} -> ${reference.path}` }))
    .filter((reference) => !existsSync(path.join(root, reference.path)));

  assert.deepEqual(
    missing.map((reference) => reference.key),
    [],
    "Local static references must point to existing files",
  );
}

function assetVersion(source, filename) {
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\?v=([^"'<>]+)`));
  assert.ok(match, `Missing versioned reference for ${filename}`);
  return match[1];
}

function serviceWorkerStringConst(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s+=\\s+"([^"]+)";`));
  assert.ok(match, `Missing service worker constant ${name}`);
  return match[1];
}

const html = readUtf8("index.html");
const learningSource = readUtf8("unterrichtsmaterial.js");
const manifestSource = readUtf8("manifest.webmanifest");
const packageSource = readUtf8("package.json");
const staticServerSource = readUtf8("scripts/serve-static.mjs");
const serviceWorkerSource = readUtf8("service-worker.js");
const toniSource = readUtf8("tarif-toni.js");
const toniApiSource = readUtf8("api/tarif-toni-chat.js");

test("JavaScript sources have no obvious syntax errors", () => {
  for (const file of ["unterrichtsmaterial.js", "tarif-toni.js", "service-worker.js"]) {
    new vm.Script(readUtf8(file), { filename: file });
  }

  const inlineScripts = [...html.matchAll(/<script\b(?<attrs>[^>]*)>(?<code>[\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/.test(match.groups.attrs));

  assert.ok(inlineScripts.length > 0, "Expected at least one inline script in index.html");
  inlineScripts.forEach((match, index) => {
    new vm.Script(match.groups.code, { filename: `index.html inline script ${index + 1}` });
  });
});

test("package scripts expose static and browser e2e suites", () => {
  const packageJson = JSON.parse(packageSource);

  assert.equal(packageJson.scripts["build:app"], "node scripts/build-app.mjs");
  assert.equal(packageJson.scripts.check, "npm test");
  assert.equal(packageJson.scripts.test, "node --test tests/static-integrity.test.mjs tests/tarif-toni-api.test.mjs && node --test Flussdiagramm/tests/static-integrity.test.mjs");
  assert.equal(packageJson.scripts["test:all"], "npm test && npm run test:e2e");
  assert.equal(packageJson.scripts["test:api"], "node --test tests/tarif-toni-api.test.mjs");
  assert.equal(packageJson.scripts["test:static"], "node --test tests/static-integrity.test.mjs");
  assert.equal(packageJson.scripts["test:e2e"], "playwright test");
  assert.match(packageJson.devDependencies["@playwright/test"], /^\^1\./, "Playwright test runner should be a dev dependency");

  for (const file of ["playwright.config.mjs", "scripts/build-app.mjs", "scripts/serve-static.mjs", "tests/e2e/flussdiagramm.spec.mjs"]) {
    assert.ok(existsSync(path.join(root, file)), `${file} must exist`);
  }
});

test("Playwright e2e suite covers the core game flows", () => {
  const config = readUtf8("playwright.config.mjs");
  const e2e = readUtf8("tests/e2e/flussdiagramm.spec.mjs");

  assert.match(config, /testDir:\s*"\.\/tests\/e2e"/, "Playwright config must point at tests/e2e");
  assert.match(config, /serviceWorkers:\s*"block"/, "E2E tests should block service workers for deterministic runs");
  assert.match(config, /webServer:\s*\{[\s\S]*scripts\/serve-static\.mjs/, "E2E tests should start the local static server");
  assert.match(e2e, /learn-correct-wrong/, "E2E suite should cover learn-mode correction");
  assert.match(e2e, /exam-success/, "E2E suite should cover successful exam evaluation");
  assert.match(e2e, /exam-failure/, "E2E suite should cover failed exam evaluation");
  assert.match(e2e, /solve-all/, "E2E suite should cover solution reveal");
  assert.match(e2e, /mode-isolation/, "E2E suite should cover mode-state isolation");
  assert.match(e2e, /toni-preferences/, "E2E suite should cover persisted Toni preferences");
  assert.match(e2e, /toni-ai-mode/, "E2E suite should cover the Toni AI mode boundary");
  assert.match(e2e, /path-boundary/, "E2E suite should cover the local server path boundary");
  assert.match(e2e, /mobile-layout/, "E2E suite should cover mobile layout");
});

test("service worker caches handled navigations without broad runtime caching", () => {
  assert.match(serviceWorkerSource, /const isNavigation = event\.request\.mode === "navigate";/);
  assert.match(serviceWorkerSource, /const isStaticAsset = isAppShellRequest\(event\.request\);/);
  assert.match(serviceWorkerSource, /if \(!isNavigation && !isStaticAsset\) return;/);
  assert.match(serviceWorkerSource, /response\.ok && \(isStaticAsset \|\| isNavigation\)/);
  assert.match(serviceWorkerSource, /key\.startsWith\(CACHE_PREFIX\) && key !== CACHE_NAME/);
});

test("local static server contains decoded request paths with path.relative", () => {
  assert.match(staticServerSource, /const relative = path\.relative\(root, target\);/);
  assert.match(staticServerSource, /relative === "\.\."/);
  assert.match(staticServerSource, /relative\.startsWith\(`\.\.\$\{path\.sep\}`\)/);
  assert.match(staticServerSource, /path\.isAbsolute\(relative\)/);
  assert.doesNotMatch(staticServerSource, /target\.startsWith\(root\)/);
});

test("local static references, manifest icons, and service worker cache entries stay valid", () => {
  const cssFiles = ["liquid-glass.css", "tarif-toni.css"];
  const manifest = JSON.parse(manifestSource);
  const appShell = evaluateServiceWorkerAppShell(serviceWorkerSource);

  assert.equal(manifest.lang, "de", "Manifest language should stay German");
  assert.equal(manifest.display, "standalone", "Manifest should stay installable");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "Manifest needs at least one icon");
  assert.ok(Array.isArray(appShell) && appShell.length > 0, "Service worker needs a non-empty APP_SHELL");

  const references = [
    ...extractHtmlAttributeReferences(html),
    ...extractCssUrlReferences(html, "index.html css url"),
    ...manifest.icons
      .map((icon) => ({ label: "manifest icon", path: normalizeLocalReference(icon.src) }))
      .filter((item) => item.path),
    ...appShell
      .map((entry) => ({ label: "service-worker APP_SHELL", path: normalizeLocalReference(entry) }))
      .filter((item) => item.path),
  ];

  for (const file of cssFiles) {
    references.push(...extractCssUrlReferences(readUtf8(file), `${file} css url`));
  }

  assertReferencesExist(references);

  const appShellPaths = new Set(appShell.map((entry) => normalizeLocalReference(entry)).filter(Boolean));
  for (const expected of ["index.html", "liquid-glass.css", "tarif-toni.css", "unterrichtsmaterial.js", "tarif-toni.js", "manifest.webmanifest", "app-icon.svg"]) {
    assert.ok(appShellPaths.has(expected), `Service worker APP_SHELL should include ${expected}`);
  }
});

test("versioned design and Toni assets stay aligned with the service worker", () => {
  const designVersion = serviceWorkerStringConst(serviceWorkerSource, "DESIGN_VERSION");
  const toniVersion = serviceWorkerStringConst(serviceWorkerSource, "TONI_VERSION");

  assert.equal(assetVersion(html, "liquid-glass.css"), designVersion, "HTML design CSS version must match service worker");
  assert.equal(assetVersion(html, "tarif-toni.css"), toniVersion, "HTML Toni CSS version must match service worker");
  assert.equal(assetVersion(html, "tarif-toni.js"), toniVersion, "HTML Toni JS version must match service worker");
  assert.match(serviceWorkerSource, /const CACHE_NAME = `\$\{CACHE_PREFIX\}v\d+`;/, "Service worker cache name must be versioned");
});

test("cards, slots, step order, and solution mapping stay aligned", () => {
  const cards = evaluateExpression(extractConst(html, "CARD_ITEMS", "[", "]"), "CARD_ITEMS");
  const solution = evaluateExpression(extractConst(html, "SOLUTION", "{", "}"), "SOLUTION");
  const stepOrder = evaluateExpression(extractConst(html, "STEP_ORDER", "[", "]"), "STEP_ORDER");
  const slots = buttonSlotKeys(html);

  assert.equal(cards.length, 15, "Expected exactly 15 cards");
  assert.equal(slots.length, 15, "Expected exactly 15 slots");
  assert.equal(stepOrder.length, 15, "Expected exactly 15 step-order entries");
  assert.equal(Object.keys(solution).length, 15, "Expected exactly 15 solution entries");

  const cardIds = cards.map((card) => card.id);
  assert.equal(unique(cardIds).length, 15, "Card ids must be unique");
  assert.equal(unique(slots).length, 15, "Slot keys must be unique");
  assert.equal(unique(stepOrder).length, 15, "Step-order keys must be unique");
  assert.equal(unique(Object.values(solution)).length, 15, "Solution card ids must be unique");

  assert.deepEqual([...slots].sort(sortByNumericSuffix), stepOrder, "HTML slots must match STEP_ORDER");
  assert.deepEqual(Object.keys(solution).sort(sortByNumericSuffix), stepOrder, "SOLUTION keys must match STEP_ORDER");
  assert.deepEqual(
    Object.values(solution).sort(sortByNumericSuffix),
    cardIds.sort(sortByNumericSuffix),
    "SOLUTION values must use every card exactly once",
  );

  for (const card of cards) {
    assert.equal(typeof card.label, "string", `Card ${card.id} needs a label`);
    assert.ok(card.label.trim(), `Card ${card.id} label must not be empty`);
  }
});

test("every step has complete learning material", () => {
  const stepOrder = evaluateExpression(extractConst(html, "STEP_ORDER", "[", "]"), "STEP_ORDER");
  const learning = evaluateExpression(
    extractBalanced(learningSource, "window.TARIFF_FLOW_LEARNING =", "{", "}"),
    "TARIFF_FLOW_LEARNING",
  );

  assert.deepEqual(
    Object.keys(learning).sort(sortByNumericSuffix),
    stepOrder,
    "Learning material keys must match STEP_ORDER",
  );

  for (const key of stepOrder) {
    const entry = learning[key];
    assert.ok(entry, `Missing learning entry for ${key}`);
    for (const field of ["title", "why", "example", "question", "caveat"]) {
      assert.equal(typeof entry[field], "string", `${key}.${field} must be a string`);
      assert.ok(entry[field].trim(), `${key}.${field} must not be empty`);
    }
  }
});

test("solution reveal remains gated and statically updates the solved board", () => {
  const solveAllBody = extractFunctionBody(html, "solveAll");
  const updateSolveButtonStateBody = extractFunctionBody(html, "updateSolveButtonState");

  assert.match(solveAllBody, /if\s*\(\s*!allSlotsFilled\(\)\s*\)\s*return;/, "solveAll must require filled slots");
  assert.match(solveAllBody, /solutionWasShown\s*=\s*true;/, "solveAll must mark the solution as shown");
  assert.match(solveAllBody, /placed\s*=\s*{\s*};/, "solveAll must rebuild placed cards from the solution");
  assert.match(solveAllBody, /slots\.forEach/, "solveAll must iterate over all slots");
  assert.match(solveAllBody, /SOLUTION\[key\]/, "solveAll must use the solution mapping per slot");
  assert.match(solveAllBody, /slot\.classList\.add\("correct"\)/, "solveAll must mark revealed slots as correct");
  assert.match(solveAllBody, /updateLearningButtons\(\);/, "solveAll must refresh learning buttons");

  assert.match(updateSolveButtonStateBody, /solveBtnEl\.disabled\s*=\s*!isComplete;/, "Solve button must be disabled until complete");
  assert.match(updateSolveButtonStateBody, /solveHintEl\.hidden\s*=\s*isComplete;/, "Solve hint must mirror completeness");
  assert.match(
    html,
    /document\.getElementById\("solveBtn"\)\.addEventListener\("click"[\s\S]*?if\s*\(\s*solveBtnEl\.disabled\s*\)\s*return;[\s\S]*?solveAll\(\);/,
    "Solve button click handler must respect the disabled guard before revealing",
  );
});

test("exam evaluation reveals and clears correctness at the right times", () => {
  const checkAllBody = extractFunctionBody(html, "checkAll");
  const markGameEditedBody = extractFunctionBody(html, "markGameEdited");

  assert.match(
    checkAllBody,
    /const revealCorrectness\s*=\s*currentMode\s*===\s*"learn"\s*\|\|\s*\(\s*currentMode\s*===\s*"exam"\s*&&\s*empty\s*===\s*0\s*\);/,
    "Exam mode must reveal correctness only after every field is filled",
  );
  assert.match(
    checkAllBody,
    /slot\.classList\.add\(cardId\s*===\s*SOLUTION\[key\]\s*\?\s*"correct"\s*:\s*"wrong"\);/,
    "Completed checks must mark both correct and wrong slots",
  );
  assert.match(
    checkAllBody,
    /currentMode\s*===\s*"learn"\s*\?\s*\(wrong\s*>\s*0\s*\|\|\s*empty\s*>\s*0\)\s*:\s*\(empty\s*===\s*0\s*&&\s*wrong\s*>\s*0\)/,
    "Exam try-again animation must wait for a complete failed check",
  );
  assert.match(
    markGameEditedBody,
    /slots\.forEach\(\(slot\)\s*=>\s*slot\.classList\.remove\("correct",\s*"wrong"\)\);/,
    "Editing an evaluated exam attempt must clear stale correctness classes",
  );
});

test("mode changes start an isolated attempt", () => {
  const setGameModeBody = extractFunctionBody(html, "setGameMode");

  assert.match(setGameModeBody, /const modeChanged = nextMode !== currentMode;/);
  assert.match(setGameModeBody, /if \(modeChanged\) resetAll\(\);/);
});

test("Tarif Toni restores persisted visibility state instead of forcing enabled", () => {
  assert.match(toniSource, /window\.addEventListener\("tarif-toni:request-state", emitState\);/);
  assert.match(html, /setGameMode\("learn"\);\s*window\.dispatchEvent\(new CustomEvent\("tarif-toni:request-state"\)\);/);
  assert.doesNotMatch(html, /setGameMode\("learn"\);\s*setToniEnabled\(true\);/);
});

test("Tarif Toni accounts for the speech bubble before showing messages", () => {
  const showMessageBody = extractFunctionBody(toniSource, "showMessage");

  assert.match(toniSource, /function getBubbleRectForCandidate\(/, "Toni needs a speech-bubble footprint");
  assert.match(toniSource, /function getCandidateRects\(/, "Toni candidate scoring must support multiple occupied rects");
  assert.match(showMessageBody, /findFreePosition\(\{\s*includeBubble:\s*true\s*\}\)/, "Toni must position for the bubble before speaking");
  assert.match(showMessageBody, /getCollisionCount\(nextPosition,\s*\{\s*includeBubble:\s*true\s*\}\)/, "Toni must detect speech-bubble collisions");
  assert.match(showMessageBody, /if\s*\(\s*bubbleWouldCollide\s*\)\s*return;/, "Toni must skip obstructive speech bubbles");
});

test("Tarif Toni AI remains free, source-bound, and disabled in exam mode", () => {
  const answerQuestionBody = extractFunctionBody(toniSource, "answerQuestion");
  const requestAiAnswerBody = extractFunctionBody(toniSource, "requestAiAnswer");

  assert.match(toniSource, /maxlength="240"/, "Toni questions need the server-aligned input limit");
  assert.match(toniSource, /Sie kann Fehler machen\. Gib keine persönlichen Daten ein\./, "The AI disclosure must be visible in the chat");
  assert.match(answerQuestionBody, /if \(getMode\(\) === "exam"\)/, "Exam mode needs a client-side guard");
  assert.match(answerQuestionBody, /Prüfungsmodus: keine KI-Anfrage/, "Exam mode must disclose that no AI request is made");
  assert.ok(
    answerQuestionBody.indexOf('getMode() === "exam"') < answerQuestionBody.indexOf("requestAiAnswer"),
    "The exam guard must run before any AI request",
  );
  assert.match(requestAiAnswerBody, /body: JSON\.stringify\(\{ message: question, mode: "learn" \}\)/, "Only learning mode may reach the AI route");
  assert.match(
    requestAiAnswerBody,
    /catch\s*\{\s*showLocalTip\(localResult,\s*"Die kostenlose KI ist gerade nicht erreichbar\."\);\s*\}/,
    "AI timeouts must fall back to the local source tip",
  );
  assert.doesNotMatch(
    requestAiAnswerBody,
    /if\s*\(\s*!controller\.signal\.aborted\s*\)/,
    "An aborted request must not suppress the local fallback",
  );
  assert.doesNotMatch(toniSource, /OPENROUTER_API_KEY|Authorization:\s*`Bearer/, "The browser code must not contain provider credentials");

  assert.match(toniApiSource, /const DEFAULT_MODEL = "openrouter\/free";/, "The backend must default to the free router");
  assert.match(toniApiSource, /model === "openrouter\/free" \|\| model\.endsWith\(":free"\)/, "The backend must reject paid model identifiers");
  assert.match(toniApiSource, /data_collection: "deny"/, "Provider data collection must be denied");
  assert.match(toniApiSource, /setTimeout\(\(\) => controller\.abort\(\), 22_000\)/, "The server must leave enough time for the approved second provider attempt");
  assert.match(toniSource, /window\.setTimeout\(\(\) => controller\.abort\(\), 25_000\)/, "The browser must wait slightly longer than the server");
  assert.match(toniApiSource, /zdr: true/, "Only zero-data-retention providers should be used");
  assert.match(toniApiSource, /if \(mode === "exam"\)/, "The backend needs its own exam guard");
});

test("GitHub Pages routes Tarif Toni to the public Vercel API", () => {
  const apiConfiguration = 'window.TARIF_TONI_API_URL = "https://flussdiagramm-spiel.vercel.app/api/tarif-toni-chat";';
  const toniScript = '<script src="tarif-toni.js?v=2026-07-20-api-fallback"></script>';

  assert.match(html, /window\.location\.hostname === "themohamedh\.github\.io"/, "Only GitHub Pages should use the cross-origin API URL");
  assert.match(html, /https:\/\/flussdiagramm-spiel\.vercel\.app\/api\/tarif-toni-chat/, "GitHub Pages must use the stable public Vercel production endpoint");
  assert.ok(html.indexOf(apiConfiguration) < html.indexOf(toniScript), "The API URL must be configured before Tarif Toni starts");
  assert.doesNotMatch(apiConfiguration, /OPENROUTER_API_KEY|sk-or-v1-/, "The browser configuration must never contain provider credentials");
});

test("Tarif Toni returns a source-bound local answer when the provider is unavailable", () => {
  assert.match(toniApiSource, /createLocalKnowledgeReply\(knowledge\)/);
  assert.match(toniApiSource, /return sendJson\(response, 200, createLocalKnowledgeReply\(knowledge\)\)/);
  assert.doesNotMatch(toniApiSource, /X-Tarif-Toni-Upstream-(?:Status|Failure)/);
});
