# 03 — DOM e pagine dinamiche

## Lavorare in una UI che non controlliamo

Nel capitolo precedente abbiamo seguito i messaggi mentre attraversavano popup, background, bridge e `MAIN` world.

Ora arriviamo al punto in cui PlumePilot deve fare qualcosa di più difficile: **capire una pagina web costruita da qualcun altro mentre quella pagina continua a cambiare sotto i suoi piedi**.

È facile descrivere un content script dicendo:

> legge il DOM e clicca alcuni elementi.

Tecnicamente è vero.

Ma è una descrizione quasi inutile.

Il vero problema non è trovare un elemento una volta.

Il vero problema è rispondere a domande come:

- l'elemento esiste già oppure verrà renderizzato tra poco?
- quello che vedo nel DOM rappresenta davvero lo stato della piattaforma?
- il nodo che ho salvato cinque secondi fa esiste ancora?
- un accordion chiuso significa che il capitolo non esiste, oppure soltanto che non è renderizzato?
- due capitoli con lo stesso numero sono lo stesso capitolo?
- se faccio `.click()`, quando posso considerare concluso l'effetto del click?
- se la tab è nascosta, i timeout hanno ancora lo stesso significato?
- se il frontend ricostruisce la sidebar, posso continuare a usare il vecchio riferimento DOM?

Queste non sono domande specifiche di PlumePilot.

Sono problemi tipici di qualunque software che debba integrarsi con una **UI dinamica non controllata**: browser extension, userscript, test end-to-end, automazione, accessibility tooling, web scraping interattivo o integrazioni con applicazioni legacy.

In questo capitolo useremo PlumePilot per imparare una regola fondamentale:

> **Il DOM è una rappresentazione temporanea dello stato dell'applicazione, non necessariamente lo stato dell'applicazione stesso.**

---

# Parte I — Il DOM non è un database

## 1. Che cos'è davvero il DOM?

Quando il browser interpreta HTML costruisce una struttura ad albero di oggetti JavaScript.

Per esempio:

```html
<div class="course">
  <div class="chapter">
    <span>1 - Introduzione</span>
  </div>
</div>
```

può essere immaginato come:

```text
Document
└── div.course
    └── div.chapter
        └── span
            └── "1 - Introduzione"
```

JavaScript può attraversare e modificare quell'albero:

```js
document.querySelector(".chapter");
```

Il risultato è un oggetto `Element` che rappresenta **quel nodo in quel momento**.

Questa ultima parte è importante.

In un sito moderno la pagina può fare:

```text
stato applicativo cambia
        ↓
frontend ricalcola la UI
        ↓
vecchi nodi rimossi
        ↓
nuovi nodi creati
```

Visivamente l'utente può vedere ancora:

```text
1 - Introduzione
```

ma JavaScript potrebbe trovarsi davanti a un oggetto completamente diverso.

Il testo è lo stesso.

L'identità DOM no.

---

## 2. Un riferimento DOM non è un'identità logica

Supponiamo di fare:

```js
const row = document.querySelector(".lesson");
```

Dopo qualche secondo la piattaforma aggiorna la sidebar e ricrea quel ramo del DOM.

Ora possono esistere due realtà:

```text
variabile row ───────► vecchio nodo, ormai staccato

DOM corrente ────────► nuovo nodo che rappresenta la stessa lezione
```

La variabile continua a contenere un oggetto valido.

Ma quell'oggetto potrebbe non appartenere più al documento corrente.

Questo tipo di riferimento viene spesso chiamato **stale reference**: un riferimento che era corretto quando è stato ottenuto, ma non rappresenta più il componente attuale della UI.

È una distinzione che incontreremo ripetutamente:

```text
DOM identity       ≠       domain identity
```

Per PlumePilot:

```text
"questo specifico <div>"    ≠    "questa specifica lezione"
```

La lezione è un concetto del dominio.

Il `<div>` è soltanto una delle sue rappresentazioni temporanee.

---

## 3. Primo esempio reale: `lessons()`

In `content.js` PlumePilot individua le righe delle lezioni così:

```js
function lessons() {
  return [...document.querySelectorAll("div.border-t")].filter((x) =>
    x.querySelector(":scope > div.cursor-pointer"),
  );
}
```

Riferimento reale: [`content.js` L647-L651](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L647-L651).

Notiamo già una scelta importante.

La funzione non conserva una lista globale del tipo:

```js
const allLessons = document.querySelectorAll(...);
```

E poi la riutilizza per sempre.

Ogni chiamata a `lessons()` **riesegue la query sul DOM corrente**.

Questo è particolarmente appropriato in una pagina dinamica.

---

## 4. `querySelectorAll()` restituisce uno snapshot statico

Secondo la documentazione DOM, `querySelectorAll()` restituisce una `NodeList` **statica**, non live.

In altre parole:

```js
const rows = document.querySelectorAll(".lesson");
```

fotografa l'insieme dei nodi che corrispondono in quel momento.

Se successivamente il DOM cambia, `rows` non si aggiorna automaticamente con i nuovi elementi.

PlumePilot converte subito la `NodeList` in un array:

```js
[...document.querySelectorAll(...)]
```

Da quel momento è ancora più chiaramente uno snapshot.

Possiamo immaginarlo così:

```text
t0
DOM: A B C
querySelectorAll() → [A, B, C]


t1
DOM: A D C
array precedente  → [A, B, C]
nuova query        → [A, D, C]
```

Il vecchio array non acquisisce magicamente `D`.

E `B` può perfino essere stato rimosso dalla pagina.

Per questo funzioni come:

```js
lessons()
chapters()
sections()
```

sono più interessanti di quanto sembrino.

Non sono semplicemente utility.

Sono **lettori dello stato visibile corrente**.

### Approfondimento

MDN descrive `querySelectorAll()` come una query che restituisce una `NodeList` non live:

https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll

---

# Parte II — I selettori sono contratti impliciti

## 5. Un selettore CSS può diventare una dipendenza software

Consideriamo ancora:

```js
document.querySelectorAll("div.border-t")
```

Quella classe non è stata definita da PlumePilot.

Appartiene alla piattaforma.

Quindi la funzione dipende implicitamente da un contratto esterno:

```text
la piattaforma continuerà a rappresentare le righe delle lezioni
con una struttura compatibile con questo selettore
```

Questo contratto non è formalizzato in una API.

Nessuno promette a PlumePilot che `.border-t` esisterà anche domani.

Per questo l'integrazione DOM è intrinsecamente più fragile di una API versionata.

---

## 6. Selettore sintattico vs selettore semantico

Immaginiamo due possibilità.

### Selettore molto strutturale

```js
div > div:nth-child(3) > div:nth-child(2) > span
```

### Selettore più semantico

```js
[aria-label="lesson-progress"]
```

Il primo dipende fortemente dal layout.

Il secondo dipende da un significato.

Idealmente preferiremmo sempre elementi con identificatori semantici stabili:

```text
data-* dedicati
aria-label
role
id documentati
URL
identificatori di dominio
```

Ma quando integriamo una pagina che non controlliamo, spesso questi dati non esistono.

PlumePilot deve quindi combinare diversi segnali:

```text
classi CSS
struttura relativa
contenuto testuale
URL
icone
stato visuale
API
```

Non esiste un selettore universalmente perfetto.

La domanda corretta diventa:

> **Quale combinazione di segnali è abbastanza stabile per questo compito?**

---

## 7. `:scope` riduce le ambiguità

In `lessons()` troviamo:

