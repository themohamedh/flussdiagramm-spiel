import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(root, "index.html");
const buildPath = resolve(root, "scripts", "build-app.mjs");
const indexSource = await readFile(indexPath, "utf8");
const buildSource = await readFile(buildPath, "utf8");
const expectedSlots = Array.from({ length: 15 }, (_, index) => `s${index + 1}`);
const results = [];

async function checkGroup(name, check) {
  const errors = [];
  const requireCondition = (condition, message) => {
    if (!condition) errors.push(message);
  };

  try {
    await check(requireCondition);
  } catch (error) {
    errors.push(`Validator konnte diesen Bereich nicht pruefen: ${error.message}`);
  }

  results.push({ name, errors });
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
}

function describeSetDifference(expected, actual) {
  const missing = expected.filter((value) => !actual.includes(value));
  const extra = actual.filter((value) => !expected.includes(value));
  const parts = [];
  if (missing.length) parts.push(`fehlt: ${missing.join(", ")}`);
  if (extra.length) parts.push(`unerwartet: ${extra.join(", ")}`);
  return parts.join("; ");
}

function findBalancedEnd(source, startIndex) {
  const opening = source[startIndex];
  const matching = { "{": "}", "[": "]", "(": ")" };
  if (!matching[opening]) throw new Error(`Kein ausbalancierbarer Start bei Index ${startIndex}.`);

  const stack = [matching[opening]];
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = startIndex + 1; index < source.length; index += 1) {
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
        quote = null;
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
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (matching[char]) {
      stack.push(matching[char]);
      continue;
    }
    if (char === stack.at(-1)) {
      stack.pop();
      if (!stack.length) return index;
    }
  }

  throw new Error(`Nicht geschlossener Block ab Index ${startIndex}.`);
}

function extractNamedLiteral(source, name) {
  const declaration = new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*=\\s*`, "m").exec(source);
  if (!declaration) throw new Error(`Deklaration ${name} wurde nicht gefunden.`);
  const start = declaration.index + declaration[0].length;
  if (source[start] !== "{" && source[start] !== "[") {
    throw new Error(`${name} muss als statisches Objekt oder Array definiert sein.`);
  }
  return source.slice(start, findBalancedEnd(source, start) + 1);
}

function evaluateLiteral(source, name) {
  const literal = extractNamedLiteral(source, name);
  return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 200 });
}

function getStaticAssignedObjects(source) {
  const assignments = [];
  const pattern = /\b(?:(?:const|let|var)\s+([A-Za-z_$][\w$]*)|(?:window|globalThis)\.([A-Za-z_$][\w$]*))\s*=\s*\{/g;

  for (const match of source.matchAll(pattern)) {
    const start = source.indexOf("{", match.index);
    try {
      const literal = source.slice(start, findBalancedEnd(source, start) + 1);
      const value = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 200 });
      assignments.push({ name: match[1] ?? match[2], value });
    } catch {
      // Dynamic object assignments are irrelevant for static content validation.
    }
  }

  return assignments;
}

function extractFunctionBody(source, name) {
  const declaration = new RegExp(`\\bfunction\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, "m").exec(source);
  if (!declaration) throw new Error(`Funktion ${name} wurde nicht gefunden.`);
  const start = source.indexOf("{", declaration.index);
  return source.slice(start + 1, findBalancedEnd(source, start));
}

function extractArrowListenerBody(source, eventName) {
  const declaration = new RegExp(
    `\\.addEventListener\\(\\s*["']${eventName}["']\\s*,\\s*\\([^)]*\\)\\s*=>\\s*\\{`,
    "m"
  ).exec(source);
  if (!declaration) throw new Error(`Event-Handler fuer "${eventName}" wurde nicht gefunden.`);
  const start = source.indexOf("{", declaration.index);
  return source.slice(start + 1, findBalancedEnd(source, start));
}

