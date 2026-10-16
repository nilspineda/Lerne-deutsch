import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { topicLabel } from '@/lib/types'

type Row = { track: string; due: string; interval_days: number; words: { topic: string; level: string } | null }
type Cat = { topic: string; level: string }

export default async function Home() {
  const sb = await createClient()
  const [{ data: c }, { data: k }] = await Promise.all([
    sb.from('user_cards').select('track, due, interval_days, words(topic, level)'),
    sb.from('words').select('topic, level').is('owner', null),
  ])
  const cards = (c ?? []) as unknown as Row[]
  const catalog = (k ?? []) as Cat[]
  const now = Date.now()
  const due = (t: string) => cards.filter((x) => x.track === t && new Date(x.due).getTime() <= now).length

  const groups = new Map<string, { level: string; topic: string; total: number; added: number; mastered: number }>()
  for (const w of catalog) {
    const key = `${w.level}|${w.topic}`
    const g = groups.get(key) ?? { level: w.level, topic: w.topic, total: 0, added: 0, mastered: 0 }
    g.total++; groups.set(key, g)
  }
  for (const x of cards.filter((x) => x.track === 'meaning' && x.words)) {
    const g = groups.get(`${x.words!.level}|${x.words!.topic}`)
    if (!g) continue
    g.added++
    if (x.interval_days >= 21) g.mastered++
  }
  const list = [...groups.values()].sort((a, b) => a.level.localeCompare(b.level))
  const box = 'rounded-xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900'
  const byLevel = new Map<string, typeof list>()
  for (const g of list) {
    const l = byLevel.get(g.level) ?? []
    l.push(g)
    byLevel.set(g.level, l)
  }
  const levelStyle: Record<string, string> = {
    'A1.1': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    'A1.2': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Link href="/study?track=meaning" className={box}>
          <div className="text-3xl font-bold">{due('meaning')}</div>
          <div className="text-sm opacity-70">📖 Significado pendientes</div>
        </Link>
        <Link href="/study?track=pron" className={box}>
          <div className="text-3xl font-bold">{due('pron')}</div>
          <div className="text-sm opacity-70">🔊 Pronunciación pendientes</div>
        </Link>
      </div>
      {cards.length === 0 && (
        <p className={box}>Aún no tienes palabras. Ve a <Link className="underline" href="/words">Palabras</Link> y agrega algunas (o 5 al azar).</p>
      )}
      <h2 className="font-semibold">Progreso por tema</h2>
      <div className="space-y-5">
        {[...byLevel.entries()].map(([level, groupsOfLevel]) => (
          <div key={level} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${levelStyle[level] ?? 'bg-stone-200 text-stone-700 dark:bg-neutral-800 dark:text-stone-200'}`}>
                {level}
              </span>
              <span className="text-xs opacity-60">
                {groupsOfLevel.reduce((a, g) => a + g.mastered, 0)} dominadas · {groupsOfLevel.reduce((a, g) => a + g.total, 0)} palabras
              </span>
            </div>
            {groupsOfLevel.map((g) => (
              <div key={g.level + g.topic} className={box}>
                <div className="flex items-center justify-between">
                  <b>{topicLabel(g.topic)}</b>
                  <Link className="text-sm underline" href={`/study?topic=${g.topic}&level=${g.level}`}>Estudiar</Link>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-stone-200 dark:bg-neutral-800">
                  <div className={level === 'A1.2' ? 'h-full bg-purple-600' : 'h-full bg-blue-600'} style={{ width: `${(g.mastered / g.total) * 100}%` }} />
                </div>
                <div className="mt-1 text-xs opacity-70">{g.mastered} dominadas · {g.added} agregadas · {g.total} en el catálogo</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
