(function exposeWhatsNew(root) {
  "use strict";

  const RELEASE = Object.freeze({
    version: "2.34.0",
    title: "Nuove rotte, materiali migliori",
    summary: "PlumePilot arriva su Mercatorum e San Raffaele, migliora gli EPUB e rende più robuste le operazioni sui corsi.",
    items: Object.freeze([
      Object.freeze({ title: "Più università supportate", text: "Usa PlumePilot anche su Mercatorum e San Raffaele, con dati e controlli separati per ogni piattaforma." }),
      Object.freeze({ title: "Menu disponibile dalla home", text: "Apri Esami, Traguardi e Preferenze anche fuori dai corsi; le azioni che richiedono un corso restano chiaramente disattivate." }),
      Object.freeze({ title: "EPUB più fedeli", text: "Formule, tabelle e dispense in stile presentazione vengono riconosciute meglio e adattate con il layout più adatto." }),
      Object.freeze({ title: "Recupero dispense più rapido", text: "I materiali mancanti vengono verificati senza lunghe attese e senza bloccare inutilmente l’esportazione." }),
      Object.freeze({ title: "Operazioni più robuste", text: "Le schede nascoste non innescano cicli di recupero e le notifiche chiuse restano nascoste fino alla fine dell’operazione." }),
      Object.freeze({ title: "Gaming più leggibile", text: "Le cornici premio riempiono meglio l’icona del menu fluttuante e i testi dei Traguardi sono più chiari." }),
    ]),
  });

  root.PlumePilotWhatsNew = Object.freeze({
    RELEASE,
    PENDING_KEY: "plumepilotPendingWhatsNewVersion",
    LAST_SEEN_KEY: "plumepilotLastSeenWhatsNewVersion",
  });
})(globalThis);
