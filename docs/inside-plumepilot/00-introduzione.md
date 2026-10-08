# 00 — Introduzione: dal problema al prodotto

## Perché studiare proprio PlumePilot?

Molti corsi di programmazione insegnano un concetto attraverso esempi costruiti apposta per essere semplici:

```js
fetch('/api/users')
  .then(response => response.json())
  .then(users => console.log(users));
```

L'esempio è utile per imparare `fetch`, ma elimina quasi tutti i problemi che rendono interessante il software reale:

- chi decide quando eseguire la richiesta?
- cosa succede se la pagina cambia nel frattempo?
- dove conserviamo il risultato?
- quanto possiamo fidarci del dato ricevuto?
- cosa accade se due parti dell'applicazione avviano la stessa operazione?
- come comunichiamo il risultato a una UI che vive in un altro contesto?
- cosa succede in Firefox se l'API usata in Chrome non è disponibile allo stesso modo?

PlumePilot contiene tutte queste domande perché non è nato come esercizio didattico. È nato da problemi concreti: avanzare tra attività di un corso, organizzare materiali, creare quiz consultabili offline, generare PDF ed EPUB, osservare cambiamenti nello stato degli esami e offrire tutto questo in tre browser diversi.

Per questo il progetto è un buon laboratorio: i concetti non vengono aggiunti artificialmente alla spiegazione. Sono già lì perché il problema li ha resi necessari.

---

## Da script utile a piccolo sistema software

All'inizio è naturale immaginare una browser extension come “JavaScript che gira sopra una pagina”.

Questa descrizione smette presto di essere sufficiente.

L'attuale PlumePilot contiene, tra le altre cose:

- un popup dell'estensione;
- un background/service worker;
- più gruppi di content script caricati in momenti e contesti differenti;
- un bridge tra il runtime dell'estensione e il runtime della pagina;
- storage persistente;
- coordinamento di operazioni lunghe;
- generatori separati per PDF, EPUB e quiz;
- un menu fluttuante inserito nelle pagine supportate;
- compatibilità con Chrome, Edge e Firefox;
- un processo di build e validazione delle release.

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

Tre fonti diverse, con costi e livelli di affidabilità diversi.

Uno dei passaggi più interessanti nello sviluppo della ricerca della prima attività incompleta è stato proprio smettere di trattare una singola fonte come risposta universale e usare invece alcune informazioni come **indice** per decidere dove verificare.

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

Per questo parleremo molto di:

- Promise;
- eventi;
- timeout;
- polling;
- lease;
- serializzazione;
- race condition;
- cancellazione;
- idempotenza.

Il monitor della commissione è un ottimo esempio. Nel codice reale, `bridge.js` non si limita a dire “controlla la commissione”: prima chiede al background il diritto temporaneo di eseguire il controllo, riceve un `leaseId`, effettua l'operazione e infine rilascia il lease.

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
