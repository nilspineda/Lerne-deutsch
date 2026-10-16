-- ============ Catálogo inicial (owner = NULL) ============
-- Columnas: de, article, es, ipa, respell, topic, level
insert into public.words (owner, de, article, es, ipa, respell, topic, level) values
-- ABECEDARIO
(null,'A',null,'Letra A','aː','a','abecedario','A1.1'),(null,'B',null,'Letra B','beː','be','abecedario','A1.1'),
(null,'C',null,'Letra C','tseː','tse','abecedario','A1.1'),(null,'D',null,'Letra D','deː','de','abecedario','A1.1'),
(null,'E',null,'Letra E','eː','e','abecedario','A1.1'),(null,'F',null,'Letra F','ɛf','ef','abecedario','A1.1'),
(null,'G',null,'Letra G','ɡeː','gue','abecedario','A1.1'),(null,'H',null,'Letra H','haː','ja','abecedario','A1.1'),
(null,'I',null,'Letra I','iː','i','abecedario','A1.1'),(null,'J',null,'Letra J','jɔt','yot','abecedario','A1.1'),
(null,'K',null,'Letra K','kaː','ka','abecedario','A1.1'),(null,'L',null,'Letra L','ɛl','el','abecedario','A1.1'),
(null,'M',null,'Letra M','ɛm','em','abecedario','A1.1'),(null,'N',null,'Letra N','ɛn','en','abecedario','A1.1'),
(null,'O',null,'Letra O','oː','o','abecedario','A1.1'),(null,'P',null,'Letra P','peː','pe','abecedario','A1.1'),
(null,'Q',null,'Letra Q','kuː','ku','abecedario','A1.1'),(null,'R',null,'Letra R','ɛʁ','er','abecedario','A1.1'),
(null,'S',null,'Letra S','ɛs','es','abecedario','A1.1'),(null,'T',null,'Letra T','teː','te','abecedario','A1.1'),
(null,'U',null,'Letra U','uː','u','abecedario','A1.1'),(null,'V',null,'Letra V','faʊ̯','fau','abecedario','A1.1'),
(null,'W',null,'Letra W','veː','ve','abecedario','A1.1'),(null,'X',null,'Letra X','ɪks','iks','abecedario','A1.1'),
(null,'Y',null,'Letra Y','ˈʏpsilɔn','ýpsilon','abecedario','A1.1'),(null,'Z',null,'Letra Z','tsɛt','tset','abecedario','A1.1'),
(null,'Ä',null,'Letra Ä (a con diéresis)','ɛː','ä (como una «e» larga)','abecedario','A1.1'),
(null,'Ö',null,'Letra Ö (o con diéresis)','øː','ö (di «e» con labios redondeados)','abecedario','A1.1'),
(null,'Ü',null,'Letra Ü (u con diéresis)','yː','ü (di «i» con labios redondeados)','abecedario','A1.1'),
(null,'ß',null,'Eszett (doble s)','ɛsˈtsɛt','es-tsét','abecedario','A1.1'),
-- NÚMEROS
(null,'null',null,'cero (0)','nʊl','nul','numeros','A1.1'),(null,'eins',null,'uno (1)','aɪ̯ns','áins','numeros','A1.1'),
(null,'zwei',null,'dos (2)','tsvaɪ̯','tsvái','numeros','A1.1'),(null,'drei',null,'tres (3)','dʁaɪ̯','drái','numeros','A1.1'),
(null,'vier',null,'cuatro (4)','fiːɐ̯','fíar','numeros','A1.1'),(null,'fünf',null,'cinco (5)','fʏnf','fünf','numeros','A1.1'),
(null,'sechs',null,'seis (6)','zɛks','seks','numeros','A1.1'),(null,'sieben',null,'siete (7)','ˈziːbn̩','sí-ben','numeros','A1.1'),
(null,'acht',null,'ocho (8)','axt','ajt','numeros','A1.1'),(null,'neun',null,'nueve (9)','nɔɪ̯n','nóin','numeros','A1.1'),
(null,'zehn',null,'diez (10)','tseːn','tsen','numeros','A1.1'),(null,'elf',null,'once (11)','ɛlf','elf','numeros','A1.1'),
(null,'zwölf',null,'doce (12)','tsvœlf','tsvölf','numeros','A1.1'),
(null,'dreizehn',null,'trece (13)','ˈdʁaɪ̯tseːn','drái-tsen','numeros','A1.2'),(null,'vierzehn',null,'catorce (14)','ˈfɪʁtseːn','fír-tsen','numeros','A1.2'),
(null,'fünfzehn',null,'quince (15)','ˈfʏnftseːn','fünf-tsen','numeros','A1.2'),(null,'sechzehn',null,'dieciséis (16)','ˈzɛçtseːn','sesh-tsen','numeros','A1.2'),
(null,'siebzehn',null,'diecisiete (17)','ˈziːptseːn','síp-tsen','numeros','A1.2'),(null,'achtzehn',null,'dieciocho (18)','ˈaxtseːn','ájt-tsen','numeros','A1.2'),
(null,'neunzehn',null,'diecinueve (19)','ˈnɔɪ̯ntseːn','nóin-tsen','numeros','A1.2'),(null,'zwanzig',null,'veinte (20)','ˈtsvantsɪç','tsván-tsij','numeros','A1.2'),
-- FRUTAS
(null,'Apfel','der','manzana','ˈapfl̩','ápfel','frutas','A1.1'),(null,'Banane','die','banano / plátano','baˈnaːnə','banána','frutas','A1.1'),
(null,'Orange','die','naranja','oˈʁaŋʒə','oránzhe','frutas','A1.1'),(null,'Birne','die','pera','ˈbɪʁnə','bír-ne','frutas','A1.1'),
(null,'Erdbeere','die','fresa','ˈeːɐ̯tˌbeːʁə','ért-bére','frutas','A1.1'),(null,'Traube','die','uva','ˈtʁaʊ̯bə','tráu-be','frutas','A1.1'),
(null,'Zitrone','die','limón','tsiˈtʁoːnə','tsitróne','frutas','A1.1'),(null,'Kirsche','die','cereza','ˈkɪʁʃə','kír-she','frutas','A1.1'),
(null,'Melone','die','melón','meˈloːnə','melóne','frutas','A1.1'),(null,'Ananas','die','piña','ˈanaˌnas','ánanas','frutas','A1.1'),
(null,'Pfirsich','der','durazno','ˈpfɪʁzɪç','pfír-sij','frutas','A1.1'),(null,'Pflaume','die','ciruela','ˈpflaʊ̯mə','pfláu-me','frutas','A1.1'),
(null,'Himbeere','die','frambuesa','ˈhɪmˌbeːʁə','jím-bére','frutas','A1.1'),(null,'Kiwi','die','kiwi','ˈkiːvi','kí-vi','frutas','A1.1'),
(null,'Wassermelone','die','sandía','ˈvasɐmeˌloːnə','vása-melóne','frutas','A1.1'),
-- SALUDOS
(null,'Hallo',null,'hola','ˈhalo','já-lo','saludos','A1.1'),(null,'Guten Morgen',null,'buenos días','ˈɡuːtn̩ ˈmɔʁɡn̩','gú-ten mór-guen','saludos','A1.1'),
(null,'Guten Tag',null,'buen día / buenas tardes','ˈɡuːtn̩ taːk','gú-ten tak','saludos','A1.1'),(null,'Guten Abend',null,'buenas noches (al llegar)','ˈɡuːtn̩ ˈaːbn̩t','gú-ten á-bent','saludos','A1.1'),
(null,'Gute Nacht',null,'buenas noches (al dormir)','ˈɡuːtə naxt','gú-te najt','saludos','A1.1'),(null,'Tschüss',null,'chao','tʃʏs','chüs','saludos','A1.1'),
(null,'Auf Wiedersehen',null,'hasta luego (formal)','aʊ̯f ˈviːdɐˌzeːən','áuf ví-da-sé-en','saludos','A1.1'),(null,'Danke',null,'gracias','ˈdaŋkə','dán-ke','saludos','A1.1'),
(null,'Bitte',null,'por favor / de nada','ˈbɪtə','bí-te','saludos','A1.1'),(null,'Entschuldigung',null,'perdón / disculpe','ɛntˈʃʊldɪɡʊŋ','ent-shúl-di-gung','saludos','A1.1'),
(null,'Ja',null,'sí','jaː','ya','saludos','A1.1'),(null,'Nein',null,'no','naɪ̯n','náin','saludos','A1.1'),
(null,'Wie geht''s?',null,'¿cómo estás?','viː ɡeːts','vi guets','saludos','A1.1'),(null,'Ich heiße …',null,'me llamo …','ɪç ˈhaɪ̯sə','ij jái-se','saludos','A1.1'),
(null,'Freut mich',null,'mucho gusto','fʁɔɪ̯t mɪç','fróit mij','saludos','A1.1'),
-- COLORES
(null,'rot',null,'rojo','ʁoːt','rot','colores','A1.2'),(null,'blau',null,'azul','blaʊ̯','bláu','colores','A1.2'),
(null,'grün',null,'verde','ɡʁyːn','grün','colores','A1.2'),(null,'gelb',null,'amarillo','ɡɛlp','guelp','colores','A1.2'),
(null,'schwarz',null,'negro','ʃvaʁts','shvarts','colores','A1.2'),(null,'weiß',null,'blanco','vaɪ̯s','váis','colores','A1.2'),
(null,'braun',null,'café / marrón','bʁaʊ̯n','bráun','colores','A1.2'),(null,'grau',null,'gris','ɡʁaʊ̯','gráu','colores','A1.2'),
(null,'rosa',null,'rosado','ˈʁoːza','róza','colores','A1.2'),(null,'lila',null,'morado','ˈliːla','lí-la','colores','A1.2'),
-- FAMILIA
(null,'Mutter','die','madre','ˈmʊtɐ','mú-ta','familia','A1.2'),(null,'Vater','der','padre','ˈfaːtɐ','fá-ta','familia','A1.2'),
(null,'Schwester','die','hermana','ˈʃvɛstɐ','shvés-ta','familia','A1.2'),(null,'Bruder','der','hermano','ˈbʁuːdɐ','brú-da','familia','A1.2'),
(null,'Eltern','die','padres (plural)','ˈɛltɐn','él-tern','familia','A1.2'),(null,'Kind','das','niño / hijo','kɪnt','kint','familia','A1.2'),
(null,'Sohn','der','hijo','zoːn','son','familia','A1.2'),(null,'Tochter','die','hija','ˈtɔxtɐ','tój-ta','familia','A1.2'),
(null,'Oma','die','abuela','ˈoːma','óma','familia','A1.2'),(null,'Opa','der','abuelo','ˈoːpa','ópa','familia','A1.2'),
(null,'Familie','die','familia','faˈmiːli̯ə','famí-lie','familia','A1.2')
on conflict (owner, de) do nothing;

