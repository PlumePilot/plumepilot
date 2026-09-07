# PlumePilot — note per i revisori

Documento modello per i campi privati di Chrome Web Store, Microsoft Edge Add-ons e Firefox Add-ons. Sostituire ogni segnaposto immediatamente prima dell'invio. Non committare mai credenziali reali.

## Note comuni

PlumePilot integra strumenti locali nelle pagine Pegaso accessibili all'utente autenticato. Non dispone di un server proprio e non offre una schermata utile fuori dalla piattaforma supportata.

Per la revisione è quindi necessaria l'utenza DEMO fornita dalla piattaforma:

- URL di accesso: `[URL DEMO]`
- Matricola/username: `[USERNAME DEMO]`
- Password: `[PASSWORD DEMO]`
- Corso consigliato: `[NOME CORSO]`
- Validità verificata fino a: `[DATA, ORA E FUSO]`

Le credenziali devono essere inserite esclusivamente nei campi riservati ai revisori del relativo portale.

## Procedura di test essenziale

1. Installare l'estensione e accedere all'URL DEMO.
2. Aprire un corso dalla piattaforma.
3. Premere l'icona PlumePilot nella barra del browser.
4. Nella scheda **Corso**, verificare la progressione e la ricerca della prima attività incompleta.
5. Nella scheda **Attività**, verificare le opzioni Autoplay e le azioni disponibili.
6. Avviare **Crea raccolta test** e scegliere PDF oppure HTML. L'elaborazione e il download avvengono localmente.
7. Avviare **Genera dispense del corso**, quindi annullare l'operazione oppure produrre un file breve se il corso DEMO lo consente.
8. Nella scheda **Preferenze**, cambiare tema e dimensione del menu e verificare il menu fluttuante.
9. Attivare facoltativamente la modalità **Gaming** per visualizzare Traguardi, EXP e ricompense cosmetiche locali.

Le funzioni di completamento automatico di Test e Obiettivi sono disattivate per impostazione iniziale e vengono eseguite soltanto dopo una scelta esplicita dell'utente.

## Comportamento di rete e dati

- Il permesso `storage` conserva esclusivamente dati locali necessari all'interfaccia e alle funzioni scelte.
- Le pagine `*.pegaso.multiversity.click` sono l'ambiente in cui l'estensione opera.
- CloudFront e Amazon S3 forniscono materiali e immagini già disponibili all'utente e vengono contattati soltanto durante le esportazioni richieste.
- Il token della sessione Pegaso può essere usato temporaneamente in memoria per richieste HTTPS verso gli stessi servizi della piattaforma; non viene salvato o inviato allo sviluppatore.
- Nessun codice JavaScript remoto viene scaricato o eseguito.
- Non sono presenti analytics, advertising o telemetria.

Privacy policy: <https://plumepilot.github.io/plumepilot/privacy/>

## Note aggiuntive per Firefox/AMO

Il codice applicativo di PlumePilot è incluso in forma leggibile e non è minificato o offuscato. Il pacchetto contiene copie locali minificate di librerie open source di terze parti:

- pdf-lib 1.17.1;
- @pdf-lib/fontkit 1.1.1;
- PDF.js 5.6.205;
- JSZip 3.10.1.

Versioni, collegamenti ufficiali, licenze e SHA-256 sono riportati in `THIRD_PARTY_NOTICES.md`. Non vengono scaricate dipendenze durante l'esecuzione dell'estensione.

È allegato anche il pacchetto sorgente con le istruzioni di build. Il comando seguente genera i tre archivi senza installare dipendenze:

```bash
node scripts/build-release.mjs
```

Per verificare la release:

```bash
node scripts/validate-release.mjs
```

Ambiente consigliato: Node.js 24 su Ubuntu 24.04. Il builder usa la copia locale di JSZip già presente nella repository.

## Video di riserva

- URL privato/non in elenco: `[URL VIDEO]`
- Data di registrazione: `[DATA]`
- Versione mostrata: `[VERSIONE]`

Il video dovrebbe mostrare login DEMO, apertura del corso, popup, raccolta test, generazione dispense e modalità Gaming senza visualizzare credenziali o dati personali.
