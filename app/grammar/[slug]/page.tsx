import { createClient } from '@/lib/supabase/server'
import GrammarLesson from '@/components/GrammarLesson'

export default async function Lesson({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sb = await createClient()
  const { data: rule } = await sb.from('grammar_rules').select('*').eq('slug', slug).single()
  if (!rule) {
    return <p className="p-6 text-center opacity-60">Lección no encontrada. <a href="/grammar" className="underline">← Volver</a></p>
  }
  const { data: ex } = await sb.from('grammar_exercises').select('*').eq('rule_id', rule.id).limit(20)
  return <GrammarLesson rule={rule as never} exercises={(ex ?? []) as never} />
}
