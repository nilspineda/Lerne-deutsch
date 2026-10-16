-- ============ MÃ³dulo de GramÃ¡tica: mini-lecciones + ejercicios cloze con SRS (idempotente) ============
-- Ejecutar TODO el bloque en Supabase SQL Editor.

-- ---------- 1) Tablas ----------
create table if not exists public.grammar_rules (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  level       text not null,
  order_idx   int  not null default 0,
  title       text not null,
  body        text not null,
  examples    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists grammar_rules_level_idx on public.grammar_rules (level, order_idx);

create table if not exists public.grammar_exercises (
  id         bigint generated always as identity primary key,
  rule_id    bigint not null references public.grammar_rules(id) on delete cascade,
  sentence   text not null,
  options    text[] not null,
  answer     text not null,
  hint       text,
  unique (rule_id, sentence)
);
create index if not exists grammar_exercises_rule_idx on public.grammar_exercises (rule_id);

create table if not exists public.grammar_srs (
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id   bigint not null references public.grammar_exercises(id) on delete cascade,
  due           timestamptz not null default now(),
  interval_days int not null default 0,
  ease          numeric(4,2) not null default 2.5,
  reps          int not null default 0,
  lapses        int not null default 0,
  last_reviewed timestamptz,
  primary key (user_id, exercise_id)
);
create index if not exists grammar_srs_due_idx on public.grammar_srs (user_id, due);

alter table public.grammar_rules     enable row level security;
alter table public.grammar_exercises enable row level security;
alter table public.grammar_srs       enable row level security;

drop policy if exists "grammar_rules: leer por autenticados"     on public.grammar_rules;
drop policy if exists "grammar_exercises: leer por autenticados" on public.grammar_exercises;
drop policy if exists "grammar_srs: todo lo propio"              on public.grammar_srs;
create policy "grammar_rules: leer por autenticados"     on public.grammar_rules     for select to authenticated using (true);
create policy "grammar_exercises: leer por autenticados" on public.grammar_exercises for select to authenticated using (true);
create policy "grammar_srs: todo lo propio"              on public.grammar_srs       for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 2) Lecciones ----------
insert into public.grammar_rules (slug, level, order_idx, title, body, examples) values
('articulos', 'A1.1', 1, 'Los artÃ­culos: der / die / das',
  'Todo sustantivo alemÃ¡n tiene un gÃ©nero: masculino (der), femenino (die) o neutro (das). El artÃ­culo va SIEMPRE con la palabra: aprende "die Schule", no "Schule".
Pistas frecuentes:
â€¢ -ung, -heit, -keit, -schaft, -tion â†’ DIE (die Zeitung, die Freiheit)
â€¢ -chen, -lein â†’ DAS (das MÃ¤dchen)
â€¢ dÃ­as, meses, estaciones â†’ DER (der Montag, der Sommer)
â€¢ -er de aparatos y verbos sustantivados â†’ DER o DAS, hay que memorizarlos.
Truco: practica siempre "palabra = artÃ­culo".',
  '[{"de":"Der Tag","es":"el dÃ­a (masc.)"},{"de":"Die Zeitung","es":"el periÃ³dico (fem. por -ung)"},{"de":"Das MÃ¤dchen","es":"la niÃ±a (neutro por -chen)"},{"de":"Der Montag","es":"el lunes (los dÃ­as son der)"}]'::jsonb),

('sein-haben', 'A1.1', 2, 'sein y haben',
  'Los dos verbos mÃ¡s importantes, irregulares. MemorÃ­zalos conjugados:
sein: ich bin Â· du bist Â· er ist Â· wir sind Â· ihr seid Â· sie sind
haben: ich habe Â· du hast Â· er hat Â· wir haben Â· ihr habt Â· sie haben
Uso:
â€¢ sein + adjetivo: Ich bin mÃ¼de. (Estoy cansado.)
â€¢ haben + nombre: Ich habe Zeit. (Tengo tiempo.)
Â¡Cuidado con "Ich bin kalt" = tengo frÃ­o corporal; para "me da frÃ­o" se dice: Mir ist kalt. (Dativo â€” lecciÃ³n de A1.2.)',
  '[{"de":"Ich bin mÃ¼de.","es":"Estoy cansado."},{"de":"Du bist nett.","es":"Eres amable."},{"de":"Er hat ein Auto.","es":"Ã‰l tiene un coche."},{"de":"Wir haben keine Zeit.","es":"No tenemos tiempo."}]'::jsonb),

