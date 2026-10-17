-- ============ Lecciones de GRAMÁTICA: verbos (cambios de raíz, modales, separables) — idempotente ============
-- Requiere supabase/grammar.sql ejecutado previamente (tablas grammar_rules/grammar_exercises/grammar_srs).
-- NO borra ejercicios: usa upsert/on conflict para conservar el progreso SRS de los usuarios.
-- Complementa supabase/verbos-praesens.sql: mismos verbos y mismos cambios de raíz.

-- ---------- 1) Lecciones ----------
insert into public.grammar_rules (slug, level, order_idx, title, body, examples) values

('cambio-ei', 'A1.2', 7, 'Cambio e → i: sprechen, essen…',
  'Verbos FUERTES: en du y er/sie/es la e de la raíz cambia a i. Ich, wir, ihr y sie/Sie usan la forma normal.\n\nsprechen → du sprichst · er spricht\nessen → du isst · er isst\ngiben → du gibst · er gibt\nhelfen → du hilfst · er hilft\n\nNEHmen es raro: du nimmst · er nimmt (desaparece la e y aparece -mm-: ehm → imm).\n\n⚠ Si la raíz acaba en -s/-ß/-z, du no añade otra -s: du isst (nunca «isstst»).\n⚠ Nunca cambian: ich esse · wir essen · ihr esst.',
  '[{"de":"Ich spreche gut Deutsch.","es":"Hablo bien alemán (ich no cambia)."},{"de":"Du sprichst zu schnell.","es":"Hablas demasiado rápido (e → i)."},{"de":"Er isst keine Süßigkeiten.","es":"No come dulces (essen → isst)."},{"de":"Kannst du mir helfen?","es":"¿Puedes ayudarme? (helfen → hilfst)."}]'::jsonb),

('cambio-eie', 'A1.2', 8, 'Cambio e → ie: lesen, sehen…',
  'Algunos verbos cambian e → ie en du y er/sie/es. Se ESCRIBE ie, pero suena como una i larga.\n\nlesen → du liest · er liest\nsehen → du siehst · er sieht (con h entre s y t)\nempfehlen → du empfiehlst · er empfiehlt\n\nEl resto no cambia: ich lese · wir lesen · ihr lest · sie lesen.\n\nOJO: ver el imperativo — du de lesen es lies (no liesst).',
  '[{"de":"Ich lese ein Buch.","es":"Leo un libro (ich normal)."},{"de":"Du liest sehr schnell.","es":"Lees muy rápido (e → ie)."},{"de":"Sie sieht den Film.","es":"Ve la película (sehen → sieht)."},{"de":"Er empfiehlt dieses Restaurant.","es":"Recomienda este restaurante (e → ie)."}]'::jsonb),

('cambio-ae', 'A1.2', 9, 'Cambio a → ä (y au → äu)',
  'En du y er/sie/es muchos verbos cambian la a de la raíz por ä:\n\nschlafen → du schläfst · er schläft\nfahren → du fährst · er fährt\ntragen → du trägst · er trägt\nwaschen → du wäschst · er wäscht\n\nCasos raros:\n• laufen → du läufst · er läuft (¡cambio au → äu, no a → ä!)\n• halten → du hältst · er hält (la raíz ya acaba en -t: no se duplica)\n• lassen → du lässt · er lässt (ä + ss juntos)\n\nEl resto normal: ich schlafe · wir schlafen · ihr schlaft.',
  '[{"de":"Ich schlafe acht Stunden.","es":"Duermo ocho horas (ich normal)."},{"de":"Du fährst zu schnell.","es":"Conduces demasiado rápido (a → ä)."},{"de":"Er läuft im Park.","es":"Corre en el parque (au → äu)."},{"de":"Der Bus hält hier.","es":"El autobús para aquí (sin -t extra)."}]'::jsonb),

