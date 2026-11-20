'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Sparkles, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const confetti = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`, delay: `${(i % 8) * 0.2}s`, duration: `${3.4 + (i % 5) * 0.4}s`,
  color: ['#facc15', '#fb7185', '#38bdf8', '#4ade80', '#c084fc'][i % 5],
}))

export default function FinalA11Modal() {
  const sb = useMemo(() => supabase(), [])
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [savingPreference, setSavingPreference] = useState(false)

  useEffect(() => {
    let live = true
    void (async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user || !live) return
      setUserId(user.id)
      const admin = user.email?.trim().toLowerCase() === 'nilspineda@gmail.com'
      setIsSuperAdmin(admin)
      if (admin) {
        const { data: preference } = await sb.from('quiz_user_preferences').select('hide_final_invite').eq('user_id', user.id).maybeSingle()
        if (preference?.hide_final_invite || !live) return
      }
      if (sessionStorage.getItem(`final-a11-dismissed:${user.id}`)) return
      const { data, error } = await sb.from('quiz_attempts').select('id').eq('quiz_key', 'final-a1.1').limit(1)
      if (!live || error) return
      setOpen(!data?.length)
    })()
    return () => { live = false }
  }, [sb])

  function dismiss() {
    if (userId) sessionStorage.setItem(`final-a11-dismissed:${userId}`, '1')
    setOpen(false)
  }

  async function hidePermanently() {
    if (!userId) return
    setSavingPreference(true)
    const { error } = await sb.from('quiz_user_preferences').upsert({ user_id: userId, hide_final_invite: true, updated_at: new Date().toISOString() })
    setSavingPreference(false)
    if (!error) setOpen(false)
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-md" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="final-a11-title" className="relative isolate my-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-indigo-950 via-violet-950 to-rose-950 p-7 text-center text-white shadow-2xl shadow-violet-950/50 sm:p-10">
        {confetti.map((p, i) => <i key={i} aria-hidden="true" className="final-modal-confetti pointer-events-none absolute -top-8 h-3 w-2 rounded-sm opacity-80" style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay, animationDuration: p.duration }} />)}
        <button type="button" onClick={dismiss} aria-label="Cerrar invitación" className="absolute right-4 top-4 z-20 rounded-full border border-white/20 bg-white/10 p-2 text-white/80 transition hover:rotate-90 hover:bg-white/20"><X className="size-4" /></button>
        <div className="pointer-events-none absolute -left-16 top-10 size-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 size-56 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative z-10">
          <div className="mx-auto mb-5 flex size-16 animate-bounce items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur"><BookOpenCheck className="size-8 text-amber-200" /></div>
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-amber-100/25 bg-amber-100/10 px-3 py-1.5 text-xs font-bold text-amber-100"><Sparkles className="size-4 animate-pulse" /> TU RETO FINAL</div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-sky-200">Demuestra lo que aprendiste</p>
          <h2 id="final-a11-title" className="mt-2 text-4xl font-black leading-none tracking-tight sm:text-5xl">FINAL <span className="mt-2 block bg-gradient-to-r from-amber-200 via-pink-200 to-sky-200 bg-clip-text py-1 text-transparent">A.1.1 ALEMAN</span></h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-violet-100/85">Presentaciones, familia, gramática, compras, casa y números. Escucha, empareja y resuelve los retos a tu ritmo.</p>
          <Link href="/quiz-a1.1" onClick={dismiss} className="group mt-6 inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 via-pink-400 to-fuchsia-500 px-7 py-3.5 font-extrabold text-slate-950 shadow-lg shadow-pink-500/30 transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 active:scale-[0.98]">
            Presentar el final <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-3 text-xs text-violet-200/65">40 retos · Puedes repetirlo y mejorar tu nota</p>
          {isSuperAdmin && <button type="button" disabled={savingPreference} onClick={hidePermanently} className="mt-5 block w-full text-xs text-violet-200/65 underline decoration-violet-200/40 underline-offset-4 transition hover:text-white disabled:opacity-50">{savingPreference ? 'Guardando preferencia…' : 'No volver a mostrar esta ventana modal'}</button>}
        </div>
        <style jsx>{`@keyframes modal-confetti { 0% { transform: translate3d(0,-5vh,0) rotate(0); opacity: 0 } 10% { opacity: .9 } 100% { transform: translate3d(25px,90vh,0) rotate(720deg); opacity: 0 } } .final-modal-confetti { animation: modal-confetti linear infinite } @media (prefers-reduced-motion: reduce) { .final-modal-confetti { animation: none } }`}</style>
      </section>
    </div>
  )
}
