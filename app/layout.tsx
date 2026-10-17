import './globals.css'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import UserMenu from '@/components/UserMenu'
import Navbar from '@/components/Navbar'
import SwRegister from '@/components/SwRegister'
import Logo from '@/components/Logo'
import { Search } from 'lucide-react'

export const metadata = {
  title: 'LerneDeutsch',
  description: 'Aprende alemán con repetición espaciada',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}
export const viewport = { themeColor: '#1c1917' }

function nameOf(user: { email?: string; user_metadata?: { name?: string; full_name?: string } }) {
  return user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  return (
    <html lang="es" className="dark">
      <body className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-stone-100">
        <SwRegister />
        {user && (
          <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 md:max-w-3xl">
              <div className="flex shrink-0 items-center gap-1.5">
                <Link href="/" className="shrink-0">
                  <Logo className="h-7 w-auto" />
                </Link>
                <Link href="/search" aria-label="Buscar"
                  className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-200/70 md:hidden dark:text-neutral-400 dark:hover:bg-neutral-800">
                  <Search className="size-5" />
                </Link>
              </div>
              <Navbar variant="header" />
              <UserMenu name={nameOf(user)} email={user.email} />
            </div>
          </header>
        )}
        <main className="mx-auto max-w-xl p-4 sm:p-6 md:max-w-3xl md:p-8">{children}</main>
        {user && (
          <footer className="mx-auto mt-auto w-full max-w-xl p-4 pb-28 text-center text-xs opacity-50 md:max-w-3xl md:pb-4">
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
