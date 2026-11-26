import { useEffect, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initSmoothScroll } from './lib/smooth-scroll'
import { finePointer, reducedMotion } from './lib/quality'
import { Preloader } from './components/Preloader'
import { Cursor } from './components/Cursor'
import { Hero } from './sections/Hero'
import { Scan } from './sections/Scan'
import { Weather } from './sections/Weather'
import { Layers } from './sections/Layers'
import { Promise } from './sections/Promise'
import { Cta } from './sections/Cta'

export default function App() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    history.scrollRestoration = 'manual'
    scrollTo(0, 0)
    if (!loaded) return
    const stop = initSmoothScroll()
    ScrollTrigger.refresh()
    return () => stop?.()
  }, [loaded])

  return (
    <>
      {!loaded && <Preloader onDone={() => setLoaded(true)} />}
      {finePointer && !reducedMotion && <Cursor />}
      <a className="skip" href="../">Direkt zur App</a>
      <main>
        <Hero ready={loaded} />
        <Scan />
        <Weather />
        <Layers />
        <Promise />
        <Cta />
      </main>
    </>
  )
}