function stripLearnOnlyBlocks(source) {
  const guard = /if\s*\(\s*currentMode\s*(?:===\s*["']learn["']|!==\s*["']exam["'])\s*\)\s*\{/g;
  let stripped = source;
  let match;

  while ((match = guard.exec(stripped))) {
    const start = stripped.indexOf("{", match.index);
    const end = findBalancedEnd(stripped, start);
    stripped = `${stripped.slice(0, match.index)}${" ".repeat(end + 1 - match.index)}${stripped.slice(end + 1)}`;
    guard.lastIndex = match.index;
  }

  return stripped;
}

function getOpeningTagById(source, id) {
  return [...source.matchAll(/<[a-z][^>]*>/gi)]
    .map((match) => match[0])
    .find((tag) => getAttribute(tag, "id") === id);
}

function normalizeAssetReference(reference) {
  const withoutFragment = reference.split("#")[0].split("?")[0].trim();
  if (
    !withoutFragment ||
    withoutFragment === "." ||
    withoutFragment === "./" ||
    withoutFragment.startsWith("#") ||
    withoutFragment.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(withoutFragment) ||
    withoutFragment.startsWith("//")
  ) {
    return null;
  }
  return withoutFragment.replace(/^\.\//, "");
}

function referencesFromHtml(source) {
  const references = [];
  for (const match of source.matchAll(/<(?:link|script|img|source|video|audio)\b[^>]*>/gi)) {
    const tag = match[0];
    const reference = getAttribute(tag, "href") ?? getAttribute(tag, "src") ?? getAttribute(tag, "poster");
    const normalized = reference && normalizeAssetReference(reference);
    if (normalized) references.push(normalized);
  }
  return references;
}

function referencesFromCss(source) {
  const references = [];
  for (const match of source.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)"']+))\s*\)/gi)) {
    const normalized = normalizeAssetReference(match[2] ?? match[3] ?? "");
    if (normalized) references.push(normalized);
  }
  return references;
}

function referencesFromManifest(source) {
  const manifest = JSON.parse(source);
  const references = [];
  for (const icon of manifest.icons ?? []) {
    const normalized = normalizeAssetReference(icon.src ?? "");
    if (normalized) references.push(normalized);
  }
  return references;
}

async function discoverRequiredBuildAssets() {
  const discovered = new Set(["index.html"]);
  const queue = ["index.html"];

  while (queue.length) {
    const asset = queue.shift();
    const absolutePath = resolve(root, asset);
    const source = await readFile(absolutePath, "utf8");
    const extension = extname(asset).toLowerCase();
    let references = [];

    if (extension === ".html") references = referencesFromHtml(source);
    if (extension === ".css") references = referencesFromCss(source);
    if (extension === ".webmanifest" || extension === ".json") references = referencesFromManifest(source);

    for (const reference of references) {
      const resolvedReference = relative(root, resolve(dirname(absolutePath), reference)).replaceAll("\\", "/");
      if (resolvedReference.startsWith("../") || discovered.has(resolvedReference)) continue;
      discovered.add(resolvedReference);
      if ([".html", ".css", ".webmanifest", ".json"].includes(extname(resolvedReference).toLowerCase())) {
        queue.push(resolvedReference);
      }
    }
  }

  return discovered;
}

async function collectAppSourceFiles(directory = root) {
  const excludedDirectories = new Set([".git", "android", "dist", "ios", "node_modules", "scripts", "tests"]);
  const allowedExtensions = new Set([".css", ".html", ".js", ".mjs"]);
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectAppSourceFiles(absolutePath));
    } else if (allowedExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(absolutePath);
    }
  }

  return files;
}

