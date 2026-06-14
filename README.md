# flussdiagramm-spiel
Interaktives Lernspiel mit Flussdiagramm und Einsetz-Puzzle

## Unterrichtseinsatz

- Die 15 Stationen bilden einen vereinfachten möglichen Ablauf einer Tarifrunde ab.
- Im Lernmodus erscheint an korrekt zugeordneten Kästchen ein Fragezeichen mit Bedeutung, Praxisbeispiel und Denkfrage.
- Im Prüfungsmodus werden Lösungen erst nach der abschließenden Prüfung sichtbar.
- Ein möglicher Ablauf: Einzelarbeit, Austausch zu drei Lerninfos, gemeinsame Reflexion der Vereinfachungen.

Fachliche Quellen und Hinweise sind direkt im Spiel und in `unterrichtsmaterial.js` dokumentiert.

## Abschluss-Effekte

- Eine vollständig richtige Lösung startet einmalig Konfetti von links und rechts sowie einen kurzen Erfolgsimpuls im Abschlussfenster.
- Eine noch nicht vollständig richtige Prüfung markiert offene oder falsche Stationen mit einer sanften Animation und einem motivierenden Hinweis.
- Die Effekte blockieren keine Eingaben, berücksichtigen `prefers-reduced-motion` und verwenden keine externen Bibliotheken.

## Tarif Toni

- Der optionale Bildschirm-Begleiter reagiert im Lernmodus auf richtige und falsche Zuordnungen, ohne Lösungen vorwegzunehmen.
- Im Prüfungsmodus zeigt Toni ausschließlich neutrale Motivation.
- Der Schalter „Tarif Toni an/aus“ blendet Figur, Nachrichten und automatische Bewegung vollständig ein oder aus.
- Toni wechselt auf Desktop etwa alle 30 Sekunden zwischen freien Randpositionen. Auf Smartphones nutzt er nur die unteren Ecken; bei `prefers-reduced-motion` bleibt er statisch.
- Ein Klick auf Toni öffnet einen kleinen Chat für Fragen zum Spiel und zum Unterrichtsthema.
- Im Prüfungsmodus erzwingt die Backend-Route neutrale Hilfe ohne konkrete Lösungen.

### Sichere Chat-Bereitstellung

Die OpenRouter-Anfrage läuft ausschließlich über die Vercel-kompatible Serverless-Route `api/tarif-toni-chat.js`. Der API-Key gehört nie in `index.html`, JavaScript-Dateien des Frontends oder GitHub Pages.

1. Repository zusätzlich als Vercel-Projekt bereitstellen.
2. In Vercel folgende Environment Variables setzen:
   - `OPENROUTER_API_KEY` (erforderlich)
   - `ALLOWED_ORIGINS=https://themohamedh.github.io` (erforderlich; mehrere Origins kommasepariert)
   - `OPENROUTER_MODEL=openai/gpt-4o-mini` (optional)
   - `APP_URL=https://themohamedh.github.io/flussdiagramm-spiel/` (optional)
3. Für GitHub Pages vor der Veröffentlichung die öffentliche Route einmalig setzen, zum Beispiel direkt vor dem bestehenden Spielskript:

```html
<script>
  window.TARIF_TONI_API_URL = "https://DEIN-VERCEL-PROJEKT.vercel.app/api/tarif-toni-chat";
</script>
```

Ohne diese öffentliche Backend-URL verwendet das Frontend `/api/tarif-toni-chat`, was bei einer vollständigen Vercel-Bereitstellung direkt funktioniert. Die Route begrenzt Eingaben auf 500 Zeichen, Antworten auf 220 Tokens und Anfragen pro IP/Browser-Session. Sie sendet nur Frage und Spielmodus an OpenRouter.

## Prüfung

```powershell
npm test
npm run test:api
npm run build:app
```

Für einen manuellen Test beide Spielmodi prüfen: einmal vollständig richtig lösen und einmal mit offenen oder falschen Stationen auf „Prüfen“ klicken.

## Design Reference
- See `APPLE_WEB_DESIGN_SYSTEM.md` for the Apple-inspired UI system specification.

## Native iOS/iPadOS App

Das Repository enthält ein vorbereitetes Capacitor-Projekt für die
Veröffentlichung im Apple App Store. Die Schritte für den späteren Build auf
einem Mac stehen in `APP_STORE_RELEASE.md`.