```js
x.querySelector(":scope > div.cursor-pointer")
```

`>`, in CSS, significa **figlio diretto**.

`:scope` indica l'elemento sul quale stiamo eseguendo la query.

Quindi non stiamo chiedendo:

> esiste da qualche parte sotto questa riga un elemento cliccabile?

Stiamo chiedendo:

> il figlio diretto previsto dalla struttura della riga è cliccabile?

La differenza sembra piccola, ma riduce i falsi positivi.

Questo:

```text
row
└── wrapper.cursor-pointer
```

corrisponde.

Questo:

```text
row
└── qualcos'altro
    └── qualche widget interno
        └── .cursor-pointer
```

non basta.

È un esempio di selettore che codifica **una piccola aspettativa strutturale**, non soltanto una classe.

---

## 8. `closest()` legge il contesto dell'elemento

PlumePilot utilizza spesso anche `closest()`.

Per esempio, nell'identificazione di capitoli Mercatorum:

```js
const clickable =
  span.closest("div.cursor-pointer.relative.align-middle") ||
  span.closest("div.cursor-pointer");
```

Riferimento: [`content.js` L1180-L1198](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1180-L1198).

`closest()` parte dal nodo corrente e risale verso gli antenati fino a trovare il primo match.

È utile quando conosciamo un elemento interno significativo ma l'azione reale appartiene a un contenitore superiore.

Mentalmente:

```text
clickable div
└── wrapper
    └── span con "3 - Titolo"
         ▲
         │
      partiamo qui
```

`closest()` ci permette di recuperare il componente interattivo che contiene quello `span`.

Documentazione:

https://developer.mozilla.org/en-US/docs/Web/API/Element/closest

---

# Parte III — Una piattaforma, più strutture DOM

## 9. `sections()` è già un piccolo adapter multipiattaforma

Quando PlumePilot supportava soltanto una piattaforma, una certa struttura DOM poteva sembrare universale.

Con Pegaso, Mercatorum e San Raffaele, questa assunzione non regge più.

Guardiamo:

```js
function sections() {
  const nativeSections = pegasoStyleSections();
  if (nativeSections.length) return nativeSections;

  const fallbackChapters = mercatorumChapterRows();
  if (!fallbackChapters.length) return [];

  return [{
    outer: document.documentElement,
    header: null,
    span: fallbackChapters[0].clickable,
    text: MERCATORUM_STATIC_SECTION,
    static: true,
  }];
}
```

Riferimento: [`content.js` L1201-L1213](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1201-L1213).

Il resto dell'algoritmo vuole ragionare in termini di:

```text
sections
  └── chapters
      └── activities
```

Ma non tutte le piattaforme espongono esattamente la stessa UI.

Invece di spargere continuamente condizioni come:

```js
if (isMercatorum) ...
else if (isPegaso) ...
```

ovunque, `sections()` prova a restituire **una forma concettuale comune**.

Questo è un primo esempio di **DOM adapter**.

La pagina dice:

```text
"io rappresento il corso così"
```

PlumePilot traduce:

```text
"per il mio dominio, questa cosa è una section"
```

---

## 10. Normalizzare prima, ragionare dopo

Questa strategia è molto simile a ciò che faresti lato backend con provider differenti.

Immaginiamo:

```text
Provider A → customer_id
Provider B → userCode
Provider C → account.id
```

L'application layer preferisce ricevere:

```js
{
  customerId: ...
}
```

in tutti i casi.

Qui abbiamo lo stesso principio:

```text
DOM Pegaso ───────┐
                  ├──► modello concettuale PlumePilot
DOM Mercatorum ───┘
```

Questa separazione diventerà ancora più importante quando parleremo dell'architettura che potremmo adottare se riscrivessimo PlumePilot oggi.

---

# Parte IV — Il problema del tempo

## 11. `document_idle` non significa "applicazione pronta"

Nel `manifest.json`, `content.js` viene caricato con:

```json
"run_at": "document_idle"
```

Potremmo interpretarlo ingenuamente così:

```text
content.js parte
        ↓
la pagina è pronta
```

Ma `document_idle` riguarda il caricamento del documento dal punto di vista dell'estensione.

Non significa che **tutti i dati asincroni dell'applicazione host siano già arrivati**, né che ogni componente UI sia stato renderizzato.

Una Single Page Application può fare:

```text
HTML iniziale disponibile
        ↓
content script avviato
        ↓
fetch applicativo
        ↓
risposta API
        ↓
render capitoli
        ↓
render lezione attiva
```

Quindi al tempo `t0` questo può essere vero:

```js
chapters().length === 0
```

mentre al tempo `t0 + 800 ms`:

```js
chapters().length === 42
```

Nessuna delle due letture è "sbagliata".

Descrivono due momenti diversi.

---

## 12. Un bug reale: DOM inizialmente vuoto

Il changelog di PlumePilot conserva una regressione molto istruttiva.

Nella v2.14.5 venne corretto il comportamento della ricerca della prima attività incompleta dopo un reload:

- la struttura del corso veniva renderizzata asincronamente;
- l'algoritmo partiva prima che esistesse la riga della lezione attiva;
- un DOM inizialmente vuoto veniva interpretato come fallimento definitivo.