('modales', 'A1.2', 10, 'Los verbos modales: können, müssen…',
  'Seis verbos muy usados, todos irregulares. DOS claves:\n\n1) ich y er/sie/es NO llevan terminación y cambian la vocal:\nkönnen: kann · kannst · kann · können · könnt · können\nmüssen: muss · musst · muss · müssen · müsst · müssen\ndürfen: darf · darfst · darf · dürfen · dürft · dürfen\nsollen: soll · sollst · soll · sollen · sollt · sollen\nwollen: will · willst · will · wollen · wollt · wollen\nmögen: mag · magst · mag · mögen · mögt · mögen\n\n2) El segundo verbo va en infinitivo AL FINAL de la frase:\nIch kann Deutsch sprechen. · Du musst heute arbeiten.\nPara negar, el nicht va antes de ese infinitivo: Ich kann nicht sprechen.\n\nExtra: wissen funciona igual (ich weiß · du weißt) y möchten (cortesía de mögen) SÍ lleva -e: ich möchte.',
  '[{"de":"Ich kann Deutsch sprechen.","es":"Puedo hablar alemán (infinitivo al final)."},{"de":"Du musst heute arbeiten.","es":"Tienes que trabajar hoy."},{"de":"Darf ich hier sitzen?","es":"¿Puedo sentarme aquí? (dürfen)."},{"de":"Ich möchte einen Kaffee, bitte.","es":"Quisiera un café, por favor (möchten)."}]'::jsonb),

('separables', 'A1.2', 11, 'Verbos separables: ankommen, aufstehen…',
  'Verbos con PREFIJO (an, aus, auf, ein, mit, ab, zu, fern…) que se SEPARA: el prefijo va AL FINAL de la frase principal y el verbo base toma las terminaciones normales.\n\nankommen → ich komme an · du kommst an · er kommt an\naufstehen → ich stehe auf · er steht auf\nanrufen → ich rufe dich an\nabfahren → der Zug fährt ab\n\nEn preguntas y subordinados el verbo vuelve UNIDO: Wann kommst du an? · Ich weiß, dass du ankommst.\n\n⚠ No todos los verbos con prefijo son separables: besuchen, verstehen y finden NO se separan.\n⚠ Algunos separables TAMBIÉN cambian la vocal: einladen → du lädst ein · anfangen → du fängst an.',
  '[{"de":"Ich stehe um sieben auf.","es":"Me levanto a las siete (aufstehen)."},{"de":"Ich rufe dich an.","es":"Te llamo por teléfono (anrufen)."},{"de":"Der Zug fährt um zehn ab.","es":"El tren sale a las diez (abfahren)."},{"de":"Wir kaufen im Supermarkt ein.","es":"Hacemos compras (einkaufen)."}]'::jsonb)

on conflict (slug) do update set
  level = excluded.level, order_idx = excluded.order_idx, title = excluded.title,
  body = excluded.body, examples = excluded.examples;

