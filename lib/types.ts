export type Word = {
  id: string; owner: string | null; de: string; article: 'der' | 'die' | 'das' | null
  es: string; ipa: string | null; respell: string | null; example: string | null
  topic: string; level: string
  conj?: string[] | null            // [ich, du, er/sie/es, wir, ihr, sie/Sie]
  verb_type?: 'regular' | 'irregular' | null
  stem_change?: string | null       // ej. 'e→i', 'a→ä', 'au→äu'
  verb_note?: string | null
}
export const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie']
export type Card = {
  word_id: string; track: 'meaning' | 'pron'; due: string
  interval_days: number; ease: number; reps: number; lapses: number; words: Word
}
export const LEVELS = ['A1.1', 'A1.2', 'A2.1', 'A2.2']
export const TOPIC_LABEL: Record<string, string> = {
  abecedario: '🔤 Abecedario', numeros: '🔢 Números', frutas: '🍎 Frutas', saludos: '👋 Saludos',
  colores: '🎨 Colores', familia: '👪 Familia', personal: '⭐ Mis palabras',
}
export const topicLabel = (t: string) => TOPIC_LABEL[t] ?? t
export const full = (w: Word) => (w.article ? w.article + ' ' : '') + w.de
