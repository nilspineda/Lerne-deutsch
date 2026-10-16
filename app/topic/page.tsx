import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { topicLabel } from '@/lib/types'

type W = { id: string; de: string; article: string | null; es: string; topic: string; level: string }

export default async function Topic({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; level?: string }>
}) {
  const p = await searchParams
  const topic = p.topic ?? ''
  const level = p.level ?? ''
  const sb = await createClient()
  let q = sb.from('words').select('id, de, article, es, topic, level').is('owner', null)
  if (topic) q = q.eq('topic', topic)
  if (level) q = q.eq('level', level)
  q = q.order('level').order('created_at').limit(200)
  const { data: ks } = await q
  const words = (ks ?? []) as W[]
  const masterLabel = topicLabel(topic) || 'Tema'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <b>{masterLabel} {level}</b>
        <Link href="/" className="text-sm opacity-70 underline">Inicio</Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link href={`/study?track=meaning&topic=${encodeURIComponent(topic)}&level=${encodeURIComponent(level)}`}
          className="rounded-xl border border-stone-200 bg-white p-4 text-center font-medium dark:border-neutral-800 dark:bg-neutral-900">
          📖 Significado
        </Link>
        <Link href={`/study?track=pron&topic=${encodeURIComponent(topic)}&level=${encodeURIComponent(level)}`}
          className="rounded-xl border border-stone-200 bg-white p-4 text-center font-medium dark:border-neutral-800 dark:bg-neutral-900">
          🔊 Pronunciación
        </Link>
      </div>
      <div className="text-xs opacity-60">Palabras del catálogo ({words.length}):</div>
      <div>
        {words.map((w) => (
          <div key={w.id} className="flex items-baseline gap-2 border-b border-stone-200 py-2 text-sm dark:border-neutral-800">
            {w.article && <span className="shrink-0 text-red-600">{w.article}</span>}
            <b className="shrink-0">{w.de}</b>
            <span className="min-w-0 flex-1 truncate opacity-70">{w.es}</span>
          </div>
        ))}
        {!words.length && <p className="py-6 text-center text-sm opacity-60">Sin palabras en el catálogo para este tema.</p>}
      </div>
      <Link href="/" className="block text-center text-xs opacity-50 underline">← Volver al inicio</Link>
    </div>
  )
}
