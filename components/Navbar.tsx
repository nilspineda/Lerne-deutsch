'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, BookOpen, Layers, AudioLines, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', label: 'Inicio', icon: House },
  { href: '/study', label: 'Estudiar', icon: BookOpen },
  { href: '/listen', label: 'Oído', icon: AudioLines },
  { href: '/quiz', label: 'Quiz', icon: Layers },
  { href: '/stats', label: 'Progreso', icon: TrendingUp },
]

export default function Navbar() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-1 items-center justify-start gap-1 text-sm sm:justify-center">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors sm:px-4',
              active
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'text-stone-600 hover:bg-stone-200/70 hover:text-stone-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-stone-100',
            )}>
            <Icon className="size-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
