# 10 — Un piccolo rich-text editor

## `contenteditable`, Selection, Range, liste e callout

Nel Capitolo 9 abbiamo visto che il quiz HTML generato da PlumePilot non è semplicemente un documento: è una piccola applicazione offline.

Con la versione 2.35.0 quell'applicazione ha acquistato una caratteristica ancora più interessante: due campi di appunti per ogni domanda — **Spiegazione** e **Osservazioni** — non sono più semplici caselle di testo, ma piccoli editor rich-text.

L'utente può usare:

- grassetto;
- corsivo;
- sottolineato;
- barrato;
- apice e pedice;
- liste puntate e numerate;
- checklist;
- evidenziazioni colorate;
- callout;
- testo nascosto per il ripasso;
- simboli matematici;
- undo e redo;
- scorciatoie da tastiera;
- stato personale della domanda.

A prima vista potrebbe sembrare un problema di formattazione:

```text
se l'utente preme B
    ↓
rendi il testo grassetto
```

In realtà un editor rich-text deve continuamente rispondere a domande molto più difficili:

```text
Dov'è il cursore?
Che cosa è selezionato?
La selezione appartiene ancora all'editor?
Il click sulla toolbar ha distrutto la selezione?
Siamo dentro una lista?
Siamo dentro una checklist?
Siamo dentro un callout?
Il testo evidenziato ha già un altro colore?
Cosa deve succedere premendo Invio?
Dove deve continuare la digitazione dopo ESC?
Come salviamo HTML senza salvare markup arbitrario?
Come ricostruiamo l'editor dopo un rerender?
```

Questo capitolo usa `offline-quiz-runtime.js` come caso di studio per capire una cosa fondamentale:

> **Un rich-text editor non modifica una stringa. Modifica contemporaneamente un albero DOM, una selezione, uno stato di editing e una rappresentazione persistibile.**

---

# Parte I — Da `textarea` a `contenteditable`

## 1. Perché un `textarea` non basta

Un normale `<textarea>` conserva essenzialmente una stringa:

```text
"Questa è la mia spiegazione"
```

Possiamo conoscere facilmente:

```js
textarea.value
textarea.selectionStart
textarea.selectionEnd
```

Ma il testo non contiene struttura HTML.

Non possiamo rappresentare naturalmente:

```html
<strong>questa parte</strong>
<ul>
  <li>punto uno</li>
  <li>punto due</li>
</ul>
```

senza inventare un formato nostro o mostrare direttamente markup all'utente.

Con `contenteditable`, invece, un normale elemento DOM diventa modificabile:

```js
const editor = document.createElement("div");
editor.contentEditable = "true";
```

PlumePilot crea due editor per domanda in `offline-quiz-runtime.js`:

```js
const editor = document.createElement("div");
editor.className = "note-editor";
editor.contentEditable = "true";
editor.setAttribute("role", "textbox");
editor.setAttribute("aria-label", labelText);
editor.setAttribute("aria-multiline", "true");
```

Riferimento:

```text
offline-quiz-runtime.js:470–490
```

La differenza concettuale è enorme.

Nel `textarea` lo stato principale è:

```text
stringa
```

Nel `contenteditable` lo stato visibile diventa un **albero**:

```text
editor
├── testo
├── <strong>
│      └── testo
├── <span class="highlight">
│      └── testo
├── <ul class="checklist">
│      ├── <li>
│      └── <li>
└── <div class="callout">
       └── testo
```

Questo introduce subito il concetto di **document model**.

---

## 2. `contenteditable` non è un editor completo

Scrivere:

```html
<div contenteditable="true"></div>
```

non significa aver costruito un editor.

Significa soltanto aver delegato al browser alcune operazioni di editing:

- inserimento testo;
- cancellazione;
- movimento del caret;
- selezione;
- composizione da tastiera;
- una parte della gestione di paragrafi e liste;
- integrazione con il sistema di input del browser.

Il browser decide anche molti dettagli del DOM generato.

Una pressione di `Enter`, per esempio, non è semanticamente equivalente a:

```js
editor.innerHTML += "<br>";
```

Il risultato dipende dal contesto in cui si trova il caret:

```text
paragrafo
lista
list item
callout
nodo inline
editor vuoto
```

Quindi una lezione importante è:

> **`contenteditable` fornisce un editing host, non un modello dati di alto livello.**

PlumePilot deve costruire sopra quel comportamento il proprio protocollo editoriale.

---

# Parte II — Selection e Range

## 3. Il cursore è una selezione collassata

Quando diciamo:

> “il cursore si trova dopo questa parola”

il browser lo rappresenta attraverso la Selection API.

PlumePilot legge la selezione con:

```js
const selection = window.getSelection();
```

Una `Selection` descrive ciò che l'utente ha selezionato nel documento.

Può essere:

```text
selezione non collassata

"questa [parte del testo] è importante"
```

oppure:

```text
selezione collassata

"questa parte| del testo"
              ↑
             caret
```

Il cursore, quindi, non è un concetto completamente separato.

È essenzialmente una selezione il cui inizio e fine coincidono.

---

## 4. Che cos'è un `Range`

La `Selection` contiene uno o più `Range`.

Nel caso ordinario che interessa il nostro editor possiamo immaginare un range come:

```text
startContainer
startOffset
endContainer
endOffset
```

Per esempio:

```html
<p>La risposta è importante.</p>
```

se selezioniamo:

```text
risposta
```

il range descrive due coordinate dentro l'albero DOM.

Non contiene necessariamente una semplice coppia di indici della stringa.

Questo è cruciale perché una selezione può attraversare nodi differenti:

```html
<p>
  La <strong>risposta</strong> è <em>molto importante</em>.
</p>
```

Un editor rich-text deve quindi ragionare in termini di **posizioni nell'albero**, non soltanto caratteri.

---

## 5. Perché PlumePilot salva `selectedRange`

Nel runtime troviamo:

```js
let activeField = null;
let selectedRange = null;
```

poi:

```js
const rememberSelection = () => {
  const selection = window.getSelection();
  if (
    activeField &&
    selection.rangeCount &&
    activeField.contains(selection.anchorNode) &&
    activeField.contains(selection.focusNode)
  ) {
    selectedRange = selection.getRangeAt(0).cloneRange();
  }
};
```

Riferimento:

```text
offline-quiz-runtime.js:246–252
```

Perché copiare il range?

Immaginiamo questa sequenza:

```text
1. seleziono "risposta corretta"
2. la Selection appartiene all'editor
3. clicco il pulsante "Giallo"
4. il pulsante riceve l'interazione
5. il browser può spostare focus / selection
6. quando il click handler parte, la vecchia selezione potrebbe non essere più disponibile
```

Se l'editor si affidasse soltanto a:

```js
window.getSelection()
```

