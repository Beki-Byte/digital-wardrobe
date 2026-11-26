# Kleiderschrank – Startseite

Immersive Startseite für die App „Digitaler Kleiderschrank“ (Branch `main`).
Dieser Branch (`startseite`) enthält nur die Startseite – der Code ist getrennt von der App.

Online: `https://beki-byte.github.io/digital-wardrobe/start/` (die App liegt eine Ebene höher).

Der Deploy-Workflow auf `main` checkt diesen Branch aus, baut ihn und legt ihn unter `/start/` ab.
Nach Änderungen hier: auf GitHub unter *Actions → Deploy auf GitHub Pages → Run workflow* neu starten.

```bash
npm install
npm run dev
npm run build
```

Technik: Vite, React, TypeScript, GSAP (ScrollTrigger, SplitText), Lenis, three.js mit
@react-three/fiber und drei. Konzept siehe `CONCEPT.md`. Alle Kleidungsstücke sind gezeichnet
bzw. aus Geometrie gebaut – keine Fotos.
