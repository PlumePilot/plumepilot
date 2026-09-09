# PlumePilot — checklist di pubblicazione

Aggiornata il 9 settembre 2026. Questa checklist prepara la prima pubblicazione su Chrome Web Store, Microsoft Edge Add-ons e Firefox Add-ons senza includere file aggiuntivi nei pacchetti dell'estensione.

## Stato e criterio di rilascio

- [x] Baseline stabile: `v2.32.6` su `main`.
- [x] Build riproducibile separata per Chrome, Edge e Firefox.
- [x] Manifest V3, licenze, privacy, supporto e Firefox ID definitivo presenti.
- [x] Correzione della numerazione e del recupero capitoli confermata sui test locali e su più corsi reali.
- [ ] Conferma esterna finale sul corso da 29 capitoli organizzato `20 + 9`.
- [x] Feedback EXP verificato: nessun claim o messaggio in Standard; assegnazione regolare in Gaming.
- [x] Menu fluttuante verificato: header e tab fissi, solo il contenuto scorre.
- [ ] PR #3 della candidata `v2.32.7` integrata in `main`.
- [x] Version bump e aggiornamento coerente di manifest, changelog e validatore a `2.32.7`.
- [ ] Congelamento della release candidate finale.

Non caricare i pacchetti negli store finché la conferma esterna `20 + 9` e lo smoke test finale non sono stati chiusi. Le bozze, i testi e gli asset possono essere completati nel frattempo.

## Strategia Git

- `fix/test-export-chapter-numbering`: integrato con la PR #1 nella patch `v2.32.6`.
- `fix/standard-exp-floating-tabs`: PR #3 in bozza; contiene la candidata `v2.32.7`, il recupero dinamico dell'indice master, il gate EXP e le tab fisse.
- `chore/store-submission-prep`: contiene esclusivamente documentazione e preparazione store.
- `main`: riceve i branch solo dopo revisione e test.
- Il tag di release va creato soltanto sul commit realmente caricato negli store.

Prima del merge verificare che ogni PR sia aggiornata rispetto a `main` e che non contenga file `release/`, credenziali DEMO, screenshot con dati personali o materiali generati dagli utenti.

## Metadati condivisi

- [x] Nome: **PlumePilot – Assistente per Pegaso**.
- [x] Descrizione breve nel manifest: entro 132 caratteri.
- [x] Descrizione estesa italiana: `SUBMISSION_COPY_IT.md`.
- [x] Scopo unico e giustificazioni dei permessi: `SUBMISSION_COPY_IT.md`.
- [x] Privacy policy: <https://plumepilot.github.io/plumepilot/privacy/>.
- [x] Homepage: <https://plumepilot.github.io/plumepilot/>.
- [x] Supporto: <https://github.com/PlumePilot/plumepilot/issues>.
- [x] Contatto privato: `plumepilot@gmail.com`.
- [x] Licenza: GPL-3.0-only.
- [ ] Confermare la categoria più vicina disponibile: **Produttività**; su AMO aggiungere **Istruzione** se presente.
- [ ] Incollare i testi nelle bozze e controllare i contatori effettivi dei portali.

## Privacy e permessi

- [x] `storage`: solo preferenze, cache operative e stato locale.
- [x] `*.pegaso.multiversity.click`: integrazione con pagine e API Pegaso accessibili alla sessione corrente.
- [x] `*.cloudfront.net` e `ita01.s3.eu-west-1.amazonaws.com`: recupero su richiesta di materiali e immagini per esportazioni locali.
- [x] Codice remoto: **No**; nessun JavaScript remoto viene caricato o eseguito.
- [x] Nessun server PlumePilot, analytics, pubblicità, profilazione o vendita di dati.
- [ ] Riportare nei moduli Chrome ed Edge le categorie conservative indicate nella matrice di `SUBMISSION_COPY_IT.md`.
- [ ] Controllare che le dichiarazioni mostrate dai portali coincidano con manifest e privacy policy prima dell'invio.
- [x] Firefox: mantenere `authenticationInfo`, `websiteContent` e `websiteActivity` come dati richiesti.

