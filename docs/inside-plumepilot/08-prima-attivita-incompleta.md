# 08 — Trovare la prima attività incompleta

## Euristiche, indici, verifiche e fallback

Una delle funzioni apparentemente più semplici di PlumePilot pone in realtà un problema algoritmico interessante:

> **Dato un corso composto da molti capitoli e molte attività, come troviamo la prima attività realmente incompleta senza aprire e controllare tutto?**

La risposta ingenua è facile:

```text
apri capitolo 1
controlla tutte le attività
se è tutto completo → capitolo 2
controlla tutte le attività
...
```

Funziona.

Ma può essere molto costoso.

Ogni capitolo può richiedere:

- apertura dell'accordion;
- attesa del rendering;
- lettura del DOM;
- eventuale richiesta API;
- sincronizzazione con una UI che può cambiare;
- recovery se il contenuto non viene renderizzato.

In un corso lungo, la domanda quindi non è soltanto:

> **Qual è il primo elemento con progresso < 100%?**

È piuttosto:

> **Qual è il modo più economico per individuare il primo candidato corretto, sapendo che le nostre fonti possono essere incomplete, stale o ambigue?**

Questo capitolo è uno studio di algoritmi applicati.

Non parleremo di quicksort o alberi bilanciati in astratto. Vedremo invece concetti come:

- spazio di ricerca;
- indice;
- euristica;
- candidate ordering;
- verifica;
- completezza;
- false positive e false negative;
- short-circuit;
- fallback;
- progressive refinement;
- costo computazionale vs costo I/O;
- correttezza sotto informazione incompleta.

---

## 1. Il problema come ricerca ordinata

Supponiamo che un corso contenga `N` moduli.

Ogni modulo contiene attività ordinate:

```text
Obiettivi
Video 1
Video 2
...
Test finale
```

Vogliamo trovare la prima attività incompleta secondo **l'ordine del corso**.

Formalmente, possiamo immaginare una sequenza:

```text
A1, A2, A3, ..., Am
```

con una funzione:

```text
complete(Ai) ∈ {true, false, unknown}
```

Il risultato che cerchiamo è:

```text
min i tale che complete(Ai) = false
```

Il problema è che conoscere `complete(Ai)` non è gratis.

Per alcune attività possiamo avere un'indicazione aggregata economica.

Per altre dobbiamo interrogare un endpoint dettagliato.

Per altre ancora dobbiamo aprire il capitolo e osservare il DOM.

Quindi abbiamo un secondo problema:

> **In quale ordine conviene spendere il costo delle verifiche?**

---

## 2. Una ricerca lineare è corretta, ma non necessariamente efficiente

La soluzione più semplice è una scansione lineare.

Pseudo-codice:

```js
for (const chapter of course) {
  open(chapter);
  for (const activity of chapter.activities) {
    if (!isComplete(activity)) return activity;
  }
}
```

Dal punto di vista algoritmico classico, la complessità è:

```text
O(N)
```

se consideriamo ogni capitolo come una unità.

Ma questa notazione nasconde la parte realmente costosa.

Nel browser:

```text
1 iterazione
```

non significa necessariamente:

```text
1 operazione CPU economica
```

Può significare:

```text
click DOM
→ rendering asincrono
→ attesa
→ richiesta di rete
→ parsing JSON
→ altra attesa
```

Per PlumePilot è quindi più utile distinguere:

```text
costo CPU
costo DOM
costo rete
costo di sincronizzazione
```

Una scansione `O(N)` che esegue `N` chiamate HTTP può essere molto più lenta di una scansione `O(N)` che legge un singolo array già disponibile in memoria.

Questa distinzione tornerà spesso nel libro:

> **La Big-O descrive la crescita; non descrive da sola il costo reale delle operazioni.**

---

# Parte I — Dal DOM a un indice

## 3. La prima idea: guardare ciò che è visibile

Una versione iniziale del problema può essere risolta direttamente dal DOM.

Nel codice attuale esiste ancora una funzione che rappresenta bene questa idea:

```js
function firstVideoInChapter(identity, incompleteOnly = false) {
  const chapter = findChapter(identity);

  if (!chapter) return null;

  return (
    chapterRows(chapter).find((row) => {
      const name = lessonName(row).toLowerCase();

      if (!name || name === "obiettivi") return false;

      const progress = getProgress(row);

      return !incompleteOnly || progress < 100;
    }) || null
  );
}
```

_File: `content.js`, area ~1417._

La funzione usa `Array.find()`.

Questa scelta è significativa.

Non vogliamo tutti i video incompleti.

Vogliamo il **primo**.

Perciò:

```text
filter()
```

sarebbe concettualmente:

```text
controlla tutto → costruisci un nuovo array → prendi il primo
```