await checkGroup("15 Slots und eindeutige vollstaendige Loesung", (requireCondition) => {
  const slotTags = [...indexSource.matchAll(/<button\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => (getAttribute(tag, "class") ?? "").split(/\s+/).includes("slot"));
  const slotKeys = slotTags.map((tag) => getAttribute(tag, "data-key")).filter(Boolean);
  const solution = evaluateLiteral(indexSource, "SOLUTION");
  const cards = evaluateLiteral(indexSource, "CARD_ITEMS");
  const solutionKeys = Object.keys(solution);
  const solutionValues = Object.values(solution);
  const cardIds = cards.map((card) => card.id);

  requireCondition(slotKeys.length === 15, `Es muessen genau 15 Slot-Elemente existieren; gefunden: ${slotKeys.length}.`);
  requireCondition(
    new Set(slotKeys).size === slotKeys.length,
    `Slot-IDs muessen eindeutig sein; gefunden: ${slotKeys.join(", ")}.`
  );
  requireCondition(
    expectedSlots.every((slot) => slotKeys.includes(slot)) && slotKeys.every((slot) => expectedSlots.includes(slot)),
    `Slots muessen genau s1 bis s15 abdecken (${describeSetDifference(expectedSlots, slotKeys)}).`
  );
  requireCondition(
    expectedSlots.every((slot) => solutionKeys.includes(slot)) && solutionKeys.every((slot) => expectedSlots.includes(slot)),
    `SOLUTION muss genau s1 bis s15 abdecken (${describeSetDifference(expectedSlots, solutionKeys)}).`
  );
  requireCondition(
    new Set(solutionValues).size === solutionValues.length,
    `Jeder Slot braucht eine eigene Loesungskarte; doppelte Karten in SOLUTION: ${solutionValues.join(", ")}.`
  );
  requireCondition(
    new Set(cardIds).size === cardIds.length,
    `Karten-IDs in CARD_ITEMS muessen eindeutig sein; gefunden: ${cardIds.join(", ")}.`
  );
  requireCondition(cardIds.length === 15, `CARD_ITEMS muss genau 15 Karten enthalten; gefunden: ${cardIds.length}.`);
  requireCondition(
    solutionValues.every((cardId) => cardIds.includes(cardId)),
    `Alle SOLUTION-Werte muessen auf CARD_ITEMS verweisen (${describeSetDifference(solutionValues, cardIds)}).`
  );
  requireCondition(
    cardIds.every((cardId) => solutionValues.includes(cardId)),
    `Jede Karte muss genau einmal Teil der Loesung sein (${describeSetDifference(cardIds, solutionValues)}).`
  );
});

await checkGroup("Unterrichtsmaterial fuer s1 bis s15", async (requireCondition) => {
  const candidates = [];
  const sourceFiles = [{ name: "index.html", source: indexSource }];
  const scriptReferences = referencesFromHtml(indexSource)
    .filter((reference) => [".js", ".mjs"].includes(extname(reference).toLowerCase()));

  for (const reference of scriptReferences) {
    sourceFiles.push({
      name: reference,
      source: await readFile(resolve(root, reference), "utf8")
    });
  }

  for (const sourceFile of sourceFiles) {
    for (const assignment of getStaticAssignedObjects(sourceFile.source)) {
      const value = assignment.value;
      if (!value || Array.isArray(value) || typeof value !== "object") continue;
      const slotCount = expectedSlots.filter((slot) => Object.hasOwn(value, slot)).length;
      const objectEntryCount = expectedSlots.filter((slot) => {
        const entry = value[slot];
        return entry && typeof entry === "object" && !Array.isArray(entry);
      }).length;
      const fieldCount = expectedSlots.reduce((count, slot) => {
        const entry = value[slot];
        return count + ["why", "example", "question"].filter((field) => typeof entry?.[field] === "string" && entry[field].trim()).length;
      }, 0);
      if (objectEntryCount) {
        candidates.push({
          name: `${sourceFile.name}:${assignment.name}`,
          value,
          slotCount,
          objectEntryCount,
          fieldCount
        });
      }
    }
  }

  candidates.sort((left, right) => (
    right.fieldCount - left.fieldCount ||
    right.objectEntryCount - left.objectEntryCount ||
    right.slotCount - left.slotCount
  ));
  const material = candidates[0];
  requireCondition(
    Boolean(material),
    "Es fehlt ein statisches Unterrichtsmaterial-Objekt mit Eintraegen fuer s1 bis s15."
  );
  if (!material) return;

  requireCondition(
    material.slotCount === expectedSlots.length,
    `${material.name} muss Material fuer alle Slots enthalten; vorhanden: ${material.slotCount}/15.`
  );
  for (const field of ["why", "example", "question"]) {
    const missing = expectedSlots.filter((slot) => typeof material.value[slot]?.[field] !== "string" || !material.value[slot][field].trim());
    requireCondition(
      !missing.length,
      `${material.name}: Feld "${field}" fehlt oder ist leer fuer ${missing.join(", ")}.`
    );
  }
});

await checkGroup("Keine externe Google-Font-Abhaengigkeit", async (requireCondition) => {
  const files = await collectAppSourceFiles();
  const findings = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    source.split(/\r?\n/).forEach((line, index) => {
      if (/https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)/i.test(line)) {
        findings.push(`${relative(root, file).replaceAll("\\", "/")}:${index + 1}`);
      }
    });
  }

  requireCondition(
    !findings.length,
    `Google Fonts darf nicht extern geladen werden; Referenzen gefunden in ${findings.join(", ")}.`
  );
});

