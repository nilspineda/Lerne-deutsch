#!/usr/bin/env node
// ============================================================================
// upload-content.mjs · sube un manifiesto de contenido a Supabase
//
//   node scripts/upload-content.mjs content/manifiesto.json \
//     [--audio-dir content/audio] [--dry-run] [--only words,numbers,units]
//
// Qué hace:
//   1. Valida el manifiesto (campos, duplicados, niveles, artículos, audio).
//   2. Sube los archivos de audio al bucket `audio` de Supabase Storage.
//   3. Hace upsert de las filas en `words`, `numbers` y `units`.
//
// Requisitos (variables de entorno):
//   SUPABASE_URL               (o NEXT_PUBLIC_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY  (clave de service_role:Settings → API Keys)
//
// Es idempotente: volver a subir el mismo manifiesto actualiza, no duplica.
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------- args
const args = process.argv.slice(2)
const VALUE_FLAGS = ['--audio-dir', '--only']
const positional = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (VALUE_FLAGS.includes(a)) { i++; continue }
  if (a.startsWith('--')) continue
  positional.push(a)
}
const flag = (name) => args.includes(name)
const opt = (name, def = null) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const manifestPath = positional[0] ?? 'content/manifiesto.json'
const audioDir = path.resolve(opt('--audio-dir', 'content/audio'))
const dryRun = flag('--dry-run')
const only = (opt('--only', '') || '').split(',').map((s) => s.trim()).filter(Boolean)

// ---------------------------------------------------------------- env
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n[x] Faltan credenciales.')
  console.error('    SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (Settings → API Keys → service_role).')
  console.error('    No uses la anon key: el service_role es el único que puede escribir en el catálogo.\n')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ---------------------------------------------------------------- helpers
const LEVELS = ['A1.1', 'A1.2', 'A2.1', 'A2.2']
const ARTICLES = ['der', 'die', 'das']
const NUM_CATEGORIES = ['cardinal', 'ordinal', 'decimal', 'fraction', 'percentage', 'money', 'time']
const DIMENSIONS = ['peso', 'volumen', 'longitud', 'tiempo', 'cantidad', 'moneda']

/** slug ASCII: sin acentos, sin ß→ss, espacios → _ */
export function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const publicUrl = (p) => `${SUPABASE_URL}/storage/v1/object/public/audio/${p}`

const errors = []
const warns = []
const err = (m) => errors.push(m)
const warn = (m) => warns.push(m)

// ---------------------------------------------------------------- validate
function validateWord(w, i) {
  const tag = `words[${i}]${w?.de ? ` (${w.de})` : ''}`
  if (!w.de || typeof w.de !== 'string') return err(`${tag}: falta "de"`)
  if (!w.es || typeof w.es !== 'string') return err(`${tag}: falta "es"`)
  if (w.de.match(/^(der|die|das)\s+/i)) err(`${tag}: "de" NO debe llevar artículo; va en el campo "article"`)
  if (w.article !== undefined && w.article !== null && !ARTICLES.includes(w.article)) err(`${tag}: "article" inválido (${w.article})`)
  if (w.level && !LEVELS.includes(w.level)) err(`${tag}: "level" inválido (${w.level}); usa ${LEVELS.join(', ')}`)
  if (!w.topic) warn(`${tag}: sin "topic" (se usará "personal")`)
  if (w.audio && !/\.(mp3|m4a|ogg|wav)$/i.test(w.audio)) warn(`${tag}: "audio" no es un archivo de audio conocido`)
}

function validateNumber(n, i) {
  const tag = `numbers[${i}]${n?.de ? ` (${n.de})` : ''}`
  if (typeof n.value !== 'number' || Number.isNaN(n.value)) err(`${tag}: "value" debe ser un número`)
  if (!n.de) err(`${tag}: falta "de"`)
  else if (/\d/.test(n.de)) err(`${tag}: "de" debe ir escrito en letras ("einundzwanzig"), no en cifras`)
  if (!n.es) err(`${tag}: falta "es"`)
  if (n.category && !NUM_CATEGORIES.includes(n.category)) err(`${tag}: "category" inválido (${n.category})`)
  if (n.level && !LEVELS.includes(n.level)) err(`${tag}: "level" inválido (${n.level})`)
}