mentre:

```text
find()
```

fa short-circuit appena trova il primo match.

Schema:

```text
video 1 → 100% → continua
video 2 → 100% → continua
video 3 → 42%  → STOP
video 4 → non serve leggerlo
```

È una piccola ottimizzazione, ma esprime anche meglio l'intento dell'algoritmo.

---

## 4. Il problema del DOM: per cercare devi prima renderizzare

La ricerca DOM ha però un limite strutturale.

Per leggere le righe di un capitolo, quel capitolo deve spesso essere disponibile/renderizzato.

Quindi una ricerca globale diventa:

```text
capitolo 1
  ↓
apri
  ↓
render
  ↓
verifica
  ↓
capitolo 2
  ↓
apri
  ↓
render
  ↓
verifica
...
```

Se la prima attività incompleta è al capitolo 30, potremmo aver interagito inutilmente con 29 capitoli.

Questo fu esattamente uno dei tipi di regressione osservati nello sviluppo: la funzione poteva arrivare correttamente al target, ma aprendo capitoli intermedi che avrebbero dovuto essere saltati.

La correttezza del risultato non basta.

Conta anche il percorso usato per raggiungerlo.

---

# Parte II — Separare indice e record

## 5. Il concetto più importante: indice ≠ dato dettagliato

Un database raramente legge tutte le righe di una tabella per rispondere a ogni query.

Usa indici.

Possiamo applicare lo stesso modello mentale.

Immaginiamo due livelli:

```text
COURSE INDEX
--------------------------------
Modulo 1    100%
Modulo 2    100%
Modulo 3     80%
Modulo 4    100%
Modulo 5     20%

DETAIL
--------------------------------
Modulo 3
  Obiettivi 100%
  Video A   100%
  Video B    42%
  Test        0%
```

Il primo livello non ci dice necessariamente *quale* attività è incompleta.

Ma può dirci:

> **Dove conviene guardare per prima.**

È esattamente il ruolo assunto dal course/master index di PlumePilot.

---

## 6. `getPlaybackCourseIndex()`

Il codice normalizza l'indice in entry del tipo:

```js
{
  displayOrder,
  percentage,
  masterOrder,
  folderId,
  id,
  lpId,
  title
}
```

Una parte importante è:

```js
const entries = response.data.entries
  .map((entry) => {
    const displayOrder = Number(entry?.displayOrder);
    const percentage = Number(entry?.percentage);

    if (!Number.isInteger(displayOrder) || displayOrder < 1) {
      return null;
    }

    return {
      displayOrder,
      percentage: Number.isFinite(percentage) ? percentage : 0,
      ...
    };
  })
  .filter(Boolean)
  .sort((first, second) => first.displayOrder - second.displayOrder);
```

_File: `content.js`, area ~5760–5822._

L'indice produce quindi una struttura ordinata e relativamente economica da consultare.

Per esempio:

```text
[
  { displayOrder: 1, percentage: 100 },
  { displayOrder: 2, percentage: 100 },
  { displayOrder: 3, percentage: 82  },
  { displayOrder: 4, percentage: 100 },
  { displayOrder: 5, percentage: 35  }
]
```

A questo punto una domanda naturale è:

> Perché non prendere semplicemente il primo `<100%` e fermarsi?

Per un periodo l'algoritmo si è avvicinato molto a questo modello.

Poi l'esperienza reale ha mostrato che sarebbe stato troppo forte come assunzione.

---

## 7. Euristica, indice e source of truth non sono sinonimi

Supponiamo che l'indice dica:

```text
Modulo 1 → 100%
Modulo 2 → 100%
Modulo 3 → 80%
```

È ragionevole controllare prima il modulo 3.

Ma da questo non segue logicamente che:

```text
Modulo 1 e 2 sono impossibili da considerare ancora
```

Perché il dato aggregato potrebbe essere:

- leggermente stale;
- aggiornato con tempi diversi rispetto ai detail endpoint;
- incapace di rappresentare qualche particolare stato dell'attività;
- temporaneamente incoerente con la UI.

Il modello corretto è quindi:

```text
percentage < 100
        ↓
forte candidato
        ≠
prova definitiva
```

Questo porta a una distinzione fondamentale.

### Source of truth

Fonte che consideriamo autorevole per una certa decisione.

### Index

Struttura che ci permette di trovare rapidamente dove cercare.

### Heuristic

Segnale che migliora l'ordine della ricerca senza garantirne da solo il risultato.

Nel design attuale, la percentuale master agisce soprattutto come **indice/euristica di prioritizzazione**.

---

# Parte III — Candidate ordering

## 8. La parte elegante dell'algoritmo attuale

Nel codice corrente troviamo:

