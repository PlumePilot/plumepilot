(function exposeWhatsNew(root) {
  "use strict";

  const definition = {
    "version": "2.36.0",
    "title": "PlumePilot ora anche in inglese",
    "summary": "PlumePilot in italiano e inglese, con miglioramenti per quiz e avvisi sonori.",
    "items": [
      {
        "title": "PlumePilot in italiano e inglese",
        "text": "Apri Preferenze → Interfaccia → Lingua dal menu principale o fluttuante. L’italiano è la lingua iniziale e la scelta si applica a entrambi i menu e ai nuovi avvisi di PlumePilot."
      },
      {
        "title": "Interfaccia delle esportazioni tradotta",
        "text": "Le schermate di esportazione e i testi aggiunti da PlumePilot nei quiz HTML e PDF e nelle dispense PDF ed EPUB seguono la lingua selezionata. Domande, risposte e materiali mantengono la lingua del corso."
      },
      {
        "title": "Quiz HTML nella lingua scelta, anche offline",
        "text": "Il quiz HTML conserva la lingua scelta al momento dell’esportazione, anche quando lo riapri offline o scarichi una copia con gli appunti."
      },
      {
        "title": "Navigazione più comoda",
        "text": "Il pulsante per mostrare o nascondere i capitoli resta accessibile mentre scorri i quiz HTML. Nei menu, etichette e selettori sono più coerenti e le tab inglesi si adattano alle tre dimensioni."
      },
      {
        "title": "Pausa? segue la lingua di PlumePilot",
        "text": "I comandi, le istruzioni e il riepilogo finale del minigioco usano la lingua scelta nelle Preferenze."
      },
      {
        "title": "Avvisi sonori più affidabili",
        "text": "Se il documento audio di Chrome non riesce ad avviare il suono, PlumePilot prova a riprodurlo in una scheda della piattaforma. Attiva Notifiche sonore nelle Preferenze e scegli un volume maggiore di zero."
      },
      {
              "title": "Potresti esserti perso… dalla 2.35.5",
              "text": "Nei nuovi quiz HTML puoi incollare appunti formattati o Markdown e nascondere i capitoli con l’icona della barra laterale. Su Chrome ed Edge desktop puoi salvare gli appunti nello stesso file aperto dal disco; Scarica HTML con appunti salva una copia anche su Firefox. In Corso → Autoplay, Schermo intero continuo mantiene il player a schermo intero al cambio di video sulle piattaforme supportate. Il menu fluttuante evita i riepiloghi duplicati e lascia accessibili le tab durante gli avvisi EXP."
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