('praesens', 'A1.1', 3, 'Presente: verbos regulares',
  'Quita la terminaciÃ³n -en del infinitivo y aÃ±ade:
ich -e Â· du -st Â· er -t Â· wir -en Â· ihr -t Â· sie -en
spielen â†’ ich spiele, du spielst, er spielt, wir spielen, ihr spielt, sie spielen.
OrtografÃ­a: si la raÃ­z acaba en -t/-d, du aÃ±ade -e: arbeiten â†’ du arbeitest.
Con e en la raÃ­z (lesen): du liest, er liest (e â†’ ie en du/er).',
  '[{"de":"Ich lerne Deutsch.","es":"Aprendo alemÃ¡n."},{"de":"Du wohnst in KÃ¶ln.","es":"Vives en Colonia."},{"de":"Er arbeitet viel.","es":"Ã‰l trabaja mucho."},{"de":"Wir hÃ¶ren Musik.","es":"Escuchamos mÃºsica."}]'::jsonb),

('w-fragen', 'A1.1', 4, 'Preguntas: W-Fragen y sÃ­/no',
  'W-Fragen: van al principio y detrÃ¡s va el VERBO en 2Âª posiciÃ³n:
Wo wohnst du? Â· Was machst du? Â· Wann beginnt der Film? Â· Wie heiÃŸt du? Â· Wer ist das? Â· Warum lernst du Deutsch?
Preguntas de sÃ­/no: el verbo va en PRIMERA posiciÃ³n:
Bist du mÃ¼de? Â· Hast du Zeit?',
  '[{"de":"Wo wohnst du?","es":"Â¿DÃ³nde vives?"},{"de":"Was machst du?","es":"Â¿QuÃ© haces?"},{"de":"Wann beginnt der Film?","es":"Â¿CuÃ¡ndo empieza la pelÃ­cula?"},{"de":"Bist du mÃ¼de?","es":"Â¿EstÃ¡s cansado? (verbo primero)"}]'::jsonb),

('negacion', 'A1.1', 5, 'NegaciÃ³n: nicht y kein',
  'Dos negaciones, cada una para su terreno:
â€¢ KEIN (keine, keinenâ€¦) niega NOMBRES con artÃ­culo indefinido o sin artÃ­culo: Ich habe kein Auto. / Kein Problem!
â€¢ NICHT niega todo lo demÃ¡s (verbos, adjetivos, adverbios, nombres con artÃ­culo determinado) y va lo mÃ¡s tarde posible: Ich schlafe nicht. / Das Auto ist nicht neu. / Das ist nicht mein Buch.
Truco: Â¿cuenta cosas (ein, alguno)? â†’ kein. Â¿El resto? â†’ nicht.',
  '[{"de":"Ich habe kein Auto.","es":"No tengo coche (nombre indefinido)."},{"de":"Das ist nicht neu.","es":"Eso no es nuevo (adjetivo)."},{"de":"Er kommt nicht.","es":"Ã‰l no viene (verbo)."},{"de":"Kein Problem!","es":"Â¡Sin problema!"}]'::jsonb),

('plural', 'A1.1', 6, 'El plural',
  'El plural depende de cada palabra (aprÃ©ndelo con la palabra), pero hay patrones:
â€¢ -(e)n: la mayorÃ­a de femeninas: die Frau â†’ die Frauen
â€¢ -e (Â± umlaut): der Tisch â†’ die Tische, der Apfel â†’ die Ã„pfel
â€¢ -er (Â± umlaut): das Kind â†’ die Kinder, der Mann â†’ die MÃ¤nner
â€¢ -s: extranjeros y -er aparatos: das Auto â†’ die Autos
â€¢ sin cambio: das Zimmer â†’ die Zimmer
OJO: TODOS los plurales de nominativo/acusativo llevan articulo DIE, aunque el singular sea der o das:
die Autos, die Kinder.',
  '[{"de":"die Tische","es":"las mesas (der Tisch â†’ -e)"},{"de":"die Frauen","es":"las mujeres (die Frau â†’ -en)"},{"de":"die Kinder","es":"los niÃ±os (das Kind â†’ -er)"},{"de":"die Autos","es":"los coches (das Auto â†’ -s)"}]'::jsonb),

