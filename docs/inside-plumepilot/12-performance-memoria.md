# 12 — Performance e memoria

## Quando il browser diventa il nostro runtime

> **Snapshot di riferimento del capitolo**  
> Questo capitolo usa il candidato **2.35.2**, branch `feat/ui-ux-2.35.2`, commit `4d32a8c2a6cd291e4fe389bdf10fdbaf1856a8c2`.  
> Il manifest conserva ancora `2.35.1` perché il bump appartiene alla preparazione finale della release.

Nei capitoli precedenti abbiamo incontrato quasi tutti i problemi che, prima o poi, diventano problemi di performance:

- scansioni del DOM;
- richieste di rete;
- polling;
- cache;
- retry;
- export PDF;
- rendering con PDF.js;
- canvas;
- immagini;
- ZIP;
- `MutationObserver`;
- operazioni batch;
- UI che deve rimanere utilizzabile mentre il lavoro continua.

Finché li osserviamo separatamente sembrano dettagli locali.

Quando li mettiamo insieme emerge invece un fatto importante:

> **Una browser extension non gira “dentro JavaScript”. Gira dentro un browser che deve contemporaneamente eseguire JavaScript, gestire DOM e layout, disegnare, ricevere input, fare rete, decodificare immagini, mantenere cache e coordinare più context.**

Per questo dire semplicemente:

```text
"questa funzione è lenta"
```

è quasi sempre una diagnosi troppo povera.

Potrebbe essere:

```text
CPU-bound
I/O-bound
memory-bound
main-thread-bound
DOM-bound
network-bound
```

oppure una combinazione delle precedenti.

Il nostro obiettivo in questo capitolo non sarà quindi collezionare micro-ottimizzazioni.

Costruiremo invece un metodo per rispondere a quattro domande:

1. **Dove viene speso il tempo?**
2. **Quali risorse rimangono vive e per quanto?**
3. **Quanto lavoro facciamo inutilmente?**
4. **La UI rimane responsiva mentre il lavoro utile continua?**

---

# Parte I — Performance non significa una sola cosa

## 1. Quattro budget diversi

Per PlumePilot è utile separare almeno quattro budget.

### Budget CPU

Quanto lavoro computazionale deve svolgere il processo:

```text
parsing
ordinamenti
classificazione pagine
hash SHA-256
pixel analysis
costruzione DOM
compressione ZIP
```

### Budget I/O

Quanto attendiamo risorse esterne:

```text
fetch API
PDF remoti
asset immagini
storage browser
messaggi fra context
```

### Budget memoria

Quanti dati sono vivi contemporaneamente:

```text
PDF bytes
PDF.js document
canvas
pixel buffer
immagini codificate
cache
stringhe HTML
JSZip
output finale
```

### Budget responsiveness

Per quanto tempo il main thread rimane indisponibile per:

```text
input utente
paint
layout
scroll
animazioni
aggiornamenti UI
```

Questi budget sono collegati, ma non equivalenti.

Una modifica può fare questo:

```text
più parallelismo
   ↓
meno wall time
   ↓
più richieste contemporanee
   ↓
più buffer vivi
   ↓
picco RAM maggiore
```

Oppure:

```text
cache più aggressiva
   ↓
meno rete
   ↓
meno scansioni
   ↓
più memoria trattenuta
```

Il concetto centrale del capitolo è quindi:

> **Ottimizzare significa scegliere quale risorsa stiamo cercando di risparmiare.**

---

## 2. Wall time, CPU time e perceived latency

Supponiamo che un export duri 20 secondi.

Non sappiamo ancora quasi nulla.

Potrebbe contenere:

```text
2 s CPU
18 s rete
```

oppure:

```text
18 s CPU
2 s rete
```

Dal punto di vista dell'utente il wall time è simile.

Dal punto di vista architetturale sono due sistemi completamente diversi.

E c'è un terzo tempo:

**perceived latency**.

Un'operazione di 20 secondi che aggiorna progressivamente:

```text
Download dispensa 3/12
Conversione pagina 8/24
Compressione 64%
```

può sembrare più controllabile di un'operazione da 12 secondi che congela completamente l'interfaccia.

Quindi:

```text
performance != solo durata totale
```

ma anche:

```text
responsiveness
feedback
cancellabilità
progressività
```

---

# Parte II — Misurare prima di ottimizzare

## 3. `performance.now()` e clock monotono

Nel convertitore EPUB troviamo:

```js
const startedAt = performance.now();
```

Riferimento:

```text
epub-core.mjs:1842
```

E alla fine:

```js
diagnostics.elapsedMs = performance.now() - startedAt;
```

Riferimento:

```text
epub-core.mjs:2119–2121
```

Per una misurazione di durata questo è preferibile a:

```js
Date.now()
```

perché `performance.now()` usa un riferimento monotono pensato per misurare intervalli.

Questo ci permette di introdurre una regola semplice:

```text
Date.now()
→ quando ci interessa il tempo civile / timestamp

performance.now()
→ quando ci interessa quanto è durata un'operazione
```

---

## 4. Misurare il sistema giusto

Nel repository esistono benchmark EPUB.

Ma uno dei commenti più importanti è questo:

```js
// Supplementary renderer benchmark. These timings are NOT browser measurements.
```

Riferimento:

```text
scripts/benchmark-epub-node.mjs:1
```

E il benchmark Chromium specifica:

```js
scope:
  "Chromium converter over HTTP; not an installed-extension integration or process-memory test"
```

Riferimento:

```text
scripts/benchmark-epub-regions.mjs:95–101
```

Questo è software engineering molto più importante del singolo numero prodotto dal benchmark.

Un benchmark deve dichiarare **cosa misura e cosa non misura**.

Altrimenti potremmo concludere:

```text
"il benchmark Node usa 120 MB"
```

quindi:

```text
"l'estensione nel browser usa 120 MB"
```

ma non sarebbe una conclusione valida.

Node, Chromium, PDF.js worker, canvas implementation e extension runtime possono avere ownership e accounting della memoria differenti.

---

## 5. Benchmark vs profiling

Sono attività correlate ma diverse.

### Benchmark

Risponde a domande come:

```text
Quanto dura questa conversione?
Quanti byte produce?
Quante immagini vengono deduplicate?
La variante A è più veloce della B?
```

### Profiling

Risponde invece:

```text
Dove viene speso il tempo?
Quale funzione alloca?
Quale oggetto trattiene memoria?
Quale task blocca il main thread?
```

Un benchmark può dirci:

```text
versione nuova: 14.2 s
versione vecchia: 19.6 s
```

ma non necessariamente **perché**.

Un profiler ci aiuta a costruire quel perché.

---

## 6. Metriche utili per PlumePilot

Per un workflow di PlumePilot le metriche utili possono essere:

```text
elapsedMs
numero richieste API
numero retry
numero fallback visuali
pagine text/regional/visual
input image bytes
unique image bytes
EPUB bytes
numero cache hit/miss
numero capitoli aperti nel DOM
numero canvas creati
peak working set
```

Non tutte devono finire nel prodotto.

Molte possono vivere solo nei benchmark o in modalità diagnostica.

Il punto è un altro:

> **Una performance regression è molto più facile da individuare quando abbiamo una metrica legata al comportamento che vogliamo proteggere.**

---

# Parte III — Big-O non basta

## 7. Due algoritmi `O(N)` possono avere costi radicalmente diversi

Nel Capitolo 8 abbiamo visto la ricerca della prima attività incompleta.

Una scansione completa dei capitoli è, concettualmente:

```text
O(N)
```

Anche questa strategia è `O(N)`:

```text
leggi master index
ordina candidati
ispeziona i moduli necessari
```

Eppure possono avere prestazioni molto differenti.

Perché?

Perché l'unità di costo non è sempre:

```text
una iterazione JavaScript
```

Può essere:

```text
aprire accordion
attendere rendering LMS
fare una request HTTP
attendere una detail call
eseguire querySelectorAll
far cambiare route alla SPA
```

Quindi per sistemi I/O-heavy una formula più realistica è:

```text
Costo ≈
  operazioni economiche × costo economico
+ operazioni costose × costo costoso
```

Se riduciamo le detail call da 50 a 5, possiamo ottenere un enorme guadagno pur restando formalmente in `O(N)`.

---

## 8. Ottimizzare lo spazio di ricerca

La funzione:

```js
findNextPlaybackTargetViaApi(...)
```

costruisce `discoveryOrder`.

Quando è disponibile il course index, prima colloca i capitoli sospetti:

```js
const suspectedIncomplete = (index) => {
  const route = routeByLessonNumber.get(outline[index].lessonNumber);
  return !route || Number(route.percentage) < 100;
};

discoveryOrder = [
  ...discoveryOrder.filter(suspectedIncomplete),
  ...discoveryOrder.filter((index) => !suspectedIncomplete(index)),
];
```