## Asset

| Asset | Chrome | Edge | Stato |
|---|---:|---:|---|
| Icona | 128×128 PNG nel pacchetto | 300×300 consigliata, minimo 128×128 | 128×128 e 512×512 esistenti; verifica visiva da fare |
| Screenshot principali | 1280×800, da 1 a 5 | 1280×800 o 640×480, fino a 6 | da produrre |
| Tile piccola | 440×280 | 440×280 facoltativa | da produrre |
| Tile grande | 1400×560 facoltativa | 1400×560 facoltativa | da produrre dopo la prima submission |
| Video YouTube | facoltativo | facoltativo, senza pubblicità | utile per revisori; da registrare con DEMO fresca |

Set screenshot consigliato, tutto in italiano e senza dati personali:

1. popup **Corso** in modalità Standard con progressione;
2. popup **Attività** con le azioni principali;
3. raccolta dei test in HTML interattivo;
4. creazione locale di PDF ed EPUB;
5. modalità Gaming con Traguardi e ricompense.

La schermata della commissione è facoltativa: inserirla soltanto con dati interamente fittizi o oscurati. Non usare la stessa immagine inviata per diagnosticare `LESSON_DATA_INCOMPLETE`, perché contiene titoli e dettagli provenienti da un corso reale.

## Verifica della release candidate

- [x] Aggiornare la versione in `manifest.json`.
- [x] Aggiornare il controllo versione in `scripts/validate-release.mjs`.
- [x] Aggiungere al `CHANGELOG.md` soltanto fix confermati.
- [x] Eseguire `node scripts/build-release.mjs`.
- [x] Eseguire `node scripts/validate-release.mjs`.
- [x] Conservare nome, dimensione e SHA-256 dei tre ZIP.
- [x] Verificare che Chrome ed Edge siano identici oppure documentare la differenza attesa.
- [ ] Costruire in una directory vuota e conservare il `SHA256SUMS.txt` generato dal builder.
- [ ] Verificare che gli hash del file scaricato, del verbale e del portale coincidano prima di ogni installazione o upload.
- [ ] Installare da zero gli stessi ZIP destinati agli store.
- [x] Audit statico: debug disattivato e nessun log esplicito di token, header Authorization o payload API.
- [ ] Controllare assenza di errori runtime nelle console durante lo smoke test.

Build candidata corretta `v2.32.7` verificata:

- Chrome/Edge: 1.945.033 byte, SHA-256 `ee24d29a4f4fd126db0ec1dcf5a1632e511a4400f644c1f8d98361c00b9e60fa`;
- Firefox: 1.945.163 byte, SHA-256 `d9257e6a5c8c8f54bd5d048e50e722f0bf60d281b53a36baeffc03a073655fa4`.

L'archivio Chrome con SHA-256 `45b621e75e9dc0d9bbb14e0583fab63bd7f6129bfe3142d073c54fea71ec76b0` è una candidata precedente priva della gestione di `folder_id: 0` e non deve essere installato né caricato negli store.

Conferme manuali già ricevute sulla candidata corretta:

- raccolta test e allineamento capitoli positivi su più corsi;
- EXP e relativi messaggi corretti in Standard e Gaming;
- tab del menu fluttuante correttamente fisse;
- possibili test isolati non recuperabili vengono elencati come non inclusi senza disallineare la raccolta.

## Smoke test comune

