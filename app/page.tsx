import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { topicLabel } from '@/lib/types'
import AddRandom from '@/components/AddRandom'
import InstallPrompt from '@/components/InstallPrompt'

type Row = { track: string; due: string; interval_days: number; words: { topic: string; level: string } | null }
type Cat = { topic: string; level: string; owner: string | null }

// racha en días (UTC): días consecutivos con repases
function streakOf(days: string[]): number {
  const set = new Set(days)
  let s = 0
  const today = new Date().toISOString().slice(0, 10)
  const d = new Date(today + 'T00:00:00Z')
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1) // hoy aún no estudió: cuenta desde ayer
  for (;;) {
    const key = d.toISOString().slice(0, 10)
    if (!set.has(key)) break
    s++; d.setUTCDate(d.getUTCDate() - 1)
    if (s > 365) break
  }
  return s
}

export default async function Home() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const [{ data: c }, { data: k }, { data: r }] = await Promise.all([
    sb.from('user_cards').select('track, due, interval_days, words(topic, level)'),
    // catálogo global + palabras propias (suman al total del tema y permiten "agregar más")
    sb.from('words').select('topic, level, owner').or(`owner.is.null,owner.eq.${user?.id}`),
    sb.from('review_log').select('reviewed_at').gte('reviewed_at', new Date(Date.now() - 90 * 864e5).toISOString()).limit(2000),
  ])
  const cards = (c ?? []) as unknown as Row[]
  const catalog = (k ?? []) as Cat[]
  const streak = streakOf((r ?? []).map((x: { reviewed_at: string }) => x.reviewed_at.slice(0, 10)))
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
    if (x.interval_days >= 3) g.mastered++
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
      <InstallPrompt />
      <AddRandom n={15} />
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
      <div className="text-center">
        <Link href="/study?saved=1" className="inline-block rounded-lg border border-yellow-500/60 px-4 py-2 text-sm font-medium text-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-950/40">
          ★ Repasar mis palabras guardadas
        </Link>
      </div>
      <p className="text-center text-sm">
        {streak > 0 ? <><span className="font-bold text-red-600">🔥 {streak}</span> <span className="opacity-70">día(s) de racha</span></> : <span className="opacity-60">🔥 Estudia hoy y empieza tu racha</span>}
      </p>
      {cards.length === 0 && (
        <p className={box}>Aún no tienes palabras. Ve a <Link className="underline" href="/words">Palabras</Link> y agrega algunas (o 5 al azar).</p>
      )}
      <h2 className="font-semibold">Progreso por tema</h2>
    <div className="space-y-5">
        {[...byLevel.entries()].map(([level, groupsOfLevel]) => (
          <div key={level} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${levelStyle[level] ?? 'bg-stone-200 text-stone-700 dark:bg-neutral-800 dark:text-stone-200'}`}>
                {level}
              </span>
              <span className="text-xs opacity-60">
                {groupsOfLevel.reduce((a, g) => a + g.mastered, 0)} dominadas · {groupsOfLevel.reduce((a, g) => a + g.total, 0)} palabras
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            {groupsOfLevel.map((g) => (
              <div key={g.level + g.topic} className={box}>
                <div className="flex items-center justify-between">
                  <b>{topicLabel(g.topic)}</b>
                  <Link className="text-sm underline" href={`/topic?topic=${encodeURIComponent(g.topic)}&level=${encodeURIComponent(g.level)}`}>Estudiar</Link>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-stone-200 dark:bg-neutral-800">
                  <div className={level === 'A1.2' ? 'h-full bg-purple-600' : 'h-full bg-blue-600'} style={{ width: `${(g.mastered / g.total) * 100}%` }} />
                </div>
                <div className="mt-1 text-xs opacity-70">{g.mastered} dominadas · {g.added} agregadas · {g.total} en el catálogo</div>
                {g.mastered >= g.total && (
                  <Link className="mt-1 inline-block text-xs underline opacity-80" href={`/words?topic=${encodeURIComponent(g.topic)}&level=${encodeURIComponent(g.level)}`}>
                    🎉 ¡Tema completo! Agrega más palabras y baja la barra
                  </Link>
                )}
              </div>
            ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