('akkusativ', 'A1.2', 1, 'Akkusativ: el caso del objeto',
  'Cuando algo es el OBJETO de la acciÃ³n, solo cambia el MASCULINO:
der â†’ den Â· die â†’ die Â· das â†’ das
Ich sehe den Mann. (veo AL hombre, masc. objeto)
Ich sehe die Frau / das Kind. (fem. y neutro no cambian en formulario)
Los pronombres tambiÃ©n cambian: ich â†’ mich, du â†’ dich.
Con movimiento (a dÃ³nde) preposiciÃ³n Wechsel + Akkusativ: Ich gehe in den Supermarkt.',
  '[{"de":"Ich sehe den Mann.","es":"Veo al hombre (masc. â†’ den)."},{"de":"Ich kaufe die Milch.","es":"Compro la leche (fem. no cambia)."},{"de":"Ich habe das Buch.","es":"Tengo el libro (neutro no cambia)."},{"de":"Er fragt mich.","es":"Ã‰l me pregunta (yo â†’ mich)."}]'::jsonb),

('dativ', 'A1.2', 2, 'Dativ: el caso de "a quiÃ©n / con quÃ©"',
  'El Dativ marca el objeto INDIRECTO (a quiÃ©n) y lo alternador de muchas preposiciones:
der â†’ dem Â· die â†’ der Â· das â†’ dem Â· plural: den + -n (die Kinder â†’ den Kindern)
Ich gebe dem Freund das Buch. (le doy el libro AL amigo)
Pronombres: du â†’ dir, ich â†’ mir, sie (ella) â†’ ihr.
Verbos tÃ­picos con dativ: helfen, danken, gehÃ¶ren, gefallen, passen.
Con posiciÃ³n (dÃ³nde): preposiciÃ³n Wechsel + Dativ: Das Buch ist auf dem Tisch.',
  '[{"de":"Ich helfe dem Mann.","es":"Ayudo al hombre (helfen + Dat)."},{"de":"Sie dankt ihrer Mutter.","es":"Agradece a su madre (die â†’ derâ†’ihrâ€¦)."},{"de":"Ich gebe dir das Buch.","es":"Te doy el libro (du â†’ dir)."},{"de":"Wir sprechen mit den Kindern.","es":"Hablamos con los niÃ±os (plural â†’ den Kindern)."}]'::jsonb),

('possessiv', 'A1.2', 3, 'Los posesivos: mein, dein, seinâ€¦',
  'Los posesivos se declinan igual que EIN:
â€¢ der Mann â†’ mein Bruder (masc. nom., sin terminaciÃ³n con derâ€¦: mein)
â€¢ den Mann â†’ meinen Bruder (masc. acuativo: + en)
â€¢ dem Mann â†’ meinem (masc. dativo: + em)
â€¢ die Frau â†’ meine Â· das Kind â†’ mein Kind
Poseedores: mein (yo) Â· dein (tÃº) Â· sein (Ã©l) Â· ihr (ella) Â· unser (nos.) Â· euer (vos.) Â· ihr/Sie (ellos/Uds.).
Â¡Wichtig!: ihr significa TAMBIÃ‰N "de ella" Y "de ellos/Uds." â€” el contexto decide.',
  '[{"de":"mein Bruder","es":"mi hermano (masc. nominativo)."},{"de":"Ich sehe meinen Vater.","es":"Veo a mi padre (masc. acuativo: mein_en)."},{"de":"Ich fahre mit meinem Auto.","es":"Voy con mi coche (dativo: mein_em)."},{"de":"Das ist ihre Tasche.","es":"Es su bolso (de ella: die â†’ ihre)."}]'::jsonb),

