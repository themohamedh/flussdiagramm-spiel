# App-Store-Veröffentlichung

## Voraussetzungen

- Apple Developer Program Mitgliedschaft
- Apple Account mit Zwei-Faktor-Authentifizierung
- Zugriff auf einen Mac oder Cloud-Mac mit aktuellem Xcode
- App Store Connect Zugang

## Einmalige Einrichtung auf dem Mac

```bash
git clone https://github.com/themohamedh/flussdiagramm-spiel.git
cd flussdiagramm-spiel
npm install
npm run ios:add
npm run ios:open
```

In Xcode:

1. Unter `Signing & Capabilities` das eigene Apple-Developer-Team auswählen.
2. Prüfen, dass die Bundle-ID `de.themohamedh.flussdiagrammspiel` verfügbar ist.
3. App auf einem echten iPhone oder iPad testen.
4. Unter `Product > Archive` ein Archiv erstellen.
5. Im Organizer `Distribute App > App Store Connect > Upload` wählen.

## Bei späteren Web-Änderungen

```bash
git pull
npm install
npm run ios:sync
npm run ios:open
```

## App Store Connect

Vor der Einreichung werden mindestens benötigt:

- App-Name, Untertitel, Beschreibung und Suchbegriffe
- Support-URL und Datenschutz-URL
- Altersfreigabe
- App-Datenschutzangaben
- Screenshots für die unterstützten iPhone- und iPad-Größen
- ein hochgeladener Build

Zuerst sollte der Build über TestFlight auf echten Geräten getestet werden.