Riferimento:

```text
content.js:5896–5911
```

La complessità asintotica non diventa magica.

Ma cambia il numero atteso di operazioni costose eseguite prima di trovare il target.

Questo è un esempio di:

**cost-based optimization**.

Non stiamo semplicemente contando elementi.

Stiamo cercando di ordinare le operazioni per ridurre il costo medio.

---

## 9. Saltare lavoro già provato

Nel percorso non-bookmark troviamo anche:

```js
if (
  !options.bookmarkSearch &&
  !options.forwardVideoSearch &&
  indexedChapter &&
  Number(indexedChapter.percentage) >= 100
) {
  continue;
}
```

Riferimento:

```text
content.js:5947–5953
```

Il master index qui non deve raccontarci ogni dettaglio.

Deve rispondere a una domanda più economica:

```text
vale la pena fare la richiesta dettagliata?
```

Questa è la funzione classica di un indice.

---

# Parte IV — DOM: il costo nascosto

## 10. `querySelectorAll()` non è gratis

In `content.js` incontriamo molte query.

Per esempio:

```js
document.querySelectorAll("video").forEach(attach);
```

oppure ricerche più ampie su:

```text
span
div
heading
button
row
```

Il costo di una query DOM dipende da:

- dimensione del sottoalbero;
- complessità del selettore;
- frequenza;
- quantità di lavoro fatto sui risultati;
- eventuale interazione con layout/style.

Una query occasionale può essere irrilevante.

La stessa query ripetuta ad ogni mutazione di un grande subtree può diventare una hot path.

---

## 11. Il `MutationObserver` globale di autoplay

Il codice attuale usa:

```js
new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
```

Riferimento:

```text
content.js:7076–7079
```

Ogni volta che viene invocato `scan()`:

```js
document.querySelectorAll("video").forEach(attach);
const activeRow = currentLesson();
...
```

Riferimento:

```text
content.js:7066–7074
```

È una soluzione robusta perché non dipende dal framework interno della piattaforma.

Ma ha un potenziale costo:

```text
molte mutazioni DOM
      ↓
molti callback observer
      ↓
nuove scansioni
```

Questo non significa automaticamente che sia un problema misurabile.

Significa che è un **candidate hotspot**.

La regola è:

> **Prima profilare, poi restringere l'observer se esiste un beneficio reale.**

---

## 12. Observer come invalidation signal

Il pattern più efficiente concettualmente non è:

```text
MutationObserver = il dato
```

ma:

```text
MutationObserver = qualcosa potrebbe essere cambiato
```

Quindi:

```text
mutation
  ↓
invalidate / schedule
  ↓
fresh query
```

Questo modello era già emerso nel Capitolo 3.

Dal punto di vista delle performance permette anche strategie come:

```text
debounce
coalescing
narrow observer root
specific mutation filtering
```

se un profiler dimostrasse che servono.

---

## 13. Coalescing

Supponiamo che il framework LMS produca 30 mutazioni durante un singolo aggiornamento visuale.

Non sempre vogliamo eseguire 30 volte:

```js
scan();
```

Possiamo invece trasformare:

```text
mutation
mutation
mutation
mutation
```

in:

```text
schedule scan once
```

Questa tecnica si chiama spesso **coalescing**.

PlumePilot la applica in vari punti attraverso funzioni `schedule...()` e timer, anche se non ogni observer usa necessariamente lo stesso meccanismo.

---

## 14. Layout read

Operazioni come:

```js
element.getBoundingClientRect()
```

sono molto diverse da leggere una semplice proprietà JavaScript.

In PlumePilot vengono usate per capire:

- quale video è visibile;
- se un elemento occupa spazio renderizzato;
- la posizione del launcher;
- la geometria del menu;
- il comportamento dello scroll.

Il problema non è chiamare `getBoundingClientRect()`.

Il problema nasce soprattutto quando alterniamo ripetutamente:

```text
DOM write
layout read
DOM write
layout read
```

perché il browser potrebbe dover aggiornare layout più volte.

Il principio generale è:

> **Quando possibile, raggruppare reads e writes invece di interlevarle senza necessità.**

---

# Parte V — Rete: più veloce non significa più parallelo

## 15. Il falso istinto: `Promise.all()` ovunque

Se dobbiamo processare 40 capitoli, potremmo pensare:

```js
await Promise.all(chapters.map(loadChapter));
```

Sembra la soluzione più veloce.

Ma può creare contemporaneamente:

```text
40 richieste
40 response buffer
40 parse
40 cache write
40 possibili retry
```

Il wall time può diminuire.

Il carico complessivo può aumentare drasticamente.

Inoltre stiamo interagendo con un servizio terzo che non controlliamo.

PlumePilot usa spesso una strategia più conservativa.

---

## 16. Pacing come backpressure

Fra le costanti troviamo:

```js
const API_MATERIAL_PACING_MS = 150;
const TURBO_API_PACING_MS = 350;
```

Riferimento:

```text
content.js:60–61
```

Durante la raccolta materiali:

```js
if (index + 1 < outline.length) {
  await exportSleep(API_MATERIAL_PACING_MS, operationId);
}
```

Riferimento:

```text
content.js:3172–3175
```

Questo è un esempio di **backpressure applicativa**.

La pipeline dice:

```text
posso chiedere il prossimo elemento
```

ma sceglie deliberatamente di non saturare il producer.

---

## 17. Perché il pacing può migliorare il sistema anche se lo rallenta

Sembra un paradosso.

Inserire 150 ms:

```text
rende la singola sequenza più lenta
```

ma può:

```text
ridurre burst di richieste
ridurre retry
ridurre errori transitori
ridurre concorrenza sui buffer
ridurre carico sulla piattaforma
rendere cancellazione e progress più prevedibili
```

La performance di un sistema non è soltanto:

```text
velocità massima in condizioni ideali
```

ma anche:

```text
stabilità sotto carico e condizioni imperfette
```

---

## 18. Retry non è throughput

PlumePilot separa:

```js
const COURSE_INDEX_RETRY_DELAYS_MS = [350, 750];
const API_LESSON_RETRY_DELAYS_MS = [750, 1500];
```

Riferimento:

```text
content.js:62–63
```

Un retry serve a recuperare un fallimento.

Il pacing serve a regolare il ritmo normale.

Sono due meccanismi diversi.

Confonderli produce algoritmi strani:

```text
"aspettiamo perché potrebbe fallire"
```

invece di:

```text
pacing → comportamento normale
retry → recupero eccezionale
```

---

## 19. Request deduplication

Nel builder quiz esiste:

```js
const imageCache = new Map();
```

Riferimento:

```text
test-builder.js:16
```

Quando viene richiesta un'immagine:

```js
if (imageCache.has(url)) return imageCache.get(url);
```

poi viene salvata **la Promise della richiesta**, non soltanto il risultato finale.

Questo dettaglio è importante.

Se due consumer richiedono simultaneamente la stessa URL:

```text
consumer A ─┐
            ├→ stessa Promise → una fetch
consumer B ─┘
```

anziché:

```text
consumer A → fetch
consumer B → fetch
```

Questa è **in-flight deduplication**.

---

## 20. Cache hit come eliminazione di lavoro

Nelle pipeline API il log esplicita casi come:

```text
reused from memory cache
```

Il beneficio di una cache non è soltanto diminuire latenza.

Può eliminare:

```text
HTTP
parse JSON
normalizzazione
DOM fallback
attese
retry
```

Per questo una cache ben progettata può migliorare più budget contemporaneamente.

Ma, come abbiamo visto nel Capitolo 6, sposta il costo verso la memoria.

---

# Parte VI — Bounded memory

## 21. Una cache senza limite è una promessa di crescita

Nel MAIN-world interceptor troviamo:

```js
const pageLessonSnapshots = new Map();
```

La cache viene limitata:

```js
if (pageLessonSnapshots.size > 50) {
  pageLessonSnapshots.delete(pageLessonSnapshots.keys().next().value);
}
```

Riferimento:

```text
commission-interceptor.js:414–415
```

Questa è una proprietà fondamentale:

**bounded growth**.

Senza limite, se la pagina continua a visitare identità nuove:

```text
1 entry
10 entries
100 entries
1000 entries
...
```

il processo non ha nessuna ragione applicativa per liberarle.

---

## 22. FIFO-ish, non LRU

Come visto nel Capitolo 6, una `Map` conserva l'ordine di inserimento.

Cancellare:

```js
map.keys().next().value
```

rimuove l'entry inserita prima fra quelle ancora presenti.

Quindi questo schema è più vicino a:

```text
FIFO eviction
```

che a:

```text
LRU eviction
```

perché una semplice lettura non sposta automaticamente la chiave in fondo.

Questo può essere perfettamente adeguato.

