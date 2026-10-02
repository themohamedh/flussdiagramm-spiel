import { expect, test } from '@playwright/test';

const runtimeProblems = new WeakMap();
test.beforeEach(async ({ page }) => {
  const problems = [];
  runtimeProblems.set(page, problems);
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    // The shared config intentionally blocks service workers for isolated UI tests.
    if (message.type() === 'warning' && message.text() === 'Service Worker registration blocked by Playwright') return;
    if (['error', 'warning'].includes(message.type())) problems.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(runtimeProblems.get(page), 'Browser errors and warnings').toEqual([]);
});

async function prepareChat(page, testInfo, { rejectOnAbort = false } = {}) {
  await page.addInitScript(({ rejectOnAbort }) => {
    const originalFetch = window.fetch.bind(window);
    window.toniTestRequests = [];
    window.fetch = (url, options) => {
      if (!String(url).includes('/api/tarif-toni-chat')) return originalFetch(url, options);
      return new Promise((resolve, reject) => {
        window.toniTestRequests.push({
          resolve: (reply) => resolve(new Response(JSON.stringify({ reply, kind: 'ai', source: null }), {
            headers: { 'Content-Type': 'application/json' }
          })),
          reject: () => reject(new Error('Provider unavailable')),
          signal: options.signal
        });
        if (rejectOnAbort) options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    };
  }, { rejectOnAbort });
  await page.goto('/');
  if (testInfo.project.name === 'mobile-chromium') await page.locator('#toniOpenBtn').click();
  else await page.locator('.tarif-toni__character').click();
}

async function ask(page, question) {
  await page.locator('.tarif-toni__input').fill(question);
  await page.locator('.tarif-toni__send').click();
}

async function settle(page, index, outcome, reply = 'Verspätete Lernantwort zum Warnstreik.') {
  await page.evaluate(async ({ index, outcome, reply }) => {
    window.toniTestRequests[index][outcome](reply);
    // Let fetch, Response.json and the UI continuation settle before assertions.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }, { index, outcome, reply });
}

for (const outcome of ['reject', 'resolve']) {
  test(`toni-request-lifecycle: ${outcome} einer abgebrochenen Lernanfrage überschreibt den Prüfungsmodus nicht`, async ({ page }, testInfo) => {
    await prepareChat(page, testInfo);
    await ask(page, 'Was ist ein Warnstreik?');
    await page.locator('[data-mode="exam"]').click();
    expect(await page.evaluate(() => window.toniTestRequests[0].signal.aborted)).toBe(true);
    await settle(page, 0, outcome);
    await expect(page.locator('.tarif-toni__answer')).toContainText('Im Prüfungsmodus bleibt die KI aus');
    await expect(page.locator('.tarif-toni__source')).toHaveText('Prüfungsmodus: keine KI-Anfrage');
    await expect(page.locator('.tarif-toni__source')).not.toHaveAttribute('href');
    await expect(page.locator('.tarif-toni__send')).toBeEnabled();
  });

  test(`toni-request-lifecycle: alte ${outcome}-Antwort überschreibt eine neue Anfrage nicht`, async ({ page }, testInfo) => {
    await prepareChat(page, testInfo);
    await ask(page, 'Was ist ein Warnstreik?');
    await page.locator('#toniToggle').click();
    await page.locator('#toniToggle').click();
    if (testInfo.project.name === 'mobile-chromium') await page.locator('#toniOpenBtn').click();
    else await page.locator('.tarif-toni__character').click();
    await ask(page, 'Was ist eine Schlichtung?');
    await settle(page, 0, outcome);
    await expect(page.locator('.tarif-toni__answer')).toHaveText('Tarif Toni prüft die Quellen und denkt kurz nach.');
    await expect(page.locator('.tarif-toni__send')).toBeDisabled();
    await expect(page.locator('.tarif-toni__input')).toHaveAttribute('aria-busy', 'true');
    await settle(page, 1, 'resolve', 'Eine neutrale Person unterstützt die Suche nach einem Kompromiss.');
    await expect(page.locator('.tarif-toni__answer')).toHaveText('Eine neutrale Person unterstützt die Suche nach einem Kompromiss.');
    await expect(page.locator('.tarif-toni__send')).toBeEnabled();
  });
}

test('toni-request-lifecycle: echter Timeout zeigt weiterhin den lokalen Quellentipp', async ({ page }, testInfo) => {
  await prepareChat(page, testInfo, { rejectOnAbort: true });
  await page.clock.install();
  await ask(page, 'Was ist ein Warnstreik?');
  await page.clock.fastForward(25_001);
  await expect(page.locator('.tarif-toni__answer')).toContainText('Die kostenlose KI ist gerade nicht erreichbar.');
  await expect(page.locator('.tarif-toni__source')).toContainText('Lokaler Quellentipp');
  await expect(page.locator('.tarif-toni__send')).toBeEnabled();
  await expect(page.locator('.tarif-toni__input')).not.toHaveAttribute('aria-busy');
});
