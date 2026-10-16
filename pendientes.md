# Pendientes · Lerne Deutsch

## Hecho (para desmarcar del orden mental)
- ✅ Módulo de Gramática v1: `/grammar` con 12 mini-lecciones (A1.1/A1.2), teoría + cloze con SRS (`supabase/grammar.sql`).
- ✅ Feedback más lento en errores del quiz/artículos y cloze.

## Lo PRIMERO mañana (bloqueante)
- [ ] **Ejecutar `supabase/grammar.sql` en el SQL Editor** (crea grammar_rules/exercises/srs + las 12 lecciones). Sin esto /grammar queda vacío.
- [ ] **Probar el flujo de gramática de punta a punta**: lección → teoría → práctica → fallo se reprograma → barra de progreso sube en /grammar.
- [ ] **Pulir hints/textos de `grammar.sql`**: quedaron varias frases confusas o con español/ainglés mezclado (revisar cada `hint` y los `examples`).

## Funcionalidad
- [ ] **Recordatorio diario (PWA push)** — notificación de la app instalada con tarjetas vencidas. Requiere Push API + endpoint para guardar suscripciones.
- [ ] **Gramática en /stats** — precisión de gramática por lección (reusar quiz_log con quiz_type 'grammar' o el propio grammar_srs).
- [ ] **Estadísticas de escucha (/listen)** — precisión y días seguidos como en el quiz.
- [ ] **Backup/export de mi vocabulario** — exportar agregadas + progreso a CSV/JSON.
- [ ] **Modo inverso en estudio** — ver «colegio → Schule» (es→de), ahora solo de→es.
- [ ] **Tipos de ejercicio mezclados en /study** — significado, artículo, orden de palabras y listening alternados en una misma cola.
- [ ] **Sesión limitada (/study?limit=20)** — no rehacer el tema entero cuando tienes muchas vencidas.
- [ ] **Onboarding: quiz de nivelación** — evaluación inicial A1.1 vs A1.2 vs A2.1 (hoy solo quiz de artículos).
- [ ] **Duplicados por nivel en palabras propias** — el check es por `de` exacto; decidir si bloquear o permitir mismos temas.
- [ ] **Admin del catálogo** — SQL para corregir typos en `es` sin tocar la tabla a mano cada vez.

## Calidad / técnica
- [ ] **Bump de versión del SW (`V = 'lerne-v2'`)** en cada deploy con cambios frontend forzar refresh del shell PWA. Considerar el banner automático «Nueva versión → Recargar».
- [ ] **Linter real** (`eslint` + `eslint-config-next`): el build corre pero `cn` casi sin uso, imports sin limpiar, `articleQuiz.tsx.bak` borrado ya.
- [ ] **Tarjetas con accesibilidad**: focus plegable visible, `aria-live` en la ejectación de calificación, tamaños táctiles ≥44px en calificaciones 1-4.
- [ ] **Supabase**: auditar RLS en tablas nuevas (`saved_words` ya listo, verificar `add_random_words` como SECURITY DEFINER).
- [ ] **Migraciones versionadas** (001, 002…) en vez de seed.sql suelto, para reconstruir el proyecto desde cero.
- [ ] **Tests básicos** para `srs.next()` (SM-2) con Vitest — es la función más crítica y no tiene prueba alguna.
- [ ] **Sustituir el mensaje instantáneo de la cola offline por un indicador persistente** («🔄 2 repasos pendientes de sincronizar») visible en toda la app.
- [ ] **Icono favicon.ico para la pestaña del navegador** (de momento solo hay SVG/PNG del manifest).

## Contenido (catálogo)
- [ ] **A2.1 mínimo para extender más allá de números** — hoy solo tiene 34 palabras, TODO es de números (colapsa si cursas A2 y no a estudiar números).
- [ ] Los temas («preguntas», «pronombres», «dias», «acciones»…) no tienen icono/label — usar `TOPIC_LABEL` en `lib/types.ts` para llenarlos (usa la familia 🗂️ de emojis existente).
- [ ] **Artículos del resto del catálogo** — hay palabras con `article: null` que saque el quiz; decidir si se rellenan (GPT/MyMemory) o se excluyen oficialmente.

## Descartado (no hacer)
- ~~Estudiar contraste 21+ días~~ — ya está en 3+ días para dominada (ajustable en `page.tsx:51` y `StatsPanel.tsx:49`).
