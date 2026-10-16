'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

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
      <input className={input} type="email" placeholder="Correo" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" placeholder="Contraseña (mín. 6)" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={busy} className="w-full rounded-lg bg-red-600 p-3 font-medium text-white disabled:opacity-50">
        {mode === 'in' ? 'Entrar' : 'Crear cuenta'}
      </button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <button type="button" className="w-full text-sm underline opacity-70" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
      </button>
    </form>
  )
}