Una LRU vera costerebbe maggiore complessità.

---

## 23. Boundedness come invariante

Una struttura dati può essere veloce per entry e comunque pericolosa se cresce senza limite.

Per esempio:

```textlookup O(1)-ish
```

non ci dice nulla su:

```text
numero massimo di entry
```

La domanda di performance corretta è quindi doppia:

```text
quanto costa una operazione?
quanto può crescere la struttura?
```

---

# Parte VII — EPUB: il vero laboratorio di memoria

## 24. Working set

Nel Capitolo 9 abbiamo visto le rappresentazioni intermedie dell'EPUB.

Ora le guardiamo dal punto di vista della memoria.

Durante la conversione possono coesistere:

```text
PDF Uint8Array
PDF.js document
pagina PDF.js
textContent
operator list
canvas sorgente
ImageData temporaneo
canvas di regione
immagine compressa
XHTML
JSZip entries
EPUB finale Uint8Array
```

L'insieme di dati necessari **in questo momento** è il:

**working set**.

Il problema reale non è soltanto quanti byte avremo alla fine.

È quanti byte dobbiamo mantenere vivi contemporaneamente.

---

## 25. Peak memory

Definiamo:

```text
peak memory = massimo working set raggiunto durante l'operazione
```

Due algoritmi possono produrre lo stesso EPUB da 40 MB ma avere:

```text
Algoritmo A → picco 150 MB
Algoritmo B → picco 600 MB
```

Il file finale non ci permette di dedurlo.

Questo è il motivo per cui una riduzione della dimensione dell'EPUB **non dimostra** automaticamente una riduzione della RAM.

Il changelog 2.35.1 è infatti prudente:

```text
File-size gains depend on the document and do not establish RAM savings.
```

Riferimento:

```text
CHANGELOG.md:9
```

---

## 26. Canvas: pixel non compressi

Una immagine PNG da 800 KB può derivare da un canvas che, durante il rendering, rappresenta milioni di pixel non compressi.

Per un buffer RGBA 8-bit il modello mentale è:

```text
bytes ≈ width × height × 4
```

PlumePilot limita il rendering visuale con:

```js
const VISUAL_MAX_PIXELS = 5000000;
const VISUAL_MAX_DIMENSION = 8192;
```

Riferimento:

```text
epub-core.mjs:22–23
```

Cinque milioni di pixel RGBA corrispondono già a circa:

```text
20,000,000 bytes
≈ 19.1 MiB
```

solo per una rappresentazione pixel equivalente.

E non stiamo ancora contando:

- PDF.js;
- canvas aggiuntivi;
- `ImageData` temporanei;
- immagine codificata;
- oggetti JavaScript.

---

## 27. Limitare la scala prima di allocare

La funzione:

```js
function visualRenderScale(viewport, renderWidth = VISUAL_RENDER_WIDTH) {
  return Math.min(
    renderWidth / viewport.width,
    Math.sqrt(VISUAL_MAX_PIXELS / (viewport.width * viewport.height)),
    VISUAL_MAX_DIMENSION / Math.max(viewport.width, viewport.height),
  );
}
```

Riferimento:

```text
epub-core.mjs:1101–1107
```

è una misura di performance molto più importante di quanto sembri.

Non dice:

```text
crea il canvas grande e poi riducilo
```

Dice:

```text
calcola prima un upper bound
        ↓
alloca direttamente entro il budget
```

È una forma di **admission control** sulle allocazioni.

---

## 28. `getImageData()` crea altro lavoro e altri dati

Nella conversione regionale:

```js
const pixels = context.getImageData(
  0,
  band.start,
  canvas.width,
  band.end - band.start,
).data;
```

Riferimento:

```text
epub-core.mjs:1453–1461
```

`getImageData()` restituisce dati pixel per la regione richiesta.

Quindi una strategia che analizza pixel non ha solo costo CPU.

Ha anche costo di memoria e copying/representation.

Per questo il codice lavora per **band**, non necessariamente sempre sull'intera pagina in un unico `ImageData` aggiuntivo.

---

## 29. Cache locale per `rowInk`

Durante la classificazione regionale troviamo:

```js
const rowInkCache = new Int32Array(canvas.height).fill(-1);
const cachedRowInk = (y) => {
  if (rowInkCache[y] < 0)
    rowInkCache[y] = rowInk(context, y, 0, canvas.width);
  return rowInkCache[y];
};
```

Riferimento:

```text
epub-core.mjs:1388–1392
```

È una piccola memoization molto mirata.

Calcolare l'ink di una riga richiede leggere pixel.

La pipeline può chiedere più volte la stessa riga durante:

```text
inkBands
refinement
cut search
```

Quindi spendiamo:

```text
O(height) interi
```

per evitare lavoro pixel ripetuto.

È un ottimo esempio di trade-off:

```text
un po' più memoria
→ molta meno CPU potenziale
```

---

# Parte VIII — Lifetime e release esplicito

## 30. JavaScript ha garbage collection, ma noi controlliamo la reachability

Una frase comune è:

```text
"JavaScript ha il garbage collector, quindi non devo liberare memoria"
```

È sbagliata.

Il GC decide quando liberare oggetti **non più raggiungibili**.

Il programmatore decide, direttamente o indirettamente, quali riferimenti restano raggiungibili.

Se manteniamo:

```js
cache.set(key, hugeBuffer);
```

quel buffer resta raggiungibile.

Se un event listener chiude sopra un grande oggetto, può mantenerlo raggiungibile.

Se un array cresce indefinitamente, gli elementi restano raggiungibili.

Quindi il problema non è chiamare manualmente `free()`.

È progettare correttamente:

```text
ownership
lifetime
reachability
```

---

## 31. Ridurre un canvas a `1×1`

Dopo il rendering PlumePilot esegue pattern come:

```js
finally {
  canvas.width = 1;
  canvas.height = 1;
}
```

Riferimenti:

```text
epub-core.mjs:1132–1135
epub-core.mjs:1194–1203
epub-core.mjs:1546–1563
```

Questo non è l'equivalente JavaScript di `free()`.

È però una maniera esplicita per dire:

```text
non abbiamo più bisogno della grande backing surface
```

ridimensionando il canvas a una superficie minima.

La lezione architetturale è:

> **Quando una risorsa browser ha un lifetime chiaramente terminato, renderlo evidente nel codice può ridurre la retention accidentale.**

---

## 32. `page.cleanup()`

Ogni pagina PDF.js viene gestita così:

```js
const page = await pdf.getPage(pageNumber);
try {
  ...
} finally {
  page.cleanup();
}
```

Riferimento:

```text
epub-core.mjs:1684–1762
```

Questa è una delle ragioni per cui il `finally` non serve soltanto agli errori.

Serve alla **resource lifetime correctness**.

Qualunque percorso avvenga:

```text
successo
fallback
errore
cancellazione
```

il cleanup deve avere una via di esecuzione.

---

## 33. `pdf.destroy()`

Alla fine della dispensa:

```js
if (destroyPromise) {
  await destroyPromise;
} else if (pdf) {
  await pdf.destroy().catch(() => {});
} else if (loadingTask) {
  await loadingTask.destroy().catch(() => {});
}
```

Riferimento:

```text
epub-core.mjs:1775–1783
```

Il codice gestisce anche il caso di cancellazione durante il caricamento.

Quindi non abbiamo soltanto:

```text
lifetime normale
```

ma anche:

```text
lifetime interrotto
```

Un sistema cancellabile deve liberare risorse anche lungo i percorsi che non arrivano alla fine naturale.

---

## 34. Rimuovere listener temporanei

Per collegare l'AbortSignal al render PDF.js:

```js
signal?.addEventListener("abort", cancel, { once: true });
```

ma nel `finally`:

```js
signal?.removeEventListener("abort", cancel);
```

Riferimento:

```text
epub-core.mjs:1082–1096
```

Stesso principio in `yieldToBrowser()` e download/retry.

Un listener non è necessariamente costoso.

Un listener dimenticato può però:

```text
mantenere closure
mantenere riferimenti
accumulare callback
creare comportamento duplicato
```

---

# Parte IX — Conversione sequenziale e picco RAM

## 35. Una dispensa alla volta

`buildCourseEpub()` itera:

```js
for (let index = 0; index < materials.length; index++) {
  ...
  const converted = await convertMaterial(...);
  ...
}
```

Riferimento:

```text
epub-core.mjs:1891–1962
```

Questa scelta controlla la concorrenza.

Un'alternativa sarebbe:

```js
await Promise.all(materials.map(convertMaterial));
```

ma significherebbe poter avere contemporaneamente:

```text
PDF #1 + canvas
PDF #2 + canvas
PDF #3 + canvas
...
```

La versione sequenziale sacrifica throughput teorico per contenere il working set.

---

