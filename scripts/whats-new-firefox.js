(function exposeWhatsNew(root) {
  "use strict";

  const definition = {
  "version": "2.35.1",
  "title": "Una pausa con Plume, appunti più ricchi e nuovi fix",
  "summary": "Tutte le novità della 2.35 e le correzioni della 2.35.1, insieme in questo aggiornamento.",
  "items": [
    {
      "title": "Pausa?",
      "text": "Concediti 90 secondi di volo con Plume: raccogli dispense, test e obiettivi. Trovi il gioco nelle Preferenze del popup e del menu fluttuante."
    },
    {
      "title": "Appunti nei test HTML",
      "text": "Scrivi Spiegazioni e Osservazioni con elenchi, evidenziatori, richiami e altri strumenti di formattazione. Scarica l’HTML con gli appunti per conservarli offline."
    },
    {
      "title": "Domande da ripassare",
      "text": "Segna ogni domanda come Verificata, Da rivedere o Da verificare e usa i filtri per concentrarti su quelle che ti servono."
    },
    {
      "title": "Autoplay in ordine",
      "text": "L’autoplay segue l’ordine dei video, anche quando sono già completati: puoi ripassare senza cliccarli uno per uno. Se preferisci proseguire solo sui video da completare, attiva “Salta videolezioni completate” nelle Opzioni autoplay. L’opzione è disattivata di default. Migliorata anche la ripresa con capitoli e paragrafi chiusi."
    },
    {
      "title": "Prima attività incompleta",
      "text": "Il segnalibro dà priorità ai capitoli indicati come incompleti, nell’ordine del corso, e verifica Obiettivi, video e test. Gli Obiettivi già al 100% vengono esclusi. Se i primi candidati non contengono attività pendenti, la ricerca controlla anche gli altri capitoli. I test vengono mostrati senza risolverli, indipendentemente dalle impostazioni dell’autoplay."
    },
    {
      "title": "EPUB più leggibili e collegati",
      "text": "Il testo vicino a formule e diagrammi torna scorrevole quando può essere separato in sicurezza. Le parti complesse restano immagini. Migliorata la resa dei simboli matematici e ridotta la duplicazione delle immagini. Un indice cliccabile dopo la copertina e il link “Torna all’indice” aiutano a muoversi tra i capitoli. Per opzioni aggiuntive, nelle finestre di esportazione trovi il link al mio strumento desktop PdfToEpub converter."
    },
    {
      "title": "Il titolo giusto nei file",
      "text": "Le raccolte di dispense e test conservano il titolo della lezione da cui le hai avviate, anche se nel frattempo torni alla home o apri un’altra lezione."
    },
    {
      "title": "Limite capitoli più compatto",
      "text": "Nel menu fluttuante, il selettore −/+ occupa solo lo spazio necessario ed è affiancato dall’etichetta “Capitoli”."
    },
    {
      "title": "Plume con candela nei menu",
      "text": "Nel tema scuro, Plume torna con la candela nei menu Gaming. Durante Pausa? continua a volare senza candela."
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
