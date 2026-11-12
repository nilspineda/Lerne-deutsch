import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NumbersSession from '@/components/NumbersSession'

export const metadata = { title: 'Números · Deutsch Karten' }

export default async function NumbersPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; category?: string }>
}) {
  const p = await searchParams
  const track = p.track === 'reverse' ? 'reverse' : 'listen'
  const category = p.category ?? ''
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  const { data: nums } = await sb
    .from('numbers')
    .select('id, category, value')
    .is('owner', null)
  const all = (nums ?? []) as { id: string; category: string; value: number }[]
  const count = (c: string) => all.filter((x) => x.category === c).length

  if (!user) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm opacity-70">Inicia sesión para practicar números.</p>
        <Link href="/login" className="inline-block rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-neutral-700">Entrar</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <b>🔢 Números</b>
        <Link href="/" className="text-sm opacity-70 underline">Inicio</Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/numbers?track=listen&category=${encodeURIComponent(category)}`}
          className={`rounded-xl border p-4 text-center font-medium ${track === 'listen' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40' : 'border-stone-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'}`}>
          🎧 Oír → cifra
        </Link>
        <Link href={`/numbers?track=reverse&category=${encodeURIComponent(category)}`}
          className={`rounded-xl border p-4 text-center font-medium ${track === 'reverse' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40' : 'border-stone-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'}`}>
          🔢 Cifra → palabra
        </Link>
      </div>

      <p className="text-center text-xs opacity-60">
        {all.length} números en el catálogo · {count('cardinal')} cardinales · {count('ordinal')} ordinales · {count('decimal')} decimales
      </p>

      <NumbersSession track={track} initialCategory={category} />
    </div>
  )
}
