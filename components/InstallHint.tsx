'use client'
import { useEffect, useState } from 'react'

const ROWS = [
  { id: 'ios', label: 'iPhone · Safari', text: 'Abre la página en Safari → toca Compartir ↑ → «Añadir a pantalla de inicio».' },
  { id: 'android', label: 'Android · Chrome', text: 'Menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».' },
  { id: 'desktop', label: 'PC · Chrome / Edge', text: 'Haz clic en el icono ↧ de instalar de la barra de direcciones.' },
] as const

export default function InstallHint() {
  const [platform, setPlatform] = useState<string | null>(null)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    if (standalone) { setPlatform('hidden'); return }
    const ua = navigator.userAgent
    if (/iphone|ipad|ipod/i.test(ua)) setPlatform('ios')
    else if (/android/i.test(ua)) setPlatform('android')
    else setPlatform('desktop')
  }, [])

  if (platform === 'hidden') return null

  return (
    <div className="mx-auto mt-6 max-w-sm rounded-xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <b className="text-sm">📲 Instala la app en tu teléfono</b>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed">
        {ROWS.map((r) => {
          const active = platform === r.id
          return (
            <li key={r.id}
              className={`rounded-lg px-2 py-1.5 ${active ? 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300' : 'opacity-70'}`}>
              <b>{r.label}</b>{active ? ' · tu caso' : ''}: {r.text}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[11px] opacity-50">Funciona sin tienda: es una app web (PWA). Así tienes icono propio y modo offline.</p>
    </div>
  )
}
