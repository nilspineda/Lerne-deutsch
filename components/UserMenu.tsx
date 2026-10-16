'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function UserMenu({ name, email }: { name: string; email?: string }) {
  const r = useRouter()
  async function logout() {
    await supabase().auth.signOut()
    r.push('/login')
    r.refresh()
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <Avatar className="size-7">
          <AvatarFallback className="bg-red-600 text-xs font-bold text-white">{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-28 truncate sm:inline">Hallo, {name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{email ?? name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