## 36. Streaming ideale vs builder in-memory

JSZip accumula il pacchetto logico e alla fine:

```js
const bytes = await zip.generateAsync({
  type: "uint8array",
  compression: "DEFLATE",
  compressionOptions: { level: 6 },
}, ...);
```

Riferimento:

```text
epub-core.mjs:2098–2117
```

Durante questa fase abbiamo potenzialmente:

```text
asset registrati in JSZip
+
strutture ZIP
+
output Uint8Array in costruzione
```

Una pipeline completamente streaming potrebbe ridurre alcuni picchi.

Ma introdurrebbe:

- maggiore complessità;
- compatibilità diversa;
- gestione più complessa degli errori;
- necessità di conoscere manifest e asset finali al momento giusto.

Quindi la domanda corretta non è:

```text
"perché non streammare tutto?"
```

ma:

```text
"il picco attuale giustifica il costo di una architettura streaming?"
```

---

# Parte X — Deduplicazione: risparmiare file e working set

## 37. Content-addressable deduplication

In `epub-assets.mjs`:

```js
const byHash = new Map();
```

Ogni immagine viene digestata:

```js
const digest = new Uint8Array(
  await crypto.subtle.digest("SHA-256", image.bytes)
);
```

poi identificata con:

```js
const key = `${image.mediaType}:${extension}:${hash}`;
```

Riferimento:

```text
epub-assets.mjs:1–20
```

Se il contenuto è già presente:

```text
riuso metadata
non aggiungo una seconda copia al ZIP
```

---

## 38. Hashing costa CPU per risparmiare memoria e output

La deduplicazione non è gratis.

Per ogni asset:

```text
leggi bytes
calcola SHA-256
lookup Map
```

Quindi:

```text
più CPU
```

in cambio di:

```text
meno asset duplicati
meno ZIP bytes
meno storage interno
```

È di nuovo un trade-off multi-budget.

---

## 39. Ownership: JSZip diventa il proprietario

Dopo la registrazione:

```js
const asset = await assetRegistry.register(image);
...
image.bytes = null;
```

Riferimento:

```text
epub-core.mjs:1914–1920
```

Il commento nel codice è molto esplicito:

```js
// Release duplicate buffers; JSZip retains only the canonical bytes.
```

Qui avviene un **ownership transfer concettuale**:

```text
converted.images
      ↓ register
asset registry / JSZip
      ↓
converted image buffer non serve più
```

Impostare `image.bytes = null` rende quella transizione visibile nel codice.

---

## 40. Non duplicare ownership

Il problema che vogliamo evitare è:

```text
JSZip → buffer A
images[] → stesso buffer A
included[] → stesso/altro riferimento
aliases → metadata
```

Anche se alcuni riferimenti puntano allo stesso oggetto e non duplicano fisicamente i byte, strutture ridondanti rendono più difficile capire quando un buffer può diventare unreachable.

La regola è:

> **Ogni grande buffer dovrebbe avere un owner chiaramente identificabile.**

---

# Parte XI — JPEG o PNG? Performance come scelta di rappresentazione

## 41. Non tutte le immagini vogliono lo stesso codec

PlumePilot analizza un sample `64×64`:

```js
sample.width = 64;
sample.height = 64;
context.drawImage(canvas, 0, 0, sample.width, sample.height);
```

poi decide:

```js
return photographic
  ? { extension: "jpg", mediaType: "image/jpeg", quality: 0.9 }
  : { extension: "png", mediaType: "image/png", quality: undefined };
```

Riferimento:

```text
epub-core.mjs:1036–1050
```

È una decisione di performance basata sulla **rappresentazione**.

JPEG può comprimere meglio contenuto fotografico.

PNG preserva bene grafica, testo e bordi netti.

---

## 42. Ottimizzare prima di codificare

Notiamo l'ordine:

```text
canvas grande
   ↓
downsample 64×64
   ↓
classificazione economica
   ↓
codec
   ↓
encode
```

Non viene provato prima PNG, poi JPEG, poi scelto il più piccolo.

Quella strategia richiederebbe due encoding completi.

La soluzione attuale usa una **cheap heuristic before expensive operation**.

Pattern generale:

```text
cheap classifier
      ↓
choose expensive path
```

Lo stesso schema appare nella ricerca attività e nel routing API.

---

# Parte XII — Text first: evitare il raster quando possibile

## 43. L'ottimizzazione più potente è non fare lavoro

Per una pagina semplice PlumePilot tenta:

```js
converted = textPageToHtml(...);
```

solo se la classificazione non richiede visual rendering.

Riferimento:

```text
epub-core.mjs:1684–1717
```

Se il testo è sufficientemente affidabile:

```text
niente canvas ad alta risoluzione
niente raster intera pagina
niente immagine codificata
EPUB più reflowable
```

Questa è contemporaneamente un'ottimizzazione di:

```text
CPU
memoria
file size
accessibilità del testo
adattabilità e-reader
```

---

## 44. Fast path e slow path

Possiamo leggere il convertitore come:

```text
FAST PATH
PDF text → XHTML

SLOW PATH
PDF → render canvas → analisi → immagine/regione
```

L'obiettivo di un fast path non è eliminare il slow path.

È usare il slow path **solo quando serve**.

---

## 45. Progressive refinement

La pipeline usa una sequenza di crescente costo:

```text
estrai testo
   ↓
classifica
   ↓
conversione testuale
   ↓
controllo incompletezza
   ↓
regional analysis
   ↓
full visual fallback
```

Questo è lo stesso principio algoritmico incontrato nella ricerca attività:

> **partire dall'evidenza più economica e aumentare il costo solo quando l'incertezza lo richiede.**

---

# Parte XIII — Cooperative scheduling

## 46. Il problema del long task

JavaScript nel main thread ha semantica run-to-completion.

Se una funzione esegue per troppo tempo senza cedere:

```text
input resta in coda
paint resta in coda
scroll può diventare scattoso
progress UI non aggiorna
```

Anche se l'algoritmo termina correttamente, l'esperienza può essere pessima.

---

## 47. `yieldToBrowser()`

L'EPUB converter implementa:

```js
const browserYieldChannel = new MessageChannel();
const browserYieldQueue = [];
browserYieldChannel.port1.onmessage = () =>
  browserYieldQueue.shift()?.();
```

poi:

```js
function yieldToBrowser(signal) {
  ...
  browserYieldQueue.push(resume);
  browserYieldChannel.port2.postMessage(null);
}
```

Riferimento:

```text
epub-core.mjs:137–167
```

Il compito non è diventato parallelo.

È stato spezzato in più task cooperativi.

---

## 48. Yielding non riduce necessariamente il lavoro totale

Supponiamo:

```text
100 ms lavoro continuo
```

contro:

```text
20 ms lavoro
yield
20 ms lavoro
yield
...
```

Il secondo percorso potrebbe perfino durare leggermente di più.

Ma consente al browser di intercalare altro lavoro.

Quindi:

```text
throughput leggermente peggiore
responsiveness molto migliore
```

può essere il trade-off corretto.

---

## 49. Dove PlumePilot cede il controllo

Durante la conversione troviamo `await yieldToBrowser(signal)`:

- dopo blocchi visuali;
- durante la pianificazione regionale;
- dopo regioni;
- dopo pagine.

Riferimenti:

```text
epub-core.mjs:1198
epub-core.mjs:1487
epub-core.mjs:1551
epub-core.mjs:1764
```

Questi sono **cooperative scheduling points**.

---

## 50. Perché `MessageChannel`?

`MessageChannel` permette di accodare un messaggio che verrà elaborato in un task successivo.

Il punto non è comunicare con un altro frame.

Qui viene usato come primitiva di scheduling:

```text
current task
   ↓ postMessage
return to browser/event loop
   ↓
message task
   ↓
resume Promise
```

È un uso interessante di una API nata per channel messaging.

---

## 51. `requestIdleCallback()` sarebbe migliore?

Non automaticamente.

`requestIdleCallback()` è pensato per lavoro a bassa priorità durante periodi idle, ma non è Baseline su tutti i browser e un callback senza timeout può essere ritardato significativamente.

Per un export richiesto esplicitamente dall'utente vogliamo:

```text
cedere il thread
```

senza dire:

```text
esegui solo quando il browser ritiene di essere idle
```

Quindi il modello `MessageChannel` è ragionevole per questo caso.

---

# Parte XIV — Cancellation è anche performance

## 52. Un lavoro non più desiderato è lavoro sprecato

Quando l'utente preme:

```text
Annulla creazione EPUB
```

la cancellazione non è soltanto UX.

Serve anche a fermare:

```text
fetch
retry
PDF render
pixel analysis
compressione futura
allocazioni future
```

Quindi:

> **Cancellation è una forma di resource management.**

---

## 53. Abort dentro il render

