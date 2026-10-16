'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, BookOpen, Layers, AudioLines, TrendingUp, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', label: 'Inicio', icon: House },
  { href: '/study', label: 'Estudiar', icon: BookOpen },
  { href: '/grammar', label: 'Gram.', icon: Languages },
  { href: '/listen', label: 'Oído', icon: AudioLines },
  { href: '/quiz', label: 'Quiz', icon: Layers },
  { href: '/stats', label: 'Progreso', icon: TrendingUp },
]

export default function Navbar({ variant }: { variant: 'header' | 'bottom' }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)
  if (variant === 'bottom') {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto flex max-w-md justify-between gap-0.5 p-1.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-colors',
                  active ? 'bg-red-600 text-white' : 'text-stone-500 dark:text-neutral-400',
                )}>
                <Icon className="size-5" />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }
  return (
    <nav className="hidden flex-1 items-center justify-center gap-1 text-sm md:flex">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors',
            isActive(href)
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'text-stone-600 hover:bg-stone-200/70 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-stone-100',
          )}>
          <Icon className="size-4 shrink-0" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
