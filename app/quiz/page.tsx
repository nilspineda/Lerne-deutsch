import ArticlesQuiz from '@/components/ArticlesQuiz'

export default async function Quiz() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <b>🎩 Quiz · der / die / das</b>
        <a href="/stats" className="text-sm opacity-70 underline">Estadísticas</a>
      </div>
      <p className="text-sm opacity-60">Elige el artículo correcto. Lo que falles se repite al final de la sesión.</p>
      <ArticlesQuiz level="" />
    </div>
  )
}
