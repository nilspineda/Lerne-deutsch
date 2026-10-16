'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { speak } from '@/lib/speak'
import { topicLabel } from '@/lib/types'

type Fail = { word_id: string; words: { de: string; article: string | null; es: string } | null }
type Trend = { d: string; ok: number; tot: number }

const box = 'rounded-2xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5'

export default function StatsPanel() {
  const sb = useMemo(() => supabase(), [])
  const [cards, setCards] = useState<{ mastered: number; total: number } | null>(null)
  const [quiz, setQuiz] = useState<{ ok: number; total: number; days: number } | null>(null)
  const [fails, setFails] = useState<Fail[]>([])
  const [trend, setTrend] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const now = Date.now()
    const days30 = new Date(now - 30 * 864e5).toISOString()
    const [c, q, f] = await Promise.all([
      sb.from('user_cards').select('interval_days, track').eq('track', 'meaning'),
      sb.from('quiz_log').select('correct, answered_at').gte('answered_at', days30),
      sb.from('quiz_log').select('word_id, correct, words(de, article, es)').eq('correct', false).order('answered_at', { ascending: false }).limit(200),
    ])
    const list = (c.data ?? []) as { interval_days: number; track: string }[]
    setCards({ mastered: list.filter((x) => x.interval_days >= 21).length, total: list.length })
    const qL = (q.data ?? []) as { correct: boolean; answered_at: string }[]
    setQuiz({ ok: qL.filter((x) => x.correct).length, total: qL.length, days: 30 })
    // agrupar fallos por palabra y conservar el más repetido
    const counts = new Map<string, number>()
    for (const x of ((f.data ?? []) as unknown as Fail[])) {
      if (!x.words) continue
      counts.set(x.word_id, (counts.get(x.word_id) ?? 0) + 1)
    }
    const failList = ((f.data ?? []) as unknown as Fail[]).filter((x) => x.words)
      .sort((a, b) => (counts.get(b.word_id) ?? 0) - (counts.get(a.word_id) ?? 0))
    const seen = new Set<string>()
    setFails(failList.filter((x) => seen.has(x.word_id) ? false : (seen.add(x.word_id), true)).slice(0, 10))
    // tendencia últimos 7 días de quiz
    const byDay = new Map<string, { ok: number; tot: number }>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 864e5).toISOString().slice(0, 10)
      byDay.set(d, { ok: 0, tot: 0 })
    }
    for (const x of qL) {
      const d = x.answered_at.slice(0, 10)
      const t = byDay.get(d)
      if (t) { t.tot++; if (x.correct) t.ok++ }
    }
    setTrend([...byDay.entries()].map(([d, v]) => ({ d, ...v })))
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  if (loading) return <p className="opacity-60">Cargando…</p>

  const acc = quiz && quiz.total > 0 ? Math.round((quiz.ok / quiz.total) * 100) : null
  const mastery = cards && cards.total > 0 ? Math.round((cards.mastered / cards.total) * 100) : null

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={box}><div className="text-2xl font-bold">{cards?.total ?? 0}</div><div className="text-xs opacity-70">Palabras estudiando</div></div>
        <div className={box}><div className="text-2xl font-bold text-green-400">{mastery ?? 0}%</div><div className="text-xs opacity-70">{cards?.mastered ?? 0} dominadas (21+ días)</div></div>
        <div className={box}><div className="text-2xl font-bold">{acc !== null ? acc + '%' : '—'}</div><div className="text-xs opacity-70">Precisión quiz 30 días</div></div>
        <div className={box}><div className="text-2xl font-bold">{fails.length}</div><div className="text-xs opacity-70">Palabras a repasar</div></div>
      </div>

      <div className={box}>
        <b className="text-sm">📊 Quiz de artículos · últimos 7 días</b>
        <div className="mt-3 flex h-20 items-end gap-1">
          {trend.map((t) => {
            const okH = t.tot ? (t.ok / t.tot) * 100 : 0
            return (
              <div key={t.d} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-16 w-full flex-col justify-end">
                  <div className="w-full rounded-t bg-red-900/60" style={{ height: `${t.tot ? 100 : 0}%` }} title={`${t.tot} respuestas`}>
                    <div className="w-full rounded-t bg-green-500" style={{ height: `${okH}%` }} />
                  </div>
                </div>
                <span className="text-[10px] opacity-50">{t.d.slice(8)}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-1 text-xs opacity-60">Verde = correctas · rojo = falladas (altura = volumen del día)</div>
      </div>

      <div className="space-y-2">
        <b className="text-sm">🔁 Para mejorar (tus fallas más frecuentes)</b>
        {fails.length === 0 ? (
          <div className={box}><p className="text-sm opacity-70">¡Sin fallas registradas! {quiz && quiz.total === 0 ? 'Juega el quiz para medir tu precisión.' : 'Sigue así 🎉'}</p>
            {quiz && quiz.total === 0 && <Link href="/quiz" className="mt-2 inline-block rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white">Ir al quiz</Link>}
          </div>
        ) : fails.map((f) => (
          <div key={f.word_id} className="flex items-center gap-2 border-b border-stone-200 dark:border-neutral-800 py-2">
            <div className="min-w-0 flex-1">
              <b>{f.words?.article && <span className="mr-1 text-yellow-400">{f.words?.article}</span>}{f.words?.de}</b>
              <span className="ml-2 text-sm opacity-60">{f.words?.es}</span>
            </div>
            <button onClick={() => f.words && speak(f.words.de)} className="opacity-60 hover:opacity-100">🔊</button>
            <Link href="/quiz" className="rounded border border-stone-300 dark:border-neutral-700 px-2 py-1 text-xs hover:bg-stone-200 dark:bg-neutral-800">Practicar</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
