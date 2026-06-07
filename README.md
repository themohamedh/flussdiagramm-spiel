# flussdiagramm-spiel
Interaktives Lernspiel mit Flussdiagramm und Einsetz-Puzzle

## Unterrichtseinsatz

- Die 15 Stationen bilden einen vereinfachten möglichen Ablauf einer Tarifrunde ab.
- Im Lernmodus erscheint an korrekt zugeordneten Kästchen ein Fragezeichen mit Bedeutung, Praxisbeispiel und Denkfrage.
- Im Prüfungsmodus werden Lösungen erst nach der abschließenden Prüfung sichtbar.
- Ein möglicher Ablauf: Einzelarbeit, Austausch zu drei Lerninfos, gemeinsame Reflexion der Vereinfachungen.

Fachliche Quellen und Hinweise sind direkt im Spiel und in `unterrichtsmaterial.js` dokumentiert.

## Prüfung

```powershell
npm test
npm run build:app
```

## Design Reference
- See `APPLE_WEB_DESIGN_SYSTEM.md` for the Apple-inspired UI system specification.

## Native iOS/iPadOS App

Das Repository enthält ein vorbereitetes Capacitor-Projekt für die
Veröffentlichung im Apple App Store. Die Schritte für den späteren Build auf
einem Mac stehen in `APP_STORE_RELEASE.md`.