nel momento del click, potrebbe non sapere più quale testo formattare.

Per questo memorizza:

```js
selection.getRangeAt(0).cloneRange()
```

Il range clonato diventa uno **snapshot della posizione editoriale**.

---

## 6. Perché i pulsanti intercettano `mousedown`

La funzione che crea la toolbar contiene:

```js
item.addEventListener("mousedown", (event) => event.preventDefault());
```

Riferimento:

```text
offline-quiz-runtime.js:391–409
```

Questo dettaglio sembra minuscolo, ma è molto importante.

Il comportamento predefinito del click su un button può spostare il focus sul controllo.

PlumePilot vuole invece che la sequenza sia più vicina a:

```text
selection nell'editor
       ↓
click toolbar
       ↓
non perdere il contesto editoriale
       ↓
applica trasformazione alla selection precedente
```

Quindi usa due difese complementari:

```text
preventDefault sul mousedown
+
selectedRange clonato
```

Questo è un esempio di **defensive UI programming**.

Non ci affidiamo a un unico comportamento implicito del browser quando la correttezza dell'operazione dipende dalla selezione.

---

## 7. Ripristinare una selezione

Prima di eseguire un comando, `runCommand()` fa:

```js
editor.focus();

if (selectedRange && editor.contains(selectedRange.commonAncestorContainer)) {
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(selectedRange);
}
```

poi:

```js
document.execCommand(command, false, value);
```

Riferimento:

```text
offline-quiz-runtime.js:253–263
```

La sequenza è quindi:

```text
saved Range
    ↓
focus editor
    ↓
remove current ranges
    ↓
restore saved Range
    ↓
execute edit
```

Questa è quasi una piccola transazione editoriale.

---

# Parte III — Comandi nativi e trasformazioni custom

## 8. La strategia ibrida di PlumePilot

Il runtime usa due famiglie di operazioni.

### Operazioni delegate al browser

```text
bold
italic
underline
strikeThrough
insertUnorderedList
insertOrderedList
superscript
subscript
undo
redo
removeFormat
insertText
```

tramite:

```js
document.execCommand(...)
```

### Operazioni implementate direttamente sul DOM

```text
highlight colorati
study mask
checklist semantics
callout
uscita controllata dai callout
normalizzazione delle liste
sanitizzazione
```

Questa divisione è molto istruttiva.

PlumePilot non prova a ricostruire da zero l'intero motore di editing del browser, ma non si limita neppure ai comandi nativi.

---

## 9. `execCommand()` e il debito tecnologico consapevole

`document.execCommand()` è oggi un'API **deprecata** e non fa parte di una specifica Web moderna stabile.

È importante non nasconderlo.

Perché usarla comunque?

Per un editor piccolo e offline offre ancora alcuni vantaggi pratici:

- delega al browser operazioni complesse come bold/list/undo;
- interagisce con il normale editing `contenteditable`;
- soprattutto, molte sue modifiche partecipano alla **undo history** nativa del browser.

Questo ultimo punto è difficile da replicare perfettamente con semplici manipolazioni DOM.

Quindi la decisione non va letta come:

```text
execCommand è l'API moderna corretta
```

ma come:

```text
feature scope piccolo
+ compatibilità verificata sui browser target
+ valore dell'undo nativo
+ costo di un editor custom completo molto maggiore
------------------------------------------------
uso pragmatico di una API legacy
```

### Un'importante distinzione

**Legacy** non significa automaticamente **bug**.

Ma significa che dobbiamo conoscere il rischio:

- comportamento non perfettamente uniforme;
- futuro incerto;
- necessità di test cross-browser;
- interazione non sempre prevedibile con eventi `input` / `beforeinput`;
- possibile divergenza tra editing nativo e trasformazioni DOM custom.

### Da backend developer

È simile a usare una libreria legacy stabile in un servizio circoscritto.

La domanda corretta non è:

> “È vecchia?”

ma:

> “Qual è il costo di sostituirla, quali garanzie ci serve ottenere e dove isoliamo la dipendenza?”

In PlumePilot la dipendenza è relativamente concentrata dentro il runtime del quiz.

---

# Parte IV — Range come strumento di trasformazione

## 10. Evidenziare non significa soltanto cambiare CSS

Per gli highlight PlumePilot non usa `execCommand()`.

Costruisce invece un wrapper semantico:

```html
<span class="highlight" data-color="yellow">
  testo
</span>
```

La funzione principale è:

```js
wrapSelection(editor, className, key, value)
```

Riferimento:

```text
offline-quiz-runtime.js:343–390
```

Prima controlla che esista una selezione utile:

```js
if (
  !selectedRange ||
  selectedRange.collapsed ||
  !editor.contains(selectedRange.commonAncestorContainer)
) return;
```

Quindi una selezione vuota non viene interpretata arbitrariamente.

---

## 11. Una guardia strutturale: non attraversare blocchi incompatibili

Il codice contiene:

```js
if (
  range.startContainer.parentElement?.closest("div,li,p") !==
  range.endContainer.parentElement?.closest("div,li,p")
) return;
```

In altre parole, PlumePilot rifiuta di applicare il wrapper custom se la selezione attraversa blocchi differenti.

Perché?

Perché trasformare:

```html
<p>prima metà...</p>
<ul>
  <li>...seconda metà</li>
</ul>
```

in un singolo `<span>` sarebbe strutturalmente problematico.

Questa è una **structural guard**:

```text
selezione semplice dentro un blocco
        ↓
operazione consentita

selezione attraverso blocchi incompatibili
        ↓
fail safely
```

È lo stesso principio di prudenza visto nell'autoplay e nel reverse engineering:

> se non possiamo preservare con sicurezza la struttura, non inventiamo una trasformazione.

---

## 12. `extractContents()` + `insertNode()`

La trasformazione principale usa:

```js
const contents = range.extractContents();
wrapper.appendChild(contents);
range.insertNode(wrapper);
```

Mentalmente:

```text
DOM prima

<p>
  abc [def ghi] lmn
</p>
```

`extractContents()` estrae la parte selezionata in un `DocumentFragment`:

```text
DocumentFragment
└── "def ghi"
```

Poi:

```js
wrapper.appendChild(contents);
```

produce:

```html
<span class="highlight" data-color="yellow">
  def ghi
</span>
```

Infine:

```js
range.insertNode(wrapper);
```

reinserisce il nuovo nodo nella posizione corretta.

Risultato:

```html
<p>
  abc
  <span class="highlight" data-color="yellow">def ghi</span>
  lmn
</p>
```

Questo è un esempio reale di manipolazione strutturale del DOM tramite `Range`.

---

## 13. Cambiare colore a un highlight esistente

Supponiamo di avere:

```html
<span class="highlight" data-color="yellow">
  concetto importante
</span>
```

e di selezionare esattamente tutto il testo per renderlo blu.