await checkGroup("Pruefungsmodus ohne vorzeitige Loesungshinweise", (requireCondition) => {
  const functionsThatNeedExamGating = [
    ["renderCards", /is-focus-card|expectedCardId/, "markiert die erwartete Karte"],
    ["updateFocusMode", /is-focus-target|focus-active/, "markiert den naechsten richtigen Slot"],
    ["updateConnectors", /classList\.toggle\(["'](?:correct|revealed|active)["']/, "faerbt Verbindungen nach Richtigkeit"],
    ["updateProgress", /richtig|placed\[key\]\s*===\s*SOLUTION\[key\]/, "zeigt den laufenden Richtig-Stand"]
  ];

  for (const [functionName, sensitivePattern, description] of functionsThatNeedExamGating) {
    const body = extractFunctionBody(indexSource, functionName);
    const containsSensitiveBehavior = sensitivePattern.test(body);
    const containsModeGate = /currentMode\s*(?:===|!==)\s*["'](?:learn|exam)["']/.test(body);
    requireCondition(
      !containsSensitiveBehavior || containsModeGate,
      `${functionName} ${description}, hat aber keinen expliziten currentMode-Guard.`
    );
  }

  const placementBody = stripLearnOnlyBlocks(extractFunctionBody(indexSource, "moveCardToSlot"));
  const placementLeaks = [
    [/classList\.add\(["']correct["']\)/, "CSS-Klasse correct"],
    [/classList\.add\(["']wrong["']\)/, "CSS-Klasse wrong"],
    [/setStatusState\(["']positive["']/, "positiven Richtig-Status"],
    [/setStatusState\(["']negative["']/, "negativen Falsch-Status"],
    [/\bplayCorrectSound\s*\(/, "Richtig-Sound"],
    [/\bplayWrongSound\s*\(/, "Falsch-Sound"]
  ].filter(([pattern]) => pattern.test(placementBody)).map(([, label]) => label);

  requireCondition(
    !placementLeaks.length,
    `moveCardToSlot verraet Zuordnungen im Pruefungsmodus durch: ${placementLeaks.join(", ")}.`
  );

  const dropBody = stripLearnOnlyBlocks(extractArrowListenerBody(indexSource, "drop"));
  const dropFeedback = /classList\.add\(\s*isCorrectDrop\s*\?\s*["']drop-ok["']\s*:\s*["']drop-bad["']\s*\)/.test(dropBody);
  requireCondition(
    !dropFeedback,
    "Der Drop-Handler zeigt mit drop-ok/drop-bad unmittelbar richtig oder falsch; im Pruefungsmodus muss dieses Feedback ausbleiben."
  );
});

await checkGroup("Abschluss-Effekte und reduzierte Bewegung", (requireCondition) => {
  const successBody = extractFunctionBody(indexSource, "triggerSuccessCelebration");
  const tryAgainBody = extractFunctionBody(indexSource, "triggerTryAgainAnimation");
  const completionBody = extractFunctionBody(indexSource, "showCompletionOverlay");
  const checkAllBody = extractFunctionBody(indexSource, "checkAll");

  requireCondition(
    /id=["']celebrationLayer["']/.test(indexSource) && /id=["']tryAgainLayer["']/.test(indexSource),
    "Die Ebenen fuer Erfolgs- und Nochmal-versuchen-Effekte fehlen."
  );
  requireCondition(
    /triggerSuccessCelebration\s*\(\)/.test(completionBody),
    "Der erfolgreiche Abschluss muss die Erfolgsanimation ausloesen."
  );
  requireCondition(
    /triggerTryAgainAnimation\s*\(\)/.test(checkAllBody),
    "Eine nicht vollstaendig richtige Pruefung muss die freundliche Fehlversuch-Animation ausloesen."
  );
  requireCondition(
    /slots\.length/.test(successBody) && !/particleCount\s*=\s*1[56]\b/.test(successBody),
    "Die Konfetti-Menge muss dynamisch aus der vorhandenen Spiellogik abgeleitet werden."
  );
  requireCondition(
    /tryAgainActive\s*\|\|\s*celebrationActive/.test(tryAgainBody) && /if\s*\(celebrationActive\)\s*return/.test(successBody),
    "Die Effekte brauchen Schutz vor mehrfach gleichzeitig gestarteten Animationen."
  );
  requireCondition(
    /prefers-reduced-motion:\s*reduce/.test(indexSource) && /reducedMotion\.matches/.test(indexSource),
    "Reduzierte Bewegung muss in CSS und JavaScript beruecksichtigt werden."
  );
});

await checkGroup("Tarif Toni als optionaler Begleiter", (requireCondition) => {
  const moveBody = extractFunctionBody(indexSource, "moveTarifToni");
  const scheduleBody = extractFunctionBody(indexSource, "scheduleToniMovement");
  const toggleBody = extractFunctionBody(indexSource, "setToniEnabled");
  const placementBody = extractFunctionBody(indexSource, "moveCardToSlot");
  const modeBody = extractFunctionBody(indexSource, "setGameMode");
  const completionBody = extractFunctionBody(indexSource, "showCompletionOverlay");

  requireCondition(
    /id=["']tarifToni["']/.test(indexSource) && /id=["']toniToggle["']/.test(indexSource),
    "Tarif Toni und sein Ein-/Aus-Schalter muessen vorhanden sein."
  );
  requireCondition(
    /pointer-events:\s*none/.test(indexSource),
    "Tarif Toni darf Touch-, Klick- und Drag-and-Drop-Eingaben nicht blockieren."
  );
  requireCondition(
    /setInterval\s*\(\s*moveTarifToni\s*,\s*30000\s*\)/.test(scheduleBody),
    "Tarif Toni soll seine Position etwa alle 30 Sekunden wechseln."
  );
  requireCondition(
    /reducedMotion\.matches/.test(moveBody) && /reducedMotion\.matches/.test(scheduleBody),
    "Automatische Toni-Bewegung muss bei reduzierter Bewegung deaktiviert sein."
  );
  requireCondition(
    /tarifToniEl\.hidden\s*=\s*!enabled/.test(toggleBody) && /clearInterval\s*\(\s*toniMoveTimer\s*\)/.test(scheduleBody),
    "Beim Ausschalten muss Toni verschwinden und seine Bewegung stoppen."
  );
  requireCondition(
    /TONI_CORRECT/.test(placementBody) && /TONI_WRONG/.test(placementBody) && /TONI_EXAM/.test(placementBody),
    "Toni braucht getrennte Reaktionen fuer richtig, falsch und Pruefungsmodus."
  );
  requireCondition(
    /TONI_LEARN_HINTS/.test(modeBody) && /TONI_EXAM/.test(modeBody),
    "Der Moduswechsel muss Lernhinweise und neutrale Pruefungsnachrichten trennen."
  );
  requireCondition(
    /TONI_SUCCESS/.test(completionBody),
    "Beim erfolgreichen Abschluss muss Toni eine Erfolgsnachricht anzeigen."
  );
});

await checkGroup("Tarif Toni Chat ohne Frontend-Geheimnisse", (requireCondition) => {
  requireCondition(
    /id=["']toniChat["']/.test(indexSource) &&
      /id=["']toniChatInput["']/.test(indexSource) &&
      /id=["']toniChatSend["']/.test(indexSource) &&
      /id=["']toniChatClose["']/.test(indexSource),
    "Der Toni-Chat braucht Fenster, Eingabe, Senden- und Schliessen-Button."
  );
  requireCondition(
    /fetch\s*\(\s*TONI_CHAT_API_URL/.test(indexSource) &&
      /mode:\s*currentMode\s*===\s*["']exam["']\s*\?\s*["']exam["']\s*:\s*["']learning["']/.test(indexSource),
    "Der Toni-Chat muss die sichere API-Zwischenstelle mit dem aktuellen Modus aufrufen."
  );
  requireCondition(
    /maxlength=["']500["']/.test(indexSource) && /Tarif Toni denkt kurz nach/.test(indexSource),
    "Nachrichtenlimit und freundlicher Ladezustand fehlen."
  );
  requireCondition(
    !/OPENROUTER_API_KEY|Bearer\s+[A-Za-z0-9_-]{12,}/.test(indexSource),
    "Im Frontend darf kein OpenRouter-Key oder Bearer-Token stehen."
  );
});

await checkGroup("Dialoge mit grundlegenden ARIA-Merkmalen", (requireCondition) => {
  for (const id of ["infoPopup", "finalOverlay"]) {
    const tag = getOpeningTagById(indexSource, id);
    requireCondition(Boolean(tag), `Dialog-Container #${id} wurde nicht gefunden.`);
    if (!tag) continue;

    const tagName = tag.match(/^<([a-z]+)/i)?.[1]?.toLowerCase();
    const role = getAttribute(tag, "role");
    const ariaModal = getAttribute(tag, "aria-modal");
    const labelledBy = getAttribute(tag, "aria-labelledby");

    requireCondition(tagName === "dialog" || role === "dialog", `#${id} braucht role="dialog" oder ein natives <dialog>-Element.`);
    requireCondition(ariaModal === "true", `#${id} braucht aria-modal="true".`);
    requireCondition(Boolean(labelledBy), `#${id} braucht aria-labelledby mit Verweis auf seine sichtbare Ueberschrift.`);
    if (labelledBy) {
      requireCondition(
        Boolean(getOpeningTagById(indexSource, labelledBy)),
        `#${id} verweist mit aria-labelledby auf die nicht vorhandene ID "${labelledBy}".`
      );
    }
  }
});

await checkGroup("Build-Skript enthaelt alle erforderlichen Assets", async (requireCondition) => {
  const appFiles = evaluateLiteral(buildSource, "appFiles").map((file) => file.replaceAll("\\", "/"));
  const requiredAssets = sorted(await discoverRequiredBuildAssets());
  const missing = requiredAssets.filter((asset) => !appFiles.includes(asset));

  requireCondition(
    !missing.length,
    `scripts/build-app.mjs muss alle lokal referenzierten Assets in appFiles aufnehmen; fehlt: ${missing.join(", ")}.`
  );
});

const failed = results.filter((result) => result.errors.length);
const passedCount = results.length - failed.length;

console.log(`Flussdiagramm-Validator: ${passedCount}/${results.length} Pruefbereiche bestanden.`);
for (const result of results) {
  if (!result.errors.length) {
    console.log(`[OK] ${result.name}`);
    continue;
  }
  console.error(`[FEHLER] ${result.name}`);
  for (const error of result.errors) console.error(`  - ${error}`);
}

if (failed.length) {
  console.error(`\n${failed.length} Pruefbereich(e) fehlgeschlagen.`);
  if (typeof process !== "undefined") process.exitCode = 1;
}
