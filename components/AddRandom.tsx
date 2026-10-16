'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AddRandom({ n = 15 }: { n?: number }) {
  const r = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function go() {
    setBusy(true); setMsg('')
    const sb = supabase()
    const { error, data } = await sb.rpc('add_random_words', { p_n: n, p_level: null, p_topic: null })
    if (error) setMsg(error.message)
    else if (data === 0) setMsg('No quedan palabras nuevas 🎉')
    r.refresh()
    setBusy(false)
    if (!error && data > 0) setTimeout(() => setMsg(''), 2500)
  }
  return (
    <div className="text-center">
      <button disabled={busy} onClick={go}
        className="w-full rounded-lg bg-stone-800 p-3 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60 dark:bg-neutral-200 dark:text-stone-900">
        {busy ? 'Agregando…' : `🎲 Agregar ${n} palabras nuevas al azar`}
      </button>
      {msg && <p className="mt-2 text-xs opacity-80">{msg}</p>}
    </div>
  )
}
