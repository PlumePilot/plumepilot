(function exposeWhatsNew(root) {
  "use strict";

  const definition = {
  "version": "2.35.3",
  "title": "Salvataggio degli appunti nei quiz HTML",
  "summary": "Corretto un problema nel salvataggio dei quiz HTML con appunti.",
  "items": [
    {
      "title": "Salvataggi senza caratteri indesiderati",
      "text": "Nei nuovi quiz HTML, “Scarica HTML con appunti” non aggiunge più il testo \\n in alto nella pagina a ogni salvataggio. I file HTML già scaricati non vengono aggiornati automaticamente."
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
