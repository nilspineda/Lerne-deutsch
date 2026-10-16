import Link from 'next/link'
import ListenSession from '@/components/ListenSession'

export default async function Listen({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const p = await searchParams
  const level = p.level === 'A1.2' ? 'A1.2' : 'A1.1'
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <b>🎧 Escucha y practica</b>
        <div className="text-sm opacity-70">
          Práctica de oído · <Link className="underline" href="/study">Modo tarjetas</Link>
        </div>
      </div>
      <ListenSession level={level} />
    </div>
  )
}
