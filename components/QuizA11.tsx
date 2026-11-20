'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Volume2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Q = { id: number; slug: string; topic: string; order_idx: number; interaction: string; prompt: string; data: Record<string, unknown>; explanation: string }
type Attempt = { id: number; score: number; total_questions: number; percentage: number; finished_at: string }
const topicOrder = ['presentacion', 'familia', 'gramatica', 'supermercado', 'restaurante', 'casa', 'numeros', 'repaso']
const quizQuestionSlugs = [
  'presentacion-orden-01', 'presentacion-woher-01', 'presentacion-verbos-01',
  'familia-vocab-01', 'familia-vocab-02', 'familia-presentar-01',
  'gram-nominativo-01', 'gram-nominativo-02', 'gram-acusativo-01', 'gram-caso-01',
  'super-frutas-01', 'super-plurales-01', 'super-articulos-01', 'super-verbos-frecuencia-01',
  'restaurante-pedir-01', 'restaurante-comida-01',
  'casa-habitaciones-01', 'casa-clasificar-01', 'casa-frase-01',
  'numeros-hören-01', 'numeros-hören-04', 'numeros-emparejar-01', 'numeros-hören-06', 'numeros-hören-07',
  'repaso-mixto-01',
] as const
const asStrings = (x: unknown): string[] => Array.isArray(x) ? x.map(String) : []
const asRecord = (x: unknown): Record<string, string> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, string> : {}
const title: Record<string, string> = { presentacion: 'Presentación', familia: 'Familia', gramatica: 'Gramática', supermercado: 'Supermercado', restaurante: 'Restaurante', casa: 'La casa', numeros: 'Números', repaso: 'Repaso final' }

function shuffleForSeed<T>(items: T[], seed: string): T[] {
  const shuffled = [...items]
  let state = 2166136261
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619)
  const random = () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  // Evita que un orden al azar conserve por casualidad el orden de la clave SQL.
  if (shuffled.length > 1 && shuffled.every((item, index) => Object.is(item, items[index]))) {
    const offset = 1 + Math.floor(random() * (shuffled.length - 1))
    return [...shuffled.slice(offset), ...shuffled.slice(0, offset)]
  }
  return shuffled
}

