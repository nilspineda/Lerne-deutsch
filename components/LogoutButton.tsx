'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LogoutButton() {
  const r = useRouter()
  return (
    <button
      className="opacity-70 hover:opacity-100"
      onClick={async () => { await supabase().auth.signOut(); r.push('/login'); r.refresh() }}
    >
      Salir
    </button>
  )
}
