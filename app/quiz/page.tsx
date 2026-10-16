'use client'
import { useState } from 'react'
import ArticlesQuiz from '@/components/ArticlesQuiz'

const LEVELS = ['', 'A1', 'A2', 'B1', 'B2', 'C1']

export default function Quiz() {
  const [level, setLevel] = useState('')
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <b>🎩 Quiz · der / die / das</b>
        <a href="/stats" className="text-sm opacity-70 underline">Estadísticas</a>
      </div>
      <p className="text-sm opacity-60">Elige el artículo correcto. Lo que falles se repite al final de la sesión.</p>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              level === l
                ? 'bg-red-600 text-white'
                : 'border border-stone-300 dark:border-neutral-700 hover:bg-stone-200 dark:bg-neutral-800'
            }`}
          >
            {l || 'Todos'}
          </button>
        ))}
      </div>
      <ArticlesQuiz key={level} level={level} />
    </div>
  )
}
