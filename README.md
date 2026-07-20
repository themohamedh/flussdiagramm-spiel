# flussdiagramm-spiel

Interaktives webbasiertes Lernspiel mit Flussdiagramm und Einsetz-Puzzle zum Thema Tarifrunde, Streik und Arbeitsrecht.

## Web-App

- `index.html` enthält die statische Hauptanwendung und die Spiellogik.
- `unterrichtsmaterial.js` enthält Lerntexte und Quellenwissen.
- `tarif-toni.js` und `tarif-toni.css` enthalten den interaktiven Lernbegleiter.
- `manifest.webmanifest` und `service-worker.js` stellen die PWA-Basis bereit.
- `liquid-glass.css` enthält das visuelle Grunddesign.

## Kostenlose KI für Tarif Toni

Tarif Toni kann im Lernmodus eine kurze, quellengebundene Antwort über OpenRouter erzeugen. Die Serverfunktion akzeptiert ausschließlich `openrouter/free` oder eine konkrete Modellkennung mit der Endung `:free`. Eine versehentlich eingetragene kostenpflichtige Modellkennung wird abgelehnt. Im Prüfungsmodus wird keine KI-Anfrage gesendet. Wenn die kostenlose KI nicht verfügbar ist, erscheint automatisch der vorhandene lokale bpb-Quellentipp.

Der OpenRouter Free Tarif umfasst aktuell 50 kostenlose Anfragen pro Tag. Verfügbarkeit, Geschwindigkeit und das vom kostenlosen Router ausgewählte Modell können wechseln. Siehe [OpenRouter Free Models Router](https://openrouter.ai/docs/guides/routing/routers/free-router) und [OpenRouter Preise](https://openrouter.ai/pricing).

### Einrichtung auf Vercel

1. Das Repository als neues Vercel-Projekt importieren.
2. Unter `Settings`, `Environment Variables` die geheime Variable `OPENROUTER_API_KEY` eintragen. Den Schlüssel niemals in eine Datei, einen Pull Request oder den Browsercode kopieren.
3. Optional `OPENROUTER_MODEL=openrouter/free` setzen. Erlaubt sind nur `openrouter/free` und Kennungen mit `:free`.
4. Für ein getrenntes GitHub-Pages-Frontend zusätzlich `ALLOWED_ORIGINS=https://themohamedh.github.io` setzen. Mehrere erlaubte Ursprünge werden mit Kommas getrennt.
5. Optional `APP_URL` auf die öffentliche Spieladresse setzen.
6. Neu bereitstellen und die Route `/api/tarif-toni-chat` im Lernmodus testen.

Bei einer vollständigen Bereitstellung auf Vercel nutzt das Frontend automatisch die gleichnamige Route. Bleibt das Frontend auf GitHub Pages, muss vor `tarif-toni.js` die öffentliche Vercel-Adresse gesetzt werden:

```html
<script>
  window.TARIF_TONI_API_URL = "https://DEIN-PROJEKT.vercel.app/api/tarif-toni-chat";
</script>
```

Die Route begrenzt Eingaben, erzwingt kostenlose Modelle, fordert Provider ohne Datenspeicherung an und enthält ein einfaches Schutzlimit pro Instanz. Für ein verlässliches globales Limit zusätzlich in Vercel unter `Firewall`, `Configure` eine Rate-Limit-Regel für den Request Path `/api/tarif-toni-chat` und die Methode `POST` anlegen. Acht Anfragen pro Minute und IP sind für den Start sinnvoll. Vercel dokumentiert die Einrichtung unter [WAF Rate Limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

Die Hinweise zur Datenübertragung stehen in [`privacy.html`](privacy.html).

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

Nur die Serverfunktion von Tarif Toni prüfen:

```powershell
npm run test:api
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