function validateUnit(u, i) {
  const tag = `units[${i}]${u?.de ? ` (${u.de})` : ''}`
  if (!u.de) return err(`${tag}: falta "de"`)
  if (!u.es) err(`${tag}: falta "es"`)
  if (u.dimension && !DIMENSIONS.includes(u.dimension)) err(`${tag}: "dimension" inválido (${u.dimension})`)
  if (u.level && !LEVELS.includes(u.level)) err(`${tag}: "level" inválido (${u.level})`)
}

// ---------------------------------------------------------------- main
const raw = JSON.parse((await readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''))
const manifest = {
  meta: raw.meta ?? {},
  words: Array.isArray(raw.words) ? raw.words : [],
  numbers: Array.isArray(raw.numbers) ? raw.numbers : [],
  units: Array.isArray(raw.units) ? raw.units : [],
}

console.log(`\n· Manifiesto: ${manifestPath}`)
console.log(`  meta: ${JSON.stringify(manifest.meta)}`)
console.log(`  words=${manifest.words.length}  numbers=${manifest.numbers.length}  units=${manifest.units.length}`)

manifest.words.forEach(validateWord)
manifest.numbers.forEach(validateNumber)
manifest.units.forEach(validateUnit)

// duplicados dentro del propio manifiesto
for (const [kind, list, key] of [
  ['words', manifest.words, 'de'],
  ['numbers', manifest.numbers, 'de'],
  ['units', manifest.units, 'de'],
]) {
  const seen = new Map()
  list.forEach((it, i) => {
    const k = (it[key] ?? '').toLowerCase()
    if (!k) return
    if (seen.has(k)) err(`${kind}[${i}]: "${it[key]}" duplicado en el manifiesto (ya estaba en ${kind}[${seen.get(k)}])`)
    else seen.set(k, i)
  })
}

if (warns.length) warns.forEach((w) => console.warn(`  ! ${w}`))
if (errors.length) {
  console.error(`\n[x] ${errors.length} error(es) de validación:\n`)
  errors.forEach((e) => console.error(`  - ${e}`))
  process.exit(1)
}
console.log('  validación OK')

if (dryRun) {
  console.log('\n[dry-run] no se subió nada.\n')
  process.exit(0)
}

// ---------------------------------------------------------------- audio
const audioFiles = new Set()
if (existsSync(audioDir)) {
  const walk = async (dir, prefix = '') => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) await walk(full, `${prefix}${e.name}/`)
      else audioFiles.add(prefix + e.name)
    }
  }
  await walk(audioDir)
  console.log(`  audio: ${audioFiles.size} archivo(s) en ${audioDir}`)
} else {
  console.log(`  audio: no existe ${audioDir} (se sube sin audio → usará el TTS)`)
}

const uploaded = new Set()
async function uploadAudio(relPath) {
  if (!relPath) return null
  const clean = relPath.replace(/^\/+/, '')
  if (uploaded.has(clean)) return publicUrl(clean)
  const local = path.join(audioDir, clean)
  if (!existsSync(local)) {
    warn(`audio no encontrado: ${clean} → la fila quedará sin audio (TTS)`)
    return null
  }
  const buf = await readFile(local)
  const { error } = await sb.storage.from('audio').upload(clean, buf, {
    contentType: path.extname(clean).toLowerCase() === '.wav' ? 'audio/wav' : 'audio/mpeg',
    upsert: true,
  })
  if (error) {
    err(`subida de audio ${clean}: ${error.message}`)
    return null
  }
  uploaded.add(clean)
  return publicUrl(clean)
}

// ---------------------------------------------------------------- upserts
const CHUNK = 200
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

/**
 * Sincroniza filas por clave lógica (`de`): si ya existe en el catálogo → UPDATE por id,
 * si no → INSERT. Evita depender del `unique nulls not distinct (owner, de)`.
 */
