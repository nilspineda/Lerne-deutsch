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
- `add_random_words(n, level, topic)`: función SQL que agrega N palabras nuevas al azar del catálogo.
- `/api/enrich`: autocompleta traducción (MyMemory) + IPA/artículo (Wiktionary alemán).

## Ampliar el catálogo
Inserta más filas en `words` con `owner = null` (mismo formato que `seed.sql`).