PlumePilot riconosce il caso:

```js
if (
  startHighlight &&
  startHighlight === endHighlight &&
  editor.contains(startHighlight) &&
  range.toString() === startHighlight.textContent
) {
  startHighlight.dataset.color = value;
  ...
}
```

Non crea quindi:

```html
<span class="highlight" data-color="yellow">
  <span class="highlight" data-color="blue">
    concetto importante
  </span>
</span>
```

ma modifica direttamente il nodo esistente.

Questo evita **markup nesting inutile**.

---

## 14. Cambiare colore solo a una parte

Caso più difficile:

```text
[giallo: abc DEF ghi]
```

selezioniamo solo:

```text
DEF
```

per renderlo blu.

Il risultato desiderato è:

```text
[giallo: abc ]
[blu: DEF]
[giallo:  ghi]
```

non:

```text
[giallo:
   abc
   [blu: DEF]
   ghi
]
```

Per questo il codice controlla se il nuovo wrapper è finito dentro un vecchio highlight:

```js
const oldParent = wrapper.parentElement;

if (className === "highlight" && oldParent?.classList.contains("highlight")) {
  const before = oldParent.cloneNode(false);
  const after = oldParent.cloneNode(false);
  ...
}
```

poi ricostruisce tre segmenti:

```text
before
wrapper nuovo
after
```

Questo è uno dei primi punti in cui vediamo chiaramente che un rich-text editor è un problema di **tree rewriting**.

---

# Parte V — Stato di formattazione e caret

## 15. Formato attivo vs testo già formattato

Uno dei problemi più insidiosi di un editor è distinguere:

```text
formato del testo già esistente
```

da:

```text
formato che verrà applicato al testo che digiteremo dopo
```

Immaginiamo:

```text
H₂O|
```

Se il caret è ancora dentro `<sub>`, il prossimo carattere potrebbe continuare a essere inserito come pedice.

Analogamente:

```text
[highlight giallo: importante|]
```

il browser potrebbe continuare la digitazione dentro lo `<span class="highlight">`.

Per l'utente però spesso l'intenzione è:

> “Ho finito quella formattazione, ora voglio continuare normalmente.”

Da qui nasce la scorciatoia `Escape`.

---

## 16. ESC come comando di uscita dallo stato editoriale

Il key handler contiene:

```js
if (event.key === "Escape") {
```

Riferimento:

```text
offline-quiz-runtime.js:511–545
```

Prima, se esiste ancora una selezione estesa:

```js
if (!range.collapsed) selection.collapseToEnd();
```

Quindi il testo rimane formattato, ma il caret viene spostato alla fine.

Poi controlla i comandi inline:

```js
for (const command of [
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "superscript",
  "subscript",
]) {
  if (document.queryCommandState(command)) {
    document.execCommand(command, false, null);
  }
}
```

Concettualmente:

```text
BOLD ON      → BOLD OFF
SUPERSCRIPT  → NORMAL
SUBSCRIPT    → NORMAL
```

ESC diventa quindi una piccola operazione di **state reset**.

---

## 17. Uscire da un highlight è più difficile

Per l'highlight non esiste un semplice comando equivalente.

Il caret potrebbe trovarsi fisicamente dentro:

```html
<span class="highlight" data-color="yellow">...</span>
```

Per continuare fuori dal colore bisogna cambiare la struttura del DOM.

PlumePilot:

1. identifica l'highlight corrente;
2. costruisce un range dal caret alla fine dell'highlight;
3. estrae il suffisso;
4. se esiste testo successivo, lo conserva in un clone dell'highlight;
5. posiziona il caret **dopo** il primo highlight.

La parte centrale è:

```js
const suffix = caret.cloneRange();
suffix.setEnd(highlight, highlight.childNodes.length);
const rest = suffix.extractContents();
```

poi:

```js
const position = document.createRange();
position.setStart(
  parent,
  Array.prototype.indexOf.call(parent.childNodes, highlight) + 1,
);
position.collapse(true);
```

Quindi ESC non significa semplicemente:

```text
set color = null
```

Significa:

```text
modifica albero
+
ricostruzione selection
+
nuova posizione caret
```

---

# Parte VI — Liste e checklist

## 18. Una checklist non è una lista completamente diversa

PlumePilot modella la checklist come una normale lista non ordinata:

```html
<ul class="checklist">
  <li>Ripassare definizione</li>
  <li class="checked">Rivedere esempio</li>
</ul>
```

Il CSS trasforma visivamente gli elementi:

```css
.note-editor .checklist {
  list-style: none;
}

.note-editor .checklist > li::before {
  content: "☐";
}

.note-editor .checklist > li.checked::before {
  content: "☑";
}
```

Questa scelta riusa la semantica strutturale di `<ul>/<li>` e aggiunge soltanto stato applicativo.

Possiamo descriverla così:

```text
struttura HTML standard
        +
classe semantica PlumePilot
        +
stato per singolo item
```

---

## 19. Il bug lista puntata → checklist → lista puntata

Uno dei bug reali incontrati durante lo sviluppo era questo:

```text
1. creo una checklist
2. esco dalla checklist
3. seleziono "lista puntata"
4. il browser continua / ricrea una riga con semantica checklist
```

La lista numerata non mostrava lo stesso comportamento.

Questo è un ottimo esempio della difficoltà di `contenteditable`:

> **il browser possiede un proprio modello implicito della lista corrente.**

Non basta assumere che, dopo un comando, il DOM corrisponda esattamente al modello mentale dell'applicazione.

La soluzione attuale introduce:

```js
function splitChecklist(editor) {
```

Riferimento:

```text
offline-quiz-runtime.js:270–288
```

La funzione individua:

```textcaret
 ↓
<li corrente>
 ↓
<ul class="checklist">
```

poi separa l'item corrente dalla checklist.

---

## 20. Anatomia di `splitChecklist()`

Partiamo da:

```text
CHECKLIST
├── A
├── B   ← current item
└── C
```

Il codice crea:

```js
const normal = document.createElement("ul");
const remainder = list.cloneNode(false);
```

Quindi sposta i sibling successivi in `remainder`:

```text
original checklist
├── A
└── B

remainder checklist
└── C
```

Poi rimuove lo stato checked dall'item corrente:

```js
item.classList.remove("checked");
```

lo sposta nella lista normale:

```js
normal.appendChild(item);
```

ottenendo:

```text
CHECKLIST
└── A

NORMAL UL
└── B

CHECKLIST
└── C
```

Questa trasformazione preserva sia ciò che viene prima sia ciò che viene dopo.

Non converte indiscriminatamente tutta la checklist.

---

## 21. Normalizzare dopo il comando

Il pulsante lista puntata fa:

```js
if (
  command === "insertUnorderedList" &&
  currentNode(target)?.closest("ul.checklist")
) {
  splitChecklist(target);
  return;
}

runCommand(target, command);

if (command === "insertUnorderedList") {
  splitChecklist(target);
}
```

Questo doppio controllo è interessante.

PlumePilot verifica:

```text
prima del comando
+
dopo il comando
```

perché il browser stesso può aver trasformato il DOM.

È un altro esempio del pattern già visto nel libro:

```text
check
↓
operation
↓
re-check / normalize
```

Lo stesso principio che usavamo dopo un `await` ricompare qui dopo un'operazione di editing nativa.

---

## 22. Perché il doppio Invio è diverso

Quando l'utente preme Invio dentro una lista, gran parte del comportamento è ancora gestita dal motore `contenteditable` del browser.

Il classico doppio Invio su un item vuoto può causare l'uscita dalla lista.

PlumePilot non reimplementa l'intero algoritmo nativo di editing delle liste.

Interviene invece sui punti in cui la semantica custom `checklist` può sopravvivere o propagarsi in modo indesiderato.

Questo è un compromesso intenzionale:

```text
browser
→ gestione generale lista/caret/Enter

PlumePilot
→ semantica checklist
→ normalizzazione
→ checked state
```

Ricostruire completamente il comportamento di una lista sarebbe un progetto editoriale molto più grande.

---

## 23. Il click sulla casella senza un vero `<input>`

La checklist non usa un checkbox HTML reale.

Il quadrato è generato con CSS.

Per rilevare il click PlumePilot controlla:

```js
const item = event.target.closest(".checklist > li");

if (
  item &&
  editor.contains(item) &&
  event.clientX < item.getBoundingClientRect().left
) {
  item.classList.toggle("checked");
}
```

Riferimento:

```text
offline-quiz-runtime.js:560–570
```

La zona alla sinistra del contenuto del `<li>` viene quindi interpretata come click sul marker.

È una forma molto semplice di **hit testing**.

---

# Parte VII — Callout come blocchi semantici

## 24. Un callout non è solo un colore

Un callout viene modellato come:

```html
<div class="callout" data-kind="important">
  ...
</div>
```

I tipi ammessi sono:

```text
important
attention
review
```

Quindi la struttura porta un significato esplicito.

Il CSS decide l'aspetto.

Questa separazione è utile:

```text
semantica → data-kind
presentazione → CSS
```

---

## 25. Il bug: callout non annullabile

Durante lo sviluppo è emerso un problema interessante.

Se non veniva selezionato testo, l'applicazione poteva interpretare arbitrariamente il blocco precedente come target del callout.

Ma una selezione vuota può significare semplicemente:

> “voglio iniziare un nuovo callout da qui.”

La versione attuale esplicita questa semantica.

La funzione `applyCallout()` distingue tre casi.

---

## 26. Caso A — Siamo già in un callout

```js
const existing = node?.closest(".callout");
```

Se il callout corrente ha lo stesso tipo:

```js
if (existing.dataset.kind === kind) {
  existing.classList.remove("callout");
  delete existing.dataset.kind;
}
```

quindi:

```text
Callout Important
       ↓ click Important
Normal block
```

Lo stesso controllo diventa un **toggle**.

Se invece scegliamo un tipo differente:

```js
else existing.dataset.kind = kind;
```

quindi:

```text
Important
   ↓
Attention
```

senza creare un nuovo wrapper.

---

## 27. Caso B — Selection collassata

Se:

```js
selection.isCollapsed
```

PlumePilot **non** trasforma arbitrariamente il blocco precedente.

Crea un nuovo callout:

```js
const callout = document.createElement("div");
callout.className = "callout";
callout.dataset.kind = kind;
callout.appendChild(document.createElement("br"));
```

poi lo inserisce dopo il blocco corrente oppure in fondo all'editor.

Infine crea un nuovo Range e porta lì il caret.

Questa parte corregge direttamente il problema di UX emerso durante lo sviluppo.

---

## 28. Caso C — Testo selezionato

Con una selezione reale, PlumePilot chiede al browser di trasformare il blocco:

```js
document.execCommand("formatBlock", false, "div");
```

poi applica:

```js
block.className = "callout";
block.dataset.kind = kind;
```

La selezione utente rappresenta quindi una chiara intenzione:

```text
questo blocco
    ↓
diventa un callout
```

---

# Parte VIII — Come si esce da un callout?

## 29. Enter non significa sempre la stessa cosa

Nel key handler troviamo un comportamento speciale per `Enter`:

```js
if (
  event.key === "Enter" &&
  !event.shiftKey &&
  !event.ctrlKey &&
  !event.metaKey
) {
```

Poi il codice cerca il callout corrente:

```js
const block = currentNode(editor)?.closest(".callout");
```

ma non esce sempre.

Controlla se dal caret alla fine del callout rimane testo:

```js
const remaining = selection.getRangeAt(0).cloneRange();
remaining.setEnd(block, block.childNodes.length);

if (!remaining.toString().trim()) {
```

Quindi la regola è:

```text
Enter nel mezzo del callout
→ normale editing interno

Enter alla fine del callout
→ esci dal callout
```

Questo rende l'intenzione prevedibile.

---

## 30. `insertNormalBlock()`

Per uscire dal callout viene creato:

```js
const paragraph = document.createElement("div");
paragraph.appendChild(document.createElement("br"));
block.after(paragraph);
```

poi il caret viene posizionato dentro il nuovo blocco:

```js
const range = document.createRange();
range.selectNodeContents(paragraph);
range.collapse(true);
selection.removeAllRanges();
selection.addRange(range);
```

Ancora una volta:

> cambiare il DOM senza riposizionare la Selection produrrebbe un editor rotto.

DOM e caret devono essere aggiornati come un'unica operazione logica.

---

# Parte IX — Input, shortcut e paste

## 31. La toolbar non è l'unico ingresso

Un editor deve gestire almeno:

```text
mouse
keyboard
paste
browser editing engine
programmatic commands
```

PlumePilot implementa scorciatoie:

```text
Ctrl/Cmd + B → bold
Ctrl/Cmd + I → italic
Ctrl/Cmd + U → underline
Ctrl/Cmd + G → strike-through
Ctrl/Cmd + E → superscript
Ctrl/Cmd + D → subscript
ESC          → exit formatting
```

Il codice normalizza:

```js
const key = event.key.toLowerCase();
```

poi mappa:

```js
const command = {
  b: "bold",
  i: "italic",
  u: "underline",
  g: "strikeThrough",
  e: "superscript",
  d: "subscript",
}[key];
```

Riferimento:

```text
offline-quiz-runtime.js:546–555
```

---

## 32. Perché non usare Shift

Il runtime scarta esplicitamente:

```js
if (event.shiftKey) return;
```

È una scelta di riduzione dei conflitti.

