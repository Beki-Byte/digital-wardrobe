import { MagneticButton } from '../components/MagneticButton'
import { Reveal } from '../components/Reveal'

const APP = '../'

export function Cta() {
  const enter = () => {
    try {
      localStorage.setItem('kleiderschrank:intro', '1')
    } catch {
      /* egal */
    }
  }
  const share = () =>
    navigator.share?.({ title: 'Kleiderschrank', text: 'Mein Kleiderschrank als App – probier’s aus:', url: location.href })
  return (
    <section className="section cta">
      <Reveal as="h2" className="cta-title">
        Morgen früh weißt du es schon.
      </Reveal>
      <div className="cta-actions">
        <MagneticButton href={APP} onClick={enter} className="primary">
          Schrank öffnen
        </MagneticButton>
        {'share' in navigator && (
          <button className="link-btn" onClick={share}>
            Link an Freundinnen schicken
          </button>
        )}
      </div>
      <p className="cta-small">
        Kostenlos, ohne Anmeldung. Jede hat ihren eigenen Schrank auf ihrem eigenen Handy. Zum Installieren im Browser-Menü
        „Zum Home-Bildschirm“ wählen.
      </p>
      <footer className="foot">
        <span>Kleiderschrank</span>
        <span>Wetterdaten von Open-Meteo</span>
      </footer>
    </section>
  )
}
