# PlumePilot

PlumePilot è un assistente locale e open source per la fruizione, l'organizzazione e lo studio dei corsi Pegaso, Mercatorum e San Raffaele ai quali l'utente è già autorizzato ad accedere.

Il progetto è indipendente e non è affiliato, approvato o distribuito da Multiversity o dagli atenei supportati.

## Perché PlumePilot

PlumePilot nasce prima di tutto da alcune esigenze che incontravo ogni giorno come studente.

Trovavo tedioso dover cliccare manualmente su ogni video per proseguire, scaricare le dispense una alla volta e, soprattutto, consultarle dal telefono mentre andavo al lavoro. E poi c’era l’attesa dopo un esame online: giorni, a volte settimane, trascorsi controllando ripetutamente la piattaforma in cerca di aggiornamenti dalla commissione.

Da queste piccole frustrazioni sono nate le funzioni principali di PlumePilot: l’autoplay, la possibilità di riunire le dispense di un intero corso in un unico PDF o EPUB, i test interattivi in HTML per esercitarsi e aggiungere le proprie osservazioni, e il controllo dello stato della commissione per accorgersi il prima possibile di ogni cambiamento.

Sono strumenti che ho creato perché servivano prima di tutto a me. Condividerli è stato il passo successivo, nella speranza che possano rendere un po’ più semplice anche il percorso di altri studenti.

La modalità Gaming aggiunge invece un tocco leggero al percorso di studio attraverso EXP, traguardi e ricompense estetiche, senza modificare le funzionalità principali.

Per dirla con una frase spesso attribuita a Platone: «La vita deve essere vissuta come un gioco».

## Funzionalità principali

- avanzamento automatico tra video, capitoli e sezioni;
- ricerca della prima attività incompleta;
- limite configurabile per le sessioni autoplay;
- completamento facoltativo di test di autovalutazione e Obiettivi;
- raccolta dei test in PDF o HTML interattivo;
- quiz HTML navigabile per capitoli, con spazio per spiegazioni e osservazioni personali;
- creazione locale di dispense complete in PDF ed EPUB;
- barra di progressione del corso e avviso della soglia del 70%;
- controllo dello stato della commissione degli esami online;
- notifiche sonore locali facoltative per soglia del 70%, limite autoplay e cambi della commissione;
- menu fluttuante, tema chiaro/scuro e dimensioni adattive;
- menu fluttuante disponibile anche dalla home e dalla pagina esami, con le azioni del corso disabilitate fuori da un corso;
- modalità Gaming con Traguardi, EXP e ricompense cosmetiche locali.

PlumePilot non accelera i video, non concede accesso a contenuti non disponibili all'utente e non invia dati allo sviluppatore.

## Browser supportati

- Google Chrome;
- Mozilla Firefox 140 o successivo;
- Microsoft Edge.

Le release per i tre browser sono generate dalla stessa base sorgente. Ogni store riceve un pacchetto con il manifest adatto al proprio browser. Le funzioni che operano su un corso richiedono un corso accessibile e aperto nella piattaforma selezionata.

## Privacy

PlumePilot opera sulle pagine e sui servizi delle piattaforme supportate necessari alle funzionalità richieste. Preferenze, stato operativo, dati della commissione e progressi Gaming vengono conservati nel browser.

Il token di sessione già utilizzato dalla piattaforma può essere letto temporaneamente in memoria per effettuare richieste HTTPS verso i servizi della stessa piattaforma. Non viene salvato nello storage, inserito nei log o trasmesso allo sviluppatore.

Non sono presenti server PlumePilot, analytics, pubblicità, profilazione o vendita di dati. Consulta l’[informativa sulla privacy](https://plumepilot.github.io/plumepilot/privacy/) completa.

## Permessi

- `storage`: conserva localmente impostazioni, cache operative, stato commissione, Traguardi ed EXP;
- `offscreen` (solo Chrome ed Edge): mantiene la riproduzione degli avvisi locali compatibile con le regole autoplay di Chromium;
- pagine `*.pegaso.multiversity.click`, `*.mercatorum.multiversity.click` e `*.utsr.multiversity.click`: integra i controlli PlumePilot e comunica con le API già accessibili all'utente autenticato;
- `*.cloudfront.net` e `ita01.s3.eu-west-1.amazonaws.com`: scarica, su richiesta, dispense e immagini necessarie alla creazione locale dei materiali.

PlumePilot non esegue codice JavaScript ospitato in remoto.

## Sviluppo e build

È richiesto Node.js. Non è necessario installare dipendenze aggiuntive: il builder usa la copia locale di JSZip già inclusa nell'estensione.

```bash
node scripts/build-release.mjs
node scripts/validate-release.mjs
```

I comandi producono e verificano:

```text
release/plumepilot-vX.Y.Z-chrome.zip
release/plumepilot-vX.Y.Z-firefox.zip
release/plumepilot-vX.Y.Z-edge.zip
```

## Installazione per lo sviluppo

Il `manifest.json` nella repository è la base usata dal builder e contiene le configurazioni necessarie a produrre le varianti per i tre browser. Prima dei test esegui la build e usa sempre il pacchetto specifico del browser.

### Firefox

Apri `about:debugging#/runtime/this-firefox`, scegli **Carica componente aggiuntivo temporaneo** e seleziona il `manifest.json` estratto da `release/plumepilot-vX.Y.Z-firefox.zip`.

### Chrome ed Edge

Estrai lo ZIP corrispondente, apri `chrome://extensions` oppure `edge://extensions`, abilita la modalità sviluppatore e usa **Carica estensione non pacchettizzata** selezionando la cartella estratta.

Per la regressione finale testa gli stessi ZIP che saranno inviati agli store.

## Supporto e segnalazioni

- Segnalazioni e richieste: [GitHub Issues](https://github.com/PlumePilot/plumepilot/issues)
- Segnalazioni private, sicurezza e privacy: [plumepilot@gmail.com](mailto:plumepilot@gmail.com)
- Istruzioni complete: [SUPPORT.md](SUPPORT.md)

Non includere mai token, matricola, dati degli esami o schermate non oscurate nelle segnalazioni pubbliche.

## Sostieni il progetto

PlumePilot è gratuito e open source. Se vuoi sostenere lo sviluppo, puoi [offrirmi un caffè su Ko-fi](https://ko-fi.com/flo_).

Le donazioni sono facoltative e non sbloccano funzionalità né modificano il trattamento dei dati.

## Licenza

Il codice di PlumePilot è distribuito secondo la **GNU General Public License v3.0 only** (`GPL-3.0-only`). Le librerie, i font e gli altri componenti di terze parti conservano le rispettive licenze, elencate in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Consulta [CHANGELOG.md](CHANGELOG.md) per la cronologia completa delle versioni.

## Marchio e identità visiva

La licenza GPL-3.0-only riguarda il codice. Nome, logo, mascotte e altri elementi identificativi di PlumePilot non concedono automaticamente il diritto di presentare fork o redistribuzioni come prodotti ufficiali. Consulta [TRADEMARKS.md](TRADEMARKS.md).
