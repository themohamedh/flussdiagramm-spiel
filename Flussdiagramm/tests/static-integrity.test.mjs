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
const serviceWorkerSource = readUtf8("service-worker.js");
const serveStaticSource = readUtf8("scripts/serve-static.mjs");
const toniSource = readUtf8("tarif-toni.js");
const iosContentSource = readUtf8("ios/FlussdiagrammSpiel/ContentView.swift");
const iosGameStoreSource = readUtf8("ios/FlussdiagrammSpiel/GameStore.swift");

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

  assert.equal(packageJson.scripts.check, "npm run test:static");
  assert.equal(packageJson.scripts.test, "npm run test:static");
  assert.equal(packageJson.scripts["test:all"], "npm run test:static && npm run test:e2e");
  assert.equal(packageJson.scripts["test:static"], "node --test tests/static-integrity.test.mjs");
  assert.equal(packageJson.scripts["test:e2e"], "playwright test");
  assert.match(packageJson.devDependencies["@playwright/test"], /^\^1\./, "Playwright test runner should be a dev dependency");

  for (const file of ["playwright.config.mjs", "scripts/serve-static.mjs", "tests/e2e/flussdiagramm.spec.mjs"]) {
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
  assert.match(e2e, /mobile-layout/, "E2E suite should cover mobile layout");
});

test("local static server rejects decoded path traversal", () => {
  assert.match(serveStaticSource, /decodeURIComponent/, "Static server should decode request paths before resolving");
  assert.match(serveStaticSource, /path\.relative\(root,\s*target\)/, "Static server should use separator-aware containment");
  assert.match(serveStaticSource, /path\.isAbsolute\(relative\)/, "Static server should reject absolute relative paths");
  assert.doesNotMatch(serveStaticSource, /target\.startsWith\(root\)/, "Static server must not use prefix-only containment");
});

test("iOS exam mode waits for final evaluation before revealing correctness", () => {
  assert.match(iosGameStoreSource, /var solutionWasShown = false/, "Game store should track solution reveal separately");
  assert.match(iosGameStoreSource, /var shouldShowAnswerState: Bool/, "Game store should expose answer-state visibility");
  assert.match(iosGameStoreSource, /mode == \.exam && placements\.count == GameData\.steps\.count/, "Exam mode should evaluate complete attempts");
  assert.match(iosGameStoreSource, /private func evaluateExamAttempt\(\)/, "Exam mode should evaluate final placement state");
  assert.match(iosGameStoreSource, /wrongAttempts = wrongSteps\.count/, "Exam wrong count should come from final wrong steps");
  assert.match(iosGameStoreSource, /solutionWasShown = true[\s\S]*showResult = false/, "Solution reveal should not open scored results");

  assert.match(iosContentSource, /game\.shouldShowAnswerState \? game\.correctCount : game\.placements\.count/, "Exam progress should not reveal correctness before evaluation");
  assert.match(
    iosContentSource,
    /if game\.shouldShowAnswerState \{[\s\S]*?\} else \{\s*Text\("Prüfung läuft"\)\s*\}/,
    "Exam step label should not reveal the first incorrect placement before evaluation",
  );
  assert.match(iosContentSource, /guard game\.shouldShowAnswerState else \{ return "circle\.fill" \}/, "Exam status icon should stay neutral before evaluation");
  assert.match(iosContentSource, /guard game\.shouldShowAnswerState else \{ return \.blue \}/, "Exam status color should stay neutral before evaluation");
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

test("versioned Toni assets stay aligned with the service worker", () => {
  const toniVersion = serviceWorkerStringConst(serviceWorkerSource, "TONI_VERSION");

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

test("Tarif Toni accounts for the speech bubble before showing messages", () => {
  const showMessageBody = extractFunctionBody(toniSource, "showMessage");

  assert.match(toniSource, /function getBubbleRectForCandidate\(/, "Toni needs a speech-bubble footprint");
  assert.match(toniSource, /function getCandidateRects\(/, "Toni candidate scoring must support multiple occupied rects");
  assert.match(showMessageBody, /findFreePosition\(\{\s*includeBubble:\s*true\s*\}\)/, "Toni must position for the bubble before speaking");
  assert.match(showMessageBody, /getCollisionCount\(nextPosition,\s*\{\s*includeBubble:\s*true\s*\}\)/, "Toni must detect speech-bubble collisions");
  assert.match(showMessageBody, /if\s*\(\s*bubbleWouldCollide\s*\)\s*return;/, "Toni must skip obstructive speech bubbles");
});
