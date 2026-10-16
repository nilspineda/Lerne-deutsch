import { NextResponse } from 'next/server'

const UA = { 'User-Agent': 'DeutschKarten/1.0 (uso personal)' }

async function translate(word: string): Promise<string | null> {
  const email = process.env.MYMEMORY_EMAIL
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=de|es${email ? `&de=${encodeURIComponent(email)}` : ''}`
  try {
    const r = await fetch(url, { headers: UA, next: { revalidate: 86400 } })
    const j = await r.json()
    const t: string | undefined = j?.responseData?.translatedText
    return t && !/MYMEMORY|QUERY LENGTH/i.test(t) ? t.toLowerCase() : null
  } catch { return null }
}

// Wiktionary alemán: IPA y género (best-effort; el wikitext puede variar)
async function wiktionary(word: string): Promise<{ ipa: string | null; article: string | null }> {
  const cap = word.charAt(0).toUpperCase() + word.slice(1)
  for (const title of [...new Set([word, cap])]) {
    try {
      const url = `https://de.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles=${encodeURIComponent(title)}`
      const j = await (await fetch(url, { headers: UA, next: { revalidate: 86400 } })).json()
      const text: string | undefined = j?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content
      if (!text) continue
      const ipa = /\{\{Lautschrift\|([^}|]+)/.exec(text)?.[1] ?? null
      const g = /Genus=([mfn])/.exec(text)?.[1] ?? /\{\{([mfn])\}\}/.exec(text)?.[1]
      return { ipa, article: g ? ({ m: 'der', f: 'die', n: 'das' } as Record<string, string>)[g] : null }
    } catch { /* intenta el siguiente */ }
  }
  return { ipa: null, article: null }
}

export async function GET(req: Request) {
  const word = new URL(req.url).searchParams.get('word')?.trim()
  if (!word) return NextResponse.json({ error: 'word requerido' }, { status: 400 })
  const [es, wk] = await Promise.all([translate(word), wiktionary(word)])
  return NextResponse.json({ es, ...wk })
}