Una scorciatoia editoriale apparentemente comoda può interferire con:

- maiuscole;
- selezioni;
- shortcut native;
- layout di tastiera differenti;
- combinazioni già usate dal browser.

Un piccolo editor dovrebbe avere un set di shortcut limitato e prevedibile.

---

## 33. Paste come testo semplice

Il paste handler fa:

```js
editor.addEventListener("paste", (event) => {
  event.preventDefault();
  document.execCommand(
    "insertText",
    false,
    event.clipboardData.getData("text/plain"),
  );
});
```

Perché impedire l'HTML del clipboard?

Se incollassimo direttamente rich HTML potremmo ricevere:

```html
<span style="font-family: ...">
<div class="qualcosa">
<a href="...">
<img ...>
```

oppure markup molto più complesso prodotto da Word, Google Docs o un'altra pagina web.

PlumePilot decide:

```text
paste esterno
    ↓
text/plain
    ↓
struttura controllata dal nostro editor
```

È sia una semplificazione architetturale sia una misura difensiva.

---

# Parte X — Sanitizzazione: l'HTML salvato non è automaticamente affidabile

## 34. Perché sanitizzare il proprio editor?

Potremmo pensare:

> “L'HTML lo abbiamo creato noi, quindi possiamo salvarlo così com'è.”

Ma il contenuto può attraversare più percorsi:

```text
browser editing engine
custom DOM operations
file annotato precedente
paste
markup legacy
future versions
```

Inoltre il file HTML annotato viene ricaricato in un contesto eseguibile.

Per questo PlumePilot usa una funzione esplicita:

```js
cleanHtml(source)
```

Riferimento:

```text
offline-quiz-runtime.js:27–60
```

---

## 35. Allowlist, non blacklist

La funzione definisce:

```js
const allowed = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "UL",
  "OL",
  "LI",
  "SUP",
  "SUB",
  "BR",
  "DIV",
  "P",
  "SPAN",
]);
```

Quindi la domanda non è:

> “Questo tag è pericoloso?”

ma:

> “Questo tag fa parte del nostro formato editoriale?”

È la differenza tra:

```text
blacklist
→ prova a conoscere tutto ciò che non vogliamo
```

versus:

```text
allowlist
→ accetta soltanto ciò che sappiamo interpretare
```

Per un piccolo formato controllato, la seconda strategia è molto più semplice da ragionare.

---

## 36. Anche gli attributi vengono ricostruiti

PlumePilot non copia genericamente gli attributi del nodo.

Per uno `SPAN` riconosce soltanto:

```text
.study-mask
.highlight + data-color ammesso
```

per un `DIV`:

```text
.callout + data-kind ammesso
```

per un `UL`:

```text
.checklist
```

per un `LI`:

```text
.checked
```

Quindi un nodo del tipo:

```html
<span onclick="..." style="..." data-random="...">
```

non viene copiato con quegli attributi.

Il sanitizer ricostruisce un nuovo DOM conosciuto.

---

## 37. Sanitizzazione conservativa

Il codice commenta:

```js
// Unknown markup is discarded along with its content.
```

Se un nodo non è ammesso, viene restituito un `DocumentFragment` vuoto.

Questa scelta è molto conservativa.

Un sanitizer differente potrebbe decidere di:

```text
rimuovere il tag
ma mantenere i figli testuali
```

PlumePilot preferisce invece non reinterpretare markup che non riconosce.

È un trade-off:

```text
massima conservazione del contenuto
          vs
massima prevedibilità del formato
```

Per un editor di appunti con vocabolario HTML ristretto, la seconda scelta è ragionevole.

---

# Parte XI — Stato live e stato persistibile

## 38. Il DOM dell'editor non è l'unico stato

All'inizio del runtime troviamo:

```js
const notes = new Map(...);
```

Ogni domanda possiede una chiave stabile:

```js
noteKey:
  `test:${...}:question:${questionIndex + 1}`
```

Il modello persistito contiene campi come:

```text
explanationHtml
observationsHtml
status
```

Quindi possiamo distinguere:

```text
LIVE EDITOR STATE
DOM contenteditable
Selection
Range
activeField

        ↓ input

PERSISTABLE NOTE STATE
Map<noteKey, note>
```

Questa separazione è fondamentale.

---

## 39. `input` come commit verso il modello

Ogni editor registra:

```js
editor.addEventListener("input", () => {
  details.dataset.hasNotes = String(
    saveNote(question, field + "Html", cleanHtml(editor.innerHTML)),
  );
});
```

Quindi:

```text
DOM mutation dell'editor
        ↓
input event
        ↓
editor.innerHTML
        ↓
cleanHtml()
        ↓
saveNote()
        ↓
notes Map
```

La `Map` diventa la rappresentazione persistibile del contenuto.

Il DOM dell'editor può essere distrutto e ricreato durante un `render()`.

---

## 40. Rerender e ricostruzione

Il quiz può essere rerenderizzato quando:

- cambia capitolo;
- cambia filtro;
- cambia ordine delle domande;
- viene resettata una vista.

Il container viene sostituito:

```js
container.replaceChildren();
```

poi ogni editor viene ricreato.

Il contenuto salvato viene reinserito con:

```js
if (saved[field + "Html"]) {
  editor.innerHTML = cleanHtml(saved[field + "Html"]);
} else {
  editor.textContent = saved[field] || "";
}
```

Quindi:

```text
DOM corrente
≠
source of truth permanente degli appunti
```

La `notes Map` è più vicina al modello dati; il DOM è una vista editabile di quel modello.

### Da backend developer

È simile a:

```text
View Model / DOM
      ↓
change event
      ↓
application state
      ↓
re-render
```

anche se qui non stiamo usando React/Vue o un framework reattivo.

---

# Parte XII — Salvare un HTML annotato

## 41. Il file stesso diventa contenitore dello stato

Il quiz offline non usa un database esterno.

Quando l'utente sceglie:

```text
Scarica HTML con appunti
```

PlumePilot clona il documento:

```js
const clone = document.documentElement.cloneNode(true);
```

poi serializza la `Map`:

```js
Object.fromEntries(notes)
```

la codifica e la inserisce in:

```html
<script id="notes-data" type="application/octet-stream">...</script>
```

Infine salva l'intero HTML.

Riferimento:

```text
offline-quiz-runtime.js:689–705
```

Quindi il file contiene contemporaneamente:

```text
UI
runtime JavaScript
dati dei quiz
immagini offline
appunti
stati di revisione
```

È una piccola **self-contained application snapshot**.

---

## 42. Perché codificare gli appunti

Il runtime usa `TextEncoder`, `TextDecoder`, `btoa()` e `atob()` per trasformare il JSON in una rappresentazione testuale sicura da inserire nel nodo dati.

Concettualmente:

