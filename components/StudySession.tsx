'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { next, preview, type Rating } from '@/lib/srs'
import { speak, stopSpeak } from '@/lib/speak'
import { full, topicLabel, type Card } from '@/lib/types'
import { queueRating, flushPending } from '@/lib/offlineSrs'

export default function StudySession({ track, level, topic }: { track: 'meaning' | 'pron'; level?: string; topic?: string }) {
  const sb = useMemo(() => supabase(), [])
  const [queue, setQueue] = useState<Card[]>([])
  const [shown, setShown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(0)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      let q = sb.from('user_cards').select('*, words!inner(*)').eq('track', track)
        .lte('due', new Date().toISOString()).order('due').limit(40)
      if (level) q = q.eq('words.level', level)
      if (topic) q = q.eq('words.topic', topic)
      let { data } = await q

      if (!data?.length) {
        // sin tema: agrega palabras nuevas del catálogo (sin duplicar) hasta tener suficientes
        const { data: have } = await sb.from('user_cards').select('word_id').eq('track', track)
        const haveIds = new Set((have ?? []).map((h: { word_id: string }) => h.word_id))
        let f = sb.from('words').select('id, de, article, es').is('owner', null)
        if (level) f = f.eq('level', level)
        if (topic) f = f.eq('topic', topic)
        const { data: cat } = await f
        const fresh = (cat ?? [])
          .filter((w: { id: string }) => !haveIds.has(w.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, 20)
        if (fresh.length) {
          await sb.from('user_cards').upsert(fresh.map((w: { id: string }) => ({ word_id: w.id, track })), { ignoreDuplicates: true })

          // estudio por tema/nivel: si no hay tarjetas (o ninguna vencida), se agregan del catálogo automáticamente
        } else if (level || topic) {
          let f2 = sb.from('words').select('id').is('owner', null)
          if (level) f2 = f2.eq('level', level)
          if (topic) f2 = f2.eq('topic', topic)
          const { data: cat2 } = await f2
          if (cat2?.length) {
            await sb.from('user_cards').upsert(
              cat2.map((w: { id: string }) => ({ word_id: w.id, track })),
              { ignoreDuplicates: true },
            )
          }
        }

        // 'siempre hay algo que estudiar': se adelantan las más cercanas aunque no estén vencidas
        let q2 = sb.from('user_cards').select('*, words!inner(*)').eq('track', track).order('due').limit(40)
        if (level) q2 = q2.eq('words.level', level)
        if (topic) q2 = q2.eq('words.topic', topic)
        const { data: upcoming } = await q2
        if (upcoming?.length) data = upcoming
      }
      setQueue((data ?? []) as unknown as Card[]); setDone(0); setShown(false); setLoading(false)
    })()
  }, [sb, track, level, topic])

  const card = queue[0]
  const w = card?.words
  const [choice, setChoice] = useState<string | null>(null)
  const [wrong, setWrong] = useState<string | null>(null)

  useEffect(() => { setChoice(null); setWrong(null) }, [card?.word_id])

  useEffect(() => () => stopSpeak(), []) // corta el audio al desmontar (nav fuera de /study)

  // sincroniza repases guardados sin conexión al abrir y al volver la red
  useEffect(() => {
    const flush = () => { void flushPending() }
    void flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  const options = useMemo(() => {
    if (!w) return []
    const pool = queue.slice(1).map((c) => c.words.es).filter((es) => es && es !== w.es)
    const uniq = [...new Set(pool)]
    const picked: string[] = []
    while (picked.length < 3 && uniq.length) {
      const i = Math.floor(Math.random() * uniq.length)
      picked.push(uniq.splice(i, 1)[0])
    }
    return [w.es, ...picked].sort(() => Math.random() - 0.5)
  }, [card?.word_id, queue.length, track]) // eslint-disable-line

  function pick(es: string) {
    if (!w || shown) return
    if (es === w.es) { setChoice(es); setShown(true) }
    else {
      setWrong(es); setChoice(null)
      if (track === 'pron') speak(full(w), true) // reescucha lenta al fallar
    }
  }

  useEffect(() => { if (card) speak(full(card.words)) }, [card?.word_id, track]) // eslint-disable-line

  const [err, setErr] = useState('')
  async function rate(q: Rating) {
    if (!card) return
    // reset inmediato: al 'Otra vez' la carta vuelve con el mismo word_id y este reset
    // evita que queden pegados la opción tachada/mensajes (bug si se depende del word_id)
    setChoice(null); setWrong(null)
    const n = next(card, q)
    const upd = await sb.from('user_cards').update({
      due: n.due.toISOString(), interval_days: n.interval_days, ease: n.ease, reps: n.reps, lapses: n.lapses,
      last_reviewed: new Date().toISOString(),
    }).match({ word_id: card.word_id, track: card.track })
    if (upd.error) {
      // sin conexión: guarda el repaso localmente; se sincroniza al volver la red
      queueRating({ word_id: card.word_id, track: card.track, rating: q, interval_days: n.interval_days, ease: n.ease, reps: n.reps, lapses: n.lapses, due: n.due.toISOString() })
      setErr('Sin conexión: guardado local, se sincronizará automático.')
      setQueue((qs) => {
        const rest = qs.slice(1)
        const withN = { ...card, ...n, due: n.due.toISOString() }
        if (q === 0) return [...rest, withN]
        return wrong ? [...rest, withN] : rest
      })
      if (q !== 0 && !wrong) setDone((d) => d + 1)
      setShown(false)
      return
    }
    const ins = await sb.from('review_log').insert({ word_id: card.word_id, track: card.track, rating: q })
    if (ins.error) {
      queueRating({ word_id: card.word_id, track: card.track, rating: q, interval_days: n.interval_days, ease: n.ease, reps: n.reps, lapses: n.lapses, due: n.due.toISOString() })
    }
    setErr('')
    setQueue((qs) => {
      const rest = qs.slice(1)
      const withN = { ...card, ...n, due: n.due.toISOString() }
      if (q === 0) return [...rest, withN] // 'Otra vez': siempre al final de la sesión
      // colita extra: si fallaste al elegir la opción, la carta vuelve a la cola aunque califiques bien
      return wrong ? [...rest, withN] : rest
    })
    if (q !== 0 && !wrong) setDone((d) => d + 1)
    setShown(false)
  }

  function reveal() { setShown(true); if (track === 'meaning' && card) speak(full(card.words)) }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !shown) { e.preventDefault(); reveal() }
      else if (shown && '1234'.includes(e.key)) {
        const r = (Number(e.key) - 1) as Rating
        setKeyPressed(r)
        rate(r)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }) // eslint-disable-line

  const qs = (t: string) => `/study?track=${t}${level ? `&level=${level}` : ''}${topic ? `&topic=${topic}` : ''}`
  const tab = (t: string, on: boolean) =>
    `flex-1 rounded-lg border p-2 text-center text-sm ${on ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-black' : 'border-stone-300 dark:border-neutral-700'}`
  const box = 'rounded-2xl border border-stone-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900'

  const [keyPressed, setKeyPressed] = useState<Rating | null>(null)
  useEffect(() => {
    if (keyPressed !== null) {
      const t = setTimeout(() => setKeyPressed(null), 150)
      return () => clearTimeout(t)
    }
  }, [keyPressed])

  const rateStyles: Record<Rating, string> = {
    0: 'border-red-300 bg-red-50 hover:bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300',
    1: 'border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:hover:bg-orange-900 dark:text-orange-300',
    2: 'border-green-300 bg-green-50 hover:bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:hover:bg-green-900 dark:text-green-300',
    3: 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300',
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Link href={qs('meaning')} className={tab('meaning', track === 'meaning')}>📖 Significado</Link>
        <Link href={qs('pron')} className={tab('pron', track === 'pron')}>🔊 Pronunciación</Link>
      </div>
      {topic && <p className="text-sm opacity-70">{topicLabel(topic)} {level} · <Link className="underline" href={`/topic?topic=${encodeURIComponent(topic)}&level=${encodeURIComponent(level ?? '')}`}>resumen del tema</Link></p>}

      {loading ? <p className="opacity-60">Cargando…</p> : !card || !w ? (
        <div className={box}>✅ ¡Todo al día! Hiciste {done} tarjetas.<div className="mt-3"><Link className="underline" href="/words">Agregar más palabras</Link></div></div>
      ) : (
        <>
          <div className="flex justify-between text-sm opacity-70"><span>Pendientes: {queue.length}</span><span>Hechas: {done}</span></div>
          {err && <p className="rounded-lg bg-red-950 px-3 py-2 text-center text-sm text-red-300">{err}</p>}
          <div className={box}>
            {track === 'meaning' ? (
              <div className="text-4xl font-bold">{w.article && <span className="mr-2 text-red-600">{w.article}</span>}{w.de}</div>
            ) : (
              <div className="py-4 text-lg opacity-80">Escucha y trata de recordar la palabra y su significado</div>
            )}
            {options.length >= 2 ? (
              <>
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={() => speak(full(w))} className="rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-neutral-700">🔊 Escuchar</button>
                  <button onClick={() => speak(full(w), true)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-neutral-700">🐢 Lento</button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {options.map((es) => {
                    const isWrong = wrong === es
                    const isRight = choice === es
                    return (
                      <button key={es} disabled={isRight || isWrong} onClick={() => pick(es)}
                        className={`rounded-lg border p-2.5 text-sm transition-transform active:scale-95 ${
                          isRight ? 'border-green-400 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                          : isWrong ? 'border-red-400 bg-red-50 text-red-700 line-through dark:bg-red-950 dark:text-red-300'
                          : 'border-stone-300 hover:bg-stone-100 dark:border-neutral-700 dark:hover:bg-neutral-800'}`}>
                        {es}
                      </button>
                    )
                  })}
                </div>
                {wrong && choice !== w.es && <p className="mt-3 text-sm font-medium text-red-600">❌ Incorrecto. Intenta otra opción o pulsa «No sé».</p>}
                {choice === w.es && <p className="mt-3 text-sm font-medium text-green-600">{wrong ? '✅ Al final acertaste (2º intento). Califica honesto.' : '✅ ¡Al primer intento! Califica tu dificultad.'}</p>}
              </>
            ) : (
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={() => speak(full(w))} className="rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-neutral-700">🔊 Escuchar</button>
                <button onClick={() => speak(full(w), true)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-neutral-700">🐢 Lento</button>
              </div>
            )}
            {shown && (
              <div className="mt-5 space-y-1 border-t border-dashed border-stone-300 pt-5 dark:border-neutral-700">
                {track === 'pron' && <div className="text-3xl font-bold">{full(w)}</div>}
                {track === 'meaning' ? <div className="text-2xl">{w.es}</div> : <div className="text-xl">{w.es}</div>}
                {w.respell && <div className="text-lg opacity-80">«{w.respell}»</div>}
                {w.ipa && <div className="opacity-60">/{w.ipa}/</div>}
                {w.example && <div className="pt-2 italic opacity-70">{w.example}</div>}
              </div>
            )}
          </div>
          {shown ? (
            <div className="grid grid-cols-4 gap-2">
              {([['Otra vez', 0], ['Difícil', 1], ['Bien', 2], ['Fácil', 3]] as [string, Rating][]).map(([l, q]) => (
                <button key={q} onClick={() => rate(q)} disabled={keyPressed !== null}
                  className={`rounded-lg border p-2 text-sm transition-transform duration-100 active:scale-95 disabled:opacity-70 ${rateStyles[q]} ${keyPressed === q || (wrong && q === 1) ? 'scale-95 ring-2 ring-stone-900 dark:ring-white' : ''}`}>
                  <small className="mr-1.5 opacity-50">{q + 1}</small>{l}<small className="block opacity-60">{preview(card, q)}</small>
                </button>
              ))}
            </div>
          ) : (
            <button onClick={reveal} className="w-full rounded-lg bg-stone-800 p-3 font-medium text-white hover:bg-stone-700 dark:bg-neutral-200 dark:text-stone-900">
              {options.length >= 2 ? '🤷 No sé (espacio)' : 'Mostrar respuesta'}
            </button>
          )}
          <p className="text-center text-xs opacity-50">
            {options.length >= 2 ? 'Toca la opción correcta · «No sé» (espacio) revela · 1-4 = calificar' : 'Atajos: espacio = mostrar · 1-4 = calificar'}
          </p>
        </>
      )}
    </div>
  )
}
