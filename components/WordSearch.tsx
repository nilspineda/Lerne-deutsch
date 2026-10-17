'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { speak } from '@/lib/speak'
import { PRONOUNS, full, topicLabel, type Word } from '@/lib/types'

const CHIPS = ['sein', 'haben', 'essen', 'fahren', 'können', 'Wasser']
const box = 'rounded-xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900'

export default function WordSearch() {
  const sb = useMemo(() => supabase(), [])
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Word[] | null>(null) // null = sin buscar todavía
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const term = q.trim()
    if (!term) { setHits(null); return }
    // PostgREST: , % ( ) rompen la sintaxis del filtro .or()
    const safe = term.replace(/[,%()\\]/g, ' ').replace(/\s+/g, ' ').trim()
    if (!safe) { setHits(null); return }
    const t = setTimeout(async () => {
      setBusy(true)
      const { data, error } = await sb.from('words').select('*')
        .or(`de.ilike.%${safe}%,es.ilike.%${safe}%`)
        .limit(40)
      setHits(error ? [] : ((data ?? []) as Word[]))
      setBusy(false)
    }, 250)
    return () => clearTimeout(t)
  }, [q, sb])

  const term = q.trim().toLowerCase()
  const shown = useMemo(() => {
    if (!hits) return []
    const starts = (w: Word) =>
      w.de.toLowerCase().startsWith(term) || w.es.toLowerCase().startsWith(term) ||
      (w.article ?? '') === term
    return [...hits].sort((a, b) => Number(starts(b)) - Number(starts(a)) || a.de.length - b.de.length)
  }, [hits, term])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <b>🔍 Buscador</b>
        <Link href="/" className="text-sm opacity-70 underline">Inicio</Link>
      </div>

      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Busca en alemán o español… (pausa, schlafen, comer)"
        className="w-full rounded-xl border border-stone-300 bg-white p-3.5 text-base shadow-sm outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-900" />

      {hits === null ? (
        <div className={box}>
          <p className="text-sm opacity-70">Escribe una palabra o verbo y verás su <b>traducción</b>, <b>artículo (der/die/das)</b> y <b>pronunciación</b>. Los verbos muestran conjugación en presente.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => setQ(c)}
                className="rounded-full border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100 dark:border-neutral-700 dark:hover:bg-neutral-800">{c}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs opacity-60">
            {busy ? 'Buscando…' : `${shown.length} resultado${shown.length === 1 ? '' : 's'}`}
          </p>
          {shown.map((w) => {
            const conj = Array.isArray(w.conj) && w.conj.length === 6 ? (w.conj as string[]) : null
            return (
              <div key={w.id} className={box}>
                <div className="flex items-start gap-2">
                  <div className="flex shrink-0 flex-col gap-1 pt-0.5">
                    <button aria-label="Escuchar" onClick={() => speak(full(w))} className="text-base">🔊</button>
                    <button aria-label="Escuchar lento" onClick={() => speak(full(w), true)} className="text-base">🐢</button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-lg font-bold">
                        {w.article && <span className="mr-1.5 text-red-600">{w.article}</span>}{w.de}
                      </span>
                      {w.verb_type && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${w.verb_type === 'regular'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                          verbo {w.verb_type}{w.stem_change ? ` · ${w.stem_change}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-red-700 dark:text-red-400">→ {w.es}</div>
                    {(w.respell || w.ipa) && (
                      <div className="text-xs opacity-70">
                        🔈{w.respell ? ` «${w.respell}»` : ''}{w.ipa ? ` · /${w.ipa}/` : ''}
                      </div>
                    )}
                    {w.example && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs italic opacity-70">
                        <button aria-label="Escuchar ejemplo" onClick={() => speak(w.example!)} className="not-italic">🔊</button>
                        <span>{w.example}</span>
                      </div>
                    )}
                    {conj && (
                      <div className="mt-2.5 grid grid-cols-3 gap-1 sm:grid-cols-6">
                        {PRONOUNS.map((p, i) => (
                          <button key={p} onClick={() => speak(conj[i])}
                            title={`Escuchar: ${p} ${conj[i]}`}
                            className="rounded-lg border border-stone-200 px-1.5 py-1 text-center transition-colors hover:bg-stone-100 dark:border-neutral-800 dark:hover:bg-neutral-800">
                            <span className="block text-[10px] font-medium uppercase tracking-wide opacity-50">{p}</span>
                            <b className="block text-sm">{conj[i]}</b>
                          </button>
                        ))}
                      </div>
                    )}
                    {w.verb_note && (
                      <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">💡 {w.verb_note}</div>
                    )}
                    <div className="mt-1.5 text-[11px] opacity-45">{w.level} · {topicLabel(w.topic)}</div>
                  </div>
                </div>
              </div>
            )
          })}
          {!busy && !shown.length && (
            <div className={box + ' text-center'}>
              <p className="text-sm opacity-70">No encontré «{q.trim()}» en el catálogo.</p>
              <Link href="/words" className="mt-2 inline-block text-sm font-medium text-red-600 underline">＋ Agregarla en Palabras</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
