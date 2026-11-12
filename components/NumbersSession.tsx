'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { next, preview, type Rating } from '@/lib/srs'
import { speak, stopSpeak } from '@/lib/speak'
import type { NumberEntry } from '@/lib/types'

export type Track = 'listen' | 'reverse'

type Card = {
  number_id: string
  track: Track
  due: string
  interval_days: number
  ease: number
  reps: number
  lapses: number
  numbers: NumberEntry
}

const CATEGORIES = [
  { id: '', label: 'Todos' },
  { id: 'cardinal', label: 'Cardinales' },
  { id: 'ordinal', label: 'Ordinales' },
  { id: 'decimal', label: 'Decimales' },
]

const SESSION_SIZE = 20

export default function NumbersSession({ track, initialCategory = '' }: { track: Track; initialCategory?: string }) {
  const sb = useMemo(() => supabase(), [])
  const [category, setCategory] = useState(initialCategory)
  const [queue, setQueue] = useState<Card[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [ok, setOk] = useState<boolean | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [done, setDone] = useState(0)
  const [err, setErr] = useState('')

  const card = queue[idx]

  // ---------------------------------------------------------- cargar cola
  const load = useCallback(async (cat: string) => {
    setLoading(true)
    setErr('')
    const { data: cards } = await sb
      .from('number_cards')
      .select('number_id, track, due, interval_days, ease, reps, lapses, numbers!inner(*)')
      .eq('track', track)
      .order('due')
      .limit(60)
    let list = (cards ?? []) as unknown as Card[]

    const now = Date.now()
    const due = list.filter((c) => new Date(c.due).getTime() <= now)
    list = due.length ? due : list

    // sin tarjetas: se crean N números del catálogo para esta pista
    if (list.length < 3) {
      let q = sb.from('numbers').select('*').is('owner', null)
      if (cat) q = q.eq('category', cat)
      const { data: fresh } = await q.order('value').limit(SESSION_SIZE * 2)
      const pool = (fresh ?? []) as NumberEntry[]
      const picked = pool.filter((_, i) => i % 2 === 0).slice(0, SESSION_SIZE)
      if (picked.length) {
        await sb.from('number_cards').upsert(
          picked.map((n) => ({ number_id: n.id, track })),
          { ignoreDuplicates: true },
        )
        const { data: freshCards } = await sb
          .from('number_cards')
          .select('number_id, track, due, interval_days, ease, reps, lapses, numbers!inner(*)')
          .eq('track', track)
          .in('number_id', picked.map((n) => n.id))
        list = (freshCards ?? []) as unknown as Card[]
      }
    }

    if (cat) list = list.filter((c) => c.numbers.category === cat)

    // barajar para que no salga siempre en orden
    const shuffled = [...list].sort(() => Math.random() - 0.5)
    setQueue(shuffled)
    setIdx(0)
    setLoading(false)
  }, [sb, track])

  useEffect(() => { load(category) }, [load, category])
  useEffect(() => () => stopSpeak(), [])

  // ------------------------------------------------------- audio al entrar
  useEffect(() => {
    setAnswer(''); setRevealed(false); setOk(null); setOptions([])
    if (!card) return
    const n = card.numbers
    speak(n.de, false, n.audio_url)
    if (track === 'reverse') {
      // 4 opciones: la correcta + 3 números cercanos por valor
      const near = queue
        .map((c) => c.numbers)
        .filter((x) => x.de !== n.de)
        .sort((a, b) => Math.abs(a.value - n.value) - Math.abs(b.value - n.value))
        .slice(0, 3)
        .map((x) => x.de)
      setOptions([...near, n.de].sort(() => Math.random() - 0.5))
    }
  }, [card?.number_id, track]) // eslint-disable-line

  // ------------------------------------------------------------ responder
  function parseAnswer(s: string): number | null {
    const t = s.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.')
    if (!t) return null
    const v = Number(t)
    return Number.isFinite(v) ? v : null
  }

  async function check() {
    if (!card || revealed) return
    const v = parseAnswer(answer)
    const good = v !== null && Math.abs(v - card.numbers.value) < 1e-9
    setOk(good)
    setRevealed(true)
    if (!good) speak(card.numbers.de, true, card.numbers.audio_url)
  }

  async function pick(de: string) {
    if (!card || revealed) return
    const good = de === card.numbers.de
    setOk(good)
    setRevealed(true)
    if (!good) speak(card.numbers.de, true, card.numbers.audio_url)
  }

  // -------------------------------------------------------------- calificar
  async function rate(q: Rating) {
    if (!card) return
    const n = next(card, q)
    const { error } = await sb.from('number_cards').update({
      due: n.due.toISOString(), interval_days: n.interval_days, ease: n.ease,
      reps: n.reps, lapses: n.lapses, last_reviewed: new Date().toISOString(),
    }).match({ number_id: card.number_id, track })
    if (error) setErr('Sin conexión: la nota no se guardó.')
    await sb.from('number_review_log').insert({ number_id: card.number_id, track, rating: q })
    setDone((d) => d + 1)
    setQueue((qs) => {
      const rest = qs.filter((_, i) => i !== idx)
      return q === 0 ? [...rest, { ...card, ...n, due: n.due.toISOString() }] : rest
    })
    setIdx((i) => (i < queue.length - 1 ? i + 1 : 0))
    setRevealed(false); setOk(null); setAnswer('')
  }

  // ------------------------------------------------------------------ vista
  if (loading) return <p className="py-10 text-center text-sm opacity-60">Cargando números…</p>
  if (!card) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm opacity-70">No hay números en la cola. Añade algunos al catálogo y vuelve a entrar.</p>
        <Link href="/numbers" className="inline-block rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-neutral-700">↻ Recargar</Link>
      </div>
    )
  }

  const n = card.numbers
  const es = n.category === 'ordinal'
    ? `${n.es.split(' (')[0]}`
    : n.es

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs opacity-60">
        <span>🔢 {done} repasados</span>
        <span>pista: {track === 'listen' ? 'oír → cifra' : 'cifra → palabra'}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${category === c.id ? 'bg-red-600 text-white' : 'bg-stone-200 text-stone-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* tarjeta */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
        {track === 'listen' ? (
          <>
            <button onClick={() => speak(n.de, false, n.audio_url)}
              className="mx-auto flex size-24 items-center justify-center rounded-full bg-red-600 text-4xl text-white shadow-lg active:scale-95"
              aria-label="Escuchar el número">
              🔊
            </button>
            <p className="mt-3 text-xs opacity-60">Escucha y escribe el número</p>
            <form onSubmit={(e) => { e.preventDefault(); check() }} className="mt-3 flex gap-2">
              <input value={answer} onChange={(e) => setAnswer(e.target.value)}
                inputMode="decimal" autoComplete="off" placeholder="21" disabled={revealed}
                aria-label="Escribe el número"
                className="w-full rounded-lg border border-stone-300 px-4 py-3 text-center text-2xl font-bold dark:border-neutral-700 dark:bg-neutral-950" />
              <button type="submit" disabled={revealed}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900">
                Comprobar
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-5xl font-bold">{n.value}</div>
            <p className="mt-1 text-xs opacity-60">¿Cómo se dice?</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {options.map((o) => (
                <button key={o} onClick={() => pick(o)} disabled={revealed}
                  className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium disabled:opacity-50 dark:border-neutral-700">
                  {o}
                </button>
              ))}
            </div>
          </>
        )}

        {/* respuesta */}
        {revealed && (
          <div className="mt-5 border-t border-stone-200 pt-4 dark:border-neutral-800">
            <div className="text-lg font-bold">
              {n.de}
              {ok === false && <span className="ml-2 text-sm font-normal opacity-60">({n.value})</span>}
            </div>
            <div className="text-sm opacity-70">{es}</div>
            {n.ipa && <div className="mt-1 text-xs opacity-50">{n.ipa} · {n.respell}</div>}
            {n.example && <div className="mt-2 text-xs italic opacity-60">{n.example}</div>}
            <div className="mt-4 grid grid-cols-4 gap-1.5">
              {([0, 1, 2, 3] as Rating[]).map((q) => (
                <button key={q} onClick={() => rate(q)}
                  className="rounded-lg border border-stone-300 py-2 text-xs font-medium hover:bg-stone-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  {['Otra vez', 'Difícil', 'Bien', 'Fácil'][q]}
                  <span className="block text-[10px] opacity-50">{preview(card, q)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {ok === false && !revealed && <p className="text-center text-sm text-red-600">Piensa bien: vuelve a escuchar 🔊</p>}
      {err && <p className="text-center text-xs text-red-600">{err}</p>}
    </div>
  )
}