`renderPage()` collega il signal a PDF.js:

```js
const task = page.render(...);
const cancel = () => task.cancel();
signal?.addEventListener("abort", cancel, { once: true });
```

Riferimento:

```text
epub-core.mjs:1074–1096
```

Se la cancellazione restasse soltanto nel pulsante UI, il lavoro pesante continuerebbe.

La cancellazione deve attraversare l'intera pipeline.

---

## 54. Cancellation latency

Una cancellazione perfetta non è soltanto:
```text
alla fine controllo signal.aborted
```

Dobbiamo anche chiederci:

```text
quanto tempo passa tra il click e il prossimo cancellation point?
```

Questa è la **cancellation latency**.

Più il lavoro è suddiviso in unità ragionevoli:

```text
pagina
regione
retry
sleep breve
```

più rapidamente possiamo interromperlo.

---

# Parte XV — Output size e RAM non sono la stessa metrica

## 55. Il caso che inganna facilmente

Immaginiamo due EPUB:

```text
A = 40 MB
B = 20 MB
```

Non possiamo concludere:

```text
B usa metà RAM
```

Perché B potrebbe essere stato prodotto con:

```text
più canvas intermedi
più hash
più buffer temporanei
compressione più aggressiva
```

La dimensione finale misura l'artefatto.

La peak memory misura il processo.

---

## 56. Compressione: spazio vs CPU

JSZip usa:

```js
compression: "DEFLATE",
compressionOptions: { level: 6 }
```

Riferimento:

```text
epub-core.mjs:2098–2103
```

Una compressione più aggressiva potrebbe ridurre file size ma aumentare CPU.

Una compressione minore potrebbe aumentare output ma terminare prima.

Ancora una volta:

```text
"più piccolo" != "più performante"
```

---

# Parte XVI — Parallelismo selettivo

## 57. Dove `Promise.all()` ha senso

Nel test builder vengono caricati in parallelo i font:

```js
const [regularBytes, boldBytes] = await Promise.all([...]);
```

Riferimento:

```text
test-builder.js:197
```

Questi sono pochi asset noti e indipendenti.

Qui il fan-out è piccolo e controllato.

---

## 58. Dove può aumentare il working set

La creazione dell'HTML offline usa nested `Promise.all()` per:

```text
test
  → questions
      → question images
      → answers
          → answer images
```

Riferimento:

```text
test-builder.js:326–347
```

Questo rende il codice semplice e può accelerare la preparazione.

Ma per un quiz enorme può aumentare il numero di immagini caricate contemporaneamente.

La `imageCache` evita download duplicati, ma non impone un concurrency limit globale.

Quindi questa è una possibile area futura da misurare prima di introdurre una queue.

---

## 59. Concurrency limit come compromesso

Una futura strategia potrebbe usare:

```text
N worker logici
```

per esempio:

```text
massimo 4 immagini in flight
```

ottenendo:

```text
più veloce del seriale
meno memoria del Promise.all illimitato
```

È lo stesso concetto di connection pool o worker pool lato backend.

---

# Parte XVII — Stringhe, Base64 e duplicazione

## 60. HTML offline self-contained

Il quiz HTML incorpora immagini come Data URL.

Per ogni immagine:

```text
binary bytes
   ↓
Base64 string
   ↓
HTML string finale
```

Questa scelta è ottima per:

```text
un solo file
uso offline
nessuna cartella asset
```

ma ha un costo di rappresentazione.

Base64 aumenta la quantità di testo rispetto ai byte binari originali e durante la generazione possono coesistere:

```text
bytes originali
Data URL
payload JSON
HTML finale
Blob finale
```

---

## 61. Self-contained è un requisito, non una micro-ottimizzazione

Potremmo produrre:

```text
index.html
images/...
runtime.js
```

riducendo alcune duplicazioni di stringhe.

Ma perderemmo il requisito UX:

```text
scarica un file e aprilo ovunque
```

Questa è una lezione importante:

> **Una architettura va valutata rispetto ai requisiti del prodotto, non soltanto alla metrica più facile da ottimizzare.**

---

# Parte XVIII — Object URLs e lifetime

## 62. Blob URL

Nel builder materiali:

```js
const url = URL.createObjectURL(
  new Blob([bytes], { type: mime })
);
```

poi:

```js
setTimeout(() => URL.revokeObjectURL(url), 5000);
```

Riferimento:

```text
materials-builder.js:75–84
```

Una Blob URL mantiene accessibile la risorsa associata.

Quindi anche il download ha un lifetime da gestire.

---

## 63. Perché non revocarla immediatamente?

Perché il browser deve avere il tempo di consumare il link di download.

Quindi usiamo:

```text
create
click
remove anchor
revoke later
```

Il timer non è una misura perfetta universale.

È un compromesso pragmatico fra:

```text
non invalidare il download troppo presto
```

e:

```text
non mantenere la Blob URL indefinitamente
```

---

# Parte XIX — Memory leak vs high memory usage

## 64. Non sono sinonimi

Un export può raggiungere 300 MB e poi tornare a 80 MB.

Questo è **high peak memory**.

Un altro può partire da 80 MB e, dopo ogni export, stabilizzarsi a:

```text
100
125
155
190
...
```

Questo suggerisce **retention/leak**.

Sono problemi differenti.

---

## 65. Leak = memoria che rimane raggiungibile senza motivo

Cause tipiche:

```text
Map senza eviction
listener mai rimossi
DOM detachato ancora referenziato
closure
worker non terminati
array cumulativi
cache globali
```

PlumePilot contiene esempi di difese contro alcuni di questi rischi:

- cache bounded;
- listener temporanei rimossi;
- PDF.js destroy;
- canvas ridotti;
- cache memory-only che muore col context;
- operation cleanup.

---

## 66. Tre snapshot come metodo mentale

Per investigare retention è utile confrontare:

```text
A — prima dell'operazione
B — dopo l'operazione
C — dopo cleanup / ritorno allo stato iniziale
```

Se B cresce, è normale.

La domanda è:

```text
C torna vicino ad A?
```

Non necessariamente byte-per-byte, perché GC, JIT e cache del browser possono variare.

Ma il trend è più informativo del singolo numero.

---

# Parte XX — GC rende la memoria rumorosa

## 67. Non misurare un singolo punto

Il garbage collector decide autonomamente quando eseguire collection.

Quindi:

```text
misura 1 → 180 MB
misura 2 → 220 MB
```

non significa automaticamente che abbiamo perso 40 MB.

Potrebbe esserci memoria reclaimable che il runtime non ha ancora raccolto.

Per questo conviene guardare:

```text
trend
ripetizioni
heap snapshots
retained objects
```

non solo un contatore live.

---

## 68. `performance.memory` non è una verità universale

Esiste una proprietà storica `performance.memory`, ma è non standard e deprecata.

Una API più moderna è:

```js
performance.measureUserAgentSpecificMemory()
```

ma ha disponibilità limitata e requisiti di sicurezza/cross-origin isolation.

Quindi nel nostro contesto non la tratteremmo come metrica portabile di produzione.

DevTools rimane fondamentale per l'analisi concreta.

---

# Parte XXI — Cache e pressure

## 69. Cache utile vs cache eterna

Ogni cache dovrebbe poter rispondere a:

```text
chi la possiede?
quando nasce?
quanto può crescere?
quando scade?
come viene invalidata?
quanto è costosa una entry?
```

Per `lessonApiCache` abbiamo TTL semantico.

Per `pageLessonSnapshots` abbiamo un cap numerico.

Per alcune cache del content script il lifecycle della pagina stessa costituisce un limite naturale.

Questi sono tre metodi differenti per controllare crescita e staleness.

---

## 70. TTL controlla staleness, non size

Ricordiamo:

```js
const API_LESSON_CACHE_FRESH_MS = 5 * 60 * 1000;
```

Riferimento:

```text
content.js:64
```

Un TTL dice:

```text
questa entry è ancora fresca?
```

Non necessariamente:

```text
rimuovi fisicamente ogni entry dopo 5 minuti
```

Quindi TTL e memory bound sono concetti distinti.

---

# Parte XXII — Il costo delle strutture intermedie

## 71. `Array.from`, spread e copie

Nel codice web moderno scriviamo spesso:

```js
[...document.querySelectorAll(...)]
```

oppure:

```js
[...arrayA, ...arrayB]
```

Queste operazioni sono comode e leggibili.

Ma creano nuove strutture.

Nella maggior parte del codice PlumePilot sono trascurabili.

In una hot path con decine di migliaia di elementi potrebbero diventare rilevanti.

La regola non è:

```text
mai usare spread
```

ma:

> **Non sacrificare leggibilità per micro-allocazioni finché il profiler non dimostra che sono il collo di bottiglia.**

---

## 72. Ottimizzazione prematura

È facile trasformare:

```js
array.filter(...).map(...)
```

in un loop manuale complesso per risparmiare una allocazione.

Se il 95% del tempo è speso in:

```text
fetch
PDF render
canvas encode
```

abbiamo ottimizzato la parte sbagliata.

Questo è il significato pratico di **premature optimization**.

---

# Parte XXIII — Performance e correttezza

## 73. Una ottimizzazione che cambia semantica è un bug

La storia della ricerca della prima attività incompleta lo mostra bene.

Saltare tutti i capitoli master `100%` sarebbe più veloce.

Ma se il master è stale può introdurre false negative.

Quindi la versione attuale fa una seconda passata.

Risultato:

```text
leggermente più lavoro nel worst case
```

ma:

```text
correttezza maggiore
```

Non possiamo valutare performance senza includere il costo degli errori.

---

## 74. Ottimizzazione conservativa

Una buona ottimizzazione in sistemi incerti spesso ha questa forma:

```text
fast path quando l'evidenza è forte
fallback corretto quando l'evidenza è debole
```

Esempi PlumePilot:

```text
master index → detail call → visual fallback
text EPUB → regional → full visual
cache fresh → API → DOM fallback
```

Questo pattern produce **graceful performance degradation**.

---

# Parte XXIV — Responsiveness come requisito funzionale

## 75. Progress update non è cosmetica

Durante l'EPUB vengono inviati update con:

```text
dispensa
pagina
percentuale
compressione
```

Il progress non riduce CPU.

Ma rende osservabile un'operazione lunga.

Una UI che mostra:

```text
64%
```

permette all'utente di distinguere:

```text
sta lavorando
```

da:

```text
si è bloccato
```

Questa informazione modifica l'esperienza del sistema.

---

## 76. Cancellable vs non cancellable phases

Quando parte la compressione ZIP:

```js
cancellable: false
```

Riferimento:

```text
epub-core.mjs:2089–2116
```

La UI comunica:

```text
Finalizzazione in corso…
```

Riferimento:

```text
materials-builder.js:69–72
```

Questo è un ottimo esempio di **truthful UI**.

Non dobbiamo mostrare un controllo di cancellazione se il livello sottostante non può più garantire una cancellazione sicura.

---

# Parte XXV — Il costo della visual fidelity

## 77. Qualità e performance sono in tensione

Una pagina con formula complessa può essere convertita in:

```text
text
```

più velocemente e con meno memoria.

Ma se perdiamo simboli matematici, l'output è sbagliato.

Rasterizzarla integralmente preserva fedeltà ma costa:

```text
CPU
RAM
file size
reflowability
```

La conversione regionale tenta un punto intermedio.

---

## 78. Budget di qualità

Possiamo pensare che ogni pagina abbia più obiettivi:

```text
fidelity
selectable text
reflow
memory
CPU
file size
```

Non esiste sempre una soluzione dominante.

Quindi la funzione di classificazione è un **policy engine** che sceglie un compromesso.

---

## 79. Regional preservation come optimization under constraints

La modalità regionale tenta:

```text
prosa affidabile → XHTML
formula/diagramma → raster
```

Questo può evitare di trasformare l'intera pagina in immagine.

Ma richiede più analisi:

- operator list;
- bounding box;
- row ink;
- region planning;
- pixel coverage.

Quindi ridurre file size o aumentare reflow può costare più CPU durante la conversione.

---

# Parte XXVI — Resource budget per pagina

## 80. Una possibile formalizzazione

Possiamo modellare la conversione di una pagina con:

```text
P = pagina

CPU(P)
MEM(P)
OUTPUT(P)
FIDELITY(P)
```

La strategia sceglie una modalità:

```text
text
regional
visual
```

con obiettivo:

```text
minimizzare CPU + MEM + OUTPUT
soggetto a FIDELITY >= soglia accettabile
```

Naturalmente PlumePilot non risolve matematicamente questa funzione.

Ma il modello ci aiuta a capire cosa sta facendo l'euristica.

---

# Parte XXVII — Main thread vs worker

## 81. PDF.js worker non elimina tutto il lavoro dal main thread

PDF.js usa un worker configurato con:

```js
pdfjsLib.GlobalWorkerOptions.workerSrc = ...
```

Riferimento:

```text
epub-core.mjs:8–11
```

Questo sposta parte dell'elaborazione.

Ma il browser deve comunque gestire nel context della pagina:

```text
canvas
DOM
encoding callback
JSZip orchestration
progress UI
```

Quindi:

```text
"usa un worker"
```

non equivale a:

```text
"il main thread non può più bloccarsi"
```

---

## 82. Cosa potremmo spostare in un worker in futuro?

Possibili candidati concettuali:

```text
hashing
alcune trasformazioni pure
ZIP
analisi dati non DOM
```

Ma non tutto può essere spostato facilmente.

Canvas/OffscreenCanvas, compatibilità extension, PDF.js integration e trasferimento di grandi buffer introducono altri trade-off.

---

## 83. Transfer vs copy

Se un giorno spostassimo grandi `ArrayBuffer` fra worker, dovremmo considerare:

```text
structured clone
```

contro:

```text
transferable ownership
```

Copiare un buffer da 50 MB può creare un picco diverso dal trasferirne l'ownership.

È un tema naturale per una futura evoluzione del converter, ma non è necessario introdurlo senza misurazioni che lo giustifichino.

---

# Parte XXVIII — Background extension e performance

## 84. Il background non è un processo eterno

In Manifest V3 il service worker Chromium è effimero.

Questo ha una conseguenza utile:

```text
non possiamo trattare le variabili globali background come una cache eterna
```

Dal punto di vista memory, la sospensione può liberare lo stato in-memory.

Dal punto di vista performance, una riattivazione ha un costo di startup.

Ancora una volta:

```text
lifetime breve
```

è contemporaneamente un vantaggio e un vincolo.

---

# Parte XXIX — Cross-context performance

## 85. Messaging ha un costo, ma non è il primo sospetto

PlumePilot passa dati fra:

```text
popup
background
content script
MAIN world
builder page
```

Ogni boundary implica:

```text
serializzazione / structured clone
scheduling
callback / Promise
```

Ma ottimizzare il messaging prima di misurare potrebbe essere inutile se i payload sono piccoli e il costo dominante è PDF rendering.

La regola resta:

```text
profile the dominant cost
```

---

## 86. Payload grandi meritano attenzione diversa

Un messaggio con:

```js
{ type: "START" }
```

non è equivalente a trasferire megabyte di dati strutturati.

PlumePilot tende a lasciare i grandi artefatti nel context che li costruisce e usa messaging soprattutto per:

```text
comandi
status
operation metadata
```

Questo riduce la necessità di spostare grandi buffer fra context.

---

# Parte XXX — Data locality

## 87. Tenere il dato vicino a chi lo usa

La cache `lessonApiCache` vive nel content side che esegue la discovery.

I `turboControllers` vivono nel MAIN interceptor che possiede le fetch abortable.

Gli asset EPUB vivono nel builder EPUB.

Questo è **data locality**.

Un dato non viene centralizzato soltanto perché potrebbe essere condiviso.

Meno trasferimenti possono significare:

```text
meno serializzazione
meno coupling
lifetime più semplice
```

---

# Parte XXXI — UI performance

## 88. Render selettivo

Nel Capitolo 11 abbiamo visto che `chrome.storage.onChanged` controlla quale parte della UI aggiornare.

Per esempio il floating menu non ricostruisce indiscriminatamente tutto ad ogni change.

Decide:

```text
visualStyle → applyVisualStyle
menuSize → applyMenuSize
layout → applyFloatingMenuLayout
autoplay keys → renderSettings
operation → renderOperation
```

Riferimento:

```text
floating-menu.js:4588–4664
```

Questa è una forma manuale di **dependency tracking**.

---

## 89. Perché non renderizzare tutto sempre?

Per UI piccole potrebbe essere perfettamente accettabile.

Ma rendering selettivo evita:

```text
DOM churn
focus reset
scroll reset
layout extra
animazioni riavviate
```

Quindi il beneficio non è soltanto CPU.

È anche stabilità dell'interazione.

---

# Parte XXXII — CSS e layout

## 90. CSS condiviso riduce divergence, non necessariamente runtime cost

`menu-ux.css` nasce soprattutto per coerenza.

Non è corretto dire automaticamente:

```text
meno CSS duplicato = UI più veloce
```

Il browser deve comunque applicare stili ai nodi rilevanti.

Il vero beneficio principale è:

```text
una sola regola semantica
meno drift
meno patch contraddittorie
```

La performance di sviluppo conta quanto quella del runtime.

---

# Parte XXXIII — Developer performance
## 91. Performance del team

Esiste anche un'altra performance:

```text
tempo necessario per cambiare il software senza romperlo
```

Una architettura con:

