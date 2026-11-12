# 📦 Estructura de contenido (manifiesto JSON) → Supabase

Este documento define **el formato exacto** que debes darme (a mí o a cualquier IA)
para que suba contenido a Supabase sin preguntar nada más.

El paquete tiene **tres listas** y **una sola clave `meta`**:

```jsonc
{
  "meta":   { ... },   // info del lote (opcional pero recomendada)
  "words":   [ ... ],  // vocabulario: frutas, verduras, supermercado, palabras…
  "numbers": [ ... ],  // números: cardinales, ordinales, decimales
  "units":   [ ... ]   // medidas: kilo, gramo, litro, metro, pieza…
}
```

Todo el contenido se sube con:

```bash
node scripts/upload-content.mjs content/manifiesto.json --audio-dir content/audio
```

- Idempotente: se puede volver a subir el mismo manifiesto sin duplicar.
- Si falta un archivo de audio, la fila se sube igual y usa el TTS existente (`/api/tts`).
- Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el entorno.

---

## 1. `meta`

```jsonc
"meta": {
  "batch": "numeros-2026-01",     // id del lote (libre, para trazabilidad)
  "level": "A1.2",                // nivel por defecto de las filas que no lo traigan
  "source": "IA / manual",        // de dónde salió el contenido
  "notes": "números 0-1000 + ordinales 1-30"  // texto libre
}
```

Niveles válidos: `A1.1`, `A1.2`, `A2.1`, `A2.2`.

---

## 2. `words` — vocabulario

Va a la tabla `public.words` (`owner = null` → catálogo global).

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `de` | string | ✅ | Palabra **sin artículo**: `"Apfel"`, no `"der Apfel"` |
| `es` | string | ✅ | Traducción al español |
| `article` | `"der"\|"die"\|"das"` | ➖ | `null` si no aplica (números, verbos) |
| `ipa` | string | ➖ | Alfabeto fonético, ej. `"ˈapfl̩"` |
| `respell` | string | ➖ | Pronunciación "a la española": `"ap-fel"` |
| `example` | string | ➖ | Frase corta con la palabra: `"Ich kaufe einen Apfel."` |
| `topic` | string | ➖ | `frutas`, `verduras`, `supermercado`, `medidas`, `numeros`… (default `personal`) |
| `category` | string | ➖ | Subcategoría: `fruta`, `verdura`, `carne`, `lacteo`, `panaderia`, `bebida`, `limpieza` |
| `unit` | string | ➖ | Unidad de compra: `kg`, `g`, `l`, `Stück`, `Packung` |
| `price_eur` | number | ➖ | Precio orientativo: `2.5` |
| `level` | string | ➖ | `A1.1`…`A2.2` (default: `meta.level`) |
| `audio` | string | ➖ | Ruta del audio **dentro de la carpeta de audio**: `"words/apfel.mp3"` |

```json
{
  "de": "Apfel", "article": "der", "es": "manzana", "ipa": "ˈapfl̩", "respell": "ap-fel",
  "example": "Ich kaufe einen Apfel.", "topic": "frutas", "category": "fruta",
  "unit": "Stück", "price_eur": 1.2, "level": "A1.1", "audio": "words/apfel.mp3"
}
```

Si omites `audio`, el script lo deduce: `words/{slug}.mp3` (slug en ASCII minúsculas, sin acentos, `ß`→`ss`, espacios→`_`).

---

## 3. `numbers` — números

Va a la tabla `public.numbers`. Aquí **el valor numérico es la clave**: sirve para
preguntar «¿qué número has oído?» y comprobar la respuesta con una cifra.

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `value` | number | ✅ | El número: `21`, `21.5`, `3.14` |
| `de` | string | ✅ | **Escrito en letras**: `"einundzwanzig"` (nunca `"21"`) |
| `es` | string | ✅ | `"veintiuno"` |
| `category` | string | ➖ | `cardinal` (def.), `ordinal`, `decimal`, `fraction`, `percentage`, `money`, `time` |
| `ipa` | string | ➖ | `"aɪ̯nʊntˈtsvaːntyɪç"` |
| `respell` | string | ➖ | `"ein-unt-tsvan-tsig"` |
| `example` | string | ➖ | `"Die Rechnung beträgt einundzwanzig Euro."` |
| `level` | string | ➖ | default `A1.2` |
| `audio` | string | ➖ | `"numbers/einundzwanzig.mp3"` |

```json
{
  "value": 21, "de": "einundzwanzig", "es": "veintiuno (21)", "category": "cardinal",
  "ipa": "aɪ̯nʊntˈtsvaːntyɪç", "respell": "ein-unt-tsvan-tsig",
  "example": "ein + und + zwanzig", "level": "A1.2", "audio": "numbers/einundzwanzig.mp3"
}
```

