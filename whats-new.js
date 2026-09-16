(function exposeWhatsNew(root) {
  "use strict";

  const RELEASE = Object.freeze({
    version: "2.33.0",
    title: "Più controllo, più libertà",
    summary: "Nuovi controlli per l’autoplay, quiz annotabili, avvisi sonori e un menu fluttuante su misura.",
    items: Object.freeze([
      Object.freeze({ title: "Autoplay più preciso", text: "Fermalo al 70% e imposta il limite capitoli con campo numerico, pulsanti −/+ o cursore." }),
      Object.freeze({ title: "Quiz HTML annotabili", text: "Aggiungi spiegazioni e osservazioni, usa simboli matematici e conserva tutto nella copia HTML scaricata." }),
      Object.freeze({ title: "Temi per i quiz", text: "Scegli tra Automatico, Chiaro e Scuro anche nei file annotati." }),
      Object.freeze({ title: "Avvisi sonori facoltativi", text: "Ricevi un segnale locale al 70%, al limite capitoli o quando cambia lo stato di una commissione in attesa." }),
      Object.freeze({ title: "Menu fluttuante su misura", text: "Riordina o nascondi i pulsanti operativi e ripristina la disposizione iniziale quando vuoi." }),
      Object.freeze({ title: "Interfaccia più chiara", text: "Raccolte sotto Corso, preferenze richiudibili e controllo commissione direttamente dalla scheda Esami." }),
    ]),
  });

  root.PlumePilotWhatsNew = Object.freeze({
    RELEASE,
    PENDING_KEY: "plumepilotPendingWhatsNewVersion",
    LAST_SEEN_KEY: "plumepilotLastSeenWhatsNewVersion",
  });
})(globalThis);