```text
Map
 ↓ Object.fromEntries
Object
 ↓ JSON.stringify
JSON UTF-8
 ↓ Base64
payload testuale
```

Al caricamento avviene il percorso inverso.

Questo non è cifratura.

È soltanto **encoding**.

L'obiettivo è poter incorporare il payload nel file senza mescolare direttamente il suo contenuto con markup o script eseguibile.

---

# Parte XIII — Stato della domanda ≠ formattazione dell'appunto

## 43. Due modelli separati

Ogni domanda può anche avere:

```text
🟢 Verificata
🟡 Da rivedere
🔴 Da verificare
```

Questo stato non viene rappresentato come colore dentro l'editor.

Vive in:

```js
note.status
```

Il runtime può quindi filtrare le domande senza interpretare il loro HTML.

Questa è una buona separazione semantica:

```text
contenuto dell'appunto
→ HTML controllato

workflow di studio
→ status enum
```

Se avessimo codificato lo stato soltanto attraverso colori o classi visuali nel testo, la logica di filtro sarebbe molto più fragile.

---

# Parte XIV — Un editor come state machine

## 44. Il Capitolo 7 ritorna

Anche questo piccolo editor può essere visto come una macchina a stati.

Non necessariamente una FSM esplicita, ma un insieme di stati combinati:

```text
activeField
selection collapsed / expanded
current formatting
current block type
current list type
callout kind
highlight ancestry
focus state
```

Gli eventi includono:

```text
FOCUS
KEYDOWN
INPUT
MOUSEUP
MOUSEDOWN TOOLBAR
CLICK TOOLBAR
PASTE
CLICK CHECKLIST
```

Le guardie includono:

```text
selection appartiene all'editor?
selection è collapsed?
range attraversa più blocchi?
siamo dentro una checklist?
siamo dentro un callout?
caret è alla fine del callout?
```

E le azioni:

```text
execCommand
extractContents
insertNode
split list
create block
move caret
saveNote
sanitize
```

Quindi possiamo riscrivere mentalmente:

```text
EDITOR_IDLE
   ↓ focus
EDITOR_ACTIVE
   ├── select text
   │      ↓
   │   RANGE_SELECTED
   │      ↓ toolbar
   │   FORMAT_SELECTION
   │
   ├── caret in callout + Enter at end
   │      ↓
   │   EXIT_CALLOUT
   │
   ├── caret in highlight + Escape
   │      ↓
   │   SPLIT_HIGHLIGHT
   │
   └── input
          ↓
       SANITIZE_AND_SAVE
```

Il concetto di state machine, quindi, non era specifico dell'autoplay.
È un modo generale di ragionare sui sistemi interattivi.

---

# Parte XV — Il bug come violazione di un'invariante

## 45. Invarianti utili dell'editor

Possiamo formulare alcune proprietà che dovrebbero sempre essere vere.

### Invariante 1

Un comando della toolbar deve modificare soltanto l'editor attivo.

```text
selectedRange ∈ activeField
```

### Invariante 2

Il markup salvato deve appartenere al vocabolario consentito.

```text
saved HTML ⊆ allowed editor schema
```

### Invariante 3

Una lista puntata normale non deve ereditare semanticamente `.checklist` solo perché l'utente proveniva da una checklist.

### Invariante 4

Una selezione vuota su “Callout” non deve trasformare arbitrariamente un blocco precedente.

### Invariante 5

Dopo ESC, la digitazione successiva non deve ereditare involontariamente una formattazione che l'utente ha deciso di terminare.

### Invariante 6

Dopo ogni trasformazione strutturale, il caret deve trovarsi in una posizione valida e prevedibile.

Visti in questo modo, i bug diventano più semplici da classificare.

Non sono soltanto:

```text
"lista che si comporta male"
```

ma:

```text
violazione dell'invariante di separazione tra list type
```

---

# Parte XVI — Undo/redo e transazioni editoriali

## 46. Perché undo è difficile

Un utente si aspetta che:

```text
scrivo
→ formatto
→ inserisco lista
→ modifico colore
→ Ctrl+Z
```

ripercorra operazioni coerenti.

Con `execCommand()`, il browser mantiene parte della propria undo history.

Ma quando manipoliamo direttamente il DOM con:

```js
extractContents()
insertNode()
replaceWith()
appendChild()
```

l'integrazione con quella history non è necessariamente equivalente in tutti i browser.

Questo è uno dei principali problemi degli editor ibridi.

Possiamo immaginare due motori:

```text
Browser editing history
        +
Custom DOM mutations
```

che non sempre condividono la stessa idea di “transazione”.

---

## 47. Come sarebbe un editor più formale

Un editor più grande potrebbe introdurre un proprio transaction model:

```text
before state
    ↓
operation
    ↓
normalized document state
    ↓
transaction record
    ↓
after state
```

per esempio:

```js
{
  type: "SET_HIGHLIGHT",
  range: ...,
  color: "yellow"
}
```

oppure un modello documentale indipendente dal DOM.

Il DOM diventerebbe una proiezione:

```text
Document Model
     ↓
DOM render
```

invece di essere contemporaneamente:

```text
modello + vista + editing engine
```

È la direzione seguita dai rich-text editor professionali.

Ma avrebbe un costo progettuale enormemente superiore rispetto alle esigenze di PlumePilot.

---

# Parte XVII — `beforeinput` come possibile evoluzione

## 48. Osservare l'intenzione prima della mutazione

Le piattaforme Web moderne espongono anche l'evento:

```text
beforeinput
```

che viene emesso prima che molte modifiche dell'utente vengano applicate all'editing host.

In un editor più strutturato può essere utile per intercettare intenzioni del tipo:

```text
insertText
insertParagraph
formatBold
historyUndo
...
```

prima della mutazione.

Un'ipotetica evoluzione potrebbe usare:

```text
beforeinput
+ Selection / Range
+ DOM normalization
+ transaction layer
```

riducendo progressivamente la dipendenza da `execCommand()`.

Ma questo non significa che la migrazione sia una semplice sostituzione uno-a-uno.

`execCommand("bold")` concentra dietro una singola chiamata molti dettagli di editing che dovremmo poi gestire noi.

---

# Parte XVIII — Editor minimale vs framework editoriale

## 49. Quando smettere di costruirlo a mano

Per il nostro caso il runtime gestisce:

```text
due piccoli campi per domanda
insieme limitato di formati
file offline
nessun collaborative editing
nessun documento lungo multiutente
nessun plugin ecosystem
```

Quindi un editor minimale custom è difendibile.

Se però aggiungessimo:

```text
tabelle editabili
link complessi
immagini drag-and-drop
nested callout
indentazione arbitraria
history robusta cross-browser
collaboration
commenti multiutente
schema documentale versionato
```

il costo crescerebbe rapidamente.

A quel punto avrebbe senso valutare un vero editor framework con document model e transaction system.

