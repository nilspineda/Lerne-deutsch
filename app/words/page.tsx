import WordsManager from '@/components/WordsManager'

export default async function Words({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; level?: string }>
}) {
  const p = await searchParams
  return <WordsManager initialTopic={p.topic} initialLevel={p.level} />
}
