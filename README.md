# 🇩🇪 Deutsch Karten

Flashcards de alemán con repetición espaciada. Next.js 15 + Supabase (Auth + Postgres + RLS) + Tailwind 4.

## Puesta en marcha
1. Crea un proyecto en Supabase.
2. SQL Editor → ejecuta `supabase/schema.sql` y luego `supabase/seed.sql`.
3. Authentication → URL Configuration: Site URL = tu dominio; Redirect URLs = `https://TU-DOMINIO/auth/callback` (y `http://localhost:3000/auth/callback`).
4. `cp .env.local.example .env.local` y rellena URL + anon/publishable key.
5. `npm install && npm run dev`

## Cómo está armado
- `words`: catálogo global (`owner = null`) + palabras propias del usuario.
- `user_cards`: una fila por palabra y por pista (`meaning` y `pron`), cada una con su propio calendario SM-2.
- `review_log`: historial para estadísticas.
- `numbers` + `number_cards`: los números (cardinales, ordinales, decimales) con su valor numérico, y su propio SRS para `/numbers`.
- `units`: medidas (kilo, gramo, litro, pieza…).
- `add_random_words(n, level, topic)`: función SQL que agrega N palabras nuevas al azar del catálogo.
- `/api/enrich`: autocompleta traducción (MyMemory) + IPA/artículo (Wiktionary alemán).

## Ampliar el catálogo
Inserta más filas en `words` con `owner = null` (mismo formato que `seed.sql`).

### Cargar contenido con audio (manifiesto JSON)
1. Ejecuta `supabase/2026-001-contenido-audio.sql` en el SQL Editor (crea `numbers`, `units`, el bucket `audio` y las columnas `audio_url`/`category`/`unit`/`price_eur` en `words`).
2. Pide el contenido a la IA usando el prompt de `docs/CONTENT-MANIFEST.md` → te devuelve un JSON con `words`, `numbers` y `units`.
3. Pon los MP3 en `content/audio/{words,numbers,units}/` con el nombre que indica el campo `audio`.
4. Sube todo (audio + filas) con:

```bash
# requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno
node scripts/upload-content.mjs content/manifiesto.json --audio-dir content/audio
# solo validar, sin subir:
node scripts/upload-content.mjs content/manifiesto.json --dry-run
```

El script es idempotente (actualiza, no duplica). Si falta un MP3, la fila se sube igual y suena el TTS de `/api/tts`. Las tablas: `words` (vocabulario), `numbers` (números con su valor numérico), `units` (kilo, gramo, litro…).
