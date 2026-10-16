'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { speak } from '@/lib/speak'
import { SENTENCES, type Sentence } from '@/lib/sentences'

type Mode = 'comprender' | 'ordenar'

export default function ListenSession({ level }: { level: 'A1.1' | 'A1.2' }) {
  const [mode, setMode] = useState<Mode>('comprender')
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [built, setBuilt] = useState<number[]>([])

  const sentences = SENTENCES[level]
  const [deck, setDeck] = useState<Sentence[]>([])
  // barajar: cada entrada nueva (o vuelta completa) mezcla el orden y las oraciones nunca salen igual
  useEffect(() => { setDeck([...sentences].sort(() => Math.random() - 0.5)) }, [level, mode])

  const s = deck[idx % Math.max(deck.length, 1)] ?? sentences[0]
  const words = useMemo(() => s.text.split(/\s+/), [s.text])
  const shuffled = useMemo(
    () => words.map((w, i) => ({ w, i })).sort(() => Math.random() - 0.5),
    [s.text],
  )
  const choices = useMemo(() => shuffleDistractors(s, sentences), [s.text, level])

  // reproducir automáticamente al cambiar de oración
  useEffect(() => { speak(s.text) }, [s.text, mode]) // eslint-disable-line
  useEffect(() => { setShown(false); setPicked(null); setFailed(false); setBuilt([]); setTip(null) }, [s.text, mode])

  function next() {
    // al completar una vuelta, rebaraja para que la siguiente ronda sea totalmente distinta
    if ((idx + 1) % Math.max(deck.length, 1) === 0) setDeck([...sentences].sort(() => Math.random() - 0.5))
    setIdx((i) => (i + 1) % Math.max(sentences.length, 1))
  }

  function retryOrNext() {
    // si ya falló dos veces, pasa a la siguiente
    if (failed) { setFailed(false); next() }
    else { setFailed(true); setBuilt([]) }
  }

  function checkOrder() {
    const ok = built.map((i) => words[i]).join(' ') === s.text
    if (ok) { setShown(true); speak(s.text) }
    else { setFailed(true); setBuilt([]) }
  }

  const box = 'rounded-2xl border border-stone-800 bg-white dark:bg-neutral-900 p-5'
  const [tip, setTip] = useState<{ word: string; es: string } | null>(null)

  async function wordTip(word: string) {
    const clean = word.replace(/[.,!?«»]/g, '').trim()
    speak(clean)
    if (tipCache.has(clean)) { setTip({ word: clean, es: tipCache.get(clean)! }); return }
    try {
      const r = await fetch(`/api/enrich?word=${encodeURIComponent(clean)}`)
      const d = await r.json()
      const es = d.es || 'sin traducción'
      tipCache.set(clean, es)
      setTip({ word: clean, es })
    } catch { setTip({ word: clean, es: 'sin traducción' }) }
  }
  const bigBtn = 'w-full rounded-lg bg-red-600 p-3 font-medium text-white'
  const ghost = 'rounded-lg border border-stone-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-stone-200 dark:hover:bg-neutral-800'
  const tab = (on: boolean) =>
    `flex-1 rounded-lg border p-2 text-center text-sm ${on ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-black' : 'border-stone-300 dark:border-neutral-700 text-stone-300 dark:text-neutral-300'}`

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setMode('comprender')} className={tab(mode === 'comprender')}>🧠 Comprender</button>
        <button onClick={() => setMode('ordenar')} className={tab(mode === 'ordenar')}>🔤 Ordenar</button>
      </div>
      <div className="flex gap-2 text-sm">
        {(['A1.1', 'A1.2'] as const).map((l) => (
          <Link key={l} href={`/listen?level=${l}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${level === l ? 'bg-purple-200 text-purple-900 dark:bg-purple-700 dark:text-white' : 'bg-stone-200 text-neutral-700 hover:bg-stone-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}`}>
            {l}
          </Link>
        ))}
      </div>

      <div className={box}>
        <div className="flex items-center justify-between text-xs opacity-60">
          <span>Oración {idx + 1} / {sentences.length}</span>
          <span>{mode === 'comprender' ? 'Escucha y elige el significado' : 'Escucha y ordena lo que oyes'}</span>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button aria-label="Escuchar oraci�n" onClick={() => speak(s.text)} className={ghost}>🔊 Escuchar</button>
          <button aria-label="Escuchar oraci�n lenta" onClick={() => speak(s.text, true)} className={ghost}>🐢 Lento</button>
        </div>

        {mode === 'comprender' && !shown && (
          <div className="mt-6 space-y-2">
            {choices.map((c) => {
              const isWrong = picked === c
              return (
                <button key={c} disabled={isWrong} onClick={() => { setPicked(c); if (c === s.es) { setShown(true); speak(s.text) } }}
                  className={`w-full rounded-lg border p-2.5 text-sm transition-transform active:scale-[0.98] ${
                    isWrong ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 line-through'
                    : 'border-stone-300 dark:border-neutral-700 hover:bg-stone-200 dark:hover:bg-neutral-800'}`}>
                  {c}
                </button>
              )
            })}
            {failed && <p className="pt-1 text-center text-sm text-red-700 dark:text-red-400">❌ No es esa. Intenta de nuevo.</p>}
            {failed && <button onClick={retryOrNext} className="w-full rounded-lg border border-stone-300 dark:border-neutral-700 p-2 text-sm hover:bg-stone-200 dark:hover:bg-neutral-800">Siguiente oración →</button>}
          </div>
        )}

        {mode === 'ordenar' && !shown && (
          <div className="mt-5 space-y-3">
            <div className="min-h-[3rem] rounded-lg border border-dashed border-stone-300 dark:border-neutral-700 p-2">
              {built.length === 0 && <span className="text-xs opacity-50">Construye la oración tocando las palabras…</span>}
              <div className="flex flex-wrap gap-1.5">
                {built.map((pos, n) => (
                  <button key={pos + n} onClick={() => setBuilt((b) => b.filter((_, k) => k !== n))}
                    className="rounded bg-stone-100 px-2 py-1 text-sm text-stone-900 hover:bg-stone-200">
                    {words[pos]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {shuffled.filter(({ i }) => !built.includes(i)).map(({ w, i }) => (
                <button key={i} onClick={() => setBuilt((b) => [...b, i])}
                  className="rounded border border-stone-300 dark:border-neutral-700 px-2.5 py-1.5 text-sm hover:bg-stone-200 dark:hover:bg-neutral-800">
                  {w}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={checkOrder} disabled={!built.length} className={`${bigBtn} flex-1 disabled:opacity-40`}>Comprobar</button>
              <button onClick={() => { setBuilt([]) }} className={ghost} disabled={!built.length}>Limpiar</button>
            </div>
            {failed && <p className="text-center text-sm text-red-700 dark:text-red-400">❌ No es así. Reinicia y vuelve a intentarlo.</p>}
          </div>
        )}

        {shown && (
          <div className="mt-5 space-y-2 border-t border-stone-300 dark:border-neutral-700 pt-4">
            <div className="text-xl font-semibold">{mode === 'comprender' ? s.text : (
              <span> {s.text.split(/\s+/).map((word, i) => (
                <span key={i}>
                  <button aria-label="Ver traducci�n" onClick={() => wordTip(word)} className="underline decoration-dotted decoration-orange-400/60 underline-offset-4 hover:text-orange-700 dark:text-orange-300" title="Ver traducción">{word}</button>
                  <span> </span>
                </span>
              ))}
              </span>
            )}</div>
            {tip && <div className="rounded-lg bg-stone-200 dark:bg-neutral-800 px-3 py-2 text-sm text-orange-700 dark:text-orange-300">🔍 {tip.word}: {tip.es}</div>}
            <div className="text-sm text-green-700 dark:text-green-400">✅ {s.es}</div>
            <button onClick={next} className={bigBtn}>Siguiente oración →</button>
          </div>
        )}
      </div>
    </div>
  )
}

// traducción palabra por palabra al tocar una palabra de la oración revelada
const tipCache = new Map<string, string>()

function shuffleDistractors(correct: Sentence, pool: Sentence[]): string[] {
  const others = pool.filter((x) => x.es !== correct.es).map((x) => x.es)
  const picked: string[] = []
  while (picked.length < 3 && others.length) {
    const i = Math.floor(Math.random() * others.length)
    picked.push(others.splice(i, 1)[0])
  }
  return [correct.es, ...picked].sort(() => Math.random() - 0.5)
}
