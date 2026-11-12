export type Word = {
  id: string; owner: string | null; de: string; article: 'der' | 'die' | 'das' | null
  es: string; ipa: string | null; respell: string | null; example: string | null
  topic: string; level: string
  audio_url?: string | null         // audio propio (bucket "audio"); si no, se usa el TTS
  category?: string | null          // subcategoría: fruta, verdura, carne…
  unit?: string | null              // unidad de compra: kg, g, l, Stück…
  price_eur?: number | null         // precio orientativo en euros
  conj?: string[] | null            // [ich, du, er/sie/es, wir, ihr, sie/Sie]
  verb_type?: 'regular' | 'irregular' | null
  stem_change?: string | null       // ej. 'e→i', 'a→ä', 'au→äu'
  verb_note?: string | null
}
export type NumberEntry = {
  id: string; owner: string | null; value: number; de: string; es: string
  category: 'cardinal' | 'ordinal' | 'decimal' | 'fraction' | 'percentage' | 'money' | 'time'
  ipa: string | null; respell: string | null; example: string | null
  audio_url?: string | null; level: string
}
export type Unit = {
  id: string; de: string; es: string; symbol: string | null
  dimension: 'peso' | 'volumen' | 'longitud' | 'tiempo' | 'cantidad' | 'moneda'
  plural_de: string | null; ipa: string | null; respell: string | null
  example: string | null; audio_url?: string | null; level: string
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
  verduras: '🥕 Verduras', supermercado: '🛒 Supermercado', medidas: '⚖️ Medidas',
  ordinales: '1️⃣ Ordinales', decimales: '🔢 Decimales', tiempo: '⏰ Tiempo', dinero: '💰 Dinero',
}
export const topicLabel = (t: string) => TOPIC_LABEL[t] ?? t
export const full = (w: Word) => (w.article ? w.article + ' ' : '') + w.de