La lezione non è:

> “non usare librerie.”

È:

> **scegli il livello di infrastruttura proporzionato alla complessità semantica dell'editor.**

---

# Parte XIX — Testare un rich-text editor

## 50. Testare soltanto il risultato visivo non basta

Due DOM possono apparire identici ma comportarsi diversamente al prossimo input.

Per esempio:

```html
<span class="highlight">abc|</span>
```

visivamente può sembrare uguale a:

```html
<span class="highlight">abc</span>|
```

ma il prossimo carattere:

```text
x
```

nel primo caso può entrare nell'highlight.

Nel secondo no.

Quindi dobbiamo testare:

```text
DOM
+
Selection
+
prossima azione dell'utente
```

---

## 51. Una matrice di test utile

### Formattazione inline

```text
selezione singolo nodo
selezione con bold già presente
selection collapsed
ESC dopo bold
ESC dopo superscript
ESC dopo subscript
```

### Highlight

```text
plain → yellow
yellow → blue su tutto il wrapper
yellow → blue su sottoselezione
ESC nel mezzo
ESC alla fine
selezione cross-block → nessuna trasformazione
```

### Checklist

```text
nuova checklist
check / uncheck item
checklist → bullet
checklist → numbered
uscita da lista → nuova bullet
split con item precedenti
split con item successivi
split con entrambi
```

### Callout

```text
selection → callout
caret collapsed → nuovo callout
same kind → remove
kind A → kind B
Enter nel mezzo
Enter alla fine
```

### Persistenza

```text
scrivi → cambia capitolo → torna
scrivi → filtra → ritorna
scarica annotato → riapri
markup legacy → cleanHtml
paste rich text → plain text
```

### Cross-browser

```text
Chrome
Edge
Firefox
```

In particolare per i comandi legacy non possiamo assumere equivalenza perfetta tra browser.

---

# Parte XX — Property-based thinking

## 52. Testare proprietà, non soltanto esempi

Molte regole dell'editor si prestano a test di proprietà.

Per esempio:

```text
Dopo cleanHtml():
nessun tag fuori dall'allowlist deve esistere.
```

Oppure:

```text
Dopo wrapSelection():
il testo visibile totale deve essere invariato.
```

Oppure:

```text
Dopo cambiare colore a una sottoselezione:
nessun highlight identico deve essere annidato inutilmente.
```

Oppure:

```text
Dopo splitChecklist():
l'ordine testuale degli item deve essere invariato.
```

Queste proprietà sono spesso più potenti di un singolo test basato su coordinate DOM esatte.

---

# Parte XXI — Schema del formato degli appunti

## 53. L'HTML è anche un formato dati

Il sanitizer ci permette di dedurre uno schema implicito.

Possiamo rappresentarlo così:

```text
NoteDocument
├── inline
│   ├── B / STRONG
│   ├── I / EM
│   ├── U
│   ├── S
│   ├── SUP
│   ├── SUB
│   └── SPAN
│       ├── highlight[data-color]
│       └── study-mask
│
├── block
│   ├── DIV
│   │   └── callout[data-kind]
│   └── P
│
└── list
    ├── UL
    │   └── checklist?
    ├── OL
    └── LI
        └── checked?
```

Quindi, anche se non esiste un file JSON Schema, abbiamo già un **document schema**.

Questo è utile per eventuali migrazioni future.

---

## 54. Versionare il formato?

Al momento la struttura è semplice e il sanitizer supporta anche valori legacy testuali:

```js
if (saved[field + "Html"]) ...
else editor.textContent = saved[field] || "";
```

È una piccola forma di backward compatibility.

Se il formato crescesse molto, potrebbe essere utile introdurre:

```js
{
  version: 2,
  explanationHtml: "...",
  observationsHtml: "...",
  status: "review"
}
```

esattamente come abbiamo già visto per gli snapshot della commissione.

Ancora una volta, lo stesso problema architetturale ricompare in domini differenti:

```text
stato persistito
→ schema
→ evoluzione
→ migrazione
```

---

# Parte XXII — Una possibile architettura futura

## 55. Separare DOM adapter e document model

Se dovessimo far crescere molto l'editor, potremmo separare:

```text
┌───────────────────────┐
│     Note Model        │
│ blocks / marks / list │
└───────────┬───────────┘
            │ render
            ▼
┌───────────────────────┐
│      DOM Adapter      │
└───────────┬───────────┘
            │
            ▼
      contenteditable
            ▲
            │ input intent
┌───────────┴───────────┐
│  Selection Adapter    │
│  beforeinput / Range  │
└───────────────────────┘
```

Le operazioni diventerebbero comandi espliciti:

```text
TOGGLE_BOLD
SET_HIGHLIGHT(yellow)
TOGGLE_CHECKLIST
SET_CALLOUT(attention)
EXIT_FORMATTING
```

Il vantaggio sarebbe maggiore prevedibilità.

Lo svantaggio sarebbe costruire e mantenere un vero motore editoriale.

Per PlumePilot attuale probabilmente non ne vale la pena.

---

# Parte XXIII — Da backend developer

## 56. Selection come cursor applicativo

Possiamo fare un'analogia con database e stream.

Un `Range` è simile a un cursore che identifica una porzione della struttura corrente.

Ma attenzione: il DOM può cambiare.

Quindi il range non è un identificatore business stabile.

È più vicino a:

```text
cursor / pointer dentro una struttura mutabile
```

che a:

```text
primary key
```

Questa distinzione spiega perché PlumePilot verifica sempre che il range appartenga ancora all'editor corretto.

---

## 57. `cleanHtml()` come boundary validation

Nel Capitolo 2 abbiamo visto che `bridge.js` normalizza i messaggi che attraversano un boundary.

Qui accade la stessa cosa con HTML:

```text
DOM arbitrario dell'editing engine
        ↓
cleanHtml()
        ↓
formato PlumePilot ammesso
```

`cleanHtml()` è quindi un **anti-corruption layer** tra:

```text
browser editing DOM
```

e:

```text
persisted note format
```

---

## 58. `input` come event sourcing? Non proprio

Potrebbe essere tentante dire:

```text
ogni input event = evento persistito
```

ma non è ciò che accade.

PlumePilot salva lo **snapshot corrente** dell'HTML sanitizzato.

Non conserva una sequenza come:

```text
INSERT_TEXT
TOGGLE_BOLD
ADD_CALLOUT
...
```

Quindi il modello è:

```text
state snapshot
```

non:

```text
event sourcing
```

Questa distinzione è importante.

---

# Parte XXIV — Cosa ci insegnano i bug reali

## 59. Bug: checklist che ritorna

Lezione:

> il browser editing engine mantiene struttura e contesto propri; dopo un comando bisogna verificare il DOM risultante, non assumere che corrisponda all'intenzione.