**Reglas clave para los ordinales:** `value` = el número cardinal (1 → `"erste"`, 3 → `"dritte"`),
`category` = `"ordinal"`, `de` = `"erste"` / `"der erste"`… (**sin artículo**, sin `de.`).

---

## 4. `units` — medidas y unidades

Va a la tabla `public.units`.

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `de` | string | ✅ | Unidad **sin artículo**: `"Kilogramm"` |
| `es` | string | ✅ | `"kilogramo"` |
| `symbol` | string | ➖ | `"kg"`, `"g"`, `"l"`, `"ml"`, `"m"`, `"cm"`, `"Stück"` |
| `dimension` | string | ➖ | `peso`, `volumen`, `longitud`, `tiempo`, `cantidad`, `moneda` |
| `plural_de` | string | ➖ | `"die Kilogramme"` (aquí sí con artículo) |
| `ipa` / `respell` / `example` | string | ➖ | Igual que en `words` |
| `level` | string | ➖ | default `A1.1` |
| `audio` | string | ➖ | `"units/kilogramm.mp3"` |

```json
{
  "de": "Kilogramm", "es": "kilogramo", "symbol": "kg", "dimension": "peso",
  "plural_de": "die Kilogramme", "example": "Ein Kilogramm Äpfel, bitte.",
  "level": "A1.1", "audio": "units/kilogramm.mp3"
}
```

---

## 5. Audio

- Carpeta por defecto: `content/audio/`.
- Estructura recomendada: `content/audio/words/…`, `content/audio/numbers/…`, `content/audio/units/…`.
- Formatos: `.mp3` (preferido), `.m4a`, `.ogg`, `.wav`.
- El `audio` del manifiesto es la ruta **relativa a la carpeta de audio**.
- Se sube al bucket `audio` (público). La URL final queda en la columna `audio_url`.
- Si el archivo no existe → aviso, la fila se sube sin audio y suena el TTS.

---

## 6. 🤖 Prompt listo para la IA

Copia este bloque, pega tu manifiesto y pídele el JSON:

```text
Eres profesor de alemán para hispanohablantes (nivel A1.2).
Devuelve SOLO un JSON válido (sin markdown, sin comentarios) con esta estructura:

{
  "meta": { "batch": "<nombre del lote>", "level": "A1.2" },
  "words":   [ { "de", "article", "es", "ipa", "respell", "example", "topic", "category", "unit", "price_eur", "level", "audio" } ],
  "numbers": [ { "value", "de", "es", "category", "ipa", "respell", "example", "level", "audio" } ],
  "units":   [ { "de", "es", "symbol", "dimension", "plural_de", "ipa", "respell", "example", "level", "audio" } ]
}

Reglas obligatorias:
- "de" NUNCA lleva artículo (el artículo va en "article"). En "units" el "de" tampoco.
- "de" de un número va escrito en letras ("einundzwanzig"), y "value" lleva la cifra (21).
- "ipa" en alfabeto fonético internacional; "respell" como se oye en español.
- "example": una frase corta y natural en alemán con la palabra.
- "audio": "words/{slug}.mp3", "numbers/{slug}.mp3" o "units/{slug}.mp3"
  con slug en ASCII minúsculas (apfel, einundzwanzig, kilogramm).
- "level" solo puede ser A1.1, A1.2, A2.1 o A2.2.
- "category" de words: fruta, verdura, carne, lacteo, panaderia, bebida, limpieza, Marquezine.
- "dimension" de units: peso, volumen, longitud, tiempo, cantidad, moneda.
- No inventes campos, no repitas filas.

Contenido que quiero ahora:
1) NÚMEROS: cardinales del 0 al 100, del 200 al 1000 (saltando los que ya están),
   ordinales del 1 al 30, y decimales 0,5 / 1,5 / 2,5 / 3,75 (drei Komma fünf …).
2) FRUTAS: 30 palabras (manzana, plátano, naranja…) con artículo, categoría "fruta" y precio en euros.
3) VERDURAS: 30 palabras con artículo, categoría "verdura" y precio en euros.
4) SUPERMERCADO: 40 palabras de carne, panadería, lácteos, bebidas y limpieza,
   con "unit" (kg, g, l, Stück, Packung) y "price_eur".
5) MEDIDAS: 20 unidades (peso, volumen, longitud, cantidad, dinero) con símbolo y plural.
```

---

## 7. Checklist antes de subir

- [ ] Ejecutaste `supabase/2026-001-contenido-audio.sql` en el SQL Editor.
- [ ] El bucket `audio` existe (lo crea la migración).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está en el entorno.
- [ ] El JSON parsea (valida el script).
- [ ] Los nombres de los archivos de audio coinciden con el campo `audio`.
- [ ] `de` no lleva artículo.
