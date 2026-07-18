import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryDirectoryName = path.basename(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."));

const slotSelector = (key) => `.slot[data-key="${key}"]`;
const cardSelector = (id) => `#cards .card[data-card-id="${id}"]:not(.used)`;
const learningButtonSelector = (key) => `.slot-learning-btn[data-slot-key="${key}"]`;

async function gotoFresh(page, name) {
  const consoleProblems = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleProblems.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`/?e2e=${encodeURIComponent(name)}-${Date.now()}`);
  await expect(page).toHaveTitle(/Flussdiagramm-Spiel/);
  return { consoleProblems, pageErrors };
}

async function expectCleanRuntime(runtime) {
  expect(runtime.consoleProblems, "Browser console errors").toEqual([]);
  expect(runtime.pageErrors, "Unhandled page errors").toEqual([]);
}

async function placeCard(page, cardId, slotKey) {
  await page.locator(cardSelector(cardId)).click();
  await page.locator(slotSelector(slotKey)).click();
}

async function fillCorrectSolution(page) {
  for (let index = 1; index <= 15; index += 1) {
    await placeCard(page, `c${index}`, `s${index}`);
  }
}

async function countClasses(page) {
  return page.evaluate(() => ({
    correct: document.querySelectorAll(".slot.correct").length,
    wrong: document.querySelectorAll(".slot.wrong").length
  }));
}

async function visibleLearningButtons(page) {
  return page.evaluate(() => [...document.querySelectorAll(".slot-learning-btn")].filter((button) => !button.hidden).length);
}

test("Startzustand lädt vollständig und ohne Konsolenfehler", async ({ page }) => {
  const runtime = await gotoFresh(page, "start");

  await expect(page.locator(".card")).toHaveCount(15);
  await expect(page.locator(".slot")).toHaveCount(15);
  await expect(page.locator("#progress")).toHaveText("0 / 15 richtig");
  await expect(page.locator("#solveBtn")).toBeDisabled();
  await expect(page.locator(".tarif-toni")).toBeVisible();

  await expectCleanRuntime(runtime);
});

test("Lernmodus markiert falsche und korrigierte Zuordnung korrekt", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Gameplay-Smokes laufen im Desktop-Projekt; Mobile Layout hat einen eigenen Test.");
  const runtime = await gotoFresh(page, "learn-correct-wrong");

  await placeCard(page, "c2", "s1");
  await expect(page.locator(slotSelector("s1"))).toHaveText("Warnstreiks");
  await expect(page.locator(slotSelector("s1"))).toHaveClass(/wrong/);
  await expect(page.locator("#feedback")).toContainText("Nicht korrekt");

  await placeCard(page, "c1", "s1");
  await expect(page.locator(slotSelector("s1"))).toHaveText("Kündigung TV");
  await expect(page.locator(slotSelector("s1"))).toHaveClass(/correct/);
  await expect(page.locator("#progress")).toHaveText("1 / 15 richtig");
  await expect(page.locator(cardSelector("c2"))).not.toHaveClass(/used/);
  await expect(page.locator(learningButtonSelector("s1"))).toBeVisible();

  await page.locator(learningButtonSelector("s1")).click();
  await expect(page.locator("#infoPopup")).toHaveClass(/open/);
  await expect(page.locator("#infoTitle")).toHaveText("Kündigung TV");
  await expect(page.locator("#infoText .learning-detail-section")).toHaveCount(4);
  await page.locator("#closeInfoBtn").click();
  await expect(page.locator("#infoPopup")).not.toHaveClass(/open/);

  await expectCleanRuntime(runtime);
});