('es-gibt', 'A1.2', 4, 'es gibt: hay + Akkusativ',
  '"Es gibt" = hay. SIEMPRE con Akkusativ (singular neutro nominativo queda la forma fija):
Es gibt einen Supermarkt hier. (masc. â†’ einen)
Es gibt keinen Park. (no hay parque â†’ keinen, tambiÃ©n la negaciÃ³n cambia)
Femeninas y plurales no se ven afectadas: Es gibt eine Apotheke. / Es gibt Probleme.
Pregunta: Gibt es hier einen Fernseher?',
  '[{"de":"Es gibt einen Fehler.","es":"Hay un error (masc. â†’ einen)."},{"de":"Gibt es hier eine Apotheke?","es":"Â¿Hay una farmacia aquÃ­? (fem. â†’ eine)."},{"de":"Es gibt keinen Zucker.","es":"No hay azÃºcar (masc. â†’ keinen)."},{"de":"Es gibt Probleme.","es":"Hay problemas (plural sin cambio)."}]'::jsonb),

('adjektive', 'A1.2', 5, 'Adjetivos delante del sustantivo',
  'Con DER/DIE/DAS el adjetivo toma -e:
der alt_ Mann â†’ der alte Mann Â· die rot_ Tasche â†’ die rote Tasche Â· das klein_ Kind â†’ das kleine Kind
Con EIN y en caso con terminaciÃ³n dÃ©bil, el adjetivo toma -en:
ein alt_ Table â†’ ein alter Tisch (masc. nom.) Â· ein alt_ Kind â†’ ein altes Kind (neutro)
den alten Mann Â· mit einem alten Mann.
Regla de arranque: der/die/das â†’ -e; ein (masc. y neutro) â†’ -er / -es.',
  '[{"de":"der alte Mann","es":"el hombre mayor (der â†’ -e)."},{"de":"ein altes Auto","es":"un coche viejo (ein + neutro â†’ -es)."},{"de":"eine rote Tasche","es":"un bolso rojo (fem. â†’ -e)."},{"de":"den neuen Film","es":"la nueva pelÃ­cula (den â†’ -en)."}]'::jsonb),

('imperativ', 'A1.2', 6, 'El imperativo: dar Ã³rdenes',
  'Tres formas segÃºn a quiÃ©n le hables:
â€¢ DU: raÃ­z sola: Komm! Â· Sprich langsamer! (sprechen â†’ sprich)
â€¢ IHR: presente de ihr sin pronombre: Kommt! Â· Spielt!
â€¢ SIE formal: verbo + Sie: Kommen Sie bitte!
Verbos reforzados en e (nehmen â†’ nimm! lesen â†’ lies!). No se dice el pronombre du.',
  '[{"de":"Komm bitte!","es":"Â¡Ven, por favor (a ti)!"},{"de":"Kommt alle mit!","es":"Â¡Vengan todos (vosotros)!"},{"de":"Kommen Sie herein!","es":"Â¡Pase usted!"},{"de":"Nimm den Bus!","es":"Â¡Causa el autobÃºs (du de nehmen â†’ nimm)!"}]'::jsonb)
on conflict (slug) do update set
  level = excluded.level, order_idx = excluded.order_idx, title = excluded.title,
  body = excluded.body, examples = excluded.examples;