- [ ] Apertura popup e salvataggio preferenze.
- [ ] Attivazione/disattivazione globale dell'estensione.
- [ ] Autoplay e ricerca della prima attività incompleta.
- [ ] Limite sessione e arresto ai test.
- [ ] Completamento facoltativo di Test e Obiettivi.
- [ ] Raccolta test PDF e HTML, incluso un capitolo mancante o non leggibile.
- [ ] PDF ed EPUB: avvio, completamento e annullamento.
- [ ] Barra di progressione e avviso 70%.
- [ ] Stato commissione e cancellazione cache.
- [ ] Menu fluttuante nei tre formati e nei temi chiaro/scuro.
- [ ] Modalità Gaming, assegnazione EXP, reset e assenza di UI Gaming in Standard.
- [ ] Ricaricamento pagina, nuova scheda e riavvio browser.

Ripetere lo smoke test almeno su Chrome Stable, Edge Stable e Firefox 140 o successivo. Annotare sistema operativo e versioni browser nel verbale di test.

Usare `SMOKE_TEST_REPORT.md` come verbale e `SCREENSHOT_CAPTURE_GUIDE.md` per le immagini delle schede store.

## Preparazione delle bozze

### Chrome Web Store

- [ ] Creare l'elemento e caricare temporaneamente la release candidate soltanto quando congelata.
- [ ] Compilare Store Listing, Privacy, Distribution e Test instructions.
- [ ] Impostare pubblicazione differita per evitare una pubblicazione automatica non coordinata.
- [ ] Allegare almeno icona, tile piccola e uno screenshot.

### Microsoft Edge Add-ons

- [ ] Creare la scheda separata in Partner Center.
- [ ] Visibilità: **Public**; mercati: tutti, salvo diversa decisione.
- [ ] Compilare Properties, Privacy, Store listings e Certification notes.
- [ ] Riutilizzare pacchetto Chromium, testi e screenshot dopo smoke test Edge.
- [ ] Non attendere l'approvazione Chrome: le due revisioni possono partire in parallelo.

### Firefox Add-ons

- [ ] Caricare il pacchetto Firefox con ID `plumepilot@fabiofloris`.
- [ ] Risolvere errori e warning del validatore AMO prima dell'invio.
- [ ] Selezionare solo Firefox Desktop, salvo futuri test Android.
- [ ] Allegare il pacchetto sorgente e le istruzioni di `FIREFOX_SOURCE_SUBMISSION.md`.
- [ ] Riportare in Notes for Reviewers librerie vendor, versioni e collegamenti indicati in `THIRD_PARTY_NOTICES.md`.

## Accesso per i revisori

- [ ] Richiedere una nuova utenza DEMO Pegaso il più vicino possibile all'invio.
- [ ] Annotare data e ora esatte di scadenza.
- [ ] Verificare le credenziali in una finestra privata prima di inserirle nei portali.
- [ ] Inserire credenziali solo nei campi privati dei portali, mai nella repository.
- [ ] Registrare un breve video di riserva mentre la DEMO è valida.
- [ ] Se la DEMO scade durante la revisione, rispondere subito fornendo nuove credenziali.

## Invio e monitoraggio

- [ ] Confrontare gli SHA-256 caricati con il verbale finale.
- [ ] Inviare Chrome ed Edge in parallelo; inviare Firefox appena superato il validatore AMO.
- [ ] Archiviare ID e URL delle tre schede.
- [ ] Monitorare email e dashboard per richieste dei revisori.
- [ ] Non modificare `main` o rigenerare i pacchetti durante la revisione senza aprire una nuova patch version.
- [ ] Pubblicare la release GitHub e il tag dopo l'accettazione o secondo la strategia di lancio scelta.

## Riferimenti ufficiali

- Chrome: <https://developer.chrome.com/docs/webstore/publish>
- Chrome, immagini: <https://developer.chrome.com/docs/webstore/images>
- Chrome, privacy: <https://developer.chrome.com/docs/webstore/cws-dashboard-privacy>
- Edge: <https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension>
- Firefox: <https://extensionworkshop.com/documentation/publish/submitting-an-add-on/>
- Firefox, sorgenti: <https://extensionworkshop.com/documentation/publish/source-code-submission/>
- Firefox, dichiarazioni dati: <https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/>
