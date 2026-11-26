# Konzept – Die App lebt im Schrank

**Große Idee:** Die App ist dein Kleiderschrank. Jedes Mal, wenn du den Schrank öffnest, gehen die Türen auf,
das Licht geht an, und deine eigenen Teile hängen als Stoff an der Stange.

**Stimmung:** warm, abendlich, persönlich, ruhig.
**Farben:** Walnuss `#1c130e`, Holz `#9a6a48`, Lampenlicht `#f5e6c8`, Salbei-Grün `#a9d3bb`, Koralle `#f08b74`.
**Schrift:** Fraunces (Überschriften), Manrope (Text).
**Bewegung:** ein Easing `cubic-bezier(.2,.8,.2,1)` / `power3.inOut`, 0,9–1,6 s.

| Bereich | Szene | Antrieb | Budget | Fallback |
|---|---|---|---|---|
| Start | Wortmarke, Vorhang | Zeit | DOM | sofort |
| Schrank | 3D-Schrank öffnet sich, deine Fotos als Stoff am Bügel, Wischen schiebt Bügel | Zeit + Touch | 1 Canvas, DPR ≤ 1,75, Texturen ≤ 700 px | Raster-Ansicht |
| Heute | Wetter-Himmel (Shader): kalt → warm, Wolken, Regen/Schnee; Teile fallen ins Outfit | Zeit + Maus | 1 Canvas, DPR ≤ 1,25 | CSS-Verlauf |
| Scannen | Scan-Linie legt das freigestellte Teil frei | Aktion | DOM | ohne Animation |
| Looks | Karten neigen sich wie Bügel beim Wischen | Touch | DOM | flach |
| Wechsel | Kreis öffnet sich vom Tipp-Punkt | Aktion | View Transitions | direkter Wechsel |
