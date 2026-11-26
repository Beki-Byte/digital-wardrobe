# Konzept – „Der Schrank geht auf“

**Große Idee:** Die Frage jeden Morgens ist „Was ziehe ich heute an?“. Die Antwort steckt im eigenen
Schrank. Beim Scrollen öffnen sich die Türen, drinnen geht das Licht an, die Kleider schwingen am Bügel.

**Stimmung:** warm, ruhig, persönlich, ein bisschen magisch.

**Farben:** Walnuss `#241812` (Bühne), Holz `#7a5238`, Lampenlicht `#f5e3bf`, Tannengrün `#21463a`
(verbindet mit der App), Rosé `#d79a8c`.

**Schrift:** Fraunces (variabel, riesig, mit Kursiv als Stimme), Manrope für Text.

**Bewegung:** ein Easing (`power3.out` / `cubic-bezier(.2,.8,.2,1)`), Tempo 0,9–1,2 s.

## Szenen

| Sektion | Szene | Antrieb | Budget | Fallback |
|---|---|---|---|---|
| Preloader | Wort „Kleiderschrank“ + Zähler, Vorhang nach oben | Zeit | nur DOM | sofort ausblenden |
| Hero | 3D-Schrank, Türen öffnen, Licht an, Stoff-Shader, Kamera fährt rein | Scroll + Maus | 1 Canvas, DPR ≤ 1,75, nur aktiv im Hero | statisches SVG |
| Scannen | Foto einer gemusterten Bluse, Scan-Linie entfernt den Hintergrund | Scroll (Clip-Path) | DOM/SVG | fertiges Bild |
| Wetter | gepinnt: 7→16 Uhr, −4°→12°, Mantel geht aus | Scroll | DOM/SVG | Startzustand + beide Texte |
| Layering | Hemd, kurzes Kleid, Hose schichten sich | Scroll | DOM/SVG | fertiger Look |
| Versprechen | Text färbt sich Wort für Wort | Scroll | DOM | voll sichtbar |
| CTA | magnetischer Button „Schrank öffnen“ | Maus | DOM | normaler Link |