-- ---------- 3) Ejercicios ----------
delete from public.grammar_exercises;  -- re-seed limpio (idempotente si actualizamos contenido)

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('articulos','___ Zeitung liegt auf dem Tisch.', array['Der','Die','Das'], 'Die','por -ung → DIE'),
  ('articulos','___ Mädchen heißt Anna.', array['Der','Das','Dem'],'Das','-chen → DAS'),
  ('articulos','___ Sommer ist warm.', array['Der','Die','Das'],'Der','estaciones → DER'),
  ('articulos','___ Idee ist gut.', array['Die','Der','Das'],'Die','die Idee'),
  ('articulos','___ Auto ist neu.', array['Der','Dem','Die'],'Der','das Auto (neutro)'),
  ('articulos','___ Freiheit ist wichtig.', array['Die','Der','Das'],'Die','-heit → DIE')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('sein-haben','Ich ___ müde.', array['bin','bist','ist'],'bin','ich → bin'),
  ('sein-haben','Du ___ nett.', array['bist','bin','sind'],'bist','du → bist'),
  ('sein-haben','Er ___ ein Auto.', array['hat','habe','hast'],'hat','er → hat'),
  ('sein-haben','Wir ___ Studenten.', array['sind','seid','ist'],'sind','wir → sind'),
  ('sein-haben','Ihr ___ spät.', array['seid','sind','habt'],'seid','ihr → seid'),
  ('sein-haben','Wir ___ keine Zeit.', array['haben','habt','hast'],'haben','wir → haben')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('praesens','Ich ___ Deutsch.', array['lerne','lernt','lernst'],'lerne','ich → -e'),
  ('praesens','Du ___ in Köln.', array['wohnst','wohnt','wohnen'],'wohnst','du → -st'),
  ('praesens','Er ___ viel.', array['arbeitet','arbeitest','arbeiten'],'arbeitet','er → -t'),
  ('praesens','Ihr ___ Musik.', array['hört','hören','höre'],'hört','ihr → -t'),
  ('praesens','Du ___ ein Buch. (lesen)', array['liest','liesst','lese'],'liest','lesen: du/er → ie'),
  ('praesens','Sie (plural) ___ ins Kino.', array['gehen','geht','gehe'],'gehen','sie → -en')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('w-fragen','___ wohnst du? — In Berlin.', array['Wo','Wann','Warum'],'Wo','¿dónde?'),
  ('w-fragen','___ machst du heute?', array['Was','Wo','Wie'],'Was','¿qué?'),
  ('w-fragen','___ heißt du?', array['Wie','Wer','Was'],'Wie','¿cómo?'),
  ('w-fragen','___ beginnt der Film?', array['Wann','Warum','Was'],'Wann','¿cuándo?'),
  ('w-fragen','___ lernen Deutsch? — Alle.', array['Wer','Wo','Wann'],'Wer','¿quién?'),
  ('w-fragen','___ lernst du Deutsch? — Für die Arbeit.', array['Warum','Was','Wo'],'Warum','¿por qué?')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('negacion','Ich habe ___ Auto.', array['kein','nicht','keine'],'kein','nombre sin artículo → kein'),
  ('negacion','Das Auto ist ___ neu.', array['nicht','kein','keine'],'nicht','adjetivo → nicht'),
  ('negacion','Ich schlafe ___.', array['nicht','kein','keine'],'nicht','verbo → nicht'),
  ('negacion','Er hat ___ Zeit.', array['keine','kein','nicht'],'keine','die Zeit fem. → keine'),
  ('negacion','Das ist ___ mein Buch.', array['nicht','kein','kein das'],'nicht','con artículo determinado → nicht'),
  ('negacion','___ Problem!', array['Kein','Nicht','Keine'],'Kein','das Problem → kein')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('plural','Zwei ___ sitzen hier. (der Mann)', array['Männer','Mannen','Manns'],'Männer','-er + umlaut'),
  ('plural','Hier sind viele ___. (die Frage)', array['Fragen','Frägen','fragen'],'Fragen','fem. → -(e)n'),
  ('plural','Drei ___ fahren. (das Auto)', array['Autos','Autosen','Autoe'],'Autos','das Auto → -s'),
  ('plural','Zwei ___ spielen. (das Kind)', array['Kinder','Kinds','Kinderen'],'Kinder','das Kind → -er'),
  ('plural','Fünf ___ blühen. (die Blume)', array['Blumen','Blume','Blüten'],'Blumen','fem. → -(e)n'),
  ('plural','___ sind billig. (der Apfel)', array['Äpfel','Apfeln','Apfels'],'Äpfel','-e + umlaut')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('akkusativ','Ich sehe ___ Mann.', array['den','der','dem'],'den','masc. objeto → den'),
  ('akkusativ','Er kauft ___ Tisch. (der Tisch)', array['den','dem','der'],'den','"—"'),
  ('akkusativ','Ich kaufe ___ Brot. (das Brot)', array['das','den','dem'],'das','neutro no cambia'),
  ('akkusativ','Er fragt ___. (ich)', array['mich','ich','mir'],'mich','pron. ich → mich (Akk)'),
  ('akkusativ','Ich gehe in ___ Supermarkt. (bewegung)', array['den','dem','der'],'den','a dónde → Akkusativ (masc.)'),
  ('akkusativ','Kenne ___? (du)', array['dich','du','dir'],'dich','du → dich (Akk)')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('dativ','Ich helfe ___ Mann.', array['dem','den','der'],'dem','dativ masc. → dem'),
  ('dativ','Das Buch ist auf ___ Tisch.', array['dem','den','der'],'dem','posición → dativ (masc.)'),
  ('dativ','Ich gebe ___ das Buch. (du)', array['dir','dich','du'],'dir','du → dir (Dat)'),
  ('dativ','Sie dankt ___ Mutter.', array['ihrer','ihre','ihr'],'ihrer','ihrer Mutter (Dat + posesivo fem.)'),
  ('dativ','Wir sprechen mit ___ Kindern.', array['den','dem','die'],'den','plural dativ: den Kindern'),
  ('dativ','___ ist kalt. (a mí)', array['Mir','Ich','Mich'],'Mir','las señas físicas → dativ')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('possessiv','Das ist ___ Bruder.', array['mein','meinen','meinem'],'mein','masc. nominativo'),
  ('possessiv','Ich sehe ___ Vater.', array['meinen','mein','meinem'],'meinen','masc. acuativo: + en'),
  ('possessiv','Ich fahre mit ___ Auto.', array['meinem','meinen','mein'],'meinem','dativo: + em'),
  ('possessiv','___ Tasche ist rot. (de ella)', array['Ihre','Ihr','Ihrem'],'Ihre','die → ihre'),
  ('possessiv','Das ist ___ Kind. (de él)', array['sein','seine','seinem'],'sein','das Kind neutro: sin cambio'),
  ('possessiv','Ich wohne mit ___ Eltern.', array['meinen','meinem','meine'],'meinen','die Eltern plural dativ → meinen (+n)')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('es-gibt','Es gibt ___ Supermarkt hier.', array['einen','einem','ein'],'einen','es gibt + Akk: masc. → einen'),
  ('es-gibt','Gibt es hier ___ Apotheke?', array['eine','einen','einem'],'eine','fem. no cambia'),
  ('es-gibt','Es gibt ___ Zucker.', array['keinen','kein','nicht'],'keinen','der Zucker (masc., sin artículo) → keinen'),
  ('es-gibt','Es gibt ___ Probleme.', array['keine','keinen','nicht'],'keine','plural → keine'),
  ('es-gibt','Gibt es ___ Fernseher?', array['einen','eine','einem'],'einen','der Fernseher masc.'),
  ('es-gibt','Es gibt hier keinen Park.', array['kein','keine','keinen'],'keinen','der Park (masc.) → keinen'),
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('adjektive','der ___ Mann (alt)', array['alte','alt','alten'],'alte','der → -e'),
  ('adjektive','den ___ Mann (alt)', array['alten','alte','alt'],'alten','den → -en'),
  ('adjektive','ein ___ Auto (neu)', array['neues','neue','neuen'],'neues','ein + neutro → -es'),
  ('adjektive','eine ___ Tasche (rot)', array['rote','rot','roten'],'rote','fem. → -e'),
  ('adjektive','das ___ Kind (klein)', array['kleine','kleines','kleinen'],'kleine','artículo das → adjetivo -e'),
  ('adjektive','mit einem ___ Mann (alt)', array['alten','alte','alt'],'alten','dativo → -en')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('imperativ','(a ti) ___ bitte hierher! (kommen)', array['Komm','Kommen','Kommt'],'Komm','du → raíz'),
  ('imperativ','(vosotros) ___ alle mit! (kommen)', array['Kommt','Komm','Kommen'],'Kommt','ihr → -t'),
  ('imperativ','(usted) ___ bitte herein! (kommen)', array['Kommen','Komm','Kommt'],'Kommen','Sie → infinitivo'),
  ('imperativ','(a ti) ___ langsamer! (sprechen)', array['Sprich','Sprechen','Spricht'],'Sprich','sprechen → sprich'),
  ('imperativ','(a ti) ___ den Bus! (nehmen)', array['Nimm','Nehm','Nehmt'],'Nimm','nehmen → nimm'),
  ('imperativ','(usted) ___ Sie bitte leise! (sein)', array['Sei','Sind','Seien'],'Seien','Sie formal → Seien')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

select 'grammar: ' ||
       (select count(*) from public.grammar_rules) || ' lecciones · ' ||
       (select count(*) from public.grammar_exercises) || ' ejercicios' as resultado;



