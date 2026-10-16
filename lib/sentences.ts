export type Sentence = { text: string; es: string }

export const SENTENCES: Record<'A1.1' | 'A1.2', Sentence[]> = {
  'A1.1': [
    { text: 'Ich trinke jeden Morgen Kaffee.', es: 'Tomo café cada mañana.' },
    { text: 'Das Wetter ist heute schön.', es: 'El clima está lindo hoy.' },
    { text: 'Meine Mutter kocht gern Suppe.', es: 'A mi mamá le gusta cocinar sopa.' },
    { text: 'Ich fahre mit dem Bus zur Arbeit.', es: 'Voy al trabajo en autobús.' },
    { text: 'Hast du eine Bruder oder Schwester?', es: '¿Tienes un hermano o hermana?' },
    { text: 'Er kommt um acht Uhr nach Hause.', es: 'Él llega a casa a las ocho.' },
    { text: 'Ich brauche eine neue Tasche.', es: 'Necesito una bolsa nueva.' },
    { text: 'Wir essen abends zusammen.', es: 'Cenamos juntos por la noche.' },
    { text: 'Kannst du mir bitte helfen?', es: '¿Puedes ayudarme, por favor?' },
    { text: 'Der Zug hat zehn Minuten Verspätung.', es: 'El tren tiene diez minutos de retraso.' },
  ],
  'A1.2': [
    { text: 'Ich möchte nächste Woche einen Termin vereinbaren.', es: 'Quisiera agendar una cita la próxima semana.' },
    { text: 'Die Wohnung ist teuer, aber sehr zentral.', es: 'El apartamento es caro, pero muy céntrico.' },
    { text: 'Am Wochenende bin ich bei Freunden eingeladen.', es: 'El fin de semana estoy invitado a casa de amigos.' },
    { text: 'Könnten Sie das bitte einmal wiederholen?', es: '¿Podría repetir eso una vez, por favor?' },
    { text: 'Meine Kollegin fährt mit dem Rad ins Büro.', es: 'Mi compañera va en bicicleta a la oficina.' },
    { text: 'Der Arzt sagt, ich soll mehr Wasser trinken.', es: 'El doctor dice que debo tomar más agua.' },
    { text: 'Ich habe mein Handy in der Jackentasche vergessen.', es: 'Dejé mi celular en el bolsillo de la chaqueta.' },
    { text: 'Wir haben gestern einen tollen Film gesehen.', es: 'Ayer vimos una película genial.' },
    { text: 'In Deutschland beginnt die Schule früh am Morgen.', es: 'En Alemania la escuela empieza temprano en la mañana.' },
    { text: 'Ich verstehe die Frage leider nicht ganz.', es: 'Lamentablemente no entiendo bien la pregunta.' },
  ],
}
