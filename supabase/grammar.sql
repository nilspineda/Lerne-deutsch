-- ============ Módulo de Gramática: mini-lecciones + ejercicios cloze con SRS (idempotente) ============
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
('articulos', 'A1.1', 1, 'Los artículos: der / die / das',
  'Todo sustantivo alemán tiene un género: masculino (der), femenino (die) o neutro (das). El artículo va SIEMPRE con la palabra: aprende "die Schule", no "Schule".\n\nPistas frecuentes:\n• -ung, -heit, -keit, -schaft, -tion → DIE (die Zeitung, die Freiheit)\n• -chen, -lein → DAS (das Mädchen)\n• días, meses, estaciones → DER (der Montag, der Sommer)\n• -er de aparatos y verbos sustantivados → DER o DAS, hay que memorizarlos.\n\nTruco: practica siempre "palabra = artículo".',
  '[{"de":"Der Tag","es":"el día (masc.)"},{"de":"Die Zeitung","es":"el periódico (fem. por -ung)"},{"de":"Das Mädchen","es":"la niña (neutro por -chen)"},{"de":"Der Montag","es":"el lunes (los días son der)"}]'::jsonb),

('sein-haben', 'A1.1', 2, 'sein y haben',
  'Los dos verbos más importantes, irregulares. Memorízalos conjugados:\n\nsein: ich bin · du bist · er ist · wir sind · ihr seid · sie sind\nhaben: ich habe · du hast · er hat · wir haben · ihr habt · sie haben\n\nUso:\n• sein + adjetivo: Ich bin müde. (Estoy cansado.)\n• haben + nombre: Ich habe Zeit. (Tengo tiempo.)\n\nCuidado: "Ich bin kalt" = tengo el cuerpo frío; para "me da frío" se dice: Mir ist kalt. (Dativo — lección de A1.2)',
  '[{"de":"Ich bin müde.","es":"Estoy cansado."},{"de":"Du bist nett.","es":"Eres amable."},{"de":"Er hat ein Auto.","es":"Él tiene un coche."},{"de":"Wir haben keine Zeit.","es":"No tenemos tiempo."}]'::jsonb),

('praesens', 'A1.1', 3, 'Presente: verbos regulares',
  'Quita la terminación -en del infinitivo y añade:\n\nich -e · du -st · er -t · wir -en · ihr -t · sie -en\n\nspielen → ich spiele, du spielst, er spielt, wir spielen, ihr spielt, sie spielen.\n\nOrtografía: si la raíz acaba en -t/-d, du añade -e: arbeiten → du arbeitest.\nCon e en la raíz (lesen): du liest, er liest (e → ie en du/er).',
  '[{"de":"Ich lerne Deutsch.","es":"Aprendo alemán."},{"de":"Du wohnst in Köln.","es":"Vives en Colonia."},{"de":"Er arbeitet viel.","es":"Él trabaja mucho."},{"de":"Wir hören Musik.","es":"Escuchamos música."}]'::jsonb),

('w-fragen', 'A1.1', 4, 'Preguntas: W-Fragen y sí/no',
  'W-Fragen: van al principio y detrás va el VERBO en 2ª posición:\n\nWo wohnst du? · Was machst du? · Wann beginnt der Film? · Wie heißt du? · Wer ist das? · Warum lernst du Deutsch?\n\nPreguntas de sí/no: el verbo va en PRIMERA posición:\nBist du müde? · Hast du Zeit?',
  '[{"de":"Wo wohnst du?","es":"¿Dónde vives?"},{"de":"Was machst du?","es":"¿Qué haces?"},{"de":"Wann beginnt der Film?","es":"¿Cuándo empieza la película?"},{"de":"Bist du müde?","es":"¿Estás cansado? (verbo primero)"}]'::jsonb),

('negacion', 'A1.1', 5, 'Negación: nicht y kein',
  'Dos negaciones, cada una para su terreno:\n\n• KEIN (keine, keinen…) niega NOMBRES con artículo indefinido o sin artículo: Ich habe kein Auto. / Kein Problem!\n• NICHT niega todo lo demás (verbos, adjetivos, adverbios, nombres con artículo determinado) y va lo más tarde posible: Ich schlafe nicht. / Das Auto ist nicht neu. / Das ist nicht mein Buch.\n\nTruco: ¿cuenta cosas (ein, alguno)? → kein. ¿El resto? → nicht.',
  '[{"de":"Ich habe kein Auto.","es":"No tengo coche (nombre indefinido)."},{"de":"Das ist nicht neu.","es":"Eso no es nuevo (adjetivo)."},{"de":"Er kommt nicht.","es":"Él no viene (verbo)."},{"de":"Kein Problem!","es":"¡Sin problema!"}]'::jsonb),