-- ---------- 2) Ejercicios (inserta solo los que falten: conserva grammar_srs) ----------
insert into public.grammar_exercises (rule_id, sentence, options, answer, hint)
select r.id, e.sentence, e.options, e.answer, e.hint
from public.grammar_rules r
join (values
  ('cambio-ei','Du ___ Deutsch. (sprechen)', array['sprechst','sprichst','spricht'],'sprichst','e → i en du: sprichst'),
  ('cambio-ei','Er ___ Brot zum Frühstück. (essen)', array['esst','isst','essen'],'isst','e → i en er: isst'),
  ('cambio-ei','Ich ___ dir das Buch. (geben)', array['gebe','gibst','gibt'],'gebe','ich no cambia: forma normal'),
  ('cambio-ei','Kannst du mir ___? (helfen)', array['helfen','hilfst','hilft'],'hilfst','du con e → i: hilfst'),
  ('cambio-ei','Wir ___ einen Kaffee. (nehmen)', array['nehmen','nehmt','nimmt'],'nehmen','wir no cambia: forma normal'),
  ('cambio-ei','Du ___ das Wort nicht. (vergessen)', array['vergesst','vergessen','vergisst'],'vergisst','e → i en du: vergisst'),

  ('cambio-eie','Du ___ jeden Tag ein Buch. (lesen)', array['lest','liest','lese'],'liest','e → ie en du'),
  ('cambio-eie','Ich ___ den Film. (sehen)', array['sehe','siehst','sieht'],'sehe','ich no cambia'),
  ('cambio-eie','Er ___ dieses Restaurant. (empfehlen)', array['empfehlen','empfiehlt','empfiehlst'],'empfiehlt','e → ie en er'),
  ('cambio-eie','Was ___ du da? (sehen)', array['sieht','sehen','siehst'],'siehst','du: e → ie (siehst con h)'),
  ('cambio-eie','Ihr ___ die Speisekarte. (lesen)', array['lest','liest','lesen'],'lest','ihr sin cambio: lest'),
  ('cambio-eie','Wir ___ abends fern. (fernsehen)', array['sehen','seht','fernsehen'],'sehen','wir normal; «fern» va al final'),

  ('cambio-ae','Er ___ acht Stunden. (schlafen)', array['schlaft','schläft','schläfst'],'schläft','a → ä en er'),
  ('cambio-ae','Du ___ mit dem Bus. (fahren)', array['fährst','fahrt','fahrst'],'fährst','a → ä en du'),
  ('cambio-ae','Sie ___ eine Jacke. (tragen)', array['trägt','trage','tragt'],'trägt','a → ä en er/sie/es'),
  ('cambio-ae','Der Bus ___ hier. (halten)', array['hält','hältst','haltet'],'hält','raíz ya en -t: er hält sin -t extra'),
  ('cambio-ae','Du ___ die Hände. (waschen)', array['waschst','wäschst','wäscht'],'wäschst','a → ä en du'),
  ('cambio-ae','Er ___ im Park. (laufen)', array['lauft','läuft','läufst'],'läuft','laufen: au → äu'),

  ('modales','Ich ___ Deutsch sprechen.', array['kann','können','kannst'],'kann','ich sin terminación'),
  ('modales','Du ___ heute nicht kommen.', array['musst','muss','müssen'],'musst','du: la vocal cambia, terminación normal'),
  ('modales','___ ich hier sitzen? (dürfen)', array['Darf','Darfst','Dürfen'],'Darf','ich → darf (sin terminación)'),
  ('modales','Ihr ___ die Aufgabe machen.', array['sollt','sollen','soll'],'sollt','ihr → -t normal'),
  ('modales','Er ___ Kaffee. (mögen)', array['mag','mögt','magst'],'mag','er sin terminación + ö → a'),
  ('modales','Ich ___ es nicht. (wissen)', array['weiß','weißt','wissen'],'weiß','wissen funciona como modal'),

  ('separables','Ich stehe um sieben Uhr ___. (aufstehen)', array['auf','ab','ein'],'auf','el prefijo va al final'),
  ('separables','Ich ___ dich an. (anrufen)', array['rufe','rufst','ruft'],'rufe','verbo base con terminación de ich'),
  ('separables','Der Zug ___ um zehn Uhr ab. (abfahren)', array['fährt','fährst','fahren'],'fährt','a → ä en er + prefijo ab al final'),
  ('separables','Wir ___ im Supermarkt ein. (einkaufen)', array['kaufen','kaufst','kauft'],'kaufen','wir → -en + prefijo ein'),
  ('separables','Der Kurs ___ um acht Uhr an. (anfangen)', array['fängt','fängst','fangen'],'fängt','a → ä + separable'),
  ('separables','Ich ___ meine Oma. (besuchen)', array['besuche','besuchst','besucht'],'besuche','besuchen NO es separable: va unido'),
  ('separables','Er ___ abends fern. (fernsehen)', array['sieht','siehst','sehen'],'sieht','e → ie + «fern» al final')
) as e(slug, sentence, options, answer, hint) on e.slug = r.slug
on conflict (rule_id, sentence) do nothing;

select 'grammar-verbos: ' ||
       (select count(*) from public.grammar_rules where slug in ('cambio-ei','cambio-eie','cambio-ae','modales','separables')) || ' lecciones · ' ||
       (select count(*) from public.grammar_exercises e join public.grammar_rules r on r.id = e.rule_id
         where r.slug in ('cambio-ei','cambio-eie','cambio-ae','modales','separables')) || ' ejercicios' as resultado;
