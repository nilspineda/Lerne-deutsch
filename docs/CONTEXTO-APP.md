# 🗺️ Contexto general de la app · LerneDeutsch (Deutsch Karten)

> Documento de referencia para cualquier agente (IA o humano) que trabaje en este repositorio.
> Describe el producto, la arquitectura, el modelo de datos, los flujos de usuario y las reglas
> que **no** se deben romper.
> Última revisión: 2026-11-19.

---

## 1. Qué es

**LerneDeutsch** (nombre interno del paquete: `deutsch-karten`) es una PWA de flashcards de
alemán con **repetición espaciada**, pensada para hispanohablantes en nivel A1–A2.

Autores: **Nils Pineda & Angie Vera**. Uso personal/pequeño círculo, no hay monetización ni
multitenant: cada usuario ve el catálogo global + sus propias palabras.

### Value proposition
1. Estudiar vocabulario con SRS (SM-2 simplificado) en dos pistas: **significado** y **pronunciación**.
2. Practicar **números** (oír → escribir cifra / cifra → elegir palabra) con SRS propio.
3. Studiar **gramática** por mini-lecciones con ejercicios *cloze* y SRS propio.
4. **Escuchar** el alemán real (MP3 propios en Supabase Storage, con TTS de Google como fallback).
5. Instalar como app (PWA) y seguir funcionando **offline** (shell cacheado + cola de repasos local).

### Rutas principales

| Ruta | Qué hace | Componente |
|---|---|---|
| `/` | Home: racha, pendientes, progreso por tema, agregar 15 al azar | `app/page.tsx` + `components/AddRandom.tsx` |
| `/login` | Login / registro (email + password) + aviso de instalación | `app/login/page.tsx` + `components/InstallHint.tsx` |
| `/auth/callback` | Intercambia el `code` de Supabase por sesión | `app/auth/callback/route.ts` |
| `/study?track=meaning\|pron&level=&topic=&saved=1` | Sesión de flashcards SRS | `components/StudySession.tsx` |
| `/words?topic=&level=` | Gestor de palabras: alta manual, agregar al azar, borrar propias | `components/WordsManager.tsx` |
| `/topic?topic=&level=` | Listado de un tema con acceso rápido a estudiar | `app/topic/page.tsx` |
| `/search` | Buscador de traducción con artículo, IPA, ejemplo y conjugación | `components/WordSearch.tsx` |
| `/grammar` | Índice de lecciones de gramática con barra de progreso | `app/grammar/page.tsx` |
| `/grammar/[slug]` | Lección: teoría + práctica cloze con SRS | `components/GrammarLesson.tsx` |
| `/numbers?track=listen\|reverse&category=` | Sesión de números con SRS propio | `components/NumbersSession.tsx` |
| `/listen?level=` | Práctica de oído (dictado de palabras) | `components/ListenSession.tsx` |
| `/quiz` | Quiz der/die/das | `components/ArticlesQuiz.tsx` |
| `/stats` | Progreso, racha, precisión, errores frecuentes | `components/StatsPanel.tsx` |
| `/api/tts?word=&slow=1` | TTS alemán server-side (Google Translate TTS) | `app/api/tts/route.ts` |
| `/api/enrich?word=` | Autocompleta `es` (MyMemory) + `ipa`/`article` (Wiktionary) | `app/api/enrich/route.ts` |

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, RSC + Client Components), React 19, TypeScript 5.9 |
| Estilos | Tailwind CSS 4 (`@import "tailwindcss"`, sin `tailwind.config`), `tw-animate-css`, `lucide-react` para iconos, componentes `components/ui/*` estilo shadcn (Radix + CVA) |
| Backend | Supabase: Auth (email/password, SSR con cookies), Postgres, Storage, RLS |
| PWA | `app/manifest.ts` (MetadataRoute) + `public/sw.js` (service worker manual, sin librerías) |
| Scripts | Node ESM (`.mjs`) para la carga masiva de contenido |