```js
let discoveryOrder = outline
  .map((_entry, index) => index)
  .filter((index) =>
    index >= firstIndex &&
    !(options.verifiedCompleteChapters || []).some((identity) =>
      sameChapterIdentity(outline[index].identity, identity)
    )
  );
```

Poi:

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

_File: `content.js`, area ~5894–5911._

Questa operazione merita di essere letta con calma.

Partiamo da:

```text
[1, 2, 3, 4, 5, 6]
```

Supponiamo:

```text
1 → 100%
2 → 100%
3 → 80%
4 → 100%
5 → 40%
6 → 100%
```

Il nuovo ordine diventa:

```text
[3, 5, 1, 2, 4, 6]
```

Non abbiamo eliminato i capitoli al 100%.

Li abbiamo spostati nella **seconda passata**.

Questo è concettualmente simile a una **stable partition**:

```text
prima i candidati sospetti
poi gli altri
```

mantenendo però l'ordine originale all'interno dei due gruppi.

Quindi:

```text
80% prima di 40%?
```

No.

La percentuale non diventa un ranking numerico.

Il criterio è soltanto:

```text
sospetto incompleto?
```

poi viene mantenuto l'ordine del corso.

Questo è essenziale, perché cerchiamo la **prima attività incompleta in ordine didattico**, non quella con percentuale più bassa.

---

## 9. Perché non ordinare per percentuale?

Potrebbe sembrare naturale fare:

```js
chapters.sort((a, b) => a.percentage - b.percentage);
```

Ma sarebbe sbagliato.

Esempio:

```text
Modulo 3 → 80%
Modulo 5 → 20%
```

La prima attività incompleta può essere nel modulo 3.

Se ordinassimo per percentuale visiteremmo prima il modulo 5, violando la semantica della funzione.

Il requisito non è:

> Trova il capitolo meno completo.

È:

> Trova la prima attività incompleta secondo l'ordine del corso.

Quindi l'indice serve a ridurre il lavoro, **non a cambiare l'ordinamento semantico del dominio**.

---

## 10. Due passate, non una scorciatoia irreversibile

Il codice dice esplicitamente:

```js
// Prefer the master's unfinished candidates, keeping course order within
// each pass. A second pass verifies 100% summaries if no candidate matches.
```

Questa frase descrive l'evoluzione architetturale dell'algoritmo.

Prima:

```text
100% master → skip definitivo
```

può essere molto veloce.

Ma se il master è stale può produrre un **false negative**:

```text
attività realmente incompleta
ma classificata come completa
→ mai controllata
```

La soluzione attuale è:

```text
PASS 1
candidati <100% o senza mapping

se nessun target valido
        ↓
PASS 2
entry aggregate al 100%
```

Quindi l'indice riduce il **tempo medio** senza sacrificare la completezza nel caso peggiore.

---

# Parte IV — Progressive refinement

## 11. Dall'informazione economica a quella costosa

Possiamo rappresentare la ricerca come una piramide.

```text
            DOM visuale
         costo più elevato
              ▲
              │
        lesson detail API
              ▲
              │
       course/master index
              ▲
              │
       cache / stato locale
       costo più economico
```

L'algoritmo cerca di salire nella piramide soltanto quando necessario.

Questo pattern può essere chiamato **progressive refinement**:

1. usa una rappresentazione grossolana ed economica;
2. restringi i candidati;
3. chiedi dati più dettagliati;
4. usa la verifica visuale solo per l'incertezza residua.

È molto simile a ciò che succede in molti sistemi reali:

```text
indice DB → row lookup
cache → database
metadata → file completo
search index → document retrieval
bounding box → collision detection precisa
```

---

## 12. La detail call

Per ogni candidato, PlumePilot può chiedere dati dettagliati:

```js
const lesson = await requestLessonWithRetry(
  courseCode,
  entry.lessonNumber,
  "playback",
  null,
  null,
  lessonLpId,
  false,
  indexedChapter?.id || entry.lessonNumber,
  true,
);
```

Poi esamina:

```text
Obiettivi
video
progressItems
test
```

Il target può essere:

```js
const unfinishedItem =
  !options.forwardVideoSearch && objectivePending
    ? { ...objective, contentType: "intro" }
    : playbackItems.find(
        (item) =>
          item.contentType === "video" &&
          Number(item.percentage) < 100
      );
```

Questa è una seconda ricerca lineare, ma su un insieme molto più piccolo: le attività del singolo modulo.

La struttura generale diventa:

```text
course index
   ↓
chapter candidate
   ↓
lesson detail
   ↓
activity candidate
```

---

## 13. Il risultato non è solo `found/not found`

Una funzione ingenua potrebbe restituire:

```js
return activity || null;
```