test("Prüfungsmodus wertet vollständige richtige Lösung erst nach Prüfen aus", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Gameplay-Smokes laufen im Desktop-Projekt; Mobile Layout hat einen eigenen Test.");
  const runtime = await gotoFresh(page, "exam-success");

  await page.locator('[data-mode="exam"]').click();
  await fillCorrectSolution(page);

  await expect(page.locator("#progress")).toHaveText("15 / 15 belegt");
  await expect(page.locator("#solveBtn")).toBeEnabled();
  await expect.poll(() => countClasses(page)).toEqual({ correct: 0, wrong: 0 });

  await page.locator("#checkBtn").click();
  await expect(page.locator("#finalOverlay")).toHaveClass(/open/);
  await expect(page.locator("#finalStats")).toContainText("Trefferquote: 100%");
  await expect.poll(() => countClasses(page)).toEqual({ correct: 15, wrong: 0 });
  await expect.poll(() => visibleLearningButtons(page)).toBe(15);

  await page.keyboard.press("Escape");
  await expect(page.locator("#finalOverlay")).not.toHaveClass(/open/);
  await page.locator(slotSelector("s1")).click();
  await expect(page.locator("#progress")).toHaveText("14 / 15 belegt");
  await expect.poll(() => countClasses(page)).toEqual({ correct: 0, wrong: 0 });

  await expectCleanRuntime(runtime);
});

test("Prüfungsmodus markiert vollständige falsche Lösung ohne Erfolgs-Overlay", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Gameplay-Smokes laufen im Desktop-Projekt; Mobile Layout hat einen eigenen Test.");
  const runtime = await gotoFresh(page, "exam-failure");

  await page.locator('[data-mode="exam"]').click();
  await placeCard(page, "c2", "s1");
  await placeCard(page, "c1", "s2");
  for (let index = 3; index <= 15; index += 1) {
    await placeCard(page, `c${index}`, `s${index}`);
  }

  await expect(page.locator("#progress")).toHaveText("15 / 15 belegt");
  await expect.poll(() => countClasses(page)).toEqual({ correct: 0, wrong: 0 });

  await page.locator("#checkBtn").click();
  await expect(page.locator("#finalOverlay")).not.toHaveClass(/open/);
  await expect(page.locator("#status")).toContainText("13 von 15 korrekt");
  await expect(page.locator("#feedback")).toContainText("13 richtige und 2 falsche");
  await expect.poll(() => countClasses(page)).toEqual({ correct: 13, wrong: 2 });
  await expect(page.locator("#tryAgainLayer")).toHaveClass(/active/);

  await expectCleanRuntime(runtime);
});

test("Lösung anzeigen ersetzt vollständig mit Musterlösung und öffnet kein Erfolgs-Overlay", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Gameplay-Smokes laufen im Desktop-Projekt; Mobile Layout hat einen eigenen Test.");
  const runtime = await gotoFresh(page, "solve-all");

  await page.locator('[data-mode="exam"]').click();
  await placeCard(page, "c2", "s1");
  await placeCard(page, "c1", "s2");
  for (let index = 3; index <= 15; index += 1) {
    await placeCard(page, `c${index}`, `s${index}`);
  }

  await page.locator("#solveBtn").click();
  await expect(page.locator("#finalOverlay")).not.toHaveClass(/open/);
  await expect(page.locator("#status")).toHaveText("Lösung wird angezeigt.");
  await expect.poll(() => countClasses(page)).toEqual({ correct: 15, wrong: 0 });
  await expect.poll(() => visibleLearningButtons(page)).toBe(15);

  await expectCleanRuntime(runtime);
});

test("mode-isolation: Moduswechsel beginnt mit einem vollständig frischen Versuch", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Gameplay-Smokes laufen im Desktop-Projekt; Mobile Layout hat einen eigenen Test.");
  const runtime = await gotoFresh(page, "mode-isolation");

  await page.locator('[data-mode="exam"]').click();
  await fillCorrectSolution(page);
  await expect(page.locator("#progress")).toHaveText("15 / 15 belegt");

  await page.locator('[data-mode="learn"]').click();
  await expect(page.locator("#progress")).toHaveText("0 / 15 richtig");
  await expect(page.locator(".slot.empty")).toHaveCount(15);
  await expect(page.locator(".card.used")).toHaveCount(0);
  await expect(page.locator("#finalOverlay")).not.toHaveClass(/open/);

  await page.locator('[data-mode="exam"]').click();
  await expect(page.locator("#progress")).toHaveText("0 / 15 belegt");
  await expect(page.locator(".slot.empty")).toHaveCount(15);

  await expectCleanRuntime(runtime);
});

