# PlumePilot

PlumePilot è un assistente locale e open source per la fruizione, l'organizzazione e lo studio dei corsi Pegaso ai quali l'utente è già autorizzato ad accedere.

Il progetto è indipendente e non è affiliato, approvato o distribuito dall'Università Telematica Pegaso o da Multiversity.

## Perché PlumePilot

PlumePilot è nato inizialmente come strumento personale, dalla necessità di rendere più pratica la fruizione quotidiana dei corsi e di aggiungere alcune funzionalità che ritengo necessarie.

Lavorare e studiare contemporaneamente non è facile. Molti studenti che frequentano l’Università Telematica Pegaso sono anche lavoratori, e riuscire a studiare durante il tragitto casa-lavoro diventa quasi obbligatorio per prepararsi a un esame. Scaricare una dispensa alla volta è estremamente tedioso e il formato PDF non si adatta bene allo schermo di tablet e telefoni. La funzionalità che consente di scaricare un’unica dispensa, sia in formato PDF sia in EPUB, è pensata proprio per questo.

Questo è solo un esempio, ma penso che racconti perfettamente lo spirito che ha portato alla creazione di questo strumento, che spero possa essere utile anche ad altri e che, grazie alle vostre esperienze, potremo migliorare ulteriormente.

Scoprirete che PlumePilot offre anche una modalità particolare, che forse alcuni di voi gradiranno più di altri: la modalità **Gaming**! A cosa serve? Non aggiunge alcuna funzione extra, se non quel tono giocoso che personalmente apprezzo. Il nostro percorso richiede impegno, ma un po’ di leggerezza non guasta.

Per dirla con una frase spesso attribuita a Platone: «La vita deve essere vissuta come un gioco».


## Funzionalità principali

- avanzamento automatico tra video, capitoli e sezioni;
- ricerca della prima attività incompleta;
- limite configurabile per le sessioni autoplay;
- completamento facoltativo di test di autovalutazione e Obiettivi;
- raccolta dei test in PDF o HTML interattivo;
- creazione locale di dispense complete in PDF ed EPUB;
- barra di progressione del corso e avviso della soglia del 70%;
- controllo dello stato della commissione degli esami online;
- menu fluttuante, tema chiaro/scuro e dimensioni adattive;
- modalità Gaming con Traguardi, EXP e ricompense cosmetiche locali.

PlumePilot non accelera i video, non concede accesso a contenuti non disponibili all'utente e non invia dati allo sviluppatore.

## Browser supportati

- Google Chrome;
- Mozilla Firefox 140 o successivo;
- Microsoft Edge.

Le release per i tre browser sono generate dalla stessa base sorgente. Ogni store riceve un pacchetto con il manifest adatto al proprio browser.

## Privacy

PlumePilot opera sulle pagine e sui servizi Pegaso necessari alle funzionalità richieste. Preferenze, stato operativo, dati della commissione e progressi Gaming vengono conservati nel browser.

Il token di sessione già utilizzato dalla piattaforma può essere letto temporaneamente in memoria per effettuare richieste HTTPS verso i servizi Pegaso. Non viene salvato nello storage, inserito nei log o trasmesso allo sviluppatore.

Non sono presenti server PlumePilot, analytics, pubblicità, profilazione o vendita di dati. Consulta l’[informativa sulla privacy](https://plumepilot.github.io/plumepilot/privacy/) completa.

## Permessi

- `storage`: conserva localmente impostazioni, cache operative, stato commissione, Traguardi ed EXP;
- pagine `*.pegaso.multiversity.click`: integra i controlli PlumePilot e comunica con le API Pegaso già accessibili all'utente autenticato;
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

Il `manifest.json` nella repository è la base usata dal builder e contiene le configurazioni necessarie a produrre entrambe le varianti. Prima dei test esegui la build e usa sempre il pacchetto specifico del browser.

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

## Licenza

Il codice di PlumePilot è distribuito secondo la **GNU General Public License v3.0 only** (`GPL-3.0-only`). Le librerie, i font e gli altri componenti di terze parti conservano le rispettive licenze, elencate in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

PlumePilot rimarrà gratuito. Eventuali donazioni saranno sempre volontarie e non necessarie per sbloccare funzionalità.

Consulta [CHANGELOG.md](CHANGELOG.md) per la cronologia completa delle versioni.

## Marchio e identità visiva

La licenza GPL-3.0-only riguarda il codice. Nome, logo, mascotte e altri elementi identificativi di PlumePilot non concedono automaticamente il diritto di presentare fork o redistribuzioni come prodotti ufficiali. Consulta [TRADEMARKS.md](TRADEMARKS.md).
