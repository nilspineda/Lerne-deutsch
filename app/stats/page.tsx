import StatsPanel from '@/components/StatsPanel'

export default function Stats() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <b>📈 Tu progreso</b>
        <a href="/quiz" className="text-sm opacity-70 underline">Quiz</a>
      </div>
      <StatsPanel />
    </div>
  )
}
