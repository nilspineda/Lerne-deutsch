export const runtime = 'nodejs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
const VALID = /^[A-Za-zÄÖÜäöüßáéíóúñ\-'’ \d.,!?«»"()/]+$/

// rate-limit simple por IP: 30 peticiones/minuto en memoria del proceso
const rlm = new Map<string, number[]>()

function ip(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}
function limited(req: Request): boolean {
  const k = ip(req); const now = Date.now()
  const hits = (rlm.get(k) ?? []).filter((t) => now - t < 60_000)
  hits.push(now)
  rlm.set(k, hits)
  return hits.length > 30
}

export async function GET(req: Request) {
  if (limited(req)) return new Response('Demasiado rápido', { status: 429 })
  const word = new URL(req.url).searchParams.get('word')?.trim()
  const slow = new URL(req.url).searchParams.get('slow') === '1'
  if (!word || word.length > 200 || !VALID.test(word)) return new Response('Bad request', { status: 400 })
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=de&q=${encodeURIComponent(word)}&client=tw-ob&ttsspeed=${slow ? '0.3' : '1'}`
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: 'https://translate.google.com/' },
      next: { revalidate: 86400 },
    })
    if (!r.ok) return new Response('TTS upstream ' + r.status, { status: 502 })
    const buf = await r.arrayBuffer()
    return new Response(buf, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  } catch {
    return new Response('TTS unreachable', { status: 502 })
  }
}