**Variables de entorno** (`.env`, ver `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
MYMEMORY_EMAIL=            # opcional: sube el límite de MyMemory de 5k a 50k car./día
SUPABASE_SERVICE_ROLE_KEY= # solo para scripts/upload-content.mjs (nunca la anon key)
```

**Scripts npm**: `dev`, `build`, `start`, `content:upload` (= `node scripts/upload-content.mjs`).

---

## 3. Estructura de carpetas

```
app/                     Rutas (App Router)
  api/                   Route Handlers: tts, enrich
  auth/callback/         Intercambio de código de OAuth
  login/ study/ words/ topic/ search/ numbers/ grammar/ listen/ quiz/ stats/
  globals.css            Tokens del design system (oklch) + variante .dark
  layout.tsx             Shell: header (logo + navbar + menú usuario), footer, navbar bottom en móvil
  manifest.ts            Manifest PWA
  page.tsx               Home
components/
  ui/                    Button, badge, avatar, dropdown-menu (shadcn-style)
  AddRandom, ArticlesQuiz, GrammarLesson, InstallHint, InstallPrompt, ListenSession,
  Logo, LogoutButton, Navbar, NumbersSession, StatsPanel, StudySession, SwRegister,
  UserMenu, WordSearch, WordsManager
content/
  manifiesto-*.json      Manifiestos de contenido
  audio/{words,numbers,units}/   MP3 (rutas relativas a `content/audio/`)
lib/
  srs.ts                 SM-2 simplificado (núcleo del spaced repetition)
  offlineSrs.ts          Cola de repasos offline en localStorage + flush
  speak.ts               Prioridad de audio (MP3 propio → TTS → speechSynthesis)
  sentences.ts           Banco de frases A1.1 / A1.2 (listen)
  types.ts               Tipos + LEVELS + TOPIC_LABEL
  supabase/client.ts     createBrowserClient
  supabase/server.ts     createServerClient (cookies)
  utils.ts               cn()
middleware.ts            Protege todas las rutas salvo /login, /auth, /api/tts
public/                  icon.svg, icon-192/512.png, apple-touch-icon.png, logo.svg, sw.js
scripts/upload-content.mjs  Valida + sube manifiesto a Supabase
supabase/                SQL (schema, seed, migraciones, contenido)
docs/                    Documentación (este archivo, CONTENT-MANIFEST.md)
```

---

## 4. Modelo de datos (Supabase / Postgres)

Todas las tablas tienen RLS habilitado. Convención clave:
**`owner = null` ⇒ fila del catálogo global (visible para todos). `owner = auth.uid()` ⇒ fila privada del usuario.**

### 4.1 `words` — catálogo de vocabulario (`supabase/schema.sql`)
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `owner` | uuid FK→auth.users | `null` = catálogo global |
| `de` | text NOT NULL | palabra **sin artículo** (`Apfel`, no `der Apfel`) |
| `article` | text | check `der|die|das`, nullable |
| `es` | text NOT NULL | traducción |
| `ipa` | text | alfabeto fonético internacional |
| `respell` | text | pronunciación "a la española" (`ap-fel`) |
| `example` | text | frase de ejemplo en alemán |
| `topic` | text NOT NULL default `'personal'` | ver `TOPIC_LABEL` en `lib/types.ts` |
| `level` | text NOT NULL default `'A1.1'` | `A1.1 / A1.2 / A2.1 / A2.2` |
| `created_at` | timestamptz | |
| `audio_url` | text | *(migración 2026-001)* URL pública en Storage |
| `category` | text | *(2026-001)* subcategoría: `fruta`, `verdura`, `carne`, `lacteo`, `panaderia`, `bebida`, `limpieza` |
| `unit` | text | *(2026-001)* unidad de compra: `kg`, `g`, `l`, `Stück`, `Packung` |
| `price_eur` | numeric(8,2) | *(2026-001)* precio orientativo |
| `conj` | jsonb | *(verbos-praesens.sql)* `[ich, du, er/sie/es, wir, ihr, sie/Sie]` |
| `verb_type` | text | *(verbos-praesens.sql)* `regular|irregular` |
| `stem_change` | text | *(verbos-praesens.sql)* `e→i`, `a→ä`, `au→äu`, `ehm→imm` |
| `verb_note` | text | *(verbos-praesens.sql)* nota del verbo |

Restricción: `unique nulls not distinct (owner, de)`.
RLS: ver catálogo + propias (select); crear/editar/borrar solo propias.

### 4.2 `user_cards` — cola SRS de vocabulario
Una fila por **(user, palabra, pista)**. `track ∈ {meaning, pron}`.
Columnas SRS: `due`, `interval_days`, `ease` (4,2), `reps`, `lapses`, `last_reviewed`.
PK: `(user_id, word_id, track)`. Índice `user_cards_due_idx (user_id, track, due)`.

### 4.3 `review_log` — historial de repasos
`user_id`, `word_id`, `track`, `rating` (0–3), `reviewed_at`. Alimenta estadísticas y racha.

### 4.4 `numbers` — números (`supabase/2026-001-contenido-audio.sql`)
`owner`, **`value` numeric NOT NULL** (la cifra: 21, 21.5), `de` (en letras), `es`, `category`
(`cardinal|ordinal|decimal|fraction|percentage|money|time`), `ipa`, `respell`, `example`,
`audio_url`, `level` (default A1.2), `created_at`.

### 4.5 `units` — medidas y unidades
`de` (UNIQUE, sin artículo), `es`, `symbol`, `dimension`
(`peso|volumen|longitud|tiempo|cantidad|moneda`), `plural_de` (aquí sí con artículo),
`ipa`, `respell`, `example`, `audio_url`, `level`. **Solo lectura** para el cliente (RLS de insert/update/delete = `false`).

### 4.6 `number_cards` / `number_review_log` — SRS de números
`number_cards`: PK `(user_id, number_id, track)`, `track ∈ {listen, reverse}`.
`number_review_log`: `rating` 0–3 + `reviewed_at`.

### 4.7 `grammar_rules` / `grammar_exercises` / `grammar_srs` — gramática (`supabase/grammar.sql`)
- `grammar_rules`: `slug` (unique), `level`, `order_idx`, `title`, `body`, `examples` (jsonb).
- `grammar_exercises`: `rule_id` FK, `sentence`, `options` (text[]), `answer`, `hint`. `unique(rule_id, sentence)`.
- `grammar_srs`: PK `(user_id, exercise_id)`, mismas columnas SRS.
Contenido: 12 mini-lecciones en `grammar.sql` + 5 lecciones de verbos en `grammar-verbos.sql`.

### 4.8 `saved_words` — favoritos (`supabase/saved-words.sql`)
PK `(user_id, word_id)`, `saved_at`. Alimenta "Repasar mis palabras guardadas".

### 4.9 `quiz_log` — resultados del quiz (`supabase/quiz-migration.sql`)
`user_id`, `word_id`, `quiz_type` (default `artikel`), `correct`, `answered_at`.

### 4.10 Funciones SQL
| Función | Devuelve | Nota |
|---|---|---|
| `add_random_words(p_n, p_level, p_topic)` | int (palabras agregadas) | `security invoker`; crea las 2 pistas por palabra; ignora las que ya tienes |
| `add_random_numbers(p_n, p_category, p_track)` | int | idem para `numbers` |

### 4.11 Storage
Bucket público **`audio`** (creado por la migración 2026-001). URL pública:
`{SUPABASE_URL}/storage/v1/object/public/audio/{ruta}`.

### 4.12 Orden de ejecución de los SQL (reconstruir desde cero)
1. `supabase/schema.sql` (words, user_cards, review_log, RLS, `add_random_words`)
2. `supabase/2026-001-contenido-audio.sql` (numbers, units, number_cards, bucket `audio`, columnas de contenido)
3. `supabase/grammar.sql` (tablas de gramática + 12 lecciones)
4. `supabase/grammar-verbos.sql` (5 lecciones de verbos)
5. `supabase/verbos-praesens.sql` (columnas de verbo + ~110 verbos)
6. `supabase/saved-words.sql`, `supabase/quiz-migration.sql`, `supabase/indexes.sql`
7. `supabase/seed.sql` (vocabulario base), `supabase/numeros-completos.sql` (144 números)

Todos los scripts son **idempotentes** (`create table if not exists`, `create or replace`).

---

## 5. Sistema de repetición espaciada

Implementado en `lib/srs.ts` (`next(s, q)` y `preview(s, q)`), usado por `user_cards`,
`number_cards` y `grammar_srs`.

**Calificación `q`**: `0` otra vez · `1` difícil · `2` bien · `3` fácil.

```
q = 0 → reps=0, lapses++, interval=0, ease = max(1.3, ease-0.2), due = ahora + 10 min
q > 0 → reps++
         reps=1 → interval = (q==3 ? 4 : 1) días
         reps=2 → interval = (q==3 ? 7 : 3) días
         reps≥3 → interval = max(interval+1, round(interval * ease * mult))
                   mult = 0.8 (q=1) | 1.3 (q=3) | 1 (q=2)
         ease = max(1.3, ease-0.15) si q=1 ; ease += 0.15 si q=3
         due = ahora + interval días
```

**"Dominada"** = `interval_days >= 3` (constante usada en `app/page.tsx` y `components/StatsPanel.tsx`).

> ⚠️ `lib/srs.ts` es la función más crítica de la app y **no tiene tests** (ver pendientes).

### Cola offline (`lib/offlineSrs.ts`)
Si un repaso no se puede guardar (sin red), se guarda en `localStorage` bajo
`lerne.pending_ratings` (última calificación por `word_id|track`) y se sincroniza con
`flushPending()` al volver la red o al abrir la app.

---

## 6. Audio: prioridad y fallbacks

`lib/speak.ts` — `speak(text, slow, audioUrl?)`:

1. **MP3 propio** del bucket `audio` (`audio_url`) → prioridad absoluta.
2. **`/api/tts`** (Google Translate TTS, `de`, velocidad `slow=1` → `ttsspeed=0.3`) con caché
   en memoria (blob URLs) y anti-duplicado de la misma palabra en 1,2 s.
3. **`speechSynthesis`** local con voz `de-DE` (rate 0.8 / 0.5 lento) como último recurso.

`/api/tts` tiene: runtime `nodejs`, rate-limit en memoria de **30 peticiones/min por IP**,
validación de caracteres con regex, longitud máx. 200 y `revalidate: 86400`.

`stopSpeak()` pausa el audio remoto y cancela `speechSynthesis` (usar como cleanup al desmontar).

---

## 7. Autenticación y autorización

- Supabase Auth con email + password. `/login` tiene dos modos (in / up) y `emailRedirectTo` → `/auth/callback`.
- `middleware.ts`: todo ruta protegida salvo `/login`, `/auth*` y `/api/tts`. Sin sesión → redirect a `/login`.
  Con sesión en `/login` → redirect a `/`. Matcher excluye `_next/static`, `_next/image`, `favicon.ico`.
- `app/layout.tsx` solo muestra header/navbar/footer si hay `user`.
- El cliente usa la **anon key**; el RLS de Postgres es la barrera real. La `service_role` solo la
  usa el script de carga masiva.

---

## 8. Design system

Tokens en `app/globals.css` (Tailwind 4, variables CSS en `oklch`, variante `dark` con
`@custom-variant dark (&:is(.dark *))`). El `<html>` tiene `className="dark"` ⇒ **la app es oscura por defecto**.

- Superficies: `bg-stone-50` (claro) / `dark:bg-neutral-950`; tarjetas `bg-white` / `dark:bg-neutral-900`.
- Bordes: `border-stone-200` / `dark:border-neutral-800`.
- Acento de marca: **rojo** (`bg-red-600`) para acciones principales y estados activos del navbar.
  Azul = A1.1, púrpura = A2.1, esmeralda = números.
- Radios: `--radius: 0.625rem`; cajas típicas `rounded-xl` / `rounded-2xl`.
- Layout: `max-w-xl` en móvil, `md:max-w-3xl` en escritorio. Navbar **inferior fijo en móvil** (`md:hidden`),
  navbar en header en escritorio. Padding inferior extra (`pb-28`) para que la navbar no tape contenido.
- Iconos: `lucide-react`. Logo: `components/Logo.tsx` (SVG inline, sin recuadro blanco).
- Componentes `components/ui/*`: shadcn-style (Radix + CVA + `cn()` de `lib/utils.ts`).

---

## 9. Carga de contenido (la parte más importante para añadir material)

### 9.1 Flujo
```
content/manifiesto.json  ──►  scripts/upload-content.mjs  ──►  Supabase (words/numbers/units)
content/audio/**.mp3    ──►  scripts/upload-content.mjs  ──►  bucket Storage "audio"
```

### 9.2 Estructura del manifiesto
Tres listas y una clave `meta`:
```jsonc
{
  "meta":    { "batch": "lote-2026-01", "level": "A1.2", "source": "IA", "notes": "..." },
  "words":   [ ... ],   // → words   (owner = null)
  "numbers": [ ... ],   // → numbers
  "units":   [ ... ]    // → units
}
```
Especificación campo a campo: **`docs/CONTENT-MANIFEST.md`**.
Plantilla lista para copiar: **`content/ejemplo-manifiesto.json`**.

Reglas que el script valida y que **deben respetarse siempre**:
- `de` **nunca** lleva artículo (`der Apfel` → `article: "der"`, `de: "Apfel"`).
- En `numbers`, `de` va **en letras** (`einundzwanzig`) y `value` lleva la cifra (21).
- `level` ∈ `A1.1 | A1.2 | A2.1 | A2.2`.
- `words.category` ∈ `fruta|verdura|carne|lacteo|panaderia|bebida|limpieza|Marquezine`.
- `numbers.category` ∈ `cardinal|ordinal|decimal|fraction|percentage|money|time`.
- `units.dimension` ∈ `peso|volumen|longitud|tiempo|cantidad|moneda`.
- Sin `de` duplicados dentro de una misma lista.
- `audio` es una ruta **relativa a `content/audio/`**: `words/apfel.mp3`, `numbers/einundzwanzig.mp3`,
  `units/kilogramm.mp3`. Slug ASCII minúsculas (sin acentos, `ß`→`ss`, espacios→`_`).
  Si se omite, el script lo deduce. Si el archivo no existe → la fila se sube igual y suena el TTS.

### 9.3 Comandos
```bash
# validar sin subir
node scripts/upload-content.mjs content/manifiesto.json --dry-run

# subir (audio + filas)
node scripts/upload-content.mjs content/manifiesto.json --audio-dir content/audio

# solo una lista
node scripts/upload-content.mjs content/manifiesto.json --only words
```
Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el entorno.

### 9.4 Qué hace el script (por fases)
1. **Valida**: campos obligatorios, artículo, nivel, categorías, duplicados, formato de audio.
   Si hay errores → sale con código 1 y no sube nada.
2. **Sube el audio** al bucket `audio` (`upsert: true`), con `contentType` según extensión.
   Genera la URL pública y la guarda en `audio_url`.
3. **Sincroniza filas** por clave lógica `de`: lee los ids existentes en el catálogo
   (`owner is null`) → los que existen van a `upsert(onConflict: 'id')`, los nuevos a `insert`.
   Lotes de 200 filas por petición.
4. Es **idempotente**: volver a subir el mismo manifiesto actualiza, no duplica.

> Nota: el script solo sincroniza el catálogo **global** (`owner = null`). Las palabras propias que
> crea la app (`owner = auth.uid()`) no se tocan.

### 9.5 Alta manual desde la app
`components/WordsManager.tsx` → insert en `words` con `owner` del usuario + 2 filas en `user_cards`.
El botón "✨ Auto" llama a `/api/enrich` (MyMemory para `es`, Wiktionary para `ipa` y `article`).
El botón "🎲 Agregar 5/10 al azar" llama a la RPC `add_random_words`.

### 9.6 Proceso recomendado para contenido nuevo
1. Ejecutar `supabase/2026-001-contenido-audio.sql` si es la primera vez (crea bucket + tablas).
2. Pegar el prompt de `docs/CONTENT-MANIFEST.md` a una IA y pedir el JSON.
3. Guardar el JSON en `content/manifiesto-<lote>.json`.
4. Poner los MP3 en `content/audio/{words,numbers,units}/` con los nombres exactos del campo `audio`.
5. `--dry-run` y luego subir.
6. Verificar en la app que las palabras aparecen en `/words` y se pueden agregar.

---

## 10. PWA

- `app/manifest.ts`: `display: standalone`, `theme_color: #1c1917`, iconos 192/512 + maskable.
- `public/sw.js`: service worker **manual**, sin librerías. Versión `V = 'lerne-v3'`.
  Cachea el *shell* (`/`, iconos, logo, manifest) y los estáticos con cache-first;
  para navegaciones usa network con fallback al shell cacheado. **No cachea `/api/*`**:
  el contenido vive en la red.
- `components/SwRegister.tsx` registra el SW en el cliente.
- `components/InstallPrompt.tsx` (banner de instalación) e `components/InstallHint.tsx`
  (en `/login`, con instrucciones por plataforma: Safari iOS, Chrome Android, PC).

> Al desplegar cambios de frontend, **subir la versión del SW** (`V = 'lerne-v4'`, etc.) para
  forzar el refresh del shell en los clientes instalados.

---

## 11. Convenciones de código

- **TypeScript estricto**, alias `@/` → raíz del proyecto.
- Server Components por defecto; `'use client'` solo donde hay estado/efectos (`components/*Session.tsx`,
  `components/WordSearch.tsx`, etc.).
- Los datos se leen en el servidor con `createClient()` de `@/lib/supabase/server` (cookies) y se
  escriben desde el cliente con `supabase()` de `@/lib/supabase/client`.
- **Consultas con join implícito** en Supabase: `sb.from('user_cards').select('*, words!inner(*)')`.
- Estilos: Tailwind inline, sin CSS modules. Colores `stone`/`neutral` para superficie, `red` como acento.
- Componentes de UI en `components/ui/` (shadcn-style); los componentes de negocio viven en `components/`.
- Idioma de la UI: **español**. Idioma del contenido: alemán (`de`) + español (`es`).
- Comentarios y textos del código en español.
- Emojis como iconografía auxiliar: `📖` significado, `🔊` pronunciación, `🔢` números, `📚` gramática,
  `⭐` palabras propias, `🎧`/`🔢` pistas de números, `🐢` pronunciación lenta.

---

## 12. Estado actual y pendientes

Resumen de `pendientes.md` (fuente de verdad). Lo relevante:

**Bloqueantes para contenido nuevo**
- [ ] Crear `SUPABASE_SERVICE_ROLE_KEY` en `.env` para poder ejecutar `npm run content:upload`.
- [ ] Subir el primer manifiesto generado por IA (`content/manifiesto.json`).
- [ ] Rellenar `audio_url` de los 144 números existentes (ya están en `public.numbers`) re-ejecutando
      `npm run content:upload content/manifiesto-numeros.json` con los MP3 en `content/audio/numbers/`.
- [ ] UI de unidades: pantalla de estudio con la tabla `units` (pendiente, reutilizando el patrón de `/numbers`).

**Funcionalidad**
Recordatorio diario con push (PWA), gramática en `/stats`, estadísticas de `/listen`,
exportar/backup del vocabulario a CSV/JSON, modo inverso en `/study` (es→de),
tipos de ejercicio mezclados, sesión limitada (`/study?limit=20`),
onboarding con quiz de nivelación, admin del catálogo.

**Calidad / técnica**
- [ ] **Tests para `srs.next()`** (Vitest) — es la función más crítica y no tiene ninguno.
- [ ] Linter real (`eslint` + `eslint-config-next`) — hoy el build corre sin lint.
- [ ] Migraciones versionadas (001, 002…) en vez de `seed.sql` suelto.
- [ ] Accesibilidad: focus visible en tarjetas plegables, `aria-live` en la calificación,
  objetivos táctiles ≥44 px.
- [ ] Auditar RLS de las tablas nuevas; revisar `add_random_words` como `SECURITY DEFINER`.
- [ ] Indicador persistente de repasos pendientes de sincronizar (hoy solo un aviso instantáneo).
- [ ] Favicon `.ico` para la pestaña del navegador.

**Contenido**
- [ ] A2.1 real: hoy solo hay 34 palabras y todas son de números (colapsa al cursar A2).
- [ ] Rellenar `article` de las palabras del catálogo que lo tienen a `null`.
- [ ] Añadir `TOPIC_LABEL` para los temas sin icono/label.

---

## 13. Reglas de oro para agentes que trabajen en este repo

1. **No cambies el modelo mental**: `owner = null` es catálogo global; el usuario solo escribe en sus propias filas.
2. **El contenido entra por el manifiesto JSON**, no a mano en la base. Editar `words` a mano rompe la
   trazabilidad y el upsert idempotente.
3. **Respeta el SRF de campos**: artículo separado, `de` sin artículo, números en letras + `value` numérica,
   niveles cerrados, categorías cerradas.
4. **No toques `lib/srs.ts` sin tests**: es el algoritmo de spaced repetition y afecta a todos los usuarios.
5. **Cambia la versión del SW** (`public/sw.js`, `const V = 'lerne-vN'`) cuando despliegues cambios de frontend.
6. **El audio es una cascada**: MP3 propio → `/api/tts` → `speechSynthesis`. No la rompas.
7. **Respeta el rate-limit** de `/api/tts` (30/min por IP) si añades llamadas masivas.
8. **SQL siempre en `supabase/` y con nombre versionado** (`2026-00X-descripcion.sql`), idempotente
   (`if not exists` / `or replace`), y anotado en `pendientes.md` si requiere ejecución manual.
9. **UI en español, contenido en alemán/español**: no introduzcas texto en inglés.
10. **Documenta lo que cambies** en `pendientes.md` (sección "Hecho") para no repetir trabajo.
