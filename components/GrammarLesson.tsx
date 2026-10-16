'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { speak } from '@/lib/speak'
import { next, preview, type Rating } from '@/lib/srs'

type Example = { de: string; es: string }
type Rule = { id: number; slug: string; level: string; title: string; body: string; examples: Example[] }
type Exercise = { id: number; sentence: string; options: string[]; answer: string; hint: string | null }
type SrsRow = { exercise_id: number; due: string; interval_days: number; ease: number; reps: number; lapses: number }

const box = 'rounded-2xl border border-stone-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900'

export default function GrammarLesson({ rule, exercises }: { rule: Rule; exercises: Exercise[] }) {
  const sb = useMemo(() => supabase(), [])
  const [phase, setPhase] = useState<'theory' | 'practice'>('theory')
  const [queue, setQueue] = useState<(Exercise & { srs: SrsRow | null })[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState({ ok: 0, total: 0 })
  const [done, setDone] = useState(0)

  // carga en cola: vencidas primero; las nuevas se consideran vencidas
  useEffect(() => {
    if (phase !== 'practice') return
    ;(async () => {
      const { data } = await sb.from('grammar_srs').select('*')
      const rows = (data ?? []) as unknown as SrsRow[]
      const map = new Map(rows.map((r) => [r.exercise_id, r]))
      const now = Date.now()
      const built = exercises.map((e) => ({ ...e, srs: map.get(e.id) ?? null }))
        .sort((a, b) => new Date(a.srs?.due ?? 0).getTime() - new Date(b.srs?.due ?? 0).getTime())
        .filter((e) => !e.srs?.due || new Date(e.srs.due).getTime() <= now)
      // si nada vencido, adelanta las más próximas (siempre hay algo)
      const list = built.length ? built : exercises.map((e) => ({ ...e, srs: map.get(e.id) ?? null }))
        .sort((a, b) => new Date(a.srs?.due ?? 0).getTime() - new Date(b.srs?.due ?? 0).getTime()).slice(0, 10)
      setQueue(list.map((e) => ({ ...e })))
      setScore({ ok: 0, total: 0 }); setDone(0); setPicked(null)
    })()
  }, [sb, phase, exercises])

  const card = queue[0]
  const lessonDone = phase === 'practice' && queue.length === 0 && exercises.length > 0

  async function rate(q: Rating) {
    if (!card) return
    setPicked(null)
    const base: SrsRow = card.srs ?? { exercise_id: card.id, due: new Date().toISOString(), interval_days: 0, ease: 2.5, reps: 0, lapses: 0 }
    const n = next({ interval_days: base.interval_days, ease: Number(base.ease), reps: base.reps, lapses: base.lapses }, q)
    const upd = await sb.from('grammar_srs').upsert({
      exercise_id: card.id, due: n.due.toISOString(), interval_days: n.interval_days,
      ease: n.ease, reps: n.reps, lapses: n.lapses, last_reviewed: new Date().toISOString(),
    })
    if (upd.error) return
    setScore((s) => ({ ok: s.ok + (q >= 2 ? 1 : 0), total: s.total + 1 }))
    setQueue((qs) => {
      const rest = qs.slice(1)
      if (q === 0) return [...rest, card] // otra vez: al final
      return qs.slice(1)
    })
  }

  const optionCls = (a: string) => {
    const isAnswer = card?.answer === a
    const correct = picked && isAnswer
    const wrong = picked === a && !isAnswer
    return `flex-1 rounded-lg border p-3 text-sm font-semibold transition-transform active:scale-95 ${
      correct ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'
      : wrong ? 'border-red-500 bg-red-50 text-red-700 line-through dark:bg-red-950 dark:text-red-300'
      : 'border-stone-300 dark:border-neutral-700 hover:bg-stone-200 dark:bg-neutral-800'}`
  }

  function answer(a: string) {
    if (picked || !card) return
    setPicked(a)
    const ok = a === card.answer
    if (!ok) speak(card.sentence.replace('___', card.answer), true)
    // acierto rápido; error con más tiempo para leer la explicación
    setTimeout(() => rate(ok ? 2 : 0), ok ? 700 : 2800)
  }

  function revealAnswer() {
    if (!card || picked) return
    setPicked(card.answer) // marca verde y califica como 'Difícil'
    speak(card.sentence.replace('___', card.answer))
    setTimeout(() => rate(1), 900)
  }

  // teoría: párrafos separados por doble salto
  const paragraphs = rule.body.split('\n\n')
  const examples = Array.isArray(rule.examples) ? rule.examples : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <b>{rule.title}</b>
        <Link href="/grammar" className="text-sm opacity-70 underline">← Lecciones</Link>
      </div>

      {phase === 'theory' ? (
        <>
          <div className={box + ' space-y-3'}>
            {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line text-sm leading-relaxed opacity-90">{p}</p>)}
          </div>
          {examples.length > 0 && (
            <div className={box}>
              <b className="text-sm">📝 Ejemplos</b>
              <ul className="mt-2 space-y-2">
                {examples.map((ex, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <button aria-label="Escuchar ejemplo" onClick={() => speak(ex.de)} className="shrink-0 opacity-60 hover:opacity-100">🔊</button>
                    <span><b>{ex.de}</b> <span className="opacity-60">— {ex.es}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={() => setPhase('practice')} disabled={!exercises.length}
            className="w-full rounded-lg bg-red-600 p-3 font-medium text-white disabled:opacity-50">
            {exercises.length ? 'Practicar esta lección' : 'Sin ejercicios todavía'}
          </button>
        </>
      ) : lessonDone ? (
        <div className={box + ' text-center'}>
          <div className="text-4xl">🎓</div>
          <div className="mt-2 text-2xl font-bold">{score.ok}/{score.total}</div>
          <div className="text-sm opacity-70">Los fallos vuelven con el repaso SRS en 10 minutos; los aciertos se espacian (1 → 3 → 7… días).</div>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => setPhase('theory')} className="rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-neutral-700">Releer teoría</button>
            <Link href="/grammar" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Otra lección</Link>
          </div>
        </div>
      ) : !card ? (
        <p className={box + ' text-center opacity-60'}><Link className="underline" href="/grammar">← Lecciones</Link></p>
      ) : (
        <>
          <div className="flex justify-between text-sm opacity-70">
            <span>Quedan: {queue.length}</span>
            <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-semibold dark:bg-neutral-800">✓ {score.ok}/{score.total}</span>
          </div>
          <div className={box + ' text-center'}>
            <div className="text-xs uppercase tracking-wide opacity-60">Completa la frase</div>
            <div className="mt-3 text-2xl font-bold">{card.sentence.replace('___', '＿＿＿')}</div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {card.options.map((a) => (
                <button key={a} disabled={!!picked} onClick={() => answer(a)} className={optionCls(a)}>{a}</button>
              ))}
            </div>
            {picked && picked !== card.answer && (
              <div className="mt-3 text-sm font-medium text-red-400">Era «{card.answer}»{card.hint ? ` — ${card.hint}` : ''}</div>
            )}
            {picked === card.answer && card.hint && <div className="mt-3 text-sm font-medium text-green-400">{card.hint}</div>}
            {!picked && (
              <button onClick={revealAnswer} className="mt-4 text-xs opacity-50 underline">No la sé (revela y repasa)</button>
            )}
            {card.srs?.due && <div className="mt-2 text-xs opacity-40">repasada {card.srs.reps} vez/veces · siguiente si es «Bien»: {preview({ interval_days: card.srs.interval_days, ease: Number(card.srs.ease), reps: card.srs.reps, lapses: card.srs.lapses }, 2)}</div>}
          </div>
        </>
      )}
    </div>
  )
}
