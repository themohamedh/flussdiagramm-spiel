# Mobile/UI-E2E-Kriterien

Ziel dieser Kriterien ist eine robuste Mobile-/UI-Abdeckung ohne pixelgenaue
Screenshot-Vergleiche. Die Assertions prüfen sichtbare Semantik, Bounding-Rects,
Scroll-Containment, Fokus und Zustände. Die vorhandenen Screenshots unter
`qa-screenshots-mobile-a11y-2026-06-30/` dienen nur als visuelle Referenz.

## Test-Basis

Für jeden Testlauf:

- Viewports: `320x568`, `390x844`, `768x1024`, zusätzlich `1280x720` als Desktop-Startansicht.
- `page.emulateMedia({ reducedMotion: "reduce" })`, damit Animationen nicht über Testergebnisse entscheiden.
- Vor dem Laden `localStorage.removeItem("tarif-toni-preferences")`, damit Toni nicht durch alte Nutzerpräferenzen versteckt ist.
- Auf `main.app`, `.hero-panel`, `#boardViewport` und `.tarif-toni` warten.
- Screenshots nur als Artefakt bei Fehlern speichern, nicht als primäre Assertion.

Hilfsfunktionen für Geometrie:

```js
function overlapArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

async function visibleBox(locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
    width: box.width,
    height: box.height,
  };
}
```

## Startansicht

Stabile Assertions:

- `getByRole("heading", { name: /Flussdiagramm-Spiel/i })` ist sichtbar.
- `.hero-panel .subtitle` ist sichtbar und hat eine positive Breite und Höhe.
- `getByRole("group", { name: "Spielmodus auswählen" })` ist sichtbar.
- `#modeLearnBtn` ist sichtbar und hat die Klasse `active`.
- `#modeExamBtn`, `#checkBtn`, `#resetBtn`, `#solveBtn`, `#soundToggle`, `#toniToggle` und `#progress` sind sichtbar.
- `#solveBtn` ist initial deaktiviert und `#solveHint` ist sichtbar.
- Die sichtbaren Start-Control-Rects liegen horizontal innerhalb des Viewports:

```js
for (const selector of [
  ".hero-panel",
  ".top-grid",
  "#modeLearnBtn",
  "#modeExamBtn",
  "#checkBtn",
  "#resetBtn",
  "#solveBtn",
  "#soundToggle",
  "#toniToggle",
]) {
  const box = await visibleBox(page.locator(selector).first());
  expect(box.left).toBeGreaterThanOrEqual(-1);
  expect(box.right).toBeLessThanOrEqual(viewport.width + 1);
}
```

Nicht als stabil ansehen: exakte Abstände, Schatten, Hintergrundbild-Ausschnitte
oder Zeilenumbrüche im Hero.

## Kein globales horizontales Overflow

Stabile Assertions je Mobile-/Tablet-Viewport:

- Das Dokument erzeugt keinen globalen horizontalen Scrollbalken:

```js
const overflow = await page.evaluate(() => ({
  html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  body: document.body.scrollWidth - window.innerWidth,
  appRight: document.querySelector("main.app").getBoundingClientRect().right - window.innerWidth,
}));

expect(overflow.html).toBeLessThanOrEqual(1);
expect(overflow.body).toBeLessThanOrEqual(1);
expect(overflow.appRight).toBeLessThanOrEqual(1);
```

- Die breite Spielfläche darf nur innerhalb `.board-wrap` scrollen:

```js
const boardScroll = await page.locator(".board-wrap").evaluate((element) => {
  const styles = getComputedStyle(element);
  element.scrollLeft = element.scrollWidth;
  return {
    overflowX: styles.overflowX,
    canScrollInside: element.scrollLeft > 0,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  };
});

expect(["auto", "scroll"]).toContain(boardScroll.overflowX);
expect(boardScroll.scrollWidth).toBeGreaterThan(boardScroll.clientWidth);
expect(boardScroll.canScrollInside).toBe(true);
```

Nicht als Fehler werten: horizontales Scrollen innerhalb des Diagramm-Containers,
solange `html`, `body` und `main.app` nicht global überlaufen.

## Toni Verdeckt Den Hero Nicht

Stabile Assertions je Viewport:

- Der alte Toni-Block `#tarifToni` bleibt versteckt.
- Der aktive `.tarif-toni` ist sichtbar, wenn der Toni-Schalter aktiv ist.
- Weder Toni-Figur noch sichtbare Toni-Sprechblase noch geöffneter Fragebereich
  schneiden die `.hero-panel`-Fläche.

```js
await expect(page.locator("#tarifToni")).toBeHidden();
await expect(page.locator(".tarif-toni")).toBeVisible();

const hero = await visibleBox(page.locator(".hero-panel"));
const overlaySelectors = [
  ".tarif-toni",
  ".tarif-toni__bubble.open",
  ".tarif-toni__ask:not([hidden])",
];

for (const selector of overlaySelectors) {
  for (const locator of await page.locator(selector).all()) {
    if (!(await locator.isVisible())) continue;
    const box = await visibleBox(locator);
    expect(overlapArea(hero, box), selector).toBe(0);
  }
}
```

Zusatz-Flow:

