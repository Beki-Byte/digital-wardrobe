import type { DayWeather } from './types'

/** Kostenlose Wetter-API ohne Schlüssel: https://open-meteo.com */
export async function fetchWeather(
  lat: number,
  lon: number,
  dayStart: number,
  dayEnd: number,
  dayOffset = 0,
): Promise<DayWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=apparent_temperature,temperature_2m,precipitation_probability,weather_code` +
    `&timezone=auto&forecast_days=3`
  const r = await fetch(url)
  if (!r.ok) throw new Error('Wetter konnte nicht geladen werden')
  const j = await r.json()
  const times: string[] = j.hourly.time
  const day = times[dayOffset * 24]?.slice(0, 10)
  const hours = times
    .map((t, i) => ({
      date: t.slice(0, 10),
      hour: Number(t.slice(11, 13)),
      // gefühlte Temperatur ist für Kleidung aussagekräftiger
      temp: Math.round(j.hourly.apparent_temperature[i] ?? j.hourly.temperature_2m[i]),
      rainProb: j.hourly.precipitation_probability[i] ?? 0,
      code: j.hourly.weather_code[i] ?? 0,
    }))
    .filter((h) => h.date === day && h.hour >= dayStart && h.hour <= dayEnd)

  if (!hours.length) throw new Error('Keine Wetterdaten für diesen Zeitraum')
  let min = hours[0], max = hours[0]
  for (const h of hours) {
    if (h.temp < min.temp) min = h
    if (h.temp > max.temp) max = h
  }
  const rainProb = Math.max(...hours.map((h) => h.rainProb))
  // häufigster "schlimmster" Wettercode tagsüber
  const code = Math.max(...hours.map((h) => h.code))
  return {
    min: min.temp,
    max: max.temp,
    minHour: min.hour,
    maxHour: max.hour,
    rainProb,
    rain: rainProb >= 50,
    code,
    hours: hours.map(({ hour, temp, rainProb, code }) => ({ hour, temp, rainProb, code })),
  }
}

export async function searchCity(q: string) {
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=de`,
  )
  const j = await r.json()
  return ((j.results ?? []) as { name: string; latitude: number; longitude: number; admin1?: string; country?: string }[]).map(
    (c) => ({
      lat: c.latitude,
      lon: c.longitude,
      name: [c.name, c.admin1, c.country].filter(Boolean).join(', '),
    }),
  )
}

export function currentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Standort nicht verfügbar'))
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
      () => rej(new Error('Standort wurde nicht freigegeben')),
      { timeout: 10000 },
    )
  })
}