L'algoritmo reale deve rappresentare più stati.

Per esempio:

```text
target
end
cancelled
fallback
```

E un `target` può contenere metadati come:

```js
{
  status: "target",
  entry,
  unfinishedItem,
  testTarget,
  visualVerification,
  verifiedActivities,
  lessonLpId,
  lessonParagraphId
}
```

Perché?

Perché:

```text
abbiamo trovato il capitolo
```

non implica necessariamente:

```text
sappiamo esattamente quale riga DOM cliccare
```

Il risultato dell'algoritmo trasporta quindi anche **il grado di conoscenza** disponibile.

---

# Parte V — Unknown è uno stato reale

## 14. Tre valori, non due

In molti punti del progetto è utile pensare al progresso come:

```text
complete
incomplete
unknown
```

non semplicemente:

```text
true / false
```

Questa distinzione appare chiaramente in:

```js
if (percentage === null || !Number.isFinite(percentage)) {
  return { contentType: "unknown", title };
}
```

_File: `content.js`, `visibleIncompleteActivity()`._

Se una percentuale manca, non dobbiamo trasformarla automaticamente in:

```text
0%
```

perché:

```text
non so
```

non significa:

```text
so che è incompleto
```

Questa è una lezione molto generale.

### Errore comune

```js
const percentage = value || 0;
```

Se `value` non è disponibile, stiamo convertendo l'assenza di informazione in una informazione precisa.

L'algoritmo attuale evita proprio questo in molti passaggi critici.

---

## 15. False positive e false negative

Due categorie di errore aiutano a ragionare sulla ricerca.

### False positive

L'algoritmo dice:

```text
questa attività è incompleta
```

ma in realtà è completa.

Effetto possibile:

```text
apertura inutile
```

### False negative

L'algoritmo dice:

```text
questa attività/capitolo può essere saltato
```

ma contiene qualcosa di incompleto.

Effetto possibile:

```text
la funzione restituisce un target successivo
oppure “tutto completo” erroneamente
```

Per `Trova prima attività incompleta`, il false negative è normalmente più grave.

Per questo la strategia attuale preferisce:

```text
incertezza
→ verifica in più
```

piuttosto che:

```text
incertezza
→ skip definitivo
```

---

# Parte VI — Quando l'API non basta

## 16. Il fallback visuale non è un fallimento dell'algoritmo

Se una lesson response rimane incompleta dopo i retry, PlumePilot non ricomincia necessariamente da capo.

Nel codice:

```js
if (!lesson.ok) {
  return {
    status: "target",
    entry,
    unfinishedItem: null,
    visualVerification: true,
  };
}
```

_File: `content.js`, area ~5979–5995._

Questo è molto importante.

L'algoritmo ha già imparato qualcosa:

```text
questo è il primo candidato che non posso escludere in sicurezza
```

Quindi non fa:

```text
API fallita
→ cancella tutta la ricerca
→ riparti dal capitolo 1
```

Fa:

```text
API incerta sul modulo 12
→ apri esattamente modulo 12
→ verifica visualmente
```

Questo è un **targeted fallback**.

---

## 17. Confronto: fallback globale vs fallback locale

### Fallback globale

```text
errore modulo 12
   ↓
riparti da modulo 1
   ↓
ricontrolla 1...11
```

Costo alto e lavoro duplicato.

### Fallback locale

```text
errore modulo 12
   ↓
apri modulo 12
   ↓
verifica
```

Il secondo approccio preserva il lavoro già svolto.

È lo stesso principio usato in sistemi distribuiti e pipeline robuste:

> **Quando una fase fallisce, conserva quanto più possibile dell'informazione già verificata.**

---

## 18. `verifiedCompleteChapters`

Se la verifica visuale apre un candidato e scopre che in realtà è completo, non dobbiamo ricominciare da capo.

Nel codice:

```js
verifiedCompleteChapters: [
  ...(options.verifiedCompleteChapters || []),
  nextIdentity,
]
```

Poi la costruzione del `discoveryOrder` li esclude:

```js
!(options.verifiedCompleteChapters || []).some((identity) =>
  sameChapterIdentity(outline[index].identity, identity)
)
```

Questo è un piccolo esempio di **memoization negativa nel workflow**:

```text
questo capitolo è già stato verificato completo
→ non spendere nuovamente il costo
```

Non è una cache globale persistente.

È memoria locale della singola ricerca.

---

# Parte VII — Apertura e verifica

## 19. Trovare il capitolo non basta

Una volta trovato un candidato:

```js
nextIdentity = apiDiscovery.entry.identity;
```

PlumePilot deve ancora trasformarlo in un'azione sulla pagina.

Il percorso è:

