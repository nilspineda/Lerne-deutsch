import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Rule = { id: number; slug: string; level: string; order_idx: number; title: string }

export default async function Grammar() {
  const sb = await createClient()
  const [{ data: rules }, { data: srs }] = await Promise.all([
    sb.from('grammar_rules').select('id, slug, level, order_idx, title').order('level').order('order_idx'),
    // dominadas (3+ días) por lección para pintar la barra
    sb.from('grammar_srs').select('exercise_id, due, interval_days'),
  ])
  const masteredByExercise = new Set<number>()
  for (const s of (srs ?? []) as unknown as { exercise_id: number; interval_days: number }[]) {
    if (s.interval_days >= 3) masteredByExercise.add(s.exercise_id)
  }
  // cuántos ejercicios tiene cada lección
  const { data: counts } = await sb.from('grammar_exercises').select('rule_id')
  const perRule = new Map<number, { tot: number; mastered: number }>()
  for (const c of (counts ?? []) as unknown as { rule_id: number }[]) {
    const g = perRule.get(c.rule_id) ?? { tot: 0, mastered: 0 }
    g.tot++
    perRule.set(c.rule_id, g)
  }
  const mastered = masteredByExercise.size
  const totalEx = ((counts ?? []) as unknown as { rule_id: number }[]).length

  const byLevel = new Map<string, Rule[]>()
  for (const r of ((rules ?? []) as unknown as Rule[])) {
    const l = byLevel.get(r.level) ?? []
    l.push(r)
    byLevel.set(r.level, l)
  }

  const levelStyle: Record<string, string> = {
    'A1.1': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    'A1.2': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  }
  const box = 'rounded-xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <b>📚 Gramática</b>
        <Link href="/" className="text-sm opacity-70 underline">Inicio</Link>
      </div>

      {totalEx > 0 && (
        <div className={box}>
          <div className="text-2xl font-bold">{mastered}/{totalEx}</div>
          <div className="text-sm opacity-70">ejercicios dominados (3+ días)</div>
          <div className="mt-2 h-2 overflow-hidden rounded bg-stone-200 dark:bg-neutral-800">
            <div className="h-full bg-blue-600" style={{ width: `${(mastered / totalEx) * 100}%` }} />
          </div>
        </div>
      )}

      {!rules?.length && (
        <p className={box}>No hay lecciones todavía. Ejecuta <code>supabase/grammar.sql</code> en el SQL Editor de Supabase.</p>
      )}

      {[...byLevel.entries()].map(([level, rs]) => (
        <div key={level} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${levelStyle[level] ?? 'bg-stone-200 text-stone-700 dark:bg-neutral-800 dark:text-stone-200'}`}>{level}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {rs.map((r) => {
              const g = perRule.get(r.id) ?? { tot: 0, mastered: 0 }
              const pct = g.tot ? (g.mastered / g.tot) * 100 : 0
              return (
                <Link key={r.id} href={`/grammar/${r.slug}`} className={box + ' transition-transform hover:scale-[1.02]'}>
                  <b className="text-sm">{r.title}</b>
                  <div className="mt-2 h-2 overflow-hidden rounded bg-stone-200 dark:bg-neutral-800">
                    <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-xs opacity-70">{g.mastered}/{g.tot} dominados</div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
