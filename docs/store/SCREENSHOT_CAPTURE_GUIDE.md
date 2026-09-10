# PlumePilot — guida agli screenshot degli store

Questa guida definisce il set iniziale di immagini per Chrome Web Store, Microsoft Edge Add-ons e Firefox Add-ons. Catturare le schermate soltanto dalla build congelata e verificata nel verbale di smoke test.

## Stato del set finale

Il set `v2.32.8` è completo: cinque immagini PNG `1280×800` per Firefox, Chrome ed Edge. Le immagini sono opache, prive di metadati e verificate anche alla resa ridotta `640×400`. Nome, matricola, avatar e barra del browser non sono visibili. Gli asset finali restano esterni alla repository e non devono essere committati.

## Preparazione

- Usare un profilo browser pulito e la release candidate installata dal pacchetto destinato allo store.
- Impostare interfaccia e zoom del browser al 100%.
- Usare una finestra sufficientemente ampia per ottenere immagini finali da `1280×800` senza ingrandimenti artificiali.
- Preferire un corso DEMO; non mostrare nome, matricola, email, credenziali, notifiche del sistema o cronologia del browser.
- Chiudere schede non pertinenti e nascondere preferiti o estensioni che possano identificare l'utente.
- Non usare schermate diagnostiche reali, inclusa quella di `LESSON_DATA_INCOMPLETE` già condivisa durante lo sviluppo.
- Conservare gli originali non compressi; produrre ritagli e versioni oscurate come copie separate.

## Set principale

| File proposto | Contenuto | Stato da mostrare | Controlli privacy |
|---|---|---|---|
| `01-corso-standard-1280x800.png` | Popup, tab **Corso** | Standard, progressione visibile | Titolo corso DEMO o fittizio |
| `02-attivita-1280x800.png` | Popup, tab **Attività** | Azioni principali disponibili, nessuna operazione in corso | Nessun URL o dato account |
| `03-raccolta-test-html-1280x800.png` | Quiz HTML generato | Indice capitoli e una domanda leggibile | Solo contenuti DEMO autorizzati |
| `04-dispense-1280x800.png` | Selettore/generazione PDF ed EPUB | Opzioni e stato locale della generazione | Nessun percorso personale di download |
| `05-gaming-traguardi-1280x800.png` | Popup, tab **Traguardi** | Gaming con EXP e ricompense | Nessun dato reale del profilo |

La schermata **Esami** è facoltativa e va usata soltanto con dati interamente fittizi o oscurati in modo irreversibile.

## Composizione

- Mantenere PlumePilot come soggetto principale e lasciare abbastanza contesto Pegaso da chiarire dove opera.
- Usare lo stesso tema e la stessa dimensione del popup nelle prime quattro immagini; riservare Gaming alla quinta.
- Evitare cursori sopra il testo, tooltip, toast transitori, scrollbar a metà e controlli tagliati.
- Non aggiungere affermazioni promozionali dentro lo screenshot che non siano presenti nella scheda store.
- Controllare leggibilità a dimensione reale, non soltanto ingrandita.

## Asset promozionali

- Tile Chrome principale: `440×280` PNG, logo PlumePilot, nome breve e sfondo coerente con l'identità visiva.
- Icona Edge: verificare la resa della sorgente `512×512` ridotta a `300×300` e `128×128`.
- Immagine promozionale grande `1400×560`: facoltativa e rimandabile dopo la prima submission.

## Verifica finale

Per ogni file confermare:

- dimensioni esatte;
- assenza di trasparenza involontaria e artefatti di ridimensionamento;
- assenza di dati personali o credenziali;
- coerenza con la versione indicata nel verbale;
- nome file corrispondente alla schermata;
- apertura corretta dopo una nuova copia/download.
