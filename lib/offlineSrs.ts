import { supabase } from '@/lib/supabase/client'

// Cola offline: si un repaso no se pudo guardar (sin conexión), se guarda aquí
// y se sincroniza con la base en cuanto vuelve la red o al abrir la app.
type PendingRating = {
  word_id: string
  track: 'meaning' | 'pron'
  rating: 0 | 1 | 2 | 3
  interval_days: number
  ease: number
  reps: number
  lapses: number
  due: string
  ts: number
}

const KEY = 'lerne.pending_ratings'

function read(): Record<string, PendingRating> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, PendingRating> } catch { return {} }
}

const kOf = (r: Pick<PendingRating, 'word_id' | 'track'>) => `${r.word_id}|${r.track}`

// la última calificación manda (se guarda el estado final de la tarjeta)
export function queueRating(r: Omit<PendingRating, 'ts'>) {
  try {
    const map = read()
    map[kOf(r)] = { ...r, ts: Date.now() }
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch { /* noop */ }
}

export function pendingCount(): number {
  return Object.keys(read()).length
}

export async function flushPending(): Promise<number> {
  const map = read()
  const items = Object.values(map)
  if (!items.length) return 0
  const sb = supabase()
  let ok = 0
  for (const r of items) {
    const upd = await sb.from('user_cards').update({
      due: r.due, interval_days: r.interval_days, ease: r.ease, reps: r.reps, lapses: r.lapses,
      last_reviewed: new Date(r.ts).toISOString(),
    }).match({ word_id: r.word_id, track: r.track })
    if (upd.error) break
    await sb.from('review_log').insert({ word_id: r.word_id, track: r.track, rating: r.rating })
    delete map[kOf(r)]
    ok++
  }
  try { localStorage.setItem(KEY, JSON.stringify(map)) } catch { /* noop */ }
  return ok
}