async function sync(table, rows, key = 'de', catalogOnly = true) {
  if (!rows.length) return { inserted: 0, updated: 0 }
  const keys = [...new Set(rows.map((r) => r[key]).filter((v) => v != null))]
  const existing = new Map()
  for (const part of chunk(keys, CHUNK)) {
    let q = sb.from(table).select('id,' + key).in(key, part)
    if (catalogOnly) q = q.is('owner', null)
    const { data, error } = await q
    if (error) { err(`leer ${table}: ${error.message}`); continue }
    for (const row of data ?? []) existing.set(String(row[key]).toLowerCase(), row.id)
  }
  const toInsert = []
  const toUpdate = []
  for (const r of rows) {
    const id = existing.get(String(r[key]).toLowerCase())
    if (id) toUpdate.push({ ...r, id })
    else toInsert.push(r)
  }
  for (const part of chunk(toUpdate, CHUNK)) {
    const { error } = await sb.from(table).upsert(part, { onConflict: 'id' })
    if (error) err(`update ${table}: ${error.message}`)
  }
  for (const part of chunk(toInsert, CHUNK)) {
    const { error } = await sb.from(table).insert(part)
    if (error) err(`insert ${table}: ${error.message}`)
  }
  return { inserted: toInsert.length, updated: toUpdate.length }
}

// words
if (!only.length || only.includes('words')) {
  const rows = []
  for (const w of manifest.words) {
    const audio = w.audio ?? (w.de ? `words/${slugify(w.de)}.mp3` : null)
    rows.push({
      owner: null,
      de: w.de,
      article: w.article ?? null,
      es: w.es,
      ipa: w.ipa ?? null,
      respell: w.respell ?? null,
      example: w.example ?? null,
      topic: w.topic ?? 'personal',
      level: w.level ?? manifest.meta.level ?? 'A1.1',
      category: w.category ?? null,
      unit: w.unit ?? null,
      price_eur: w.price_eur ?? null,
      audio_url: await uploadAudio(audio),
    })
  }
  const r = await sync('words', rows)
  console.log(`  words: ${r.inserted} insertadas, ${r.updated} actualizadas (de ${rows.length})`)
}

// numbers
if (!only.length || only.includes('numbers')) {
  const rows = []
  for (const x of manifest.numbers) {
    const audio = x.audio ?? `numbers/${slugify(x.de)}.mp3`
    rows.push({
      owner: null,
      value: x.value,
      de: x.de,
      es: x.es,
      category: x.category ?? 'cardinal',
      ipa: x.ipa ?? null,
      respell: x.respell ?? null,
      example: x.example ?? null,
      level: x.level ?? manifest.meta.level ?? 'A1.2',
      audio_url: await uploadAudio(audio),
    })
  }
  const r = await sync('numbers', rows)
  console.log(`  numbers: ${r.inserted} insertadas, ${r.updated} actualizadas (de ${rows.length})`)
}

// units
if (!only.length || only.includes('units')) {
  const rows = []
  for (const u of manifest.units) {
    const audio = u.audio ?? `units/${slugify(u.de)}.mp3`
    rows.push({
      de: u.de,
      es: u.es,
      symbol: u.symbol ?? null,
      dimension: u.dimension ?? 'peso',
      plural_de: u.plural_de ?? null,
      ipa: u.ipa ?? null,
      respell: u.respell ?? null,
      example: u.example ?? null,
      level: u.level ?? manifest.meta.level ?? 'A1.1',
      audio_url: await uploadAudio(audio),
    })
  }
  const r = await sync('units', rows, 'de', false)
  console.log(`  units: ${r.inserted} insertadas, ${r.updated} actualizadas (de ${rows.length})`)
}

if (warns.length) {
  console.warn(`\n[!] ${warns.length} aviso(s):`)
  warns.forEach((w) => console.warn(`  - ${w}`))
}
if (errors.length) {
  console.error(`\n[x] ${errors.length} error(es):`)
  errors.forEach((e) => console.error(`  - ${e}`))
  process.exit(1)
}
console.log(`\n[ok] Contenido subido. Audio en bucket "audio": ${uploaded.size} archivo(s).\n`)