-- Ejemplos automáticos
update public.words set example = 'Das ist ' || case when article = 'die' then 'eine ' else 'ein ' end || de || '.'
where owner is null and topic in ('frutas','familia') and example is null and de <> 'Eltern';

update public.words w set example = v.ex from (values
('A','A wie Apfel'),('B','B wie Banane'),('C','C wie Cola'),('D','D wie Danke'),('E','E wie Eis'),('F','F wie Frau'),
('G','G wie Garten'),('H','H wie Haus'),('I','I wie Insel'),('J','J wie Ja'),('K','K wie Katze'),('L','L wie Lampe'),
('M','M wie Mutter'),('N','N wie Nein'),('O','O wie Orange'),('P','P wie Papa'),('Q','Q wie Quelle'),('R','R wie Rot'),
('S','S wie Sonne'),('T','T wie Tisch'),('U','U wie Uhr'),('V','V wie Vater'),('W','W wie Wasser'),('X','X wie Xylophon'),
('Y','Y wie Yoga'),('Z','Z wie Zebra'),('Ä','Ä wie Äpfel'),('Ö','Ö wie Öl'),('Ü','Ü wie Übung'),('ß','ß wie Straße')
) as v(de, ex) where w.owner is null and w.topic = 'abecedario' and w.de = v.de;
