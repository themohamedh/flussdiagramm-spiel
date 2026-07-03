# flussdiagramm-spiel

Interaktives webbasiertes Lernspiel mit Flussdiagramm und Einsetz-Puzzle zum Thema Tarifrunde, Streik und Arbeitsrecht.

## Web-App

- `index.html` enthält die statische Hauptanwendung und die Spiellogik.
- `unterrichtsmaterial.js` enthält Lerntexte und Quellenwissen.
- `tarif-toni.js` und `tarif-toni.css` enthalten den interaktiven Lernbegleiter.
- `manifest.webmanifest` und `service-worker.js` stellen die PWA-Basis bereit.
- `liquid-glass.css` enthält das visuelle Grunddesign.

## Tests

Einmalig nach dem Klonen oder wenn Abhängigkeiten fehlen:

```powershell
npm install
npx playwright install chromium
```

Statische Prüfung ohne Browser:

```powershell
npm run test:static
```

Browser-E2E-Smokes für Desktop und Handy:

```powershell
npm run test:e2e
```

Kompletter Testlauf:

```powershell
npm run test:all
```

Dependency-freier PowerShell-Fallback, falls Node.js oder npm in der aktuellen Shell nicht verfügbar sind:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-static.ps1
```

Die Prüfungen validieren unter anderem Karten, Slots, Lösungszuordnung, Lernmaterial, Lösungssperre, Prüfungsmodus-Markierungen, Toni-Positionierung, lokale Asset-Referenzen, Manifest-Icons und Service-Worker-Cacheeinträge. Die E2E-Smokes decken Startzustand, Lernmodus, richtige und falsche Prüfungsabgabe, Lösung anzeigen und mobile Layout-Stabilität ab.

Der alte versteckte Toni-Fallback bleibt ohne externes Sprite-Bild lauffähig; der sichtbare Begleiter wird über `tarif-toni.js` und `tarif-toni.css` gesteuert.

## iOS-App

Eine native SwiftUI-Version liegt im Ordner [`ios`](ios/README.md).


## Designreferenz

Siehe [`APPLE_WEB_DESIGN_SYSTEM.md`](APPLE_WEB_DESIGN_SYSTEM.md) für die Apple-inspirierte UI-Spezifikation.
