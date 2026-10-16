// Repetición espaciada tipo SM-2 simplificado
export type Rating = 0 | 1 | 2 | 3 // 0 otra vez · 1 difícil · 2 bien · 3 fácil
export type SrsState = { interval_days: number; ease: number; reps: number; lapses: number }

export function next(s: SrsState, q: Rating) {
  let i = s.interval_days, ease = Number(s.ease), reps = s.reps, lapses = s.lapses
  let due: Date
  if (q === 0) {
    reps = 0; lapses++; i = 0; ease = Math.max(1.3, ease - 0.2)
    due = new Date(Date.now() + 10 * 60_000)
  } else {
    reps++
    if (reps === 1) i = q === 3 ? 4 : 1
    else if (reps === 2) i = q === 3 ? 7 : 3
    else i = Math.max(i + 1, Math.round(i * ease * (q === 1 ? 0.8 : q === 3 ? 1.3 : 1)))
    if (q === 1) ease = Math.max(1.3, ease - 0.15)
    if (q === 3) ease += 0.15
    due = new Date(Date.now() + i * 86_400_000)
  }
  return { interval_days: i, ease: Math.round(ease * 100) / 100, reps, lapses, due }
}

export const preview = (s: SrsState, q: Rating) => (q === 0 ? '10 min' : `${next(s, q).interval_days} d`)