```textcandidate identity
   ↓
openChapter()
   ↓
wait rendering
   ↓
reacquire chapter
   ↓
select exact activity
```

Perché il DOM può cambiare tra un passo e l'altro.

Il codice infatti aspetta:

```js
let chapterReady = await waitFor(() => {
  const fresh = findChapter(nextIdentity);
  if (!fresh) return null;

  const rows = chapterRows(fresh);
  return rows.length > 0 ? fresh : null;
});
```

Questa parte collega direttamente il Capitolo 8 al Capitolo 3.

L'algoritmo di ricerca può essere perfetto, ma l'esecuzione finale deve comunque sincronizzarsi con una UI dinamica.

---

## 20. API evidence vs DOM evidence

Durante il bookmark search il codice sceglie fra due strategie.

Se l'API ha identificato precisamente l'attività:

```js
const activity = apiUnfinishedItem || ...;
```

Se invece serve verifica visuale:

```js
visibleIncompleteActivity(nextIdentity, apiVerifiedActivities)
```

Questo produce una cosa interessante:

```text
API
  ↓
fornisce evidenza
  ↓
DOM
  ↓
conferma / completa l'informazione
```

Il DOM non sostituisce necessariamente l'API.

E l'API non sostituisce necessariamente il DOM.

Le due fonti vengono combinate.

---

## 21. Non sovrascrivere evidenza forte con evidenza debole

Il commento nel codice è particolarmente istruttivo:

```js
// Missing sidebar percentages are unknown, not 0%. A verified API
// target must not be replaced by a completed Obiettivi row in the DOM.
```

Questo introduce un principio molto generale:

> **Quando combini fonti multiple, devi definire una gerarchia di affidabilità.**

Esempio:

```text
API verificata: Video B = 42%
DOM incompleto: percentuale mancante
```

Non dobbiamo trasformare la seconda informazione in:

```text
DOM dice 0%, quindi scegli altro
```

né permettere a un elemento visuale ambiguo di cancellare un target già verificato.

Possiamo chiamarlo:

**evidence precedence**.

---

# Parte VIII — Il test è un tipo di target diverso

## 22. Non tutte le attività hanno la stessa semantica

Il capitolo può contenere:

```text
Obiettivi
video
Test
```

La ricerca deve rispettare le preferenze dell'utente.

Per il bookmark corrente, il test pending può diventare direttamente un target:

```js
const testNeedsAttention =
  Boolean(test) &&
  (options.bookmarkSearch
    ? pendingTest
    : ...);
```

Poi:

```js
if (activity?.contentType === "test") {
  const test = getEndOfLessonTest(chapterReady);
  ...
  test.scrollIntoView(...);
  return true;
}
```

Quindi il risultato non è sempre:

```text
clicca un video
```

Può essere:

```text
porta l'utente al test
```

Questo è un esempio di ricerca su elementi **eterogenei**.

La funzione cerca una proprietà comune:

```text
richiede attenzione
```

ma l'azione finale dipende dal tipo.

---

# Parte IX — Concorrenza e cancellazione

## 23. Una ricerca lunga deve poter diventare obsoleta

All'avvio:

```js
smartResumeRunning = true;
const generation = ++smartResumeGeneration;
```

Poi viene definita:

```js
const isCancelled = () =>
  generation !== smartResumeGeneration ||
  courseCode !== courseCodeFromUrl() ||
  !enabled ||
  busy;
```

_File: `content.js`, `startFirstIncompleteDiscovery()`._

Questo è un **generation token**.

Supponiamo:

```text
Ricerca A parte
   ↓
await API
   ↓
l'utente cambia stato
   ↓
parte Ricerca B
```

Quando A riprende, non deve più essere autorizzata a modificare la pagina.

Confronta:

```text
generation di A
```

con:

```text
generation corrente
```

Se differiscono:

```text
A è stale
→ stop
```

Questo è molto simile a un optimistic concurrency token.

---

## 24. Perché non basta `smartResumeRunning`

Un booleano dice:

```text
c'è una ricerca in corso?
```

Ma non identifica **quale** ricerca.

Il generation counter aggiunge identità temporale:

```text
run 17
run 18
run 19
```

Così una callback della run 17 non può accidentalmente diventare valida durante la run 19.

Schema:

```text
boolean lock
→ evita duplicati simultanei

generation token
→ invalida continuazioni asincrone vecchie
```

Sono due problemi diversi.

---

# Parte X — L'evoluzione reale dell'algoritmo

## 25. Versione 2.14.4 — ricerca sequenziale intelligente

Il changelog mostra una prima forma di smart resume:

```text
outline cached
→ skip capitoli/video completi
→ considera Obiettivi
→ trova primo video <100%
```

Era già migliore di una navigazione completamente cieca.