test("toni-preferences: Ausblenden und Minimieren bleiben nach Neuladen erhalten", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Persistenz wird einmal im Desktop-Projekt geprüft.");
  const runtime = await gotoFresh(page, "toni-preferences");
  const toni = page.locator(".tarif-toni");
  const restore = page.locator(".tarif-toni__restore");

  await page.getByRole("button", { name: "Tarif Toni ausblenden" }).click();
  await expect(toni).toBeHidden();
  await page.reload();
  await expect(toni).toBeHidden();
  await expect(restore).toBeVisible();
  await expect(page.locator("#toniToggle")).toHaveAttribute("aria-pressed", "false");

  await restore.click();
  await page.getByRole("button", { name: "Tarif Toni minimieren" }).click();
  await expect(toni).toHaveClass(/is-minimized/);
  await page.reload();
  await expect(toni).toHaveClass(/is-minimized/);
  await expect(toni).toBeVisible();
  await expect(restore).toBeHidden();
  await expect(page.locator("#toniToggle")).toHaveAttribute("aria-pressed", "true");

  await expectCleanRuntime(runtime);
});

test("toni-ai-mode: Prüfungsmodus bleibt lokal, Lernmodus darf die KI-Route nutzen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Die Toni KI-Modusgrenze wird einmal im Desktop-Projekt geprüft.");
  let apiRequests = 0;
  await page.route("**/api/tarif-toni-chat", async (route) => {
    apiRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Ein Warnstreik ist ein kurzes Drucksignal im Tarifkonflikt.",
        kind: "ai",
        source: {
          label: "bpb: FAQ Was ist ein Streik?",
          url: "https://www.bpb.de/kurz-knapp/hintergrund-aktuell/547428/faq-was-ist-ein-streik/"
        }
      })
    });
  });

  const runtime = await gotoFresh(page, "toni-ai-mode");
  await page.locator('[data-mode="exam"]').click();
  await page.locator(".tarif-toni__character").click();
  await page.locator(".tarif-toni__input").fill("Welche Karte kommt zuerst?");
  await page.locator(".tarif-toni__send").click();
  await expect(page.locator(".tarif-toni__answer")).toContainText("Im Prüfungsmodus bleibt die KI aus");
  expect(apiRequests).toBe(0);

  await page.locator('[data-mode="learn"]').click();
  await page.locator(".tarif-toni__input").fill("Was ist ein Warnstreik?");
  await page.locator(".tarif-toni__send").click();
  await expect(page.locator(".tarif-toni__answer")).toHaveText("Ein Warnstreik ist ein kurzes Drucksignal im Tarifkonflikt.");
  await expect(page.locator(".tarif-toni__source")).toContainText("KI-Antwort auf Basis von");
  expect(apiRequests).toBe(1);

  await expectCleanRuntime(runtime);
});

test("path-boundary: Lokaler Testserver blockiert dekodierte Pfade in gleichnamige Nachbarordner", async ({ request }) => {
  const siblingName = `${repositoryDirectoryName}-escape`;
  const response = await request.get(`/%2e%2e%2f${encodeURIComponent(siblingName)}%2fpackage.json`);

  expect(response.status()).toBe(403);
});

test("Mobile Startansicht bleibt ohne horizontales Overflow und Toni verdeckt den Hero nicht", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile Layout wird nur im mobilen Projekt geprüft.");
  const runtime = await gotoFresh(page, "mobile-layout");

  await page.waitForTimeout(1_000);
  const layout = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const toniRect = document.querySelector(".tarif-toni").getBoundingClientRect();
    const heroRect = document.querySelector(".hero-panel").getBoundingClientRect();
    const overlapsHero = !(toniRect.right + 4 < heroRect.left
      || toniRect.left - 4 > heroRect.right
      || toniRect.bottom + 4 < heroRect.top
      || toniRect.top - 4 > heroRect.bottom);

    return {
      bubbleOpen: document.querySelector(".tarif-toni__bubble").classList.contains("open"),
      clientWidth: documentElement.clientWidth,
      overlapsHero,
      scrollWidth: documentElement.scrollWidth
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 2);
  expect(layout.overlapsHero).toBe(false);
  expect(layout.bubbleOpen).toBe(false);

  await expectCleanRuntime(runtime);
});
