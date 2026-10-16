import './globals.css'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import UserMenu from '@/components/UserMenu'
import Navbar from '@/components/Navbar'
import { Sparkles } from 'lucide-react'

export const metadata = { title: 'LerneDeutsch', description: 'Aprende alemán con repetición espaciada' }

function nameOf(user: { email?: string; user_metadata?: { name?: string; full_name?: string } }) {
  return user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  return (
    <html lang="es" className="dark">
      <body className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-stone-100">
        {user && (
          <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
              <Link href="/" className="shrink-0">
                <span className="flex items-center gap-1.5 text-base sm:text-lg">
                  <Sparkles className="size-5 text-red-600" />
                  <b>LerneDeutsch</b>
                </span>
              </Link>
              <Navbar variant="header" />
              <UserMenu name={nameOf(user)} email={user.email} />
            </div>
          </header>
        )}
        <main className="mx-auto max-w-xl p-4">{children}</main>
        {user && (
          <footer className="mx-auto mt-auto w-full max-w-xl p-4 pb-28 text-center text-xs opacity-50 md:pb-4">
            Diseñado por <a href="https://nilspineda.com/es/" className="underline">nilspineda</a>
          </footer>
        )}
        {user && (
          <div className="w-full md:hidden">
            <Navbar variant="bottom" />
          </div>
        )}
      </body>
    </html>
  )
}
