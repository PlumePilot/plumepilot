(function exposeWhatsNew(root) {
  "use strict";

  const definition = {
  "version": "2.35.2",
  "title": "Menu più chiari, strumenti più facili da trovare",
  "summary": "La stessa organizzazione nei due menu, impostazioni autoplay dedicate e pulsanti personalizzabili insieme.",
  "items": [
    {
      "title": "Una sola organizzazione",
      "text": "Il menu principale e quello fluttuante ora condividono Corso, Esami e Preferenze. Nello stile Gaming trovi anche Traguardi. Passare da un menu all’altro diventa più semplice."
    },
    {
      "title": "Corso più ordinato",
      "text": "Progresso, autoplay e materiali per lo studio sono raccolti in gruppi riconoscibili. Le azioni di completamento sono nel gruppo espandibile “Completamento del corso”. “Trova prima attività incompleta” resta in evidenza; per usarlo, attiva autoplay."
    },
    {
      "title": "Autoplay più chiaro",
      "text": "Apri “Impostazioni autoplay” per configurare Video, Test e Arresto. Puoi modificare le scelte anche mentre autoplay è in pausa. Il riepilogo spiega quali impostazioni sono effettivamente in uso; torna a Corso con il pulsante indietro o Esc."
    },
    {
      "title": "Pulsanti come preferisci",
      "text": "In Preferenze → Interfaccia → Pulsanti dei menu puoi scegliere ordine e visibilità all’interno di ciascun gruppo. Le scelte valgono per entrambi i menu. Se avevi nascosto un pulsante nel menu fluttuante, ora sarà nascosto anche nel principale: puoi riattivarlo da qui o ripristinare la disposizione predefinita."
    },
    {
      "title": "Operazioni a portata di mano",
      "text": "Un’indicazione visibile ti riporta all’operazione in corso. Il relativo pulsante resta disponibile anche se era stato nascosto, così puoi raggiungere il comando per interromperla. In Esami trovi “Cancella dati degli esami” anche nel menu fluttuante: elimina solo i dati locali del browser."
    },
    {
      "title": "Leggibilità e navigazione",
      "text": "Caratteri, pulsanti e caselle di selezione seguono regole più uniformi nei temi chiaro e scuro, anche in Gaming. Le schede più lunghe hanno più spazio. Quando apri un sottomenu o un testo informativo, il menu scorre quanto serve per mostrarlo, mantenendo il controllo di apertura visibile."
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
