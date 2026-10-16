import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (code) {
    const sb = await createClient()
    await sb.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? url.origin))
}