Ma dipendeva ancora molto dalla sequenza di controlli dettagliati e dalla UI.

---

## 26. Versione 2.14.7 — course-index-assisted discovery

Arriva il course completion index.

L'idea:

```text
indice aggregato
→ evita detail request per moduli sicuramente poco interessanti
```

Il changelog descrive:

- riuso dell'indice caricato dalla pagina;
- skip dei moduli riportati al 100%;
- verifica dei candidati sotto 100%;
- fallback visuale per candidati non verificabili.

Qui nasce chiaramente il modello:

```text
index → candidate → detail/fallback
```

---

## 27. Versione 2.15.0 — da impostazione persistente a comando one-shot

La funzione cambia semantica di prodotto.

Prima:

```text
Inizia dalla prima attività incompleta
```

era una preferenza persistente.

Poi diventa:

```text
Trova prima attività incompleta
```

un'azione esplicita.

Questo cambia anche il modello algoritmico.

Non è più:

```text
policy automatica ad ogni startup
```

ma:

```text
query dell'utente
→ cerca dall'inizio
→ porta esattamente al risultato
```

È quasi un bookmark intelligente.

---

## 28. Versione 2.15.3 — master-index-first

Per ridurre ancora il lavoro, il master index viene promosso a strumento principale per individuare il candidato.

Concettualmente:

```text
find first percentage < 100
→ map to visible chapter
→ open exact target
```

Molto efficiente.

Ma l'esperienza successiva porta a una correzione importante.

---

## 29. Versione 2.35.1 — indice come priorità, non dogma

La versione corrente fa qualcosa di più prudente:

```text
1. forza refresh del master
2. costruisce outline
3. crea discovery order
4. mette prima i <100%
5. verifica i candidati
6. se necessario controlla anche i 100%
7. usa detail API
8. usa targeted visual fallback quando serve
```

Questa è probabilmente la forma più interessante dal punto di vista didattico.

L'ottimizzazione non è stata rimossa.

È stata resa **reversibile**.

Se l'euristica funziona:

```text
molto veloce
```

Se l'euristica sbaglia:

```text
seconda passata
→ correttezza preservata
```

---

# Parte XI — Analisi dei costi

## 30. Modello ingenuo

Con `N` capitoli:

```text
N aperture DOM
N attese rendering
potenzialmente N detail request
```

Possiamo rappresentare il costo come:

```text
T_naive ≈ N × (DOM + render + network)
```

---

## 31. Modello index-assisted

Supponiamo:

```text
N = 40 capitoli
K = 3 candidati <100%
```

Il master index costa circa una sola acquisizione.

Poi:

```text
1 master request
+ fino a K detail verification
+ 1 apertura DOM target
```

Nel caso favorevole:

```text
T ≈ index + K × detail + 1 × DOM
```

Il guadagno può essere enorme anche se, formalmente, costruire e filtrare gli array rimane `O(N)`.

Perché abbiamo ridotto le operazioni costose.

---

## 32. Worst case

Nel caso peggiore:

- il master è stale;
- tutti i candidati `<100%` risultano completi;
- la ricerca passa anche sui moduli riportati al 100%;
- alcune detail call richiedono retry;
- una risposta resta incompleta;
- serve verifica visuale.

Allora il costo può tornare vicino a una scansione completa.

Ma questa è una proprietà desiderabile.

L'algoritmo ottimizza:

```text
common case
```

senza eliminare:

```text
correctness path
```

---

# Parte XII — Algoritmo in pseudocodice

## 33. Versione semplificata della strategia attuale

```js
async function findFirstIncomplete(course) {
  const outline = await getOutline(course);
  const master = await getFreshMasterIndex(course);

  const candidates = partitionStable(
    outline,
    chapter => masterPercentage(chapter) < 100 || !isMapped(chapter)
  );

  const verifiedComplete = new Set();

  for (const chapter of candidates) {
    if (verifiedComplete.has(chapter.id)) continue;

    const detail = await getLessonDetail(chapter);

    if (!detail.isReliable) {
      const visual = await verifyVisually(chapter);

      if (visual.target) return visual.target;

      verifiedComplete.add(chapter.id);
      continue;
    }

    const target = firstIncompleteActivity(detail);

    if (target) return target;
  }

  return null;
}
```

Non è il codice reale, ma cattura l'architettura.

---

# Parte XIII — Un problema di information retrieval

## 34. Precision e recall come modello mentale

Senza trasformare PlumePilot in un sistema di machine learning, possiamo prendere in prestito due concetti dall'information retrieval.

### Precision

Fra i candidati che decidiamo di controllare, quanti sono davvero incompleti?

### Recall

Fra tutti i capitoli realmente incompleti, quanti riusciamo a non perdere?