('plural', 'A1.1', 6, 'El plural',
  'El plural depende de cada palabra (apréndelo con la palabra), pero hay patrones:\n\n• -(e)n: la mayoría de femeninas: die Frau → die Frauen\n• -e (± umlaut): der Tisch → die Tische, der Apfel → die Äpfel\n• -er (± umlaut): das Kind → die Kinder, der Mann → die Männer\n• -s: palabra extranjeras y -er aparatos: das Auto → die Autos\n• sin cambio: das Zimmer → die Zimmer\n\nOJO: TODOS los plurales de nominativo/acusativo llevan artículo DIE, aunque el singular sea der o das.\n\nQuizás lo más raro wikt: die Autos, die Kinder (de das Auto, das Kinder... das Kind!).',
  '[{"de":"die Tische","es":"las mesas (der Tisch → -e)"},{"de":"die Frauen","es":"las mujeres (die Frau → -en)"},{"de":"die Kinder","es":"los niños (das Kind → -er)"},{"de":"die Autos","es":"los coches (das Auto → -s)"}]'::jsonb),

('akkusativ', 'A1.2', 1, 'Akkusativ: el caso del objeto',
  'Cuando algo es el OBJETO de la acción, solo cambia el MASCULINO:\n\nder → den · die → die · das → das\n\nIch sehe den Mann. (veo AL hombre, masc. objeto)\nIch sehe die Frau / das Kind. (fem. y neutro no cambian de forma)\n\nLos pronombres también cambian: ich → mich, du → dich.\n\nCon movimiento (a dónde) preposición Wechsel + Akkusativ: Ich gehe in den Supermarkt.',
  '[{"de":"Ich sehe den Mann.","es":"Veo al hombre (masc. → den)."},{"de":"Ich kaufe die Milch.","es":"Compro la leche (fem. no cambia)."},{"de":"Ich habe das Buch.","es":"Tengo el libro (neutro no cambia)."},{"de":"Er fragt mich.","es":"Él me pregunta (yo → mich)."}]'::jsonb),

('dativ', 'A1.2', 2, 'Dativ: el caso de "a quién / con qué"',
  'El Dativ marca el objeto INDIRECTO (a quién) y se usa con muchas preposiciones:\n\nder → dem · die → der · das → dem · plural: den + -n (die Kinder → den Kindern)\n\nIch gebe dem Freund das Buch. (le doy el libro AL amigo)\nPronombres: du → dir, ich → mir, sie (ella) → ihr.\n\nVerbos típicos con dativ: helfen, danken, gehören, gefallen, passen.\n\nCon posición (dónde): preposición Wechsel + Dativ: Das Buch ist auf dem Tisch.',
  '[{"de":"Ich helfe dem Mann.","es":"Ayudo al hombre (helfen + Dat)."},{"de":"Sie dankt ihrer Mutter.","es":"Agradece a su madre (ihrer Mutter: Dat + posesivo fem.)."},{"de":"Ich gebe dir das Buch.","es":"Te doy el libro (du → dir)."},{"de":"Wir sprechen mit den Kindern.","es":"Hablamos con los niños (plural → den Kindern)."}]'::jsonb),

('possessiv', 'A1.2', 3, 'Los posesivos: mein, dein, sein…',
  'Los posesivos se declinan igual que EIN:\n\n• der Mann → mein Bruder (masc. nominativo: mein)\n• den Mann → meinen Bruder (masc. acusativo: + en)\n• dem Mann → meinem (masc. dativo: + em)\n• die Frau → meine · das Kind → mein Kind\n\nPoseedores: mein (yo) · dein (tú) · sein (él) · ihr (ella) · unser (nos.) · euer (vos.) · ihr/Sie (ellos/Uds.).\n\n¡Ojo!: ihr significa TAMBIÉN "de ella" Y "de ellos/Uds." — el contexto decide.',
  '[{"de":"mein Bruder","es":"mi hermano (masc. nominativo)."},{"de":"Ich sehe meinen Vater.","es":"Veo a mi padre (masc. acusativo: mein_en)."},{"de":"Ich fahre mit meinem Auto.","es":"Voy con mi coche (dativo: mein_em)."},{"de":"Das ist ihre Tasche.","es":"Es su bolso (de ella: die → ihre)."}]'::jsonb),

('es-gibt', 'A1.2', 4, 'es gibt: hay + Akkusativ',
  '"Es gibt" = hay. SIEMPRE con Akkusativ:\n\nEs gibt einen Supermarkt hier. (masc. → einen)\nEs gibt keinen Park. (no hay parque → keinen, también la negación declina)\n\nFemeninas y plurales no cambian de forma: Es gibt eine Apotheke. / Es gibt Probleme.\n\nPregunta: Gibt es hier einen Fernseher?',
  '[{"de":"Es gibt einen Fehler.","es":"Hay un error (masc. → einen)."},{"de":"Gibt es hier eine Apotheke?","es":"¿Hay una farmacia aquí? (fem. → eine)."},{"de":"Es gibt keinen Zucker.","es":"No hay azúcar (masc. sin artículo → keinen)."},{"de":"Es gibt Probleme.","es":"Hay problemas (plural sin cambio)."}]'::jsonb),

