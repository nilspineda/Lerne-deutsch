// Prioridad: audio alemán server-side (/api/tts, Google TTS de-DE) → no depende de las voces del sistema.
// Fallback: speechSynthesis local si el servidor falls.
// Caché: la sesión no repite peticiones por la misma palabra+velocidad (blob cache en memoria).
let current: HTMLAudioElement | null = null
let lastKey = ''
let lastAt = 0
const cache = new Map<string, string>() // clave URL → blob URL

function localSpeak(text: string, slow: boolean) {
  if (!('speechSynthesis' in window)) return
  const syn = speechSynthesis
  const v = syn.getVoices().find((x) => x.lang.toLowerCase().startsWith('de'))
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'de-DE'
  u.rate = slow ? 0.5 : 0.8
  if (v) u.voice = v
  syn.cancel()
  syn.speak(u)
}

async function play(url: string, text: string, slow: boolean) {
  current?.pause()
  const a = new Audio(url)
  current = a
  a.onended = () => { if (current === a) current = null }
  a.onerror = () => { if (current === a) current = null; localSpeak(text, slow) }
  a.play().catch(() => localSpeak(text, slow))
}

export function speak(text: string, slow = false) {
  if (typeof window === 'undefined') return
  const key = text.slice(0, 80) + '|' + (slow ? 'l' : 'n')
  const now = Date.now()
  if (key === lastKey && now - lastAt < 1200) return
  lastKey = key; lastAt = now
  const w = text.replace(/\n/g, ' ').slice(0, 200)
  try {
    const cached = cache.get(key)
    if (cached) { play(cached, text, slow); return }
    const url = `/api/tts?word=${encodeURIComponent(w)}${slow ? '&slow=1' : ''}`
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => { const u = URL.createObjectURL(b); cache.set(key, u); play(u, text, slow) })
      .catch(() => localSpeak(text, slow))
  } catch {
    localSpeak(text, slow)
  }
}

// corta todo audio local y remoto (usear como cleanup al desmontar la página)
export function stopSpeak() {
  try {
    if (current) { current.pause(); current.src = ''; current = null }
    if ('speechSynthesis' in window) speechSynthesis.cancel()
  } catch { /* noop */ }
}