```text
invarianti chiare
test mirati
moduli condivisi
cache con ownership esplicita
```

può essere leggermente più verbosa ma ridurre drasticamente il tempo di debugging.

Questo non appare in Chrome DevTools.

Ma è un costo reale del sistema.

---

# Parte XXXIV — Logging e performance

## 92. Debug log disattivabile

`epub-core.mjs` definisce:

```js
const STUDYWING_DEBUG = false;
const debugLog = (...values) => {
  if (STUDYWING_DEBUG) console.info(...values);
};
```

Riferimento:

```text
epub-core.mjs:5–7
```

Log dettagliati possono essere preziosi durante diagnosi.

In hot path possono anche:

```text
creare stringhe
serializzare oggetti
intasare DevTools
alterare timing
```

Quindi è corretto distinguere diagnostica da comportamento normale.

---

# Parte XXXV — Errori di benchmarking

## 93. Benchmark con DevTools aperto

DevTools può cambiare il comportamento osservato:

- logging;
- profiler;
- source maps;
- heap snapshots;
- instrumentation.

Non significa che non vada usato.

Significa che dobbiamo dichiarare il setup e ripetere le prove.

---

## 94. Warm cache vs cold cache

Una seconda esecuzione può beneficiare di:

```text
HTTP cache
font cache
JIT
asset già scaricati
cache applicativa
```

Quindi benchmark utili dovrebbero distinguere almeno:

```text
cold-ish run
warm run
```

quando questo è rilevante.

---

## 95. Fixture troppo piccola

Un PDF di 3 pagine può non mostrare un problema che appare a 300 pagine.

Un corso con 5 moduli può non mostrare la crescita di una cache che emerge a 200.

Le fixture devono coprire anche la **scala** del problema.

---

# Parte XXXVI — Un piano di profiling per l'EPUB

## 96. Prima domanda: wall time

Misurare:

```text
start → EPUB bytes ready
```

con `performance.now()`.

Ripetere più volte.

Separare:

```text
baseline text/visual
regional preservation
```

---

## 97. Seconda domanda: dove passa il tempo?

Con Performance panel cercare:

```text
PDF render
getImageData
canvas encoding
SHA-256
JSZip compression
long tasks
```

Non partire dal presupposto che il collo di bottiglia sia quello più intuitivo.

---

## 98. Terza domanda: memory trend

Eseguire:

```text
snapshot A
export
snapshot B
cleanup / chiusura builder
snapshot C
```

Ripetere export se necessario.

Cercare crescita cumulativa.

---

## 99. Quarta domanda: retained objects

Se la memoria non torna:

```text
chi mantiene il riferimento?
```

Candidati:

```text
Map
array
closure
listener
DOM
JSZip
PDF.js
canvas
```

Il retained size è spesso più informativo del solo shallow size.

---

# Parte XXXVII — Un piano di profiling per autoplay

## 100. Misurare observer callback

Registrare una sessione lunga e verificare:

```text
quante volte scan() viene invocato?
quanto dura?
quali mutazioni lo generano?
```

Se il costo è irrilevante, non cambiare l'architettura.

---

## 101. Misurare DOM scan vs API discovery

Per uno stesso corso:

```text
numero capitoli
numero detail call
numero accordion aperti
tempo fino al target
```

Il dato più importante potrebbe non essere il tempo JS.

Potrebbe essere il numero di transizioni LMS evitate.

---

# Parte XXXVIII — Un piano di profiling per quiz HTML

## 102. Grande collezione immagini

Costruire una fixture con:

```text
molti test
molte domande
immagini ripetute
immagini uniche
```

Misurare:

```text
peak requests in flight
peak memory
tempo totale
dimensione HTML
```

Poi confrontare:

```text
Promise.all illimitato
concurrency limit 4
concurrency limit 8
```

Solo dopo possiamo decidere se la complessità aggiuntiva vale la pena.

---

# Parte XXXIX — Back-end developer analogy

## 103. Browser come piccolo application server con UI

Per chi viene dal backend, possiamo mappare:

```text
Map cache              ≈ in-process cache
chrome.storage.local   ≈ durable local store
pacing                  ≈ rate limiting/backpressure
Promise pool            ≈ connection/worker pool
MutationObserver        ≈ invalidation event source
MessageChannel yield    ≈ cooperative scheduler handoff
canvas buffer           ≈ large in-memory working buffer
builder                 ≈ batch worker
```

Ma l'analogia ha un limite fondamentale.

Nel browser il main thread deve anche:

```text
disegnare
ricevere input
aggiornare DOM
animare
```

Quindi bloccare CPU ha un costo UX immediatamente visibile.

---

# Parte XL — Performance invariants

## 104. Invarianti utili

Possiamo formulare alcune proprietà che vorremmo mantenere.

### EPUB

```text
Una sola dispensa PDF pesante viene convertita alla volta.
```

```text
Ogni pagina PDF viene cleanup dopo l'uso.
```

```text
I canvas temporanei vengono ridotti dopo l'encoding.
```

```text
Gli asset identici vengono conservati una sola volta nel registry.
```

### API

```text
Le richieste batch sono paced.
```

```text
La cache evita richieste equivalenti quando il dato è ancora utilizzabile.
```

### UI

```text
Le operazioni lunghe espongono progress/status.
```

```text
La cancellazione ferma davvero il lavoro sottostante quando dichiarata disponibile.
```

Queste proprietà sono testabili.

---

# Parte XLI — Performance regression tests

## 105. Non tutto deve essere un benchmark temporale

I test più stabili spesso verificano proprietà strutturali:

```text
canvas finale ridotto a 1×1 dopo cancellazione
asset duplicato registrato una volta
cache bounded a 50
cancellation non produce file incompleto
una sola conversione attiva
```

Sono meno rumorosi di un assertion come:

```text
"deve finire in meno di 1.7 secondi"
```

che dipende dall'hardware.

---

## 106. Il benchmark Node già verifica cleanup

`scripts/benchmark-epub-node.mjs` contiene un test che controlla che i canvas osservati dopo cancellazione abbiano dimensione minima:

```text
width <= 1
height <= 1
```

Riferimento:

```text
scripts/benchmark-epub-node.mjs:151–176
```

Questa è una **resource invariant test**.

Non ci dice quanti MB usa il browser.

Ci dice che un'importante via di cleanup è stata eseguita.

---

# Parte XLII — Ottimizzazione futura: cosa farei prima

## 107. Prima: misurare il `MutationObserver`

Il global observer è una possibile fonte di lavoro ripetuto.

Prima di riscriverlo:

```text
profiling reale su lezioni lunghe
```

Se emerge come hotspot:

```text
schedule/coalesce scan
oppure restringere root
```

---

## 108. Seconda: misurare nested `Promise.all` del quiz

Solo corsi ricchi di immagini possono dirci se serve un concurrency pool.

Una queue introduce stato e failure handling in più.

Non va aggiunta soltanto perché “sembra più robusta”.

---

## 109. Terza: misurare JSZip peak

Se l'EPUB resta memory-heavy anche dopo cleanup pagina per pagina, la fase di packaging può diventare il prossimo candidato.

A quel punto potremmo valutare:

```text
streaming ZIP
worker
alternative library
```

ma con fixture rappresentative.

---

## 110. Quarta: osservabilità standardizzata

Potremmo introdurre un piccolo diagnostics object comune:

```js
{
  elapsedMs,
  networkRequests,
  cacheHits,
  cacheMisses,
  pagesText,
  pagesRegional,
  pagesVisual,
  inputBytes,
  outputBytes,
  uniqueAssetBytes
}
```

solo nei benchmark/dev mode.

Questo renderebbe più facile confrontare release diverse senza spargere log ad hoc.

---

# Parte XLIII — Cosa non ottimizzerei oggi

## 111. Non riscriverei le `Map` con oggetti

Non esiste evidenza che `Map` sia il collo di bottiglia.

Ridurre chiarezza semantica per una micro-ottimizzazione ipotetica sarebbe controproducente.

---

## 112. Non eliminerei tutti gli `await sleep()`

Alcuni rappresentano:

```text
pacing
settling della UI host
retry delay
cancellation-friendly wait
```

Non sono semplicemente “tempo perso”.

Vanno classificati prima di rimuoverli.

---

## 113. Non parallelizzerei tutti i capitoli EPUB

Il rischio di picco RAM è evidente dal tipo di working set coinvolto.

Senza benchmark che dimostri un beneficio sicuro, il seriale è una scelta conservativa sensata.

---

## 114. Non userei una API memory non portabile nel prodotto

`measureUserAgentSpecificMemory()` è interessante per diagnostica, ma la compatibilità è limitata e richiede condizioni specifiche.

Non è necessario introdurre una dipendenza runtime per risolvere un problema che possiamo studiare con benchmark e DevTools.

