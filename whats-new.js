(function exposeWhatsNew(root) {
  "use strict";

  const definition = {
    "version": "2.35.5",
    "title": "Quiz offline e schermo intero continuo",
    "summary": "Incolla Markdown nei quiz HTML, gestisci meglio gli appunti e passa da un video all’altro a schermo intero.",
    "items": [
      {
        "title": "Incolla appunti formattati",
        "text": "Nei nuovi quiz HTML, incolla testo formattato o Markdown in Spiegazione e Osservazioni. Gli elenchi numerati conservano il numero di partenza e il testo nei blocchi di codice resta letterale."
      },
      {
        "title": "Quiz HTML più comodi da consultare",
        "text": "Usa l’icona della barra laterale per nascondere o mostrare i capitoli. Su Chrome ed Edge desktop puoi anche salvare gli appunti nello stesso file HTML aperto dal disco. Scarica HTML con appunti permette di salvare una copia, anche su Firefox."
      },
      {
        "title": "Schermo intero continuo",
        "text": "Su Pegaso, Mercatorum e San Raffaele, attiva Schermo intero continuo in Corso → Autoplay e usa l’icona del player. Con l’autoplay, lo schermo intero resta attivo al cambio di video. Premi Esc o usa la stessa icona per uscire."
      },
      {
        "title": "Menu fluttuante più leggibile",
        "text": "L’avanzamento della raccolta di test e dispense compare una sola volta. Nel tema Gaming, gli avvisi EXP lasciano accessibili le schede del menu."
      }
    ]
  };
  const RELEASE = Object.freeze({
    ...definition,
    items: Object.freeze(definition.items.map((item) => Object.freeze(item))),
  });

  root.PlumePilotWhatsNew = Object.freeze({
    RELEASE,
    PENDING_KEY: "plumepilotPendingWhatsNewVersion",
    LAST_SEEN_KEY: "plumepilotLastSeenWhatsNewVersion",
  });
})(globalThis);
