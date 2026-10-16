'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { speak } from '@/lib/speak'

type W = { id: string; de: string; article: string; es: string }

const ARTS = ['der', 'die', 'das'] as const

export default function ArticlesQuiz({ level }: { level: string }) {
  const sb = useMemo(() => supabase(), [])
  const [pool, setPool] = useState<W[]>([])
  const [queue, setQueue] = useState<W[]>([])
  const [loading, setLoading] = useState(true)
  const [picked, setPicked] = useState<string | null>(null)
  const [retry, setRetry] = useState<W[]>([])
  const [score, setScore] = useState({ ok: 0, total: 0 })

  const start = () => {
    if (pool.length) {
      const q = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(15, pool.length))
      setQueue(q); setRetry([]); setScore({ ok: 0, total: 0 })
    }
  }
  useEffect(start, [pool]) // eslint-disable-line

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      let f = sb.from('words').select('id, de, article, es').not('article', 'is', null)
      if (level) f = f.eq('level', level)
      const { data } = await f
      setPool((data ?? []) as unknown as W[])
      setLoading(false)
    })()
  }, [sb, level])

  const card = queue[0]
  const done = queue.length === 0 && !loading && score.total > 0

  async function logAnswer(wordId: string, correct: boolean) {
    await sb.from('quiz_log').insert({ word_id: wordId, quiz_type: 'artikel', correct })
  }

  function pick(a: string) {
    if (picked || !card) return
    setPicked(a)
    const ok = a === card.article
    if (!ok) speak(card.de, true)
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }))
    logAnswer(card.id, ok)
    setTimeout(() => {
      if (!ok) setRetry((r) => (r.some((x) => x.id === card.id) ? r : [...r, card]))
      setQueue((qs) => (!ok ? [...qs.slice(1), card] : qs.slice(1)))
      setPicked(null)
    }, 900)
  }

  const option = (a: string) => {
    const correct = picked && a === card?.article
    const wrong = picked === a && a !== card?.article
    return `flex-1 rounded-lg border p-3 text-sm font-semibold transition-transform active:scale-95 ${
      correct ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'
      : wrong ? 'border-red-500 bg-red-50 text-red-700 line-through dark:bg-red-950 dark:text-red-300'
      : 'border-stone-300 dark:border-neutral-700 hover:bg-stone-200 dark:bg-neutral-800'}`
  }

  if (loading) return <p className="opacity-60">Cargando…</p>
  if (pool.length === 0) return (
    <div className="rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 text-center">
      No hay palabras con artículo para este nivel. Agrega más en <Link className="underline" href="/words">Palabras</Link>.
    </div>
  )

  return (
    <div className="space-y-4">
      {done ? (
        <>
          <div className="rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 text-center">
            <div className="text-4xl">🏆</div>
            <div className="mt-2 text-2xl font-bold">{score.ok}/{score.total}</div>
            <div className="text-sm opacity-70">{score.ok === score.total ? '¡Perfecto! Todos los artículos correctos.' : 'Los fallados se repitieron hasta acertar.'}</div>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={start} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Jugar otra vez</button>
              <Link href="/stats" className="rounded-lg border border-stone-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-stone-200 dark:bg-neutral-800">Ver estadísticas</Link>
            </div>
          </div>
          {retry.length > 0 && (
            <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4">
              <b className="text-sm text-red-300">🔁 Para mejorar: fallas de esta sesión</b>
              <ul className="mt-2 space-y-1 text-sm">
                {retry.map((w, i) => (
                  <li key={w.id + '-' + i} className="flex items-center gap-2">
                    <span className="mr-auto"><span className="text-yellow-400">{w.article}</span> <b>{w.de}</b> <span className="opacity-60">— {w.es}</span></span>
                    <button onClick={() => speak(w.de)} className="opacity-60 hover:opacity-100">🔊</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Quedan: {queue.length}</span>
            <span className="rounded-full bg-stone-200 dark:bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-stone-700 dark:text-stone-200">✓ {score.ok} / {score.total}</span>
          </div>
          <div className="rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 text-center">
            <div className="text-xs uppercase tracking-wide opacity-60">¿Cuál es el artículo?</div>
            <button onClick={() => card && speak(card.de)} className="mt-2 text-4xl font-bold">{card?.de}</button>
            <div className="mt-1 text-sm opacity-60">{card?.es}</div>
            {picked && picked !== card?.article && (
              <div className="mt-3 text-sm font-medium text-green-400">Era «{card?.article}» — se repite al final</div>
            )}
            <div className="mt-5 flex gap-2">
              {ARTS.map((a) => (
                <button key={a} disabled={!!picked} onClick={() => pick(a)} className={option(a)}>{a}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
