# Checklist PR — Menù fluttuante personalizzabile

Branch: `feature/floating-menu-layout`  
Base: `integration/next-release`

## Ambito

- [x] Rendere ordinabili i quattro pulsanti operativi del pannello Corso.
- [x] Permettere di mostrare o nascondere ogni pulsante.
- [x] Mantenere launcher, schede, progresso, stato e Preferenze sempre disponibili.
- [x] Condividere la disposizione tra modalità Standard e Gaming.
- [x] Non introdurre nuove chiamate API o permessi.
- [ ] Valutare in una PR futura altri blocchi strutturali configurabili.

## Preferenze e accessibilità

- [x] Sezione dedicata nelle Preferenze del popup.
- [x] Riordinamento tramite trascinamento.
- [x] Alternativa da tastiera tramite pulsanti “Sposta su” e “Sposta giù”.
- [x] Controlli di visibilità separati.
- [x] Ripristino della disposizione predefinita.
- [x] Conferma accessibile del salvataggio.
- [x] Conservazione delle etichette e della palette esistenti.

## Persistenza e compatibilità

- [x] Schema versionato in `floatingMenuLayout`.
- [x] Identificatori indipendenti dalle etichette visibili.
- [x] Normalizzazione di valori mancanti, duplicati o sconosciuti.
- [x] Inserimento automatico in coda dei nuovi pulsanti futuri.
- [x] Aggiornamento del menu nelle schede già aperte tramite storage.
- [x] Configurazione predefinita identica all’ordine precedente.

## Gaming

- [x] Traguardo “Su misura”.
- [x] Descrizione: “Personalizza per la prima volta il tuo menu fluttuante.”
- [x] Ricompensa: 20 EXP.
- [x] Sblocco solo dopo una modifica reale in modalità Gaming.
- [x] Nessuno sblocco aprendo le Preferenze o ripristinando il default.
- [x] Nessuna assegnazione retroattiva da modalità Standard.

## Test automatici

- [x] Default e normalizzazione.
- [x] Ordine personalizzato.
- [x] Visibilità.
- [x] Duplicati e identificatori sconosciuti.
- [x] Presenza degli hook di rendering, manifest e traguardo.
- [ ] Eseguire `node tests/floating-menu-layout.mjs`.
- [ ] Eseguire l’intera suite di test.

## Test manuali

- [ ] Chrome: trascinamento, frecce, visibilità e persistenza.
- [ ] Edge: trascinamento, frecce, visibilità e persistenza.
- [ ] Firefox: trascinamento, frecce, visibilità e persistenza.
- [ ] Standard e Gaming.
- [ ] Tema chiaro, scuro e sistema.
- [ ] Menu piccolo, medio e grande.
- [ ] Più schede Pegaso aperte.
- [ ] Tutti i pulsanti nascosti: Preferenze ancora raggiungibili.
- [ ] Operazione in corso: nessuna interruzione dopo il riordino.
- [ ] Nessuna regressione su autoplay, test, obiettivi, raccolte e dispense.
- [ ] Traguardo assegnato una sola volta nelle condizioni previste.