Pattern:

```text
command
↓
inspect
↓
normalize
```

---

## 60. Bug: callout che prende il blocco sbagliato

Lezione:

> una selection collassata è informazione, non assenza di informazione.

Può significare:

```text
insertion point
```

non:

```text
usa arbitrariamente il blocco precedente
```

La UI deve interpretare correttamente lo stato epistemico della Selection.

---

## 61. Bug: formattazione che continua

Lezione:

> il formato non appartiene soltanto al testo passato; può appartenere anche alla posizione corrente del caret.

Per questo ESC deve agire sullo **stato futuro della digitazione**.

---

## 62. Bug potenziale: toolbar che perde selection

Lezione:

> focus e selection sono parte dello stato applicativo.

Un innocuo click UI può distruggere il contesto necessario a un'altra operazione.

Da qui:

```text
rememberSelection()
+
preventDefault(mousedown)
+
restore range
```

---

# Parte XXV — Concetti da portarsi dietro

## 63. Primo principio: editor = albero + selection

Non basta pensare:

```text
testo + stile
```

Dobbiamo pensare:

```text
DOM tree
+
Selection / Range
+
editing engine
+
application semantics
```

---

## 64. Secondo principio: una trasformazione deve preservare invarianti

Ogni comando deve chiedersi:

```text
Il testo rimane lo stesso?
La struttura rimane valida?
Il caret rimane valido?
Il comando modifica soltanto l'editor corretto?
Il markup rimane nel nostro schema?
```

---

## 65. Terzo principio: custom semantics richiedono normalizzazione

La checklist non è conosciuta dal browser.

Il browser conosce:

```text
UL
LI
```

PlumePilot aggiunge:

```text
checklist
checked
```

Quando questi due modelli interagiscono, serve un layer di normalizzazione.

---

## 66. Quarto principio: il DOM live non è la persistenza

Gli editor vengono distrutti e ricreati.

Gli appunti sopravvivono perché esiste un modello separato:

```text
notes Map
```

Il DOM è quindi una rappresentazione modificabile, non il deposito definitivo dello stato.

---

## 67. Quinto principio: sanitizzare anche quando controlliamo la UI

Il contenuto HTML attraversa browser, file salvati e versioni differenti.

Persistire soltanto un sottoinsieme riconosciuto rende il sistema più prevedibile.

---

## 68. Sesto principio: legacy API richiede isolamento e test

Usare `execCommand()` può essere pragmatico in uno scope ristretto.

Ma dobbiamo sapere:

```text
API deprecated
+
comportamento browser-specific
+
necessità di regression test
```

Il debito tecnologico è molto meno pericoloso quando è **consapevole e confinato**.

---

# Parte XXVI — Esercizi

## 69. Esercizio 1 — Disegna il Range

Dato:

```html
<p>La <strong>risposta corretta</strong> è B.</p>
```

immagina di selezionare:

```text
corretta
```

Prova a descrivere:

```text
startContainer
startOffset
endContainer
endOffset
```

Poi chiediti cosa cambierebbe selezionando:

```text
risposta corretta è
```

attraversando il confine tra `<strong>` e testo normale.

---

## 70. Esercizio 2 — Simula `splitChecklist()`

Parti da:

```text
☑ A
☐ B ← caret
☐ C
☐ D
```

Disegna il DOM prima e dopo il passaggio a lista puntata.

Verifica che l'ordine:

```text
A B C D
```

rimanga invariato.

---

## 71. Esercizio 3 — Highlight parziale

Parti da:

```html
<span class="highlight" data-color="yellow">
  abc def ghi
</span>
```

Seleziona `def` e applica blu.

Scrivi il DOM desiderato senza nesting inutile.

---

## 72. Esercizio 4 — Invariante del sanitizer

Aggiungi mentalmente:

```html
<a href="https://example.com" onclick="alert(1)">test</a>
```

agli appunti.

Che cosa dovrebbe produrre `cleanHtml()` attuale?

È la politica che sceglieresti per un editor più generico?

Perché?

---

## 73. Esercizio 5 — Eliminare `execCommand()`

Scegli un solo comando:

```text
bold
```

Prova a progettare una versione basata esclusivamente su:

```text
Selection
Range
DOM
beforeinput
```

Poi considera questi casi:

```text
selection già parzialmente bold
selection attraversa due nodi
caret collapsed
undo
redo
paste
nested marks
```

L'esercizio serve soprattutto a capire perché un editor completo è complesso.

---

# Parte XXVII — Approfondimenti

## 74. Documentazione primaria consigliata

### `contenteditable`

HTML Standard:

https://html.spec.whatwg.org/multipage/interaction.html#contenteditable

MDN:

https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable

### Selection API

MDN:

https://developer.mozilla.org/en-US/docs/Web/API/Selection

W3C Selection API:

https://www.w3.org/TR/selection-api/

### Range

MDN:

https://developer.mozilla.org/en-US/docs/Web/API/Range

### `beforeinput`

MDN:

https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event

Input Events specification:

https://www.w3.org/TR/input-events-2/

### `execCommand()`

MDN:

https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand

Da leggere notando esplicitamente lo stato **Deprecated** dell'API.

---

# Conclusione

Il piccolo editor degli appunti di PlumePilot ci porta sorprendentemente vicino a problemi tipici dei grandi rich-text editor.

Siamo partiti da:

```text
"vorrei mettere il grassetto negli appunti"
```

ma abbiamo incontrato:

```text
contenteditable
Selection
Range
caret
focus
DOM tree rewriting
liste
normalizzazione
state machine
sanitizzazione
schema dati
persistenza
undo history
cross-browser behavior
```

La lezione più importante è probabilmente questa:

> **Modificare testo ricco significa mantenere coerenti contenuto, struttura e posizione editoriale nello stesso momento.**

PlumePilot risolve il problema con un editor deliberatamente piccolo e ibrido:

```text
browser editing engine
+
execCommand per operazioni semplici
+
Range/DOM per semantica custom
+
cleanHtml come boundary
+
Map come stato persistibile
```

Non è l'architettura che useremmo necessariamente per costruire Google Docs.

È però una soluzione proporzionata al problema reale e, proprio per questo, un eccellente caso di studio.

Nel prossimo capitolo torneremo alla UI dell'estensione nel suo complesso:

**11 — UI senza framework: popup, menu fluttuante e sincronizzazione.**

Qui vedremo come PlumePilot costruisce interfacce relativamente ricche con DOM, CSS e JavaScript vanilla, come condivide stato tra popup e floating menu e dove la futura revisione UI/UX ci darà l'occasione di separare meglio modello, rendering e layout.

---

[← 09 — Generare PDF, HTML ed EPUB](09-generazione-documenti.md) · [Indice](index.md) · [11 — UI senza framework →](11-ui-senza-framework.md)