Un indice aggressivo potrebbe avere:

```text
alta precision
basso costo
ma recall imperfetto
```

La seconda passata sui 100% aumenta la recall.

In altre parole:

```text
master pass
→ velocità

verification pass
→ affidabilità
```

È un compromesso comune in sistemi di ricerca.

---

# Parte XIV — Cosa ci insegna questo algoritmo

## 35. Un indice serve a ridurre lo spazio di ricerca

Non deve necessariamente contenere tutta la verità.

Il suo compito può essere semplicemente:

```text
40 capitoli
   ↓
3 candidati da controllare subito
```

---

## 36. L'ordine del dominio viene prima dell'ordine dell'euristica

Non cerchiamo:

```text
la percentuale più bassa
```

ma:

```text
la prima attività incompleta
```

Quindi la prioritizzazione deve rispettare l'ordine didattico.

---

## 37. Unknown deve restare unknown

Uno dei bug più pericolosi nei sistemi reali nasce da trasformazioni come:

```text
missing → false
missing → 0
missing → completed
```

Se non sappiamo qualcosa, spesso la rappresentazione più corretta è proprio:

```text
unknown
```

---

## 38. Le ottimizzazioni migliori sono reversibili

Una buona ottimizzazione dice:

```text
provo prima il percorso economico
```

non:

```text
elimino per sempre il percorso costoso
```

Nel nostro caso:

```text
master <100%
→ first pass

master 100%
→ second pass se serve
```

è più robusto di:

```text
master 100%
→ mai più controllare
```

---

## 39. Preserva il lavoro già fatto

Quando il modulo 12 non è verificabile:

```text
non ripartire dal modulo 1
```

Apri il 12.

Quando il 12 risulta completo:

```text
memorizzalo nella ricerca corrente
```

Continua dal 13.

Questo riduce lavoro duplicato e rende il fallback locale.

---

## 40. Separare discovery da execution

La ricerca risponde:

```text
dove devo andare?
```

L'interazione DOM risponde:

```text
come ci arrivo?
```

Sono problemi diversi.

Nel codice sono ancora intrecciati in alcuni punti, ma concettualmente possiamo dividerli:

```text
Discovery Engine
  ↓
Target
  ↓
Navigation / DOM Adapter
```

Questa separazione sarebbe una delle possibili evoluzioni architetturali future.

---

# Parte XV — Come potremmo modellarlo oggi

## 41. Un `DiscoveryCandidate`

Potremmo immaginare un tipo esplicito:

```ts
type DiscoveryCandidate = {
  chapter: ChapterIdentity;
  lessonNumber: number;
  masterPercentage: number | null;
  confidence: "indexed" | "detailed" | "visual";
  activity?: ActivityIdentity;
  needsVisualVerification: boolean;
};
```

Questo renderebbe più esplicita la provenienza del dato.

---

## 42. Un result type invece di flag sparsi

Per esempio:

```ts
type DiscoveryResult =
  | { type: "target"; candidate: DiscoveryCandidate }
  | { type: "end" }
  | { type: "cancelled" }
  | { type: "unavailable"; reason: string };
```

Nel JavaScript attuale qualcosa di simile esiste già implicitamente tramite:

```text
status: target
status: end
status: cancelled
status: fallback
```

La lezione non è “riscriviamolo in TypeScript”.

È:

> **Quando un algoritmo può terminare in modi semanticamente diversi, rappresentare esplicitamente quei risultati riduce ambiguità.**

---

# Parte XVI — Testare l'algoritmo

## 43. Non basta il caso felice

Una suite utile dovrebbe coprire almeno:

| Scenario | Master | Detail | DOM | Risultato atteso |
|---|---|---|---|---|
| primo modulo incompleto | `<100` | valido | — | target modulo 1 |
| primi 4 completi | `100,100,100,100,<100` | valido | — | target modulo 5 |
| master stale | tutti `100` | modulo 3 incompleto | — | target modulo 3 nella seconda passata |
| mapping mancante | entry senza route | — | valido | verifica visuale mirata |
| detail incompleto | `<100` | errore/retry esauriti | valido | verifica visuale target |
| candidato falso | `<100` | completo | completo | continua senza rescansione |
| percentuale DOM assente | `<100` | parziale | unknown | non inventare 0% |
| ricerca cancellata | qualsiasi | await in corso | — | nessuna navigazione |
| cambio corso | qualsiasi | await in corso | — | run precedente invalidata |
| test pending | `<100` | test pending | valido | evidenzia test |

Questa tabella è più utile di molti test basati soltanto sulla coverage di riga.

---

# Da backend developer

L'analogia più utile è una query che usa un indice.

Immagina una tabella enorme:

```sql
SELECT *
FROM activities
WHERE completed = false
ORDER BY course_order
LIMIT 1;
```

Se non esiste un indice adatto, il database può dover eseguire una scansione ampia.

PlumePilot affronta una situazione simile, ma con dati distribuiti fra:

```text
master endpoint
lesson endpoint
cache locale
DOM
```

Il course index funziona come un **coarse index**.

Il detail endpoint assomiglia al fetch della row completa.

Il DOM è simile a un sistema legacy che dobbiamo interrogare come fallback quando i dati strutturati non sono sufficienti.

L'analogia non è perfetta: non abbiamo un query planner vero e proprio, né snapshot transactionally consistent.

Ma il principio è molto vicino:

> **Usa prima la rappresentazione più economica capace di restringere la ricerca; accedi ai dati costosi solo per i candidati.**

---

# Concetti da portarsi dietro

## 1. Index e source of truth sono concetti diversi

Un indice può essere utilissimo anche se non è perfettamente autorevole.

## 2. Ottimizzare l'ordine è diverso dall'eliminare candidati

```text
prima controlla <100%
```

è più sicuro di:

```text
non controllare mai 100%
```

## 3. Il costo importante spesso è I/O, non CPU

Ridurre aperture DOM e chiamate HTTP può valere molto più di una micro-ottimizzazione su un loop JavaScript.

## 4. Unknown non equivale a false

L'assenza di informazione deve restare rappresentabile.

## 5. I fallback migliori sono locali

Se fallisce il modulo 12, verifica il 12. Non ricominciare dal modulo 1.

## 6. Conserva l'evidenza verificata

`verifiedCompleteChapters` evita di ripetere lavoro già concluso.

## 7. Le operazioni asincrone devono poter diventare stale

Generation token e cancellation guard proteggono dalla continuazione di ricerche obsolete.

## 8. Discovery ed execution sono responsabilità concettualmente diverse

```text
scopri target
→ naviga al target
```

è un modello più pulito di un'unica funzione che deve contemporaneamente decidere e manipolare la UI.

---

# Esercizi

## Esercizio 1 — Stable partition

Dato:

```js
const chapters = [
  { id: 1, percentage: 100 },
  { id: 2, percentage: 75 },
  { id: 3, percentage: 100 },
  { id: 4, percentage: 20 },
];
```

Costruisci senza ordinare numericamente:

```text
[2, 4, 1, 3]
```

mantenendo l'ordine relativo dei due gruppi.

---

## Esercizio 2 — Perché `sort()` può essere semanticamente sbagliato?

Spiega perché:

```js
chapters.sort((a, b) => a.percentage - b.percentage);
```

non risolve correttamente “prima attività incompleta”.

---

## Esercizio 3 — Ternary knowledge

Modella il progresso come:

```ts
"complete" | "incomplete" | "unknown"
```

invece di un booleano.

Quali branch dell'algoritmo diventano più chiari?

---

## Esercizio 4 — Worst case

Immagina 50 capitoli e un master index che riporta erroneamente tutto al 100%.

Quante detail verification può dover eseguire l'algoritmo per preservare la correttezza?

Perché questa degradazione è accettabile?

---

## Esercizio 5 — Query planner

Disegna tre piani:

```text
DOM-first
API-detail-first
master-index-first
```

Per ognuno annota:

- numero di chiamate;
- numero di aperture DOM;
- affidabilità;
- comportamento con dati stale.

---

# Approfondimenti

Per i concetti JavaScript usati direttamente nel codice:

- MDN — `Array.prototype.find()`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find

- MDN — `Array.prototype.filter()`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter

- MDN — `Map`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

Per il modello mentale di indice/query planning è utile studiare anche i concetti dei database relazionali, mantenendo però chiaro che PlumePilot non sta implementando un DBMS.

---

# Nel prossimo capitolo

Ora sappiamo come PlumePilot decide **quali dati recuperare e in quale ordine**.

Nel Capitolo 09 cambieremo completamente tipo di problema:

# Generare PDF, HTML ed EPUB nel browser

Studieremo una pipeline che parte da URL e strutture del corso e arriva a file binari scaricabili:

```text
raccolta
  ↓
normalizzazione
  ↓
fetch degli asset
  ↓
parsing
  ↓
trasformazione
  ↓
layout / reflow
  ↓
serializzazione
  ↓
Blob / download
```

e affronteremo una domanda che diventa molto concreta quando il browser deve elaborare decine o centinaia di megabyte:

> **Cosa significa usare il browser non come semplice interfaccia, ma come vero runtime di document generation?**

---

[← 07 — Autoplay come state machine](07-autoplay-state-machine.md) · [Indice](index.md) · [09 — Generare PDF, HTML ed EPUB →](09-generazione-documenti.md)
