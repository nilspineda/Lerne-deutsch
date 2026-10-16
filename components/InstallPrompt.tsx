'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export default function InstallPrompt() {
  const [bip, setBip] = useState<BIPEvent | null>(null)
  const [ios, setIOS] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setBip(e as BIPEvent); setHidden(false) }
    window.addEventListener('beforeinstallprompt', onBip)
    // iOS Safari: no hay beforeinstallprompt; mostrar sugerencia solo si no está instalada
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { navigator: { standalone?: boolean } }).navigator.standalone
    if (isIOS) { setIOS(true); setHidden(false) }
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  if (hidden) return null

  async function install() {
    if (bip) { await bip.prompt(); setHidden(true) }
  }

  return (
    <div className="mx-auto mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/50">
      <span className="text-xl">📲</span>
      {bip ? (
        <>
          <span className="mr-auto opacity-90">Instala LerneDeutsch como app en tu teléfono</span>
          <button onClick={install} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white">Instalar</button>
          <button aria-label="Cerrar" onClick={() => setHidden(true)} className="opacity-50">✕</button>
        </>
      ) : ios ? (
        <>
          <span className="mr-auto opacity-90">En Safari: toca <b>Compartir</b> ↑ y elige <b>Añadir a pantalla de inicio</b></span>
          <button aria-label="Cerrar" onClick={() => setHidden(true)} className="opacity-50">✕</button>
        </>
      ) : null}
    </div>
  )
}
