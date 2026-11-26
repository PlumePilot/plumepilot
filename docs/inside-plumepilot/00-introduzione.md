# 00 — Introduzione: dal problema al prodotto

## Perché studiare proprio PlumePilot?

Molti corsi di programmazione insegnano un concetto attraverso esempi costruiti apposta per essere semplici:

```js
fetch('/api/users')
  .then(response => response.json())
  .then(users => console.log(users));
```

`fetch('/api/users')` avvia una richiesta HTTP all'[**API**](glossario.md#api) degli utenti, cioè all'interfaccia con cui il browser chiede quei dati al server. Restituisce subito una [**Promise**](glossario.md#promise), un oggetto che rappresenta l'esito dell'operazione. Mentre la risposta è in arrivo, il browser può continuare a gestire altri eventi.

Ogni `.then()` riceve un **callback**, una funzione da eseguire quando il passaggio precedente riesce. Il primo callback usa `response.json()` per leggere il corpo della risposta e interpretarlo come **JSON**, un formato testuale per dati strutturati. Anche questa lettura restituisce una Promise. Il secondo callback riceve i dati risultanti e li scrive nella console. Un errore di rete o di lettura si propaga lungo la catena come rifiuto della Promise.

L'esempio è utile per imparare `fetch`, ma elimina quasi tutti i problemi che rendono interessante il software reale:

- chi decide quando eseguire la richiesta?
- cosa succede se la pagina cambia nel frattempo?
- dove conserviamo il risultato?
- quanto possiamo fidarci del dato ricevuto?
- cosa accade se due parti dell'applicazione avviano la stessa operazione?
- come comunichiamo il risultato a un'interfaccia utente (**UI**, da *user interface*) che vive in un altro contesto?
- cosa succede in Firefox se l'API usata in Chrome non è disponibile allo stesso modo?

PlumePilot è nato per accompagnare lo studio nel **LMS** (*Learning Management System*), la piattaforma online che ospita corsi e attività. Cerca di risolvere problemi concreti come avanzare tra le attività, organizzare i materiali, creare quiz consultabili offline, generare PDF ed EPUB e osservare lo stato degli esami da tre browser diversi.

Per questo il progetto è un buon laboratorio: i concetti non vengono aggiunti artificialmente alla spiegazione. Sono già lì perché il problema li ha resi necessari.

---

## Da script utile a piccolo sistema software

All'inizio è naturale immaginare una browser extension come “JavaScript che gira sopra una pagina”.

Questa descrizione smette presto di essere sufficiente.

L'attuale PlumePilot contiene, tra le altre cose:

- un **popup**, la pagina che si apre facendo clic sull'icona dell'estensione
- un **background**, il componente che coordina eventi e operazioni anche quando il popup è chiuso. Su Chrome ed Edge, negli esempi del libro, gira come **service worker**, uno script che il browser può avviare in risposta agli eventi
- più **content script**, programmi dell'estensione che girano in associazione a una pagina del corso
- un **bridge**, il collegamento che inoltra messaggi tra gli ambienti di esecuzione dell'estensione e della pagina
- **storage persistente** per conservare dati come il tema scelto anche dopo aver chiuso il popup o riavviato il browser
- coordinamento di operazioni lunghe
- generatori separati per PDF, EPUB e quiz
- un menu fluttuante inserito nelle pagine supportate
- compatibilità con Chrome, Edge e Firefox
- una **build** che prepara i pacchetti da convalidare prima di distribuire una nuova versione, o **release**.

Quindi una prima idea fondamentale è questa:

> **Una browser extension non è necessariamente un singolo programma. Può essere un insieme di piccoli programmi che vivono in contesti differenti e devono coordinarsi.**

Il `manifest.json` è il documento che dice al browser quali pezzi esistono e quando devono essere caricati.

Sarà il punto di partenza del Capitolo 1.

---

## Il tema ricorrente: dove vive la verità?

Durante tutto il libro torneremo spesso a una domanda:

> Qual è la nostra *source of truth*?

Supponiamo che nella UI del corso un capitolo mostri `80%`.

Quel numero potrebbe essere utile per capire che probabilmente c'è qualcosa da completare. Ma è sufficiente per decidere esattamente quale attività aprire?

Non necessariamente.

Potremmo avere contemporaneamente:

```text
DOM visibile
    ↓
percentuale del capitolo

risposta API
    ↓
stato delle lezioni

cache PlumePilot
    ↓
informazioni già osservate
```

Il [**DOM**](glossario.md#dom) è l'albero di elementi della pagina che JavaScript può leggere o modificare. L'API può fornire dati più strutturati sugli stessi elementi del corso. La [**cache**](glossario.md#cache) conserva informazioni già ottenute per riutilizzarle quando sono ancora valide.

Per ciascuna di queste fonti cambia quanto costa consultarla e quanto possiamo fidarci del dato.

Uno dei passaggi più interessanti nello sviluppo della ricerca della prima attività incompleta è stato proprio smettere di trattare una singola fonte come risposta universale e usare invece alcune informazioni come **indice** per decidere dove verificare.

Un esempio è la [**master call**](glossario.md#master-call), il nome che usiamo per la richiesta HTTP che restituisce l'elenco dei moduli del corso con il progresso di ciascuno. Un modulo all'80% è un buon punto da cui iniziare la verifica. Il dettaglio del modulo serve poi a capire quali attività risultano incomplete.

Questa distinzione è generalizzabile ben oltre PlumePilot:

> Un'informazione può non essere abbastanza affidabile da essere la verità finale, ma essere abbastanza affidabile da ridurre enormemente lo spazio di ricerca.

È il tipo di scelta che incontriamo nei sistemi distribuiti, nelle cache, nei motori di ricerca e nei database indicizzati.

---

## Il secondo tema: il tempo

Nel software sincrono da manuale, una cosa succede dopo l'altra.

Nel browser, invece:

- una pagina carica;
- un content script parte;
- una risposta API arriva;
- l'utente apre o chiude un capitolo;
- il video termina;
- il popup viene chiuso e riaperto;
- un timer scade;
- una scheda viene ricaricata;
- il background può essere sospeso e riattivato.

La correttezza non dipende soltanto da **cosa** fa il codice, ma anche da **quando** accadono gli eventi.

Chiamiamo **asincrone** le operazioni che possono lasciare proseguire altro lavoro mentre si attende il loro esito. Per leggere gli esempi servono alcuni concetti ricorrenti:

- **Promise**, per usare il risultato di un'operazione appena è disponibile.
- **Eventi**, segnali come la fine di un video.
- [**Timeout**](glossario.md#timeout), la scadenza oltre la quale smettiamo di aspettare una risposta.
- [**Polling**](glossario.md#polling), una verifica ripetuta a intervalli, ad esempio per vedere se una riga è comparsa nella pagina.
- [**Lease**](glossario.md#lease), un diritto temporaneo a eseguire un'operazione.
- **Serializzazione delle operazioni**, che impone un ordine di esecuzione quando più componenti vogliono aggiornare lo stesso stato.
- [**Race condition**](glossario.md#race-condition), un difetto che emerge solo con certi ordini degli eventi.
- **Cancellazione**, il segnale con cui chiediamo a un'operazione di fermarsi.
- [**Idempotenza**](glossario.md#idempotenza), la proprietà di un'operazione che può essere ripetuta ottenendo lo stesso effetto previsto.

Il [**monitor della commissione**](glossario.md#monitor-della-commissione) controlla lo stato degli esami in valutazione. Prima di avviare il controllo, `bridge.js` chiede un lease al background. Se lo ottiene, riceve un `leaseId` che identifica la concessione, effettua l'operazione e infine rilascia il lease. Così due schede aperte non devono effettuare lo stesso controllo insieme.

Non è burocrazia. È coordinamento concorrente.

---

## Il terzo tema: i confini

PlumePilot vive contemporaneamente vicino a tre sistemi:

```text
┌────────────────────┐
│ Browser / Extension│
│ API                │
└─────────┬──────────┘
          │
          │
┌─────────▼──────────┐
│ PlumePilot         │
└─────────┬──────────┘
          │
          │
┌─────────▼──────────┐
│ Multiversity       │
│ pagina + servizi   │
└────────────────────┘
```

Ogni confine introduce regole diverse.

Il codice della pagina può accedere agli oggetti JavaScript della pagina, ma non automaticamente alle API privilegiate dell'estensione. Un content script isolato può usare API dell'estensione, ma non condivide lo stesso scope JavaScript della pagina. Il background può coordinare l'estensione, ma non può manipolare direttamente il DOM di una scheda.

Molte scelte architetturali di PlumePilot sono conseguenze di questi confini.

---

## Da backend developer: un'analogia utile

Senza prenderla troppo alla lettera, puoi iniziare a pensare ad alcuni componenti così:

```text
Popup / Floating UI
        ↓
   presentation
        ↓
Bridge / messaging
        ↓
 application boundary
        ↓
Background coordinator
        ↓
 state / orchestration
```

E la pagina Multiversity può essere vista contemporaneamente come:

- una UI esterna da osservare e modificare;
- un client di API che possiamo comprendere osservandone il comportamento;
- una fonte di eventi;
- un ambiente JavaScript separato.

L'analogia con un backend a servizi non è perfetta, ma è utile: invece di function call dirette tra tutti i componenti, spesso abbiamo messaggi e contratti.

---

## Cosa significa “finished” per questo libro

Il software non è mai definitivamente immobile. Browser, piattaforme e requisiti cambiano.

Per noi “PlumePilot finito” significa qualcosa di più pratico:

- il prodotto ha un perimetro funzionale maturo;
- le principali decisioni architetturali sono osservabili;
- esiste una storia sufficiente di bug, regressioni e miglioramenti;
- possiamo studiare il sistema senza inseguire continuamente una nuova feature fondamentale.

Questo rende possibile passare da **costruire** il progetto a **comprenderlo sistematicamente**.

---

## Come useremo il codice

Non commenteremo migliaia di righe in ordine.

Partiremo invece da domande.

Per esempio:

> Cosa succede quando clicco l'icona di PlumePilot?

oppure:

> Come fa PlumePilot a comunicare con una funzione che esiste nel contesto JavaScript della pagina?

oppure:

> Perché una percentuale di progresso può accelerare una ricerca pur non essendo affidabile al 100%?

Solo dopo andremo nel codice necessario a rispondere.

Questa è una modalità di lettura molto più vicina a quella usata quando si entra in un codebase reale.

---

## Concetti da portarsi dietro

**Source of truth**  
La fonte che consideriamo autorevole per uno stato o una decisione.

**Boundary**  
Il confine tra due componenti o runtime che non possono condividere tutto direttamente.

**Message passing**  
Comunicazione tramite messaggi invece di chiamate di funzione nello stesso contesto.

**Race condition**  
Un errore o comportamento imprevisto che dipende dall'ordine temporale di operazioni concorrenti.

**Idempotenza**  
Proprietà per cui ripetere un'operazione non produce effetti ulteriori indesiderati.

**Graceful degradation**  
Capacità di continuare a funzionare, magari con meno funzionalità, quando una capacità non è disponibile.

Li incontreremo di nuovo nel codice, non soltanto nel glossario.

---

## Prima di proseguire

Apri mentalmente una nuova domanda:

> Se `popup.js`, `background.js`, `bridge.js` e `content.js` sono tutti JavaScript, perché PlumePilot non potrebbe semplicemente mettere tutto in un solo file?

Il Capitolo 1 nasce dalla risposta.

---

[← Indice](index.md) · [Indice](index.md) · [01 — Anatomia di PlumePilot →](01-anatomia-estensione.md)