Riferimento storico: [`CHANGELOG.md` L793-L799](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/CHANGELOG.md#L793-L799).

Il punto fondamentale è questo:

```text
"non trovato ora"
```

non equivale necessariamente a:

```text
"non esiste"
```

Può significare:

```text
"non è ancora stato renderizzato"
```

Sono tre stati semanticamente diversi.

---

## 13. Il problema dei tre valori

Molti bug DOM nascono perché modelliamo implicitamente una condizione come booleana:

```text
found / not found
```

quando la realtà è più simile a:

```text
FOUND
NOT_READY_YET
DEFINITELY_MISSING
```

Questa distinzione è fondamentale nelle UI asincrone.

Se `chapters()` restituisce zero elementi durante lo startup, come facciamo a sapere se:

1. il corso non ha capitoli;
2. non siamo nella pagina giusta;
3. il frontend non ha ancora renderizzato i capitoli;
4. il selettore si è rotto dopo un aggiornamento della piattaforma?

Dal solo array vuoto non possiamo distinguerli.

Serve **contesto temporale e applicativo**.

---

# Parte V — Aspettare una condizione, non un numero arbitrario

## 14. `waitFor()`

PlumePilot possiede una utility semplice ma centrale:

```js
async function waitFor(fn, timeout = WAIT_MS) {
  let start = Date.now();

  while (Date.now() - start < timeout) {
    const x = fn();

    if (x) {
      return x;
    }

    await sleep(100);
  }

  return null;
}
```

La versione reale gestisce anche la visibilità della pagina; il cuore del pattern però è questo.

Riferimento: [`content.js` L1577-L1609](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1577-L1609).

Invece di dire:

```js
await sleep(2000);
const chapter = findChapter(...);
```

PlumePilot dice:

```js
const chapter = await waitFor(() => findChapter(...));
```

La differenza concettuale è enorme.

---

## 15. Delay fisso vs attesa condizionale

### Delay fisso

```text
aspetta esattamente 2 secondi
        ↓
prova
```

Problemi:

```text
la pagina è pronta dopo 100 ms  → hai perso 1.9 secondi
la pagina è pronta dopo 2.1 s   → fallisci comunque
```

### Attesa condizionale

```text
ogni 100 ms:
    la condizione è vera?
        sì → continua subito
        no → riprova fino al timeout
```

Ora il tempo massimo è una **deadline**, non la previsione esatta di quanto impiegherà la UI.

Questo è un pattern generale molto utile.

---

## 16. Polling

`waitFor()` implementa una forma di **polling**.

Il polling significa verificare periodicamente una condizione:

```text
t0      check
        false

t0+100  check
        false

t0+200  check
        true
        ↓
        continua
```

Il polling viene spesso visto come meno elegante di un evento dedicato.

Ma quando integriamo una UI che non controlliamo, un evento affidabile può semplicemente non esistere.

In quel caso un polling:

- limitato nel tempo;
- con intervallo ragionevole;
- basato su una condizione precisa;

può essere una soluzione robusta.

---

## 17. Quando sarebbe preferibile un evento?

Se controllassimo la piattaforma potremmo avere qualcosa del tipo:

```js
courseStore.on("chaptersLoaded", callback);
```

oppure:

```js
window.dispatchEvent(new CustomEvent("course-ready"));
```

Ma PlumePilot non possiede quel contratto.

Deve inferire la readiness dall'esterno.

Quindi usa strumenti osservabili:

```text
DOM
URL
video
API
MutationObserver
polling
```

Questa è una differenza fondamentale tra **software che possiede lo stato** e **software che osserva lo stato di un altro sistema**.

---

# Parte VI — `MutationObserver`: sapere che qualcosa è cambiato

## 18. Perché una scansione iniziale non basta

Alla fine di `content.js` troviamo:

```js
function scan() {
  document.querySelectorAll("video").forEach(attach);
  const activeRow = currentLesson();
  if (activeRow) rememberPlaybackLesson(activeRow);
  scheduleSessionConflictScan();

  if (!courseProgressState || courseProgressState.baselinePercent === null) {
    scheduleCourseProgressInitialization(250);
  }
}

new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

scan();
```

Riferimento: [`content.js` L7066-L7090](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L7066-L7090).

La sequenza è:

```text
1. scan iniziale
2. osserva mutazioni future
3. ogni volta che cambia l'albero → scan()
```

Questo risolve un problema essenziale.

Il video che ci interessa potrebbe **non esistere ancora quando parte PlumePilot**.

---

## 19. `MutationObserver`

`MutationObserver` è una API standard del browser per ricevere notifiche quando cambia il DOM.

Qui PlumePilot osserva:

```js
{
  childList: true,
  subtree: true,
}
```

cioè:

```text
childList → nodi aggiunti o rimossi
subtree   → non soltanto figli diretti, ma tutto il sottoalbero
```

Il target è:

```js
document.documentElement
```

quindi praticamente l'intero documento.

MDN:

https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

---

## 20. MutationObserver non dice necessariamente *cosa significa* il cambiamento

Questa distinzione è importante.

`MutationObserver` può dirci:

```text
è stato aggiunto un nodo
```

ma non sa che quel nodo rappresenta:

```text
"il nuovo player video della lezione 7"
```

Il significato lo deve ricostruire PlumePilot.

Per questo il callback non tenta di interpretare direttamente ogni singola mutation.

Fa semplicemente:

```js
scan();
```

e `scan()` ricalcola le informazioni che interessano.

È una strategia molto comune:

```text
mutation notification
        ↓
"qualcosa potrebbe essere cambiato"
        ↓
ricalcola una piccola vista dello stato
```

---

## 21. Observer come invalidation signal

Possiamo pensare al `MutationObserver` come a un segnale di invalidazione:

```text
cache mentale:
"so quali video esistono"

DOM mutation
     ↓
questa conoscenza potrebbe non essere più valida
     ↓
scan()
```

È concettualmente simile a una cache invalidation.

L'observer non ci consegna necessariamente la nuova verità già pronta.

Ci dice che **dobbiamo rileggerla**.

---

# Parte VII — Attaccarsi a elementi che possono nascere dopo

## 22. `document.querySelectorAll("video").forEach(attach)`

Una delle responsabilità di `scan()` è:

```js
document.querySelectorAll("video").forEach(attach);
```

Questo pattern risolve il caso:

```text
PlumePilot parte
    ↓
nessun <video>
    ↓
frontend carica la lezione
    ↓
crea <video>
    ↓
MutationObserver
    ↓
scan()
    ↓
attach(video)
```

Senza observer, il primo scan con zero video potrebbe essere l'ultimo.

---

## 23. Ma un observer globale può essere costoso

Osservare tutto:

```js
document.documentElement
```

con:

```js
subtree: true
```

significa ricevere notifiche per molte mutazioni potenzialmente irrilevanti.

In una UI complessa potrebbero cambiare:

- tooltip;
- contatori;
- animazioni;
- notifiche;
- menu;
- classi indirette;
- componenti non legati all'autoplay.

Per questo un observer dovrebbe idealmente avere callback poco costosi o meccanismi di debounce/coalescing.

Nel caso di PlumePilot `scan()` è relativamente mirato, ma il principio architetturale rimane:

> **Osservare un'area ampia è comodo, ma aumenta il numero di invalidazioni che dobbiamo saper assorbire.**

---

## 24. Observer specifico vs observer generale

Potremmo immaginare due strategie.

### Strategia A — generale

```js
observe(document.documentElement, {
  childList: true,
  subtree: true,
});
```

Vantaggi:

- robusta rispetto a dove compare il nuovo componente;
- semplice da implementare;
- funziona anche se il frontend ricrea alberi interi.

Svantaggi:

- molte notifiche;
- il callback deve filtrare il rumore.

### Strategia B — specifica

```js
observe(sidebar, {
  childList: true,
  subtree: true,
});
```
Vantaggi:

- meno rumore;
- semantica più chiara.

Svantaggi:

- se `sidebar` viene sostituita interamente, stiamo osservando il vecchio nodo;
- prima dobbiamo essere sicuri che la sidebar esista.

In un DOM ostile o poco stabile, l'approccio più generale può essere pragmaticamente migliore.

---

# Parte VIII — Il bug più interessante: un nodo può sparire mentre lo aspettiamo

## 25. Autoplay e accordion chiuso

Arriviamo a uno dei casi studio più importanti.

Una lezione termina.

PlumePilot deve:

```text
1. confermare il completamento
2. trovare la lezione corrente
3. trovare quella successiva
4. aprirla
```

Sembra semplice.

Ma durante l'attesa la piattaforma può aggiornare la sidebar.

Oppure l'utente può chiudere l'accordion.

Il changelog della v2.35.1 ricorda esplicitamente:

> miglioramento del recupero con accordion chiusi, handoff dagli Obiettivi e routing dei capitoli.

Riferimento: [`CHANGELOG.md` L3-L10](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/CHANGELOG.md#L3-L10).

Il codice contiene una spiegazione ancora più interessante:

```js
// Completion can update the sidebar or the user can close its accordion
// while we wait. Keep the identity so a detached row is never used for
// finding the next activity after the wait.
const completedLesson = playbackContext;
```

Riferimento: [`content.js` L6680-L6683](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L6680-L6683).

Queste tre righe descrivono un concetto architetturale molto importante.

---

## 26. Il problema del nodo staccato

Supponiamo che `cur` sia la riga corrente:

```js
const cur = currentLesson();
```

Poi aspettiamo che la piattaforma confermi il completamento:

```js
await waitForLessonCompletion(cur, video);
```

Durante l'attesa:

```text
sidebar vecchia
└── row A   ← cur
```

può essere sostituita con:

```text
sidebar nuova
└── row B   ← stessa lezione dal punto di vista del dominio
```

Ora `cur` continua a puntare a `row A`.

Ma `row A` non descrive più il DOM corrente.

Se cercassimo:

```js
nextLesson(cur)
```

potremmo calcolare il successore partendo da **una struttura ormai obsoleta**.

---

## 27. Non conservare il nodo: conserva l'identità

PlumePilot introduce `playbackContext`:

```js
playbackContext = {
  videoElement,
  courseCode: courseCodeFromUrl(),
  lessonNumber: lessonNumberFromUrl(),
  identity,
  name: lessonName(row),
  index,
};
```

Riferimento: [`content.js` L663-L677](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L663-L677).

Qui non memorizziamo soltanto il nodo.

Memorizziamo dati che ci permettono di **ritrovare concettualmente la stessa lezione**:

```text
courseCode
lessonNumber
chapter identity
lesson name
index
```

Questa è una strategia fondamentale:

```text
riferimento fragile
       ↓
estrai identità stabile
       ↓
quando serve, risolvi di nuovo l'identità sul DOM corrente
```

---

## 28. `recoverPlaybackLesson()`

La funzione di recupero rende il pattern esplicito:

```js
async function recoverPlaybackLesson(videoElement) {
  const visible = currentLesson();

  if (visible) {
    rememberPlaybackLesson(visible, videoElement);
    return visible;
  }

  const context = playbackContext;

  // verifica che il contesto appartenga ancora allo stesso corso/modulo
  // ...

  if (!(await openChapter(context.identity))) return null;

  const row = await waitFor(() => playbackLessonRow(context));

  if (row) rememberPlaybackLesson(row, videoElement);
  return row;
}
```

Riferimento: [`content.js` L691-L705](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L691-L705).

Il ragionamento è:

```text
la riga è ancora visibile?
    │
    ├── sì → usa la versione corrente
    │
    └── no
         ↓
    ho un'identità salvata?
         ↓
    riapri il capitolo
         ↓
    ritrova la riga nel DOM nuovo
```

Questo è molto più robusto di:

```js
const current = currentLesson();
await somethingAsync();
useForever(current);
```

---

## 29. Pattern generale: resolve late

Potremmo chiamare questa strategia **resolve late**.

Invece di risolvere un riferimento una volta e trascinarlo per tutta un'operazione lunga:

```text
resolve DOM node
      ↓
wait 5 seconds
      ↓
use old node
```

manteniamo un'identità e risolviamo il nodo vicino al momento dell'uso:

```text
store logical identity
      ↓
wait
      ↓
resolve current DOM node
      ↓
use it
```

È simile a memorizzare un `userId` invece di un oggetto ORM che potrebbe essere stale dopo una transazione lunga.

### Da backend developer

Pensa a:

```js
const user = await repo.findById(id);
await longExternalOperation();
// assumere che user rappresenti ancora lo stato attuale
```

contro:

```js
const userId = id;
await longExternalOperation();
const freshUser = await repo.findById(userId);
```

Non è esattamente lo stesso problema, ma il modello mentale è sorprendentemente simile.

---

# Parte IX — Fare click non significa che l'azione sia finita

## 30. `.click()` è l'inizio di una transizione

In `openSection()` PlumePilot fa:

```js
section.span.scrollIntoView({ block: "center", behavior: "instant" });
section.span.click();
```

Ma non ritorna immediatamente `true`.

Subito dopo verifica:

```js
const opened = await waitFor(() => {
  section = getSection();
  return isOpen() && section ? section : null;
});
```

Riferimento: [`content.js` L1668-L1705](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1668-L1705).

Quindi:

```text
.click()
   ↓
richiesta di transizione
   ↓
frontend reagisce
   ↓
DOM cambia
   ↓
PlumePilot verifica il nuovo stato
```

Non:

```text
.click() == operazione conclusa
```

---

## 31. Command + verification

Questo pattern può essere descritto come:

```text
COMMAND
   ↓
WAIT
   ↓
VERIFY
```

Per esempio:

```text
clicca capitolo
   ↓
attendi
   ↓
chevron-up esiste?
```

È concettualmente simile a sistemi distribuiti dove:

```text
invia richiesta
   ↓
attendi convergenza
   ↓
leggi stato risultante
```

La UI è locale, ma la natura asincrona introduce una dinamica simile.

---

## 32. Perché non basta leggere subito dopo il click?

Questo codice è fragile:

```js
chapter.span.click();
return isChapterOpen(identity);
```

Perché il click può innescare:

```text
event handler
    ↓
aggiornamento di stato framework
    ↓
scheduling render
    ↓
DOM update
```

Il rendering non deve necessariamente essersi completato prima della riga JavaScript successiva.

PlumePilot quindi verifica il risultato in un intervallo temporale.

---

# Parte X — Verificare sul DOM corrente

## 33. Nota il `getSection()` dentro il polling

Dentro `openSection()`:

```js
const getSection = () =>
  sections().find((section) => section.text === sectionText);
```

Poi, durante l'attesa:

```js
section = getSection();
```

Perché non usare semplicemente l'oggetto `section` originale?

Perché il click potrebbe aver provocato una ricostruzione del DOM.

PlumePilot preferisce recuperare **una versione fresca** della section.

Ancora una volta:

```text
identità: sectionText
rappresentazione corrente: getSection()
```

---

## 34. Il prefisso `fresh` nel codice non è casuale

In diverse parti del progetto compaiono variabili come:

```js
fresh
freshModal
freshTest
```

Non è soltanto stile di naming.

Esprime una preoccupazione architetturale reale:

> dopo un'operazione asincrona, verifica di nuovo il DOM invece di assumere che il vecchio nodo sia ancora autorevole.

Questa è una disciplina molto utile quando si lavora con UI dinamiche.

---

# Parte XI — Accordion chiuso: assenza visuale ≠ assenza logica

## 35. Il problema della virtualizzazione locale

Molte UI ad accordion non mantengono necessariamente tutti i contenuti figli sempre renderizzati.

Quando un capitolo è chiuso possiamo avere:

```text
Chapter header
```

Quando è aperto:

```text
Chapter header
├── Video 1
├── Video 2
├── Test
└── Obiettivi
```

Quindi una query come:

```js
find lesson row
```

può fallire non perché la lezione non esista, ma perché il contenitore che la rende visibile è chiuso.

Questo è un esempio di differenza tra:

```text
logical state
```

e:

```text
rendered state
```

---

## 36. `openChapter()` tratta l'apertura come una precondizione

PlumePilot verifica prima se il capitolo è aperto:

```js
const isOpen = () => {
  const fresh = getChapter();
  if (!fresh) return false;

  const outer = getOuterChapter(fresh);
  return !!outer?.querySelector('[id*="chevron-up"]');
};
```

Se non lo è:

```js
chapter.span.click();
```

Poi attende una nuova lettura:

```js
const readOpenedChapter = () => (isOpen() ? getChapter() : null);
const opened = await waitFor(readOpenedChapter);
```

Riferimento: [`content.js` L5502-L5561](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L5502-L5561).

Il capitolo è quindi trattato come una risorsa che deve trovarsi nello stato:

```text
OPEN
```

prima di poter effettuare certe query sui figli.

---

## 37. Precondition recovery

Questo pattern può essere generalizzato:

```text
voglio eseguire X
      ↓
precondizione P è vera?
      │
      ├── sì → X
      │
      └── no → prova a ripristinare P
                    ↓
                verifica P
                    ↓
                    X
```

Per PlumePilot:

```text
voglio trovare la lezione
      ↓
capitolo aperto?
      │
      ├── sì
      └── no → aprilo → verifica → continua
```

È una forma di **self-healing locale**.

---

# Parte XII — Un elemento visibile può essere un segnale migliore di uno nascosto

## 38. Leggere la percentuale del corso

PlumePilot cerca la percentuale visuale con:

```js
function readPegasoCoursePercentage() {
  const candidates = [...document.querySelectorAll("div.percent")]
    .filter((element) =>
      element.querySelector("circle.circular-progress") &&
      element.querySelector(".number-container"),
    )
    .map((element) => {
      const match = String(element.textContent || "")
        .trim()
        .match(/^(\d{1,3})%$/);

      const rect = element.getBoundingClientRect();

      return match && rect.width > 0 && rect.height > 0
        ? Math.max(0, Math.min(100, Number(match[1])))
        : null;
    })
    .filter((value) => value !== null);

  return candidates.length === 1 ? candidates[0] : null;
}
```

Riferimento: [`content.js` L4347-L4362](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4347-L4362).

Questa funzione è didatticamente molto interessante.

---

## 39. Non prende semplicemente il primo `.percent`

Il codice non fa:

```js
return document.querySelector(".percent").textContent;
```

Filtra invece i candidati usando più segnali:

```text
classe .percent
+
contiene circular-progress
+
contiene number-container
+
testo esattamente NN%
+
dimensioni visibili
```

Poi impone una regola ulteriore:

```js
return candidates.length === 1 ? candidates[0] : null;
```

Se esistono due candidati plausibili, PlumePilot **preferisce non indovinare**.

Questo è un principio molto importante.

---

## 40. Ambiguità esplicita > scelta arbitraria

Consideriamo:

```text
0 candidati → non so
1 candidato → probabilmente corretto
2 candidati → ambiguo
```

Una strategia ingenua potrebbe fare:

```js
return candidates[0];
```

Ma sarebbe una scelta arbitraria.

PlumePilot usa:

```text
ambiguità → null
```

Il `null` non è sempre un fallimento.

Può rappresentare una decisione deliberata:

> non possiedo abbastanza informazioni per affermare qualcosa con sicurezza.

Questa è una forma di **fail-safe inference**.

---

## 41. `getBoundingClientRect()` come filtro pragmatico

La funzione controlla:

```js
const rect = element.getBoundingClientRect();
rect.width > 0 && rect.height > 0
```

`getBoundingClientRect()` restituisce dimensioni e posizione dell'elemento rispetto al viewport.

Qui viene usato come euristica per escludere elementi che non occupano spazio visuale.

Documentazione:

https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

Attenzione però: questo **non equivale a una definizione universale di visibilità**.

Un elemento può avere dimensioni positive ed essere:

```text
opacity: 0
coperto da un altro elemento
fuori dalla parte visibile del viewport
```

Quindi il check significa più precisamente:

> questo candidato possiede un rettangolo renderizzato non nullo.

È sufficiente per l'euristica specifica, non una funzione generale `isVisible()`.

---

# Parte XIII — DOM come baseline, non sempre source of truth

## 42. La percentuale è una baseline

Il codice di progresso contiene:

```js
const domPercent = readPegasoCoursePercentage();

if (domPercent !== null && courseProgressState.baselinePercent === null) {
  courseProgressState.baselinePercent = domPercent;
  courseProgressState.domPercent = domPercent;
}
```

Poi la percentuale visibile può essere calcolata con:

```js
const value = exactAvailable
  ? Number(state.exactPercent)
  : state.baselinePercent + Math.max(0, Number(state.sessionDelta) || 0);
```

Riferimenti:

- [`content.js` L4440-L4455](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4440-L4455)
- [`content.js` L4463-L4469](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4463-L4469)

Il DOM quindi fornisce una **baseline**.

Ma quando esiste un valore più preciso:

```text
exactPercent
```

quello prevale.

---

## 43. Hierarchy of evidence

Possiamo descrivere questa architettura come una gerarchia di evidenze:

```text
valore esatto disponibile
        │
        ├── sì → usa exactPercent
        │
        └── no
             ↓
      baseline DOM
             +
      delta osservato nella sessione
```

Non esiste necessariamente una sola fonte che sappia tutto in ogni momento.

PlumePilot combina fonti con livelli diversi di affidabilità.

Questo ci prepara direttamente ai capitoli 04, 06 e 08:

```text
DOM
API
cache
master call
stato locale
```

non avranno tutti lo stesso peso.

---

## 44. Source of truth vs source of signal

È utile distinguere due concetti.

### Source of truth

Fonte considerata autorevole per determinare il valore reale.

### Source of signal

Fonte che ci fornisce un'indicazione utile, senza essere necessariamente definitiva.

Il DOM spesso è una **source of signal** eccellente.

Per esempio:

```text
la UI mostra 82%
```

è un ottimo punto di partenza.

Ma per alcune decisioni può essere preferibile confermare con dati più strutturati.

---

# Parte XIV — URL come identità più stabile del testo visuale

## 45. La UI può cambiare etichetta mentre l'URL rimane stabile

Nel codice del limite capitoli troviamo un commento molto interessante:

```js
// The visible chapter label is not a stable identifier: Pegaso may rebuild
// it while lesson percentages change. The URL lesson number is the same
// display-order identity used by the course APIs and remains stable while
// PlumePilot moves between videos of the same chapter.
```

Il codice quindi preferisce:

```js
const lessonNumber = lessonNumberFromUrl();
```

Riferimento al parser dell'URL: [`content.js` L4336-L4345](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4336-L4345).

Questa è un'altra manifestazione dello stesso principio:

```text
rappresentazione visuale mutevole
            ↓
identificatore logico più stabile
```

---

## 46. Testo visuale come identificatore: quando è accettabile?

PlumePilot usa comunque anche testo:

```js
{
  sectionText: chapter.sectionText,
  chapterText: chapter.text,
}
```

perché non sempre dispone immediatamente di ID migliori.

Quindi dobbiamo evitare una regola dogmatica del tipo:

> non usare mai il testo come identità.

La domanda è sempre:

```text
quali identificatori espone realmente il sistema che sto integrando?
```

Possiamo ordinare grossolanamente le preferenze così:

```text
ID di dominio stabile
    ↓
ID/chiave nell'URL
    ↓
attributo semantico stabile
    ↓
combinazione di campi
    ↓
testo visuale
    ↓
posizione pura nel DOM
```

Ma ogni progetto può imporre compromessi diversi.

---

# Parte XV — Identità composta

## 47. Perché il numero del capitolo non basta

PlumePilot supporta corsi con più sezioni:

```text
Analisi Matematica I
  1 - ...
  2 - ...

Analisi Matematica II
  1 - ...
  2 - ...
```

Se usassimo soltanto:

```text
chapterNumber = 1
```

avremmo una collisione.

Per questo `chapterIdentity()` restituisce:

```js
{
  sectionText: chapter.sectionText,
  chapterText: chapter.text,
}
```

Riferimento: [`content.js` L1235-L1238](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1235-L1238).

Il changelog della v1.8.0 conserva esattamente questa decisione: i capitoli vengono identificati tramite sezione + titolo affinché la numerazione possa ricominciare da 1 in sezioni differenti.

Riferimento: [`CHANGELOG.md` L1255-L1263](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/CHANGELOG.md#L1255-L1263).

---

## 48. Composite key

Dal punto di vista dei dati, questo è molto simile a una **chiave composta**.

In un database potremmo avere:

```text
PRIMARY KEY (section_id, chapter_number)
```

In PlumePilot abbiamo concettualmente:

```text
(sectionText, chapterText)
```

Nessuno dei due valori è ideale quanto un ID ufficiale immutabile, ma la coppia distingue casi che il solo numero non saprebbe distinguere.

---

# Parte XVI — Event delegation

## 49. Un listener sul documento può sopravvivere alla sostituzione dei figli

Alla fine di `content.js` troviamo anche:

```js
document.addEventListener("click", (event) => {
  const row = event.target?.closest?.("div.border-t");

  if (row && row.querySelector(":scope > div.cursor-pointer")) {
    setTimeout(() => {
      const selected = currentLesson();
      if (selected) rememberPlaybackLesson(selected);
    }, 0);
  }
}, true);
```

Riferimento: [`content.js` L7080-L7089](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L7080-L7089).

Questo è un esempio di **event delegation**.

Invece di aggiungere un listener a ogni riga:

```text
row1 → listener
row2 → listener
row3 → listener
```

aggiungiamo un listener a un antenato stabile:

```text
document → listener
```

Quando avviene un click, risaliamo dal target:

```js
event.target.closest("div.border-t")
```

---

## 50. Perché è particolarmente utile in un DOM dinamico

Se il frontend distrugge e ricrea le righe:

```text
row A eliminata
row B creata
```

un listener attaccato direttamente ad `A` muore insieme ad `A`.

Il listener su `document`, invece, continua a esistere.

Quindi anche una futura `row B` può essere intercettata.

Questo è uno dei vantaggi più forti dell'event delegation nelle applicazioni dinamiche.

---

## 51. Perché c'è `setTimeout(..., 0)`?

Dopo il click PlumePilot non legge immediatamente `currentLesson()`.

Fa:

```js
setTimeout(() => {
  const selected = currentLesson();
  // ...
}, 0);
```

Il timeout zero non significa:

```text
esegui immediatamente
```

Significa, semplificando:

```text
programma questo lavoro per un task futuro
```

Così il codice lascia prima terminare il task corrente e permette agli handler della pagina di aggiornare il proprio stato/DOM.

È una piccola forma di **defer**.

MDN, event loop e task/microtask:

https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide

Non garantisce che qualsiasi render asincrono sia concluso; infatti per operazioni più importanti PlumePilot usa `waitFor()`. Qui è sufficiente come tentativo di leggere la selezione immediatamente successiva al click.

---

# Parte XVII — Hidden tabs e tempo non affidabile
## 52. Il browser può rallentare una pagina non visibile

La versione reale di `waitFor()` contiene più logica di quella mostrata inizialmente:

```js
const hiddenEpochAtStart = pageHiddenEpoch;
const startedHidden = documentIsHidden();
```

Dopo il primo timeout controlla se la pagina è stata nascosta durante l'attesa e può concedere una nuova finestra di attesa quando torna visibile.

Perché?

Perché i browser applicano ottimizzazioni e throttling alle tab in background.

Quindi un timeout osservato in una tab nascosta può significare:

```text
"l'operazione non è avvenuta"
```

oppure:

```text
"la pagina non ha avuto le stesse opportunità temporali di quando era visibile"
```

---

## 53. Tempo di muro vs progresso dell'applicazione

`Date.now()` misura il tempo reale trascorso.

Ma il fatto che siano passati 5 secondi non implica che una tab in background abbia eseguito lo stesso volume di lavoro JavaScript/rendering di una tab attiva.

Quindi:

```text
5 secondi wall-clock
```

non sono necessariamente:

```text
5 secondi di progresso applicativo equivalente
```

Questa distinzione tornerà nel capitolo sull'asincronia.

---

# Parte XVIII — DOM e API: due punti di vista sullo stesso dominio

## 54. Perché PlumePilot non ha abbandonato il DOM dopo aver scoperto le API?

Una domanda naturale potrebbe essere:

> se abbiamo accesso ai dati delle API della piattaforma, perché continuare a leggere e manipolare il DOM?

Perché i due strumenti risolvono problemi differenti.

### Le API sono forti quando vogliamo sapere

```text
qual è la percentuale?
quali attività esistono?
qual è lo stato di una lezione?
qual è il dato strutturato del corso?
```

### Il DOM è necessario quando vogliamo sapere o fare

```text
cosa è attualmente renderizzato?
quale riga è selezionata?
il capitolo è aperto?
dove posso cliccare?
il player esiste in questa pagina?
quale UI sta vedendo l'utente?
```

Non sono due tecnologie concorrenti.

Sono due **proiezioni differenti del sistema**.

---

## 55. Data plane e presentation plane

Possiamo usare una distinzione informale:

```text
API / dati strutturati
        ↓
   data plane

DOM / elementi visibili
        ↓
presentation plane
```

PlumePilot deve spesso passare dall'uno all'altro.

Per esempio:

```text
API: capitolo 5 contiene un'attività incompleta
        ↓
DOM: trova il componente che rappresenta capitolo 5
        ↓
DOM: aprilo
        ↓
DOM/API: verifica la specifica attività
```

Questa combinazione è alla base della ricerca moderna della prima attività incompleta, che studieremo nel Capitolo 8.

---

# Parte XIX — Un piccolo modello di affidabilità

## 56. Non tutti i segnali DOM hanno lo stesso valore

Possiamo classificare alcuni esempi.

### Molto debole

```text
"il terzo div della seconda colonna"
```

### Debole

```text
una classe CSS puramente stilistica
```

### Medio

```text
struttura + testo + ruolo visivo
```

### Più forte

```text
URL + identificatore di dominio + conferma API
```

PlumePilot contiene combinazioni di tutti questi livelli perché è cresciuto insieme alla conoscenza della piattaforma.

Questo è normale nei software di integrazione.

---

## 57. Robustezza = più segnali + verifica

Molte delle soluzioni più affidabili del progetto seguono implicitamente questa formula:

```text
ROBUSTEZZA
    ≈
identità ragionevolmente stabile
+
lettura fresca
+
verifica post-azione
+
fallback
```

Esempio:

```text
chapter identity
    +
findChapter() fresco
    +
click
    +
waitFor(isOpen)
```

Non eliminiamo l'incertezza.

La gestiamo.

---

# Parte XX — Perché il codice DOM diventa rapidamente complesso

## 58. Un `querySelector()` può nascondere molto dominio

Guardando soltanto questa riga:

```js
const el = document.querySelector(...);
```

potremmo pensare che il problema sia "conoscere CSS selectors".

Ma in un'integrazione reale dobbiamo decidere:

```text
quando fare la query
su quale scope
con quale fallback
come riconoscere l'ambiguità
cosa fare se non esiste ancora
come capire se il nodo è stale
come riaprirne il contenitore
come validare l'effetto del click
come distinguere piattaforme diverse
```

Il selettore è quasi la parte meno interessante.

---

## 59. Questo spiega perché i test E2E possono essere fragili

Gli stessi problemi compaiono in Playwright, Selenium, Cypress e strumenti simili.

Un test fragile spesso fa:

```text
sleep 2 secondi
click sul terzo bottone
sleep 1 secondo
leggi testo
```

Un test più robusto ragiona in termini di:

```text
aspetta la condizione significativa
individua l'elemento semanticamente
esegui l'azione
verifica lo stato risultante
```

PlumePilot non è un framework E2E, ma l'esperienza accumulata è molto simile.

---

# Parte XXI — Se riscrivessimo oggi il layer DOM

## 60. Potremmo estrarre un `CoursePageAdapter`

Attualmente molte funzioni DOM vivono direttamente in `content.js`.

Una possibile evoluzione architetturale potrebbe essere:

```text
content.js
    │
    ▼
CoursePageAdapter
    │
    ├── getSections()
    ├── getChapters()
    ├── getCurrentLesson()
    ├── openChapter(identity)
    ├── readVisibleProgress()
    └── findRenderedActivity(identity)
```

Poi implementazioni specifiche:

```text
PegasoCoursePageAdapter
MercatorumCoursePageAdapter
UtsrCoursePageAdapter
```

Questo renderebbe esplicito qualcosa che nel codice attuale esiste già in forma più organica.

---

## 61. Cosa guadagneremmo?

### Separazione delle responsabilità

L'autoplay potrebbe ragionare in termini di:

```js
await page.openChapter(identity);
```

senza conoscere classi CSS o chevron.

### Testabilità

Potremmo testare il dominio contro un adapter finto:

```js
fakePage.openChapter(...)
```

senza costruire sempre il DOM completo della piattaforma.

### Isolamento dei cambiamenti

Se domani Pegaso cambia:

```text
.bg-white.text-base...
```

potremmo modificare principalmente l'adapter della pagina.

---

## 62. Cosa costerebbe?

Ogni astrazione ha un prezzo.

Dovremmo:

- definire interfacce coerenti;
- migrare una grande quantità di codice esistente;
- evitare adapter troppo generici;
- gestire casi in cui le piattaforme differiscono semanticamente, non soltanto nel markup.

Quindi non significa che la struttura attuale sia "sbagliata".

Significa che **ora il progetto è abbastanza maturo da rendere visibile un boundary che all'inizio non era ancora evidente**.

Questa è una delle lezioni più importanti dell'architettura evolutiva.

---

# Parte XXII — Caso di studio completo: dalla fine del video al prossimo elemento

## 63. Ricostruiamo il rischio

Immaginiamo:

```text
utente sta guardando Video B
sidebar aperta
PlumePilot conosce row B
```

Il video termina.

PlumePilot aspetta che la piattaforma registri il completamento.

Nel frattempo può succedere:

```text
A. la sidebar aggiorna le percentuali
B. React/il frontend ricrea le righe
C. l'utente chiude l'accordion
D. il nodo row B originale si stacca
```

L'algoritmo ingenuo sarebbe:

```js
const row = currentLesson();
await waitForCompletion(row);
const next = nextLesson(row);
clickRow(next);
```

Il problema è l'ultima parte:

```text
row potrebbe appartenere al vecchio DOM
```

---

## 64. L'algoritmo reale recupera il contesto

Nel flusso attuale:

```js
let cur = await recoverPlaybackLesson(v);
```

poi conserva:

```js
const completedLesson = playbackContext;
```

attende:

```js
const completed = await waitForLessonCompletion(cur, v);
```

quindi recupera di nuovo:

```js
const stableCur = await recoverPlaybackLesson(v);
```

Infine verifica che la lezione recuperata corrisponda ancora al contesto completato.

Riferimento: [`content.js` L6671-L6702](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L6671-L6702).

Questa sequenza è importante:

```text
resolve
  ↓
remember identity
  ↓
await external/dynamic change
  ↓
re-resolve
  ↓
validate identity
  ↓
continue
```

È quasi una piccola transazione ottimistica.

---

## 65. Optimistic concurrency, in miniatura

Non esiste un vero lock sul DOM.

PlumePilot non può dire alla piattaforma:

```text
"non modificare la sidebar finché non ho finito"
```

Quindi procede ottimisticamente:

```text
1. fotografa l'identità
2. lascia che il mondo cambi
3. verifica che le precondizioni siano ancora valide
4. solo allora continua
```

È concettualmente simile all'optimistic concurrency control:

```text
read version
work
check version still compatible
commit
```

Qui la "versione" non è un numero esplicito, ma la corrispondenza tra il playback context e il DOM nuovamente risolto.

---

# Parte XXIII — Errori che sembrano DOM bug ma non lo sono

## 66. Non ogni elemento mancante è un selettore rotto

Quando una query ritorna `null`, le possibili cause sono molte:

```text
1. selettore sbagliato
2. pagina non ancora renderizzata
3. accordion chiuso
4. siamo nella route sbagliata
5. tab nascosta / rendering ritardato
6. piattaforma differente
7. componente rimosso intenzionalmente
8. sessione cambiata
9. nodo presente in un frame differente
```

Un buon debug non dovrebbe saltare immediatamente alla conclusione:

> il CSS selector non funziona.

Prima bisogna capire **in quale stato si trova il sistema**.

---

## 67. Loggare significato, non soltanto oggetti

Messaggi come:

```text
"Chapter did not open"
"Could not determine current lesson"
"Advance cancelled because the completed lesson changed or disappeared"
```

sono più utili di:

```js
console.log(element);
```

perché descrivono l'invariante che è fallita.

Un log efficace dovrebbe rispondere a:

```text
cosa stavamo cercando di fare?
quale precondizione mancava?
quale identità stavamo seguendo?
```

Non soltanto:

```text
qual era il valore di questa variabile?
```

---

# Parte XXIV — Metodo pratico per integrare una pagina dinamica

## 68. Passo 1 — Trova l'identità di dominio

Prima di scrivere il selettore chiediti:

```text
cosa rappresenta davvero questo elemento?
```

Esempio:

```text
non "questo span"
ma "capitolo 5 della sezione X"
```

---

## 69. Passo 2 — Trova la rappresentazione DOM corrente

Solo dopo:

```js
findChapter(identity)
```

Il DOM diventa un adapter verso quell'identità.

---

## 70. Passo 3 — Definisci la readiness

Chiediti:

```text
quale condizione dimostra che il componente è pronto?
```

Non:

```text
quanti millisecondi penso che servano?
```

Esempio:

```text
chapters().length > 0
```

oppure:

```text
isChapterOpen(identity)
```

---

## 71. Passo 4 — Esegui l'azione

Per esempio:

```js
chapter.span.click();
```

---

## 72. Passo 5 — Verifica l'effetto

```js
await waitFor(() => isChapterOpen(identity));
```

Non assumere che l'azione abbia avuto successo soltanto perché non ha lanciato eccezioni.

---

## 73. Passo 6 — Preparati alla sostituzione dei nodi

Dopo ogni lunga operazione asincrona chiediti:

```text
sto usando ancora un Element ottenuto prima dell'await?
```

Se sì, valuta se devi risolverlo di nuovo.

Questa domanda da sola può prevenire molti bug.

---

# Parte XXV — Esercizi

## 74. Esercizio 1 — Quale codice è più robusto?

### Versione A

```js
const chapter = findChapter(identity);
chapter.span.click();
await sleep(1000);
return chapter;
```

### Versione B

```js
const chapter = findChapter(identity);
chapter.span.click();

return await waitFor(() => {
  const fresh = findChapter(identity);
  return fresh && isChapterOpen(identity) ? fresh : null;
});
```

Quale preferiresti?

### Ragionamento

La B.

Non perché `1000` sia necessariamente troppo corto.

Ma perché la B:

```text
attende una condizione
+
risolve nuovamente il DOM
+
verifica il risultato
```

La A indovina il tempo e restituisce un riferimento potenzialmente stale.

---

## 75. Esercizio 2 — Perché questa cache è pericolosa?

```js
const cachedLessons = lessons();

async function next() {
  await somethingSlow();
  return cachedLessons[3];
}
```

### Risposta

Perché l'array contiene riferimenti ottenuti da uno snapshot precedente.

La pagina può avere ricreato le righe durante `somethingSlow()`.

Una soluzione migliore è conservare l'identità della lezione e richiamare `lessons()` o una funzione di lookup quando serve.

---

## 76. Esercizio 3 — Che cosa significa `null`?

```js
const percent = readPegasoCoursePercentage();
```

`percent === null` può significare:

```text
A. non esistono indicatori
B. esistono ma non sono ancora renderizzati correttamente
C. esistono più candidati ambigui
D. siamo nella pagina sbagliata
E. il markup della piattaforma è cambiato
```

La risposta corretta è:

**potenzialmente tutte**.

Il chiamante deve interpretare il valore nel contesto.

---

## 77. Esercizio 4 — Observer o polling?

Devi aspettare che un capitolo appena cliccato sia aperto.

Hai due possibilità:

```text
MutationObserver globale
```

oppure:

```text
waitFor(() => isChapterOpen(identity))
```

Quale useresti?

### Una buona risposta

Per una singola transizione circoscritta, `waitFor()` è semplice e leggibile.

Per accorgersi in modo permanente che parti arbitrarie della pagina possono nascere in futuro, `MutationObserver` è più adatto.

Non esiste una API sempre superiore: rispondono a scale temporali differenti.

---

## 78. Esercizio 5 — Trova il domain identity

Hai questo elemento:

```html
<span>2 - Funzioni</span>
```

Qual è l'identità?

Non possiamo saperlo dal solo nodo.

Potrebbero esistere:

```text
Sezione A / 2 - Funzioni
Sezione B / 2 - Funzioni
```

Servono altre informazioni.

Questa è esattamente la ragione delle identità composte.

---

# Parte XXVI — Concetti da portarsi dietro

## 79. DOM snapshot

Una lettura del DOM descrive uno stato in un preciso momento. In una pagina dinamica non va confusa con una struttura immutabile.

## 80. Stale DOM reference

Riferimento a un nodo ottenuto in passato che non rappresenta più il componente corrente della UI.

## 81. Logical identity

Identità del concetto di dominio indipendente dal particolare nodo DOM che lo rappresenta.

## 82. Selector contract

Dipendenza implicita dalla struttura, dalle classi o dagli attributi della pagina host utilizzati per ritrovare un elemento.

## 83. Readiness condition

Condizione osservabile che indica quando un componente è realmente pronto per l'operazione successiva.

## 84. Polling

Controllo periodico di una condizione finché diventa vera o viene raggiunta una deadline.

## 85. MutationObserver

API browser che notifica modifiche all'albero DOM. È particolarmente utile quando componenti rilevanti possono essere creati o rimossi dopo lo startup.

## 86. Event delegation

Gestione degli eventi tramite un antenato stabile invece di attaccare listener a ogni elemento dinamico.

## 87. Command + verification

Pattern in cui un'azione viene inviata alla UI e il codice verifica successivamente che il sistema abbia raggiunto lo stato desiderato.

## 88. Resolve late

Strategia di conservare identità stabili e risolvere i riferimenti concreti il più vicino possibile al momento del loro utilizzo.

## 89. Precondition recovery

Tentativo di ripristinare automaticamente una condizione necessaria prima di proseguire, per esempio riaprire un accordion prima di cercarne i figli.

## 90. Hierarchy of evidence

Ordinamento delle fonti in base all'affidabilità. Un valore API esatto, una baseline DOM e un'euristica possono coesistere senza avere la stessa autorità.

---

# Parte XXVII — Approfondimenti

## 91. DOM selection

### MDN — `Document.querySelector()`

https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector

### MDN — `Document.querySelectorAll()`

https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll

La parte particolarmente importante per questo capitolo è che `querySelectorAll()` restituisce una `NodeList` statica.

### MDN — DOM selection and traversal

https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Selection_and_traversal_on_the_DOM_tree

---

## 92. Navigazione relativa

### MDN — `Element.closest()`

https://developer.mozilla.org/en-US/docs/Web/API/Element/closest

Utile per capire perché PlumePilot può partire da uno `span` o dal target di un click e risalire al componente logico che lo contiene.

---

## 93. Osservare il DOM

### MDN — `MutationObserver`

https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

Quando lo studi, prova a distinguere sempre:

```text
"so che il DOM è cambiato"
```

contro:

```text
"so che cosa significa semanticamente il cambiamento"
```

La seconda informazione non viene fornita automaticamente dall'observer.

---

## 94. Layout e dimensioni

### MDN — `Element.getBoundingClientRect()`

https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

Serve a comprendere perché una dimensione positiva può essere un segnale utile di rendering senza costituire una definizione completa di visibilità.

---

## 95. Task e defer

### MDN — Microtask guide / event loop

https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide

È utile per comprendere perché `setTimeout(..., 0)` non significa "esegui adesso" e perché gli effetti di un evento possono diventare osservabili soltanto in un momento successivo.

---

# 96. Cosa abbiamo imparato davvero

Il punto più importante di questo capitolo non è come usare `querySelector()`.

È imparare a vedere una pagina dinamica come un sistema con **rappresentazioni temporanee**.

Abbiamo visto che:

```text
un nodo DOM
```

non è necessariamente:

```text
un'identità di dominio
```

che:

```text
non trovato
```

non significa necessariamente:

```text
non esiste
```

che:

```text
.click()
```

non significa:

```text
transizione completata
```

che:

```text
MutationObserver
```

non ci consegna il significato del cambiamento, ma ci dice che la nostra fotografia potrebbe essere diventata obsoleta.

E soprattutto abbiamo visto un pattern che tornerà continuamente in PlumePilot:

```text
identità stabile
      ↓
lettura fresca
      ↓
azione
      ↓
attesa condizionale
      ↓
verifica
      ↓
fallback / recovery
```

Questa è già architettura software, anche se stiamo lavorando con dei `<div>`.

---

## Nel prossimo capitolo

Finora abbiamo osservato la piattaforma soprattutto dalla superficie:

```text
DOM
URL
interazioni
```

Ma PlumePilot ha imparato progressivamente a guardare anche **dietro l'interfaccia**, verso le richieste che la piattaforma stessa effettua.

Nel Capitolo 04 entreremo in:

# API e reverse engineering — capire la piattaforma osservandone il traffico

Vedremo:

- che cosa significa realmente "reverse engineering" in questo contesto;
- request e response HTTP;
- JSON come rappresentazione del dominio;
- come riconoscere endpoint e identificatori;
- perché usare la sessione già autenticata è diverso dal conservare credenziali;
- master call e chiamate di dettaglio;
- come confrontare ciò che dice una API con ciò che mostra il DOM;
- perché le API hanno reso alcuni algoritmi di PlumePilot più veloci e affidabili;
- e dove, nonostante tutto, il DOM rimane indispensabile.

Passeremo quindi da:

```text
"che cosa vedo nella pagina?"
```

alla domanda:

```text
"da dove arrivano i dati che la pagina sta mostrando?"
```

Ed è qui che l'integrazione con una web app comincia a diventare davvero interessante.

---

[← 02 — Contesti e messaging](02-contesti-messaging.md) · [Indice](index.md) · [04 — API e reverse engineering →](04-api-reverse-engineering.md)
