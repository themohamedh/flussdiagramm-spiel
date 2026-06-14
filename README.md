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
- Der Schalter „Tarif Toni an/aus“ blendet Figur, Nachrichten, Chat und Bewegung vollständig ein oder aus. Einen separaten Bewegungsschalter gibt es nicht.
- Toni gleitet kurz nach dem Laden erstmals los und danach etwa alle 30 Sekunden per `transform` zu einer zufälligen, kollisionsgeprüften Position im sichtbaren Bereich.
- Ein Klick auf Toni öffnet einen kleinen lokalen Denkanstoß-Chat. Nur während der Chat geöffnet ist, pausiert die Bewegung.
- Auf Smartphones nutzt Toni wenige sichere Ziele; bei `prefers-reduced-motion` bleibt er statisch.

## Prüfung

```powershell
npm test
npm run build:app
```

Für einen manuellen Test beide Spielmodi prüfen: einmal vollständig richtig lösen und einmal mit offenen oder falschen Stationen auf „Prüfen“ klicken.

## Design Reference
- See `APPLE_WEB_DESIGN_SYSTEM.md` for the Apple-inspired UI system specification.

## Native iOS/iPadOS App

Das Repository enthält ein vorbereitetes Capacitor-Projekt für die
Veröffentlichung im Apple App Store. Die Schritte für den späteren Build auf
einem Mac stehen in `APP_STORE_RELEASE.md`.