('adjektive', 'A1.2', 5, 'Adjetivos delante del sustantivo',
  'Con DER/DIE/DAS el adjetivo toma -e:\n\nder alte Mann · die rote Tasche · das kleine Kind\n\nCon EIN, el adjetivo marca el género:\n• ein alter Tisch (masc. nom. → -er)\n• ein altes Auto (neutro → -es)\n• eine rote Tasche (fem. → -e)\n\nY en el resto de casos (acusativo de ein, dativo en general) el adjetivo toma -en:\nden alten Mann · mit einem alten Mann',
  '[{"de":"der alte Mann","es":"el hombre mayor (der → -e)."},{"de":"ein altes Auto","es":"un coche viejo (ein + neutro → -es)."},{"de":"eine rote Tasche","es":"una bolsa roja (fem. → -e)."},{"de":"mit einem alten Mann","es":"con un hombre mayor (dativo → -en)."}]'::jsonb),

('imperativ', 'A1.2', 6, 'El imperativo: dar órdenes',
  'Tres formas según a quién le hables:\n\n• DU: raíz sola: Komm! · Sprich langsamer! (sprechen → sprich)\n• IHR: presente de ihr sin pronombre: Kommt! · Spielt!\n• SIE formal: verbo + Sie: Kommen Sie bitte!\n\nVerbos fuertes cambian la vocal: nehmen → take nimm! · lesen → lies! · essen → iss!\nNo se dice el pronombre du al dar la orden.',
  '[{"de":"Komm bitte!","es":"¡Ven, por favor (a ti)!"},{"de":"Kommt alle mit!","es":"¡Vengan todos (vosotros)!"},{"de":"Kommen Sie herein!","es":"¡Pase usted!"},{"de":"Nimm den Bus!","es":"¡Toma el autobús! (du de nehmen → nimm)"}]'::jsonb)
on conflict (slug) do update set
  level = excluded.level, order_idx = excluded.order_idx, title = excluded.title,
  body = excluded.body, examples = excluded.examples;

-- ---------- 3) Ejercicios ----------
delete from public.grammar_exercises;  -- re-seed limpio (idempotente si actualizamos contenido)

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('articulos','___ Zeitung liegt auf dem Tisch.', array['Der','Die','Das'],'Die','por -ung → DIE'),
  ('articulos','___ Mädchen heißt Anna.', array['Der','Das','Dem'],'Das','-chen → DAS'),
  ('articulos','___ Sommer ist warm.', array['Der','Die','Das'],'Der','estaciones → DER'),
  ('articulos','___ Idee ist gut.', array['Die','Der','Das'],'Die','die Idee (fem.)'),
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
  ('praesens','Du ___ ein Buch. (lesen)', array['liest','ließt','lese'],'liest','lesen: du/er → ie'),
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
  ('w-fragen','___ lernt Deutsch? — Anna.', array['Wer','Wo','Wann'],'Wer','¿quién?'),
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
  ('negacion','Das ist ___ mein Buch.', array['nicht','kein','keine'],'nicht','con artículo determinado → nicht'),
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
  ('akkusativ','Er kauft ___ Tisch. (der Tisch)', array['den','dem','der'],'den','der → den en acusativo'),
  ('akkusativ','Ich kaufe ___ Brot. (das Brot)', array['das','den','dem'],'das','neutro no cambia'),
  ('akkusativ','Er fragt ___. (ich)', array['mich','ich','mir'],'mich','pron. ich → mich (Akk)'),
  ('akkusativ','Ich gehe in ___ Supermarkt. (movimiento)', array['den','dem','der'],'den','a dónde → Akkusativ (masc.)'),
  ('akkusativ','Kennst ___? (du)', array['dich','du','dir'],'dich','du → dich (Akk)')
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
  ('dativ','___ ist kalt. (a mí)', array['Mir','Ich','Mich'],'Mir','cosas físicas → dativ')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('possessiv','Das ist ___ Bruder.', array['mein','meinen','meinem'],'mein','masc. nominativo'),
  ('possessiv','Ich sehe ___ Vater.', array['meinen','mein','meinem'],'meinen','masc. acusativo: + en'),
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
  ('es-gibt','Es gibt hier ___ Park.', array['kein','keine','keinen'],'keinen','der Park (masc.) → keinen')
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
  ('imperativ','(usted) ___ Sie bitte leise! (sein)', array['Seien','Sind','Sei'],'Seien','usted/Sie → Seien')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug;

select 'grammar: ' ||
       (select count(*) from public.grammar_rules) || ' lecciones · ' ||
       (select count(*) from public.grammar_exercises) || ' ejercicios' as resultado;
