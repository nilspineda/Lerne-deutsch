'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { speak } from '@/lib/speak'
import { LEVELS, full, topicLabel, type Word } from '@/lib/types'

const empty = { de: '', article: '', es: '', ipa: '', respell: '', example: '', topic: 'personal', level: 'A1.1' }

export default function WordsManager() {
  const sb = useMemo(() => supabase(), [])
  const [words, setWords] = useState<Word[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [level, setLevel] = useState('')
  const [topic, setTopic] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [f, setF] = useState(empty)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [w, c] = await Promise.all([
      sb.from('words').select('*').order('level').order('topic').order('created_at').limit(500),
      sb.from('user_cards').select('word_id').eq('track', 'meaning'),
    ])
    setWords((w.data ?? []) as Word[])
    setAdded(new Set((c.data ?? []).map((r: { word_id: string }) => r.word_id)))
  }, [sb])
  useEffect(() => { load() }, [load])

  const topics = [...new Set(words.map((w) => w.topic))]
  const shown = words.filter((w) =>
    (!level || w.level === level) && (!topic || w.topic === topic) &&
    (!q || (w.de + w.es).toLowerCase().includes(q.toLowerCase())))

  const addCards = (id: string) => sb.from('user_cards').insert([{ word_id: id, track: 'meaning' }, { word_id: id, track: 'pron' }])

  async function addOne(id: string) { await addCards(id); load() }
  async function random(n: number) {
    const { data, error } = await sb.rpc('add_random_words', { p_n: n, p_level: level || null, p_topic: topic || null })
    setMsg(error ? error.message : data === 0 ? 'No quedan palabras nuevas con ese filtro 🎉' : `Se agregaron ${data} palabras`)
    load()
  }
  async function remove(id: string) {
    if (confirmId !== id) { setConfirmId(id); return } // primer toque: armarse; segundo: borrar
    setConfirmId(null)
    const { error } = await sb.from('words').delete().eq('id', id)
    if (error) setMsg(error.message)
    load()
  }

  async function enrich() {
    if (!f.de.trim()) return
    setBusy(true); setMsg('')
    try {
      const r = await fetch(`/api/enrich?word=${encodeURIComponent(f.de.trim())}`)
      const d = await r.json()
      setF((p) => ({ ...p, es: p.es || d.es || '', ipa: p.ipa || d.ipa || '', article: p.article || d.article || '' }))
      if (!d.es && !d.ipa) setMsg('No encontré datos, llénalos a mano.')
    } catch { setMsg('Falló el autocompletado.') }
    setBusy(false)
  }

  async function save() {
    if (!f.de.trim() || !f.es.trim()) { setMsg('Faltan alemán y significado'); return }
    const { data, error } = await sb.from('words').insert({
      de: f.de.trim(), es: f.es.trim(), article: f.article || null, ipa: f.ipa || null,
      respell: f.respell || null, example: f.example || null, topic: f.topic.trim() || 'personal', level: f.level,
    }).select().single()
    if (error) { setMsg(error.message); return }
    await addCards(data.id)
    setF(empty); setMsg('✓ Guardada'); load()
  }

  const inp = 'w-full rounded-lg border border-stone-300 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900'
  const box = 'rounded-xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900'

  return (
    <div className="space-y-5">
      <div className={box + ' space-y-3'}>
        <div className="grid grid-cols-2 gap-2">
          <select className={inp} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Todos los niveles</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select className={inp} value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Todos los temas</option>{topics.map((t) => <option key={t} value={t}>{topicLabel(t)}</option>)}
          </select>
        </div>
        <input className={inp} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={() => random(5)} className="flex-1 rounded-lg bg-red-600 p-2 text-sm font-medium text-white">🎲 Agregar 5 al azar</button>
          <button onClick={() => random(10)} className="flex-1 rounded-lg border border-stone-300 p-2 text-sm dark:border-neutral-700">🎲 10</button>
        </div>
        {msg && <p className="text-sm opacity-80">{msg}</p>}
      </div>

      <div>
        {shown.map((w) => (
          <div key={w.id} className="flex items-center gap-2 border-b border-stone-200 py-2 dark:border-neutral-800">
            <div className="min-w-0 flex-1">
              <b>{w.article && <span className="mr-1 text-red-600">{w.article}</span>}{w.de}</b>
              <div className="truncate text-sm opacity-70">{w.es}{w.respell ? ` · «${w.respell}»` : ''}{w.ipa ? ` · /${w.ipa}/` : ''}</div>
            </div>
            <button aria-label="Escuchar pronunciación" onClick={() => speak(full(w))}>🔊</button>
            <button aria-label="Escuchar pronunciación lenta" onClick={() => speak(full(w), true)}>🐢</button>
            {w.owner && (
              <button aria-label={confirmId === w.id ? 'Confirmar borrado' : 'Borrar palabra'} className={`opacity-50 ${confirmId === w.id ? 'text-red-600 opacity-100' : ''}`} onClick={() => remove(w.id)}>
                {confirmId === w.id ? '⚠' : '✕'}
              </button>
            )}
            {added.has(w.id) ? <span className="text-green-600">✓</span> :
              <button className="rounded border border-stone-300 px-2 py-1 text-sm dark:border-neutral-700" onClick={() => addOne(w.id)}>Agregar</button>}
          </div>
        ))}
        {!shown.length && <p className="py-6 text-center opacity-60">Sin resultados</p>}
      </div>

      <div className={box + ' space-y-2'}>
        <b>Agregar palabra propia</b>
        <div className="flex gap-2">
          <select className={inp + ' !w-24'} value={f.article} onChange={(e) => setF({ ...f, article: e.target.value })}>
            <option value="">—</option><option>der</option><option>die</option><option>das</option>
          </select>
          <input className={inp} placeholder="Alemán *" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} />
          <button disabled={busy} onClick={enrich} className="shrink-0 rounded-lg border border-stone-300 px-3 text-sm dark:border-neutral-700">✨ Auto</button>
        </div>
        <input className={inp} placeholder="Significado en español *" value={f.es} onChange={(e) => setF({ ...f, es: e.target.value })} />
        <input className={inp} placeholder="Pronunciación a tu manera (ej: jáus)" value={f.respell} onChange={(e) => setF({ ...f, respell: e.target.value })} />
        <input className={inp} placeholder="IPA (opcional)" value={f.ipa} onChange={(e) => setF({ ...f, ipa: e.target.value })} />
        <input className={inp} placeholder="Ejemplo (opcional)" value={f.example} onChange={(e) => setF({ ...f, example: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={inp} placeholder="Tema" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
          <select className={inp} value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
        </div>
        <button onClick={save} className="w-full rounded-lg bg-red-600 p-2 font-medium text-white">Guardar y estudiar</button>
      </div>
    </div>
  )
}
