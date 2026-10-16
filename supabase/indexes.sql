-- ============ Índices de rendimiento (ejecutar UNA VEZ en SQL Editor) ============

-- catálogo: filtros por nivel/tema en home, /words y /quiz
create index if not exists words_level_topic_idx on public.words (level, topic) where owner is null;

-- palabras propias del usuario
create index if not exists words_owner_idx on public.words (owner);

-- búsqueda de catálogo por texto (ilike) si /words crece
create index if not exists words_de_lower_idx on public.words (lower(de));

-- colita: cola por fecha vencida ya usa user_cards_due_idx (user_id, track, due), ok.
