import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const html = readUtf8("index.html");
const learningSource = readUtf8("unterrichtsmaterial.js");

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
