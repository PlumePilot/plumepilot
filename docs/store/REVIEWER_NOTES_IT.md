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

Se uno o più test non sono disponibili dopo i tentativi automatici, la raccolta resta utilizzabile e li elenca nella sezione **Test non inclusi**. Questo comportamento evita che un fallimento isolato sposti o rinumeri le domande dei capitoli successivi.

## Comportamento di rete e dati

- Il permesso `storage` conserva esclusivamente dati locali necessari all'interfaccia e alle funzioni scelte.
- Le pagine `*.pegaso.multiversity.click` sono l'ambiente in cui l'estensione opera.
- CloudFront e Amazon S3 forniscono materiali e immagini già disponibili all'utente e vengono contattati soltanto durante le esportazioni richieste.
- Il token della sessione Pegaso può essere usato temporaneamente in memoria per richieste HTTPS verso gli stessi servizi della piattaforma; non viene salvato o inviato allo sviluppatore.
- Nessun codice JavaScript remoto viene scaricato o eseguito.
- Non sono presenti analytics, advertising o telemetria.

Privacy policy: <https://plumepilot.github.io/plumepilot/privacy/>

## Note aggiuntive per Firefox/AMO

Il codice applicativo di PlumePilot è incluso in forma leggibile e non è minificato o offuscato. Il pacchetto contiene copie locali di librerie open source di terze parti:

- pdf-lib 1.17.1;
- @pdf-lib/fontkit 1.1.1;
- PDF.js 5.6.205, distribuzione standard non minificata;
- JSZip 3.10.1.

Versioni, collegamenti ufficiali, licenze e SHA-256 sono riportati in `THIRD_PARTY_NOTICES.md`. Non vengono scaricate dipendenze durante l'esecuzione dell'estensione.

La build `2.34.0` applica trasformazioni exact-match e fail-closed esclusivamente alle copie runtime Firefox. Vengono rimossi il valutatore legacy delle callback stringa di JSZip, due fallback eval-like inutilizzati di fontkit, il compilatore PostScript opzionale e gli import variabili di fallback di PDF.js, il riferimento source map non incluso di pdf-lib e il ramo audio Chromium `chrome.offscreen` non supportato. PDF.js mantiene l'interprete, il normale module worker e il percorso WebAssembly. Chrome ed Edge conservano i file ufficiali invariati. Il validator analizza l'intero ZIP Firefox e blocca `eval`, costruttori `Function`, import dinamici variabili e riferimenti `chrome.offscreen`.

I due template Shadow DOM ora contengono markup statico dell'estensione; URL locali e versione vengono assegnati successivamente tramite nodi e attributi DOM. Nessun contenuto del sito o input utente raggiunge tali valori.

`web-ext lint 10.6.0` restituisce **0 errori, 0 notice, 0 warning** e una lista `unknownMinifiedFiles` vuota per il pacchetto Firefox generato.

Firefox Desktop minimo è `140.0`. `gecko_android.strict_min_version` è impostato a `142.0` soltanto per rendere coerente il manifest con l'introduzione del consenso dati integrato su Android; la versione AMO va distribuita esclusivamente per **Firefox Desktop**.

### Correzione Chrome Web Store Red Titanium

La versione 2.32.10 sostituisce i precedenti bundle PDF.js legacy minificati con i file `pdf.mjs` e `pdf.worker.mjs` leggibili della distribuzione standard ufficiale PDF.js 5.6.205. La routine di compatibilità legacy indicata nel rifiuto (`scriptTag`) non è presente nei nuovi file. PlumePilot imposta inoltre `isEvalSupported: false`, usando il percorso interpretato di PDF.js senza compilazione dinamica. Versione della libreria e funzionalità dell'estensione restano invariate.

È allegato anche il pacchetto sorgente con le istruzioni di build. Il comando seguente genera i tre archivi senza installare dipendenze:

```bash
node scripts/build-release.mjs
```

Lo stesso comando genera anche `plumepilot-v2.34.0-source.zip` e inserisce tutti e quattro gli archivi in `SHA256SUMS.txt`.

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