- Nach Klick auf `.tarif-toni__character` ist `.tarif-toni__ask` sichtbar.
- `.tarif-toni` hat dann die Klasse `is-asking`.
- `.tarif-toni__tools` ist im Fragezustand nicht interaktiv:

```js
await page.locator(".tarif-toni__character").click();
await expect(page.locator(".tarif-toni__ask")).toBeVisible();
await expect(page.locator(".tarif-toni")).toHaveClass(/is-asking/);

const toolsState = await page.locator(".tarif-toni__tools").evaluate((element) => ({
  opacity: Number(getComputedStyle(element).opacity),
  pointerEvents: getComputedStyle(element).pointerEvents,
}));
expect(toolsState.opacity).toBe(0);
expect(toolsState.pointerEvents).toBe("none");
```

Nicht als stabil ansehen: Tonis exakte `x/y`-Position oder Bewegungszustand.

## Lerninfo-Dialog

Stabile Assertions für den globalen Hinweis-Dialog:

- Klick auf `button[data-info-key="tarifverhandlungen"]` öffnet `#infoPopup`.
- `#infoPopup` hat `aria-hidden="false"`.
- `getByRole("dialog", { name: "Warum ist das wichtig?" })` ist sichtbar.
- Der Dialog enthält mindestens eine `.learning-detail-section`.
- `#closeInfoBtn` ist fokussiert.
- Dialogkarte und Schließen-Button liegen im Viewport und sind auf Mobile nicht abgeschnitten.
- Klick auf Schließen setzt `aria-hidden="true"` und gibt den Fokus an den auslösenden Button zurück.

```js
const trigger = page.locator('button[data-info-key="tarifverhandlungen"]');
await trigger.click();

const dialog = page.getByRole("dialog", { name: "Warum ist das wichtig?" });
await expect(dialog).toBeVisible();
await expect(page.locator("#infoPopup")).toHaveAttribute("aria-hidden", "false");
await expect(page.locator(".learning-detail-section")).toHaveCount(1);
await expect(page.locator("#closeInfoBtn")).toBeFocused();

const card = await visibleBox(page.locator(".info-card"));
expect(card.left).toBeGreaterThanOrEqual(0);
expect(card.right).toBeLessThanOrEqual(viewport.width);
expect(card.height).toBeLessThanOrEqual(viewport.height);

await page.locator("#closeInfoBtn").click();
await expect(page.locator("#infoPopup")).toHaveAttribute("aria-hidden", "true");
await expect(trigger).toBeFocused();
```

Stabile Assertions für eine Schritt-Lerninfo:

- Im Lernmodus `div.card[data-card-id="c1"]` anklicken.
- Slot `button.slot[data-key="s1"]` anklicken.
- `button[aria-label="Lerninfo zu Schritt 1 öffnen"]` wird sichtbar.
- Nach Klick öffnet der Dialog mit Titel `Kündigung TV`.
- Es gibt vier Abschnitte: `Warum ist dieser Schritt wichtig?`, `Beispiel aus der Praxis`, `Denkfrage für die Klasse`, `Wichtig zur Einordnung`.

Nicht als stabil ansehen: genaue Textlänge der Lerntexte oder exakte Scrollposition
innerhalb des Dialogs.

## Touch- Und Button-Zustände

Stabile Assertions je Mobile-/Tablet-Viewport:

- Interaktive sichtbare Controls haben mindestens `44px` Höhe und Breite, soweit
  sie keine absichtlich große Diagramm-Station sind:

```js
for (const selector of [
  "#modeLearnBtn",
  "#modeExamBtn",
  "#checkBtn",
  "#resetBtn",
  "#solveBtn",
  "#soundToggle",
  "#toniToggle",
  ".info-btn",
  ".card",
]) {
  const boxes = await page.locator(selector).evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const styles = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden";
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
  );

  expect(boxes.length, selector).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.width, selector).toBeGreaterThanOrEqual(44);
    expect(box.height, selector).toBeGreaterThanOrEqual(44);
  }
}
```

- `#soundToggle` wechselt bei Klick `aria-pressed` von `true` auf `false` und zurück.
- `#toniToggle` wechselt bei Klick `aria-pressed` von `true` auf `false`; `.tarif-toni` wird versteckt oder nicht sichtbar.
- Klick auf `#modeExamBtn` setzt die aktive Modus-Schaltfläche auf `data-mode="exam"`.
- Klick zurück auf `#modeLearnBtn` setzt die aktive Modus-Schaltfläche auf `data-mode="learn"`.
- `#solveBtn` bleibt ohne vollständige Belegung deaktiviert und löst keinen Lösungsdialog aus.
- Tastatur-Fokus ist sichtbar:

```js
await page.keyboard.press("Tab");
const focusedOutline = await page.evaluate(() => {
  const element = document.activeElement;
  const styles = getComputedStyle(element);
  return {
    tag: element?.tagName,
    outlineStyle: styles.outlineStyle,
    outlineWidth: styles.outlineWidth,
  };
});

expect(focusedOutline.tag).toBeTruthy();
expect(focusedOutline.outlineStyle).not.toBe("none");
expect(parseFloat(focusedOutline.outlineWidth)).toBeGreaterThanOrEqual(2);
```

Nicht als stabil ansehen: Hover-Farbwerte, Schattenintensität, Animationstiming
oder zufällige Toni-Reaktionen.