---

# Parte XLIV — Una checklist pratica

## 115. Quando qualcosa “sembra lento”

Prima chiedere:

```text
1. È CPU, rete, DOM o memoria?
2. Quanto dura realmente?
3. È lento o semplicemente lungo?
4. La UI rimane responsiva?
5. Il costo cresce con N?
6. Qual è N nel caso reale?
7. Stiamo ripetendo lavoro?
8. Possiamo evitare il lavoro invece di velocizzarlo?
9. Il parallelismo alzerebbe il working set?
10. Il risultato ottimizzato resta corretto?
```

Queste domande valgono molto più di partire direttamente da:

```text
"mettiamo una cache"
```

oppure:

```text
"facciamo Promise.all"
```

---

# Parte XLV — Una mappa completa di PlumePilot

## 116. Tecnica → budget

| Tecnica | CPU | Rete | Memoria | Responsiveness |
|---|---:|---:|---:|---:|
| Course master index | ↓ | ↓ | leggero ↑ | ↑ |
| `lessonApiCache` | ↓ | ↓ | ↑ | ↑ |
| Pacing | ≈ | burst ↓ | picco ↓/≈ | ↑ |
| Promise.all | wall time ↓ | concurrency ↑ | picco ↑ | dipende |
| Conversione EPUB seriale | wall time ↑ | ≈ | picco ↓ | prevedibile |
| Text fast path | ↓ | ≈ | ↓ | ↑ |
| Regional rendering | ↑ | ≈ | dipende | mitigata da yield |
| Canvas cap | ↓/≈ | ≈ | ↓ | ↑ |
| Asset dedup SHA-256 | ↑ | ≈ | ↓ | dipende |
| `yieldToBrowser()` | overhead ↑ | ≈ | ≈ | ↑↑ |
| Bounded cache | ≈ | possibile ↑ su eviction | ↓ | ≈ |
| Cancellation | lavoro totale ↓ | richieste ↓ | ↓ | ↑ |

La tabella non contiene leggi universali.

È un modo per ricordare che ogni scelta ha più assi.

---

# Parte XLVI — Concetti da portarsi dietro

## 117. Performance è gestione di risorse

Non pensare soltanto a:

```text
operazioni al secondo
```

Pensa a:

```text
CPU
I/O
memoria
main thread
rete
lifetime
```

---

## 118. La migliore ottimizzazione spesso è evitare il lavoro

Esempi:

```text
cache hit
skip capitolo 100%
text fast path
asset dedup
non rasterizzare se non serve
```

---

## 119. Controllare il working set spesso vale più di ridurre l'output

Specialmente in pipeline binarie:

```text
PDF
canvas
immagini
ZIP
```

la memoria massima contemporanea conta più della dimensione finale.

---

## 120. Cedere il thread è diverso da fare meno lavoro

`yieldToBrowser()` non rende necessariamente la conversione più economica.

La rende più cooperativa.

---

## 121. Parallelismo e memoria sono spesso in tensione

Più elementi contemporanei significano spesso:

```text
meno wall time
più working set
```

La concorrenza deve essere un numero scelto, non un riflesso automatico.

---

## 122. Cleanup è parte dell'algoritmo

`finally`, `destroy()`, listener removal e release dei buffer non sono “codice accessorio”.

Sono parte della correttezza temporale e di memoria.

---

## 123. Benchmark dichiarativi

Ogni benchmark dovrebbe dire:

```text
ambiente
fixture
metrica
cosa include
cosa esclude
```

Altrimenti il numero rischia di diventare folklore.

---

# Parte XLVII — Esercizi

## Esercizio 1 — Canvas budget

Supponi un canvas:

```text
2400 × 3000
```

Usando il modello RGBA 8-bit:

1. calcola i byte del pixel buffer;
2. converti approssimativamente in MiB;
3. spiega perché il file JPEG finale potrebbe essere molto più piccolo;
4. elenca almeno tre altre strutture che potrebbero coesistere in memoria.

---

## Esercizio 2 — Serial vs parallel

Hai 8 PDF da convertire.

Ogni conversione richiede circa:

```text
70 MB peak working set
3 secondi CPU/I/O misto
```

Confronta concettualmente:

```text
seriale
Promise.all di 8
pool di 2
pool di 4
```

Quale sceglieresti su un laptop medio e perché?

---

## Esercizio 3 — Observer

Dato:

```js
new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
```

progetta una versione con coalescing che esegua `scan()` al massimo una volta per task/frame, senza perdere la capacità di rilevare un nuovo `<video>`.

---

## Esercizio 4 — Cache bound

Trasforma mentalmente:

```js
const cache = new Map();
```

in una cache con massimo 100 entry.

Poi spiega la differenza fra:

```text
FIFO
LRU
TTL
```

---

## Esercizio 5 — Measurement plan

Vuoi dimostrare che una nuova versione EPUB usa meno memoria.

Scrivi un protocollo di benchmark che specifichi:

- browser;
- fixture;
- cold/warm run;
- numero di ripetizioni;
- momento degli snapshot;
- metrica di output;
- criterio per dichiarare una regressione.

---

## Esercizio 6 — Quiz HTML

Il nested `Promise.all()` carica troppe immagini contemporaneamente.

Disegna una funzione:

```text
mapWithConcurrency(items, 4, mapper)
```

senza implementarla necessariamente.

Spiega quali stati deve mantenere.

---

## Esercizio 7 — Fast path

Trova tre fast path reali di PlumePilot e per ciascuno identifica:

```text
cheap evidence
expensive path evitato
fallback di correttezza
```

---

## Esercizio 8 — Leak o picco?

Dopo cinque export misuri:

```text
prima: 80 MB
peak: 300 MB
dopo: 92 MB

secondo export peak: 305 MB
dopo: 94 MB
```

È sufficiente per dichiarare un leak?

Spiega perché no e cosa misureresti successivamente.

---

# Parte XLVIII — Approfondimenti

## 124. Performance API

Per misurare intervalli:

```text
https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
```

Per misure nominate:

```text
https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure
```

---

## 125. MutationObserver

Documentazione:

```text
https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
```

L'observer notifica mutazioni del DOM; il costo applicativo dipende soprattutto da cosa facciamo nel callback e da quanto ampia è l'area osservata.

---

## 126. MessageChannel

```text
https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel
```

Nel converter viene usato come punto di yield cooperativo fra task.

---

## 127. Pixel data

```text
https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData
```

`getImageData()` restituisce un `ImageData` con i pixel della regione richiesta.

---

## 128. Memory measurement

```text
https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory
```

È sperimentale / non Baseline e non va trattata come API portabile universale.

Per analisi pratica:

```text
https://developer.chrome.com/docs/devtools/
```

---

# Parte XLIX — Recap

In questo capitolo abbiamo visto che PlumePilot non ha un singolo problema chiamato “performance”.

Ha molti budget interdipendenti.

Abbiamo seguito:

```text
master index
cache
bounded Map
pacing
retry
DOM scan
MutationObserver
PDF.js
canvas
pixel buffer
text fast path
regional rendering
asset dedup
SHA-256
JSZip
yieldToBrowser
AbortController
cleanup
```

Il filo comune è questo:

> **La performance migliore nasce quando il software fa meno lavoro inutile, mantiene vivi meno dati contemporaneamente e restituisce periodicamente il controllo al runtime, senza sacrificare la correttezza.**

E soprattutto abbiamo imparato a non confondere:

```text
file più piccolo
```

con:

```text
meno RAM
```

oppure:

```text
più Promise parallele
```

con:

```text
sistema più veloce
```

oppure:

```text
stessa Big-O
```

con:

```text
stesso costo reale
```

Il browser è il nostro runtime.

Ottimizzare significa rispettarne i vincoli invece di fingere che sia soltanto una VM JavaScript.

---

# Prossimo capitolo

## 13 — Chrome, Edge e Firefox

Nel prossimo capitolo cambieremo nuovamente livello.

Finora abbiamo spesso parlato di:

```text
"il browser"
```

come se fosse uno solo.

PlumePilot deve invece convivere con:

```text
Chrome / Chromium
Edge / Chromium
Firefox
```

che condividono gran parte delle WebExtensions API ma differiscono in:

- manifest e packaging;
- service worker/background scripts;
- API disponibili;
- review policies;
- CSP e static analysis;
- gestione di vendor bundle;
- Firefox-specific minimum versions;
- differenze del runtime.

Useremo anche la storia reale delle submission AMO e dei warning Firefox per distinguere:

```text
compatibilità del codice
compatibilità dell'API
compatibilità dello store
compatibilità del processo di review
```

che sono quattro problemi diversi.

---

[← 11 — UI senza framework](11-ui-senza-framework.md) · [Indice](index.md) · [13 — Cross-browser →](13-cross-browser.md)
