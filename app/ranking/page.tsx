import { notFound } from 'next/navigation'
import RankingPodium, { type RankEntry } from '@/components/RankingPodium'
import { createClient } from '@/lib/supabase/server'

export default async function RankingPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (user?.email?.trim().toLowerCase() !== 'nilspineda@gmail.com') notFound()

  const { data, error } = await sb
    .from('quiz_a11_participant_status')
    .select('user_id, display_name, percentage, score, total_questions, finished_at, registered_at')
    .order('display_name', { ascending: true })

  return <RankingPodium entries={error ? [] : (data ?? []) as RankEntry[]} />
}
