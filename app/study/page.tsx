import StudySession from '@/components/StudySession'

export default async function Study({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; level?: string; topic?: string; saved?: string }>
}) {
  const p = await searchParams
  return <StudySession track={p.track === 'pron' ? 'pron' : 'meaning'} level={p.level} topic={p.topic} saved={p.saved === '1'} />
}
