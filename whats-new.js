(function exposeWhatsNew(root) {
  "use strict";

  const RELEASE = Object.freeze({
    version: "2.35.0",
    title: "Una pausa con Plume, appunti più ricchi",
    summary: "Vola con Plume in Pausa? e organizza meglio lo studio nei test HTML offline.",
    items: Object.freeze([
      Object.freeze({ title: "Pausa?", text: "Concediti 90 secondi di volo con Plume: raccogli dispense, test e obiettivi. Trovi il gioco nelle Preferenze del popup e del menu fluttuante." }),
      Object.freeze({ title: "Appunti nei test HTML", text: "Scrivi Spiegazioni e Osservazioni con elenchi, evidenziatori, richiami e altri strumenti di formattazione. Scarica l’HTML con gli appunti per conservarli offline." }),
      Object.freeze({ title: "Domande da ripassare", text: "Segna ogni domanda come Verificata, Da rivedere o Da verificare e usa i filtri per concentrarti su quelle che ti servono." }),
      Object.freeze({ title: "Plume in volo", text: "I nuovi sprite animati di Plume accompagnano il tema chiaro e quello scuro, anche durante Pausa?." }),
    ]),
  });

  root.PlumePilotWhatsNew = Object.freeze({
    RELEASE,
    PENDING_KEY: "plumepilotPendingWhatsNewVersion",
    LAST_SEEN_KEY: "plumepilotLastSeenWhatsNewVersion",
  });
})(globalThis);
