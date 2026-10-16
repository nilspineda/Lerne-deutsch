'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LogIn, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Login() {
  const r = useRouter()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('')
    const sb = supabase()
    if (mode === 'in') {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) setMsg(error.message); else { r.push('/'); r.refresh() }
    } else {
      const { data, error } = await sb.auth.signUp({
        email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` },
      })
      if (error) setMsg(error.message)
      else if (data.session) { r.push('/'); r.refresh() }
      else setMsg('Revisa tu correo para confirmar la cuenta.')
    }
    setBusy(false)
  }

  const input = 'w-full rounded-lg border border-stone-300 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900'
  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-3">
      <h1 className="text-2xl font-bold">🇩🇪 Deutsch Karten</h1>
      <p className="text-sm opacity-70">{mode === 'in' ? 'Inicia sesión para continuar tu progreso.' : 'Crea tu cuenta.'}</p>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
        <button type="button" onClick={() => setMode('in')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
            mode === 'in'
              ? 'bg-white text-red-600 shadow-sm dark:bg-neutral-800'
              : 'text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-stone-100',
          )}>
          <LogIn className="size-4" /> Iniciar sesión
        </button>
        <button type="button" onClick={() => setMode('up')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
            mode === 'up'
              ? 'bg-white text-red-600 shadow-sm dark:bg-neutral-800'
              : 'text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-stone-100',
          )}>
          <UserPlus className="size-4" /> Crear cuenta
        </button>
      </div>

      <input className={input} type="email" placeholder="Correo" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" placeholder="Contraseña (mín. 6)" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={busy}
        className="w-full rounded-lg bg-red-600 p-3.5 text-base font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-700 hover:shadow-red-700/40 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-neutral-950">
        {mode === 'in' ? (
          <span className="flex items-center justify-center gap-2"><LogIn className="size-5" /> Entrar</span>
        ) : (
          <span className="flex items-center justify-center gap-2"><UserPlus className="size-5" /> Crear cuenta</span>
        )}
      </button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </form>
  )
}
