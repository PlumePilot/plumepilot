(function exposeWhatsNew(root) {
  "use strict";

  const definition = {
  "version": "2.35.4",
  "title": "Quiz HTML: appunti più comodi",
  "summary": "Appunti: elenchi automatici, scorciatoia per rimuovere la formattazione e salvataggio corretto.",
  "items": [
    {
      "title": "Elenchi mentre scrivi",
      "text": "In un paragrafo vuoto, scrivi - seguito da spazio per un elenco puntato, oppure 1. seguito da spazio per un elenco numerato. Un doppio Invio permette di uscire dall’elenco."
    },
    {
      "title": "Rimuovi formattazione da tastiera",
      "text": "Seleziona il testo e premi Ctrl + \\ (⌘ + \\ su Mac) per rimuovere la formattazione, inclusi i colori di evidenziazione, come con Tx. Esc continua a interrompere i formati durante la scrittura."
    },
    {
      "title": "Salvataggio degli appunti corretto",
      "text": "“Scarica HTML con appunti” non aggiunge più il testo \\n in alto nella pagina. Queste modifiche valgono per i nuovi quiz HTML; i file già scaricati non vengono aggiornati automaticamente."
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
