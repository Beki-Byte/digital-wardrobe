# 👗 Digitaler Kleiderschrank

Eine Web-App (PWA), die deine Kleidung kennt und dir jeden Tag ein Outfit vorschlägt,
das zum Wetter **über den ganzen Tag** passt.

## Funktionen

- **Scannen**: Foto machen → Hintergrund wird automatisch entfernt, Farbe erkannt.
  Kategorien: Oberteil, Unterteil (Hose, Rock, Shorts, Leggings), Kleid, Jacke, Schuhe,
  Hijab, Ring, Armband, Kette, Gürtel.
- **Tägliche Outfits** mit Optionen für Jacke, Schuhe, Hijab und Schmuck – jedes Teil
  lässt sich einzeln tauschen (🔄), weglassen (✕) oder dazunehmen.
- **Layering**: z. B. Hemd unter kurzem Kleid + Hose drunter, Langarmshirt unter Kleid,
  Hemd unter Pulli, Leggings unter kurzem Rock.
- **Kurze Kleider/Röcke**: einstellbar – *immer mit Unterteil*, *je nach Wetter* oder *auch ohne*.
- **Wetter** (kostenlos über [Open-Meteo](https://open-meteo.com), kein API-Key):
  Das Outfit ohne Jacke passt zur wärmsten Stunde, mit Jacke zur kältesten.
  Beispiel: morgens −4°, nachmittags 12° → warme Jacke für den Schulweg, später ausziehen.
- **Lernt deinen Stil**: 👎, ❤️ und „Anziehen“ verändern die Vorschläge (Teile, Kombinationen,
  Farben, Stil-Tags, Layering, kurz mit/ohne Unterteil). Kürzlich getragene Sachen kommen seltener.
- **Eigene Outfits** zusammenstellen und speichern.
- **Alles lokal**: Daten bleiben in IndexedDB auf dem Gerät. Sicherung als Datei exportieren/importieren.
- **Hijab** in den Einstellungen ein-/ausschaltbar.

## Teilen mit Freundinnen

Die App wird über GitHub Pages veröffentlicht. Link schicken → im Browser öffnen →
„Zum Home-Bildschirm“. Jede hat ihren eigenen Schrank auf ihrem eigenen Handy.

**Einmalig einrichten:** Im Repo unter *Settings → Pages → Source* „GitHub Actions“ wählen.
Danach wird jeder Push auf `main` automatisch veröffentlicht unter
`https://<benutzername>.github.io/digital-wardrobe/`.

## Entwickeln

```bash
npm install
npm run dev      # lokal starten
npm run build    # Produktions-Build nach dist/
```

Technik: React + TypeScript + Vite, `idb` für IndexedDB, `vite-plugin-pwa` für Offline/Installation.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/engine.ts` | Outfit-Logik: Wärme-Modell, Layering-Regeln, Farben, Lernen |
| `src/weather.ts` | Open-Meteo (Wetter + Ortssuche) |
| `src/image.ts` | Hintergrund entfernen, Hauptfarbe, Farbnamen |
| `src/db.ts` | Lokale Datenbank, Export/Import |
| `src/pages/*` | Heute, Schrank, Scannen, Outfits, Einstellungen |