export default function QuizA11() {
  const sb = useMemo(() => supabase(), [])
  const [questions, setQuestions] = useState<Q[]>([])
  const [history, setHistory] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [result, setResult] = useState<Record<string, boolean>>({})
  const [checked, setChecked] = useState<boolean | null>(null)
  const [playing, setPlaying] = useState(false)
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.random().toString(36).slice(2))
  const [saveError, setSaveError] = useState('')
  const saved = useRef(false)
  const dragValue = useRef('')

  useEffect(() => {
    let alive = true
    void (async () => {
      const { data: { user } } = await sb.auth.getUser()
      const [{ data: qs, error }, { data: attempts }] = await Promise.all([
        sb.from('quiz_questions').select('id, slug, topic, order_idx, interaction, prompt, data, explanation').eq('level', 'A1.1').in('slug', quizQuestionSlugs),
        user ? sb.from('quiz_attempts').select('id, score, total_questions, percentage, finished_at').eq('quiz_key', 'final-a1.1').eq('user_id', user.id).order('finished_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
      ])
      if (!alive) return
      if (!error && qs) setQuestions((qs as Q[]).sort((a, b) => topicOrder.indexOf(a.topic) - topicOrder.indexOf(b.topic) || a.order_idx - b.order_idx))
      setHistory((attempts ?? []) as Attempt[])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [sb])

  const q = questions[index]
  const key = q?.slug ?? ''
  const data = q?.data ?? {}
  const answer = answers[key]
  const matchPairs = (data.pairs ?? []) as { left: string; right: string }[]
  const shuffleKey = `${shuffleSeed}:${key}`
  const shuffledChoices = shuffleForSeed(asStrings(data.choices), `${shuffleKey}:choices`)
  const shuffledMatchOptions = shuffleForSeed(matchPairs.map((pair) => pair.right), `${shuffleKey}:match`)
  const shuffledTargets = shuffleForSeed(asStrings(data.targets), `${shuffleKey}:targets`)
  const shuffledItems = shuffleForSeed(asStrings(data.items), `${shuffleKey}:items`)
  const shuffledTokens = shuffleForSeed(asStrings(data.tokens), `${shuffleKey}:tokens`)
  const completed = questions.length > 0 && index >= questions.length
  const score = Object.values(result).filter(Boolean).length
  const percentage = questions.length ? Math.round(score * 100 / questions.length) : 0

  function setAnswer(value: unknown) { setAnswers((all) => ({ ...all, [key]: value })) }
  function pairSelect(left: string, right: string) { setAnswer({ ...asRecord(answer), [left]: right }) }
  function sequenceAdd(token: string) { setAnswer([...asStrings(answer), token]) }
  function play(text: string) {
    const audio = new Audio(`/api/tts?word=${encodeURIComponent(text)}`)
    setPlaying(true)
    audio.onended = () => setPlaying(false)
    audio.onerror = () => setPlaying(false)
    void audio.play().catch(() => setPlaying(false))
  }

  function isCorrect() {
    if (!q) return false
    if (q.interaction === 'match') {
      const pairs = (data.pairs ?? []) as { left: string; right: string }[]
      const chosen = asRecord(answer)
      return pairs.length > 0 && pairs.every((p) => chosen[p.left] === p.right)
    }
    if (q.interaction === 'listen_choose') return String(answer ?? '') === String(data.answer ?? '')
    if (q.interaction === 'listen_match') {
      const items = (data.items ?? []) as { answer: string | number }[]
      const chosen = asRecord(answer)
      return items.length > 0 && items.every((item, i) => chosen[String(i)] === String(item.answer))
    }
    if (data.items && data.targets && data.answer && typeof data.answer === 'object') {
      const expected = asRecord(data.answer); const chosen = asRecord(answer)
      return Object.entries(expected).every(([item, target]) => chosen[item] === target)
    }
    if (Array.isArray(data.sentences) && Array.isArray(data.answers)) {
      const expected = asStrings(data.answers); const chosen = asStrings(answer)
      return expected.length === chosen.length && expected.every((value, i) => value === chosen[i])
    }
    if (Array.isArray(data.sentences) && data.sentences.every((sentence) => sentence && typeof sentence === 'object' && 'answer' in sentence)) {
      const expected = (data.sentences as { answer: string }[]).map((sentence) => String(sentence.answer))
      const chosen = asStrings(answer)
      return expected.length === chosen.length && expected.every((value, i) => value === chosen[i])
    }
    if (Array.isArray(data.answer)) {
      const expected = asStrings(data.answer); const chosen = asStrings(answer)
      return expected.length === chosen.length && expected.every((v, i) => v === chosen[i])
    }
    return String(answer ?? '') === String(data.answer ?? '')
  }

  function check() {
    if (!q || checked !== null) return
    const ok = isCorrect()
    setChecked(ok)
    setResult((all) => ({ ...all, [key]: ok }))
  }

  async function finish() {
    if (saved.current) return
    saved.current = true
    const finalScore = Object.values(result).filter(Boolean).length
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setSaveError('Inicia sesión para guardar este resultado.'); saved.current = false; return }
    const responses = questions.map((item) => ({ slug: item.slug, correct: result[item.slug] ?? false, answer: answers[item.slug] ?? null }))
    const displayName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Estudiante').slice(0, 80)
    const { error } = await sb.from('quiz_attempts').insert({ user_id: user.id, quiz_key: 'final-a1.1', score: finalScore, total_questions: questions.length, answers: responses, display_name: displayName })
    if (error) { setSaveError('No se pudo guardar el resultado. Comprueba que el SQL del historial esté aplicado.'); saved.current = false; return }
    const { data: attempts } = await sb.from('quiz_attempts').select('id, score, total_questions, percentage, finished_at').eq('quiz_key', 'final-a1.1').eq('user_id', user.id).order('finished_at', { ascending: false }).limit(20)
    setHistory((attempts ?? []) as Attempt[])
  }

  function next() {
    if (index === questions.length - 1) { setIndex(questions.length); void finish() }
    else { setIndex((i) => i + 1); setChecked(null) }
  }

  function restart() { setIndex(0); setAnswers({}); setResult({}); setChecked(null); setSaveError(''); setShuffleSeed(Math.random().toString(36).slice(2)); saved.current = false }
  function onDrop(e: DragEvent<HTMLElement>, callback: (value: string) => void) { e.preventDefault(); const value = e.dataTransfer.getData('text/plain') || dragValue.current; if (value) callback(value) }

  if (loading) return <div className="animate-pulse rounded-3xl bg-stone-200 p-8 text-center dark:bg-neutral-900">Preparando el final A1.1…</div>
  if (!questions.length) return <div className="rounded-3xl border border-stone-200 p-8 text-center dark:border-neutral-800"><h1 className="text-2xl font-black">FINAL A.1.1 ALEMAN</h1><p className="mt-3 opacity-70">No se encontraron ejercicios. Ejecuta el SQL del final A1.1 en el proyecto de Supabase conectado.</p><Link href="/" className="mt-5 inline-block underline">Volver al inicio</Link></div>

  const box = 'rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-7'
  const fields = 'w-full rounded-xl border border-stone-300 bg-white p-3 text-sm dark:border-neutral-700 dark:bg-neutral-950'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3"><Link href="/" className="inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"><ArrowLeft className="size-4" /> Inicio</Link><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">FINAL A.1.1 ALEMAN</span></div>
      {completed ? (
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-950 via-violet-950 to-rose-950 p-8 text-center text-white shadow-2xl sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">{Array.from({ length: 36 }, (_, i) => <i key={i} className="final-result-confetti absolute -top-4 h-3 w-2 rounded-sm" style={{ left: `${(i * 29) % 100}%`, backgroundColor: ['#facc15','#fb7185','#38bdf8','#4ade80','#c084fc'][i % 5], animationDelay: `${(i % 9) * 0.18}s` }} />)}</div>
          <div className="relative z-10"><div className="text-5xl">🏆</div><p className="mt-3 text-xs font-bold uppercase tracking-[.3em] text-amber-200">Resultado final</p><h1 className="mt-2 text-3xl font-black">{percentage >= 90 ? '¡Fantástico trabajo!' : percentage >= 70 ? '¡Muy bien hecho!' : '¡Sigue practicando!'}</h1><div className="mt-5 text-7xl font-black tabular-nums sm:text-8xl">{percentage}<span className="text-4xl">%</span></div><p className="mt-2 text-lg text-violet-100">{score} de {questions.length} respuestas correctas</p>{saveError && <p role="alert" className="mt-3 text-sm text-amber-200">{saveError}</p>}<div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={restart} className="rounded-xl bg-white px-5 py-3 font-bold text-violet-950 transition hover:scale-105">Repetir el final</button><Link href="/" className="rounded-xl border border-white/30 px-5 py-3 font-semibold transition hover:bg-white/10">Ver mi mejor nota</Link></div></div>
          <style jsx>{`@keyframes result-fall { 0%{transform:translateY(-5vh) rotate(0);opacity:0} 10%{opacity:1} 100%{transform:translateY(75vh) rotate(720deg);opacity:0} }.final-result-confetti{animation:result-fall 3.7s linear infinite}@media(prefers-reduced-motion:reduce){.final-result-confetti{animation:none}}`}</style>
        </section>
      ) : q && <>
        <div className={box + ' animate-in fade-in slide-in-from-bottom-3 duration-500'}>
          <div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">{title[q.topic] ?? q.topic}</p><p className="mt-1 text-xs opacity-60">Reto {index + 1} de {questions.length}</p></div><div className="text-sm font-bold tabular-nums">{score} ✓</div></div>
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-neutral-800"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-400 transition-all duration-700" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{q.prompt}</h1>

          {q.interaction === 'listen_choose' && <div className="mt-5 space-y-4"><button onClick={() => play(String(data.audio_text ?? ''))} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 font-semibold text-violet-800 transition hover:scale-105 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200"><Volume2 className={`size-5 ${playing ? 'animate-pulse' : ''}`} /> Escuchar número</button><div className="grid grid-cols-3 gap-3">{shuffledChoices.map((choice) => <button key={choice} disabled={checked !== null} onClick={() => setAnswer(choice)} className={`rounded-xl border p-4 text-xl font-black transition hover:-translate-y-1 ${String(answer) === choice ? 'border-violet-500 bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100' : 'border-stone-200 dark:border-neutral-700'}`}>{choice}</button>)}</div></div>}

          {q.interaction === 'match' && <div className="mt-5 space-y-3">{matchPairs.map((pair) => <label key={pair.left} className="grid items-center gap-2 sm:grid-cols-2"><span className="rounded-xl bg-stone-100 p-3 text-sm font-semibold dark:bg-neutral-800">{pair.left}</span><select disabled={checked !== null} className={fields} value={asRecord(answer)[pair.left] ?? ''} onChange={(e) => pairSelect(pair.left, e.target.value)}><option value="">Elige la pareja…</option>{shuffledMatchOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}</div>}

          {q.interaction === 'listen_match' && <div className="mt-5 space-y-3">{((data.items ?? []) as {audio_text:string;answer:string|number}[]).map((item, i) => <div key={item.audio_text} className="grid items-center gap-2 sm:grid-cols-[auto_1fr_1fr]"><button type="button" onClick={() => play(item.audio_text)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 px-3 py-3 text-sm font-semibold text-violet-700 dark:border-violet-800 dark:text-violet-200"><Volume2 className="size-4" /> Audio {i + 1}</button><span className="text-sm opacity-70">¿Qué cifra escuchaste?</span><select disabled={checked !== null} className={fields} value={asRecord(answer)[String(i)] ?? ''} onChange={(e) => pairSelect(String(i), e.target.value)}><option value="">Elige cifra…</option>{shuffledTargets.map((t) => <option key={t}>{t}</option>)}</select></div>)}</div>}

          {q.interaction === 'drag_drop' && Array.isArray(data.items) && Array.isArray(data.targets) && <div className="mt-5 space-y-4"><div className="grid gap-2 sm:grid-cols-2">{shuffledItems.map((item) => <label key={item} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr]"><span draggable onDragStart={(e) => { dragValue.current = item; e.dataTransfer.setData('text/plain', item) }} className="cursor-grab rounded-xl border border-dashed border-violet-300 bg-violet-50 p-3 font-semibold dark:border-violet-800 dark:bg-violet-950">⠿ {item}</span><select disabled={checked !== null} className={fields} value={asRecord(answer)[item] ?? ''} onChange={(e) => setAnswer({ ...asRecord(answer), [item]: e.target.value })}><option value="">Elige grupo…</option>{shuffledTargets.map((target) => <option key={target}>{target}</option>)}</select></label>)}</div><div className="grid gap-3 sm:grid-cols-2">{shuffledTargets.map((target) => <div key={target} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const dropped = e.dataTransfer.getData('text/plain') || dragValue.current; if (dropped && checked === null) setAnswer({ ...asRecord(answer), [dropped]: target }) }} className="min-h-24 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/60 p-3 dark:border-violet-800 dark:bg-violet-950/40"><b className="text-sm">Suelta aquí: {target}</b><div className="mt-2 flex flex-wrap gap-1.5">{shuffledItems.filter((item) => asRecord(answer)[item] === target).map((item) => <span key={item} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold text-white">{item}</span>)}</div></div>)}</div></div>}

          {q.interaction === 'drag_drop' && Array.isArray(data.sentences) && <div className="mt-5 space-y-3">{(data.sentences as (string | {text:string})[]).map((sentence, i) => <label key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_auto]"><span className="rounded-xl bg-stone-100 p-3 text-sm dark:bg-neutral-800">{typeof sentence === 'string' ? sentence : sentence.text}</span><select disabled={checked !== null} className={fields} value={asStrings(answer)[i] ?? ''} onChange={(e) => { const a = [...asStrings(answer)]; a[i] = e.target.value; setAnswer(a) }}><option value="">Arrastra o elige…</option>{shuffledTokens.map((token) => <option key={token}>{token}</option>)}</select></label>)}</div>}

          {q.interaction === 'drag_drop' && Array.isArray(data.tokens) && Array.isArray(data.answer) && <div className="mt-5"><div className="mb-3 flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-violet-300 p-3 dark:border-violet-800" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, sequenceAdd)}>{asStrings(answer).length ? asStrings(answer).map((token, i) => <button type="button" key={`${token}-${i}`} onClick={() => setAnswer(asStrings(answer).filter((_, n) => n !== i))} className="rounded-lg bg-violet-600 px-3 py-2 font-semibold text-white">{token} ×</button>) : <span className="text-sm opacity-50">Suelta las palabras aquí o tócalas en orden…</span>}</div><div className="flex flex-wrap gap-2">{shuffledTokens.filter((t) => asStrings(answer).filter((a) => a === t).length < asStrings(data.tokens).filter((x) => x === t).length).map((token, i) => <button type="button" draggable onDragStart={(e) => { dragValue.current = token; e.dataTransfer.setData('text/plain', token) }} onClick={() => sequenceAdd(token)} key={`${token}-${i}`} className="cursor-grab rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-1 dark:border-neutral-700 dark:bg-neutral-950">{token}</button>)}</div></div>}

          {q.interaction === 'drag_drop' && Array.isArray(data.tokens) && !Array.isArray(data.answer) && !Array.isArray(data.sentences) && !Array.isArray(data.items) && <div className="mt-5"><div className="mb-3 min-h-14 rounded-xl border-2 border-dashed border-violet-300 p-3 dark:border-violet-800" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, setAnswer)}>{answer ? <button type="button" onClick={() => setAnswer('')} className="rounded-lg bg-violet-600 px-3 py-2 font-bold text-white">{String(answer)} ×</button> : <span className="text-sm opacity-50">Suelta aquí tu respuesta o selecciónala…</span>}</div><div className="flex flex-wrap gap-2">{shuffledTokens.map((token) => <button key={token} type="button" draggable onDragStart={(e) => { dragValue.current = token; e.dataTransfer.setData('text/plain', token) }} onClick={() => setAnswer(token)} className={`cursor-grab rounded-xl border px-4 py-3 font-semibold transition hover:-translate-y-1 ${String(answer) === token ? 'border-violet-500 bg-violet-100 dark:bg-violet-950' : 'border-stone-300 dark:border-neutral-700'}`}>{token}</button>)}</div>{typeof data.sentence === 'string' && <p className="mt-4 text-sm opacity-70">{data.sentence}</p>}</div>}

          {checked !== null && <div role="status" className={`mt-5 rounded-xl p-4 text-sm ${checked ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200'}`}><b>{checked ? '¡Correcto!' : 'Sigue aprendiendo'}</b><p className="mt-1">{q.explanation}</p></div>}
          <div className="mt-6 flex justify-end">{checked === null ? <button onClick={check} disabled={answer === undefined || answer === '' || (Array.isArray(answer) && !answer.length)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:scale-105 disabled:opacity-40">Comprobar <Check className="size-4" /></button> : <button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 font-bold text-white transition hover:scale-105 dark:bg-white dark:text-stone-900">{index === questions.length - 1 ? 'Ver mi nota' : 'Siguiente'} <ArrowRight className="size-4" /></button>}</div>
        </div>
      </>}

      <section className={box}><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Historial de intentos</h2><p className="text-sm opacity-60">Cada resultado queda guardado en tu cuenta.</p></div><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">Mejor: {history.length ? `${Math.max(...history.map((h) => Number(h.percentage)))}%` : '—'}</span></div><div className="mt-3 divide-y divide-stone-200 dark:divide-neutral-800">{history.map((h) => <div key={h.id} className="flex items-center justify-between py-2 text-sm"><span>{new Date(h.finished_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span><b>{Number(h.percentage)}% · {h.score}/{h.total_questions}</b></div>)}{!history.length && <p className="py-3 text-sm opacity-60">Aún no tienes intentos guardados.</p>}</div></section>
    </div>
  )
}
