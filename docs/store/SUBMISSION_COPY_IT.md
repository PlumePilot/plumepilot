# PlumePilot — testi italiani per gli store

Questi testi costituiscono la sorgente unica per Chrome Web Store, Microsoft Edge Add-ons e Firefox Add-ons. Prima dell'invio confrontarli con i campi effettivamente mostrati dai portali.

## Identità

**Nome**

> PlumePilot – Assistente per Pegaso

**Descrizione breve**

> Assistente per Pegaso: automatizza lezioni e attività, crea materiali di studio e controlla lo stato degli esami online.

La descrizione breve coincide intenzionalmente con `manifest.json`; su Edge può essere modificata soltanto caricando un nuovo pacchetto.

## Descrizione estesa

PlumePilot è un assistente locale e open source pensato per rendere più pratica la fruizione e l'organizzazione dei corsi Pegaso ai quali l'utente è già autorizzato ad accedere.

L'estensione integra nella piattaforma controlli per avanzare tra video, capitoli e sezioni, trovare la prima attività incompleta e impostare un limite alle sessioni di riproduzione automatica. L'utente può inoltre scegliere di completare le attività supportate, raccogliere i test di autovalutazione in un PDF o in un quiz HTML interattivo e creare localmente dispense complete in PDF o EPUB.

PlumePilot mostra la progressione del corso e l'avvicinamento alla soglia del 70%, facilita il controllo dello stato della commissione degli esami online e offre un menu fluttuante con tema e dimensioni configurabili.

La modalità Gaming è facoltativa: aggiunge Traguardi, EXP e ricompense cosmetiche conservati nel browser, senza modificare le funzioni disponibili in modalità Standard.

Privacy e controllo rimangono centrali:

- l'elaborazione dei test e dei materiali avviene nel browser;
- i documenti generati non vengono caricati su server PlumePilot;
- preferenze, cache operative e progressi restano nello storage locale;
- il token della sessione Pegaso viene usato soltanto temporaneamente per le richieste necessarie e non viene salvato;
- non sono presenti analytics, pubblicità, profilazione o vendita di dati;
- PlumePilot non esegue codice remoto.

PlumePilot non accelera i video e non concede accesso a contenuti che non siano già disponibili all'utente. È un progetto indipendente e non è affiliato, approvato o distribuito dall'Università Telematica Pegaso o da Multiversity.

## Scopo unico

> Integrare nella piattaforma Pegaso strumenti locali per agevolare la fruizione, l'organizzazione e lo studio dei corsi ai quali l'utente è già autorizzato ad accedere.

## Categoria e parole chiave

**Categoria proposta:** Produttività. Su Firefox aggiungere Istruzione come seconda categoria se disponibile.

**Termini Edge proposti:**

> Pegaso; studio; università telematica; dispense; EPUB; test; produttività

Verificare nel portale il limite corrente prima dell'inserimento. Evitare varianti ripetitive o nomi di prodotti non pertinenti.

## Collegamenti

- Homepage: <https://plumepilot.github.io/plumepilot/>
- Privacy: <https://plumepilot.github.io/plumepilot/privacy/>
- Supporto: <https://github.com/PlumePilot/plumepilot/issues>
- Contatto privato: `plumepilot@gmail.com`
- Codice sorgente: <https://github.com/PlumePilot/plumepilot>

## Giustificazione dei permessi

### `storage`

> Necessario per conservare nel profilo del browser preferenze, cache operative, stato delle operazioni, informazioni normalizzate della commissione e, quando la modalità Gaming è attiva, Traguardi, EXP e ricompense. I dati non vengono inviati allo sviluppatore.

### `https://*.pegaso.multiversity.click/*`

> Necessario per mostrare i controlli di PlumePilot nelle pagine Pegaso e comunicare con le API della piattaforma già accessibili all'utente autenticato. Le operazioni riguardano corsi, attività, test, materiali ed esami online e avvengono nell'ambito della sessione corrente.

### `https://*.cloudfront.net/*`

> Necessario per scaricare, soltanto su richiesta dell'utente, dispense, immagini e altre risorse fornite dalla piattaforma e utilizzarle nella generazione locale di PDF, EPUB o raccolte di test.

### `https://ita01.s3.eu-west-1.amazonaws.com/*`

> Necessario per scaricare, soltanto su richiesta dell'utente, materiali e immagini Pegaso ospitati su Amazon S3 e utilizzarli nella generazione locale dei documenti.

## Codice remoto

**Risposta:** No, PlumePilot non utilizza codice remoto.

**Nota facoltativa:**

> Tutto il codice JavaScript eseguito è incluso nel pacchetto dell'estensione. Le richieste di rete recuperano dati e materiali Pegaso, non codice eseguibile. Le librerie di terze parti sono incluse localmente nel pacchetto con le rispettive licenze.

## Matrice delle dichiarazioni dati

La selezione deve essere prudente e coerente sui tre store. “Trattato” non significa che lo sviluppatore riceva il dato: PlumePilot lo usa per fornire la funzione richiesta e comunica esclusivamente con i servizi Pegaso necessari.

| Categoria funzionale | Chrome/Edge | Firefox | Motivo |
|---|---|---|---|
| Informazioni di autenticazione | dichiarare | `authenticationInfo` | il token di sessione può essere usato temporaneamente verso i servizi Pegaso; non è salvato |
| Contenuto dei siti web | dichiarare | `websiteContent` | corsi, test, materiali, percentuali e dati mostrati dalla piattaforma vengono letti per le funzioni richieste |
| Attività/interazioni sul sito | dichiarare come attività utente | `websiteActivity` | vengono elaborate azioni quali avanzamento, completamento, salvataggio e download |
| Dati tecnici/telemetria | non dichiarare | non dichiarare | nessuna telemetria o diagnostica viene inviata |
| Comunicazioni personali | non dichiarare | non dichiarare | non vengono trattate email, chat o messaggi personali |
| Dati finanziari/sanitari/localizzazione | non dichiarare | non dichiarare | non necessari alle funzionalità |

Certificazioni da confermare nei moduli Chrome ed Edge:

- i dati non vengono venduti né trasferiti per finalità estranee allo scopo dichiarato;
- i dati non vengono usati per pubblicità, profilazione o valutazioni creditizie;
- il trattamento è limitato alle funzionalità visibili e richieste dall'utente;
- le dichiarazioni coincidono con la privacy policy pubblica.

Non selezionare “nessun dato” senza una nuova valutazione: l'estensione tratta contenuti e autenticazione e invia richieste ai servizi Pegaso, anche se non dispone di server propri e lo sviluppatore non riceve tali informazioni.

## Informazioni commerciali e contenuti

- Pagamenti richiesti: No.
- Servizi non gratuiti aggiuntivi: PlumePilot è gratuito, ma funziona soltanto sui contenuti Pegaso ai quali l'utente possiede già un accesso valido.
- Pubblicità: No.
- Acquisti in-app: No.
- Contenuti maturi: No.
- Affiliazione ufficiale con Pegaso o Multiversity: No.
- Disponibilità proposta: pubblica, tutti i mercati; interfaccia e descrizione iniziale in italiano.

## Nota breve sull'indipendenza

> PlumePilot è un progetto indipendente e non è affiliato, approvato o distribuito dall'Università Telematica Pegaso o da Multiversity. Per funzionare richiede che l'utente acceda autonomamente alla piattaforma con un account valido.
