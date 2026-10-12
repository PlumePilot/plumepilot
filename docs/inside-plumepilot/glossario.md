# Glossario — Inside PlumePilot

Questo glossario crescerà insieme ai capitoli. Le definizioni sono volutamente orientate al modo in cui i concetti compaiono nel progetto.

## Adapter
Componente che traduce tra due interfacce o ambienti differenti. `bridge.js` svolge in parte questo ruolo tra il runtime WebExtension e il `MAIN` world della pagina.

## Background script / service worker
Codice dell'estensione che gestisce eventi e responsabilità non legate alla vita di una singola pagina o UI. In Manifest V3 Chromium usa un extension service worker; Firefox adotta un modello WebExtensions compatibile ma con differenze di configurazione.

## Boundary
Confine tra componenti che non condividono direttamente runtime, privilegi o stato. Attraversare un boundary richiede spesso un contratto: messaggio, API, evento o serializzazione.

## Content script
Script di un'estensione eseguito in associazione a una pagina web. Può lavorare sul DOM e, a seconda dell'execution world, dispone di isolamento e capacità differenti.

## Execution context / execution world
Ambiente JavaScript in cui gira il codice. Determina scope globale, API disponibili, isolamento e relazione con la pagina host.

## Graceful degradation
Strategia con cui il software continua a offrire una funzione utile quando la capability o il percorso preferito non è disponibile, usando un fallback meno efficiente o meno ricco invece di fallire completamente.

## Idempotenza
Proprietà di un'operazione che può essere ripetuta senza produrre effetti aggiuntivi indesiderati oltre al risultato previsto.

## ISOLATED world
Execution world tipico dei content script: condivide il DOM con la pagina ma mantiene separato lo scope JavaScript e permette l'accesso alle API previste per il content script.

## Lease
Concessione temporanea di ownership su una risorsa, identificata da owner e scadenza. A differenza di un lock indefinito, può recuperare dalla scomparsa dell’owner; PlumePilot la usa, per esempio, per evitare controlli commissione concorrenti.

## MAIN world
Execution world condiviso con il JavaScript della pagina host. Utile quando bisogna osservare o interagire con il runtime della pagina, ma privo dell'isolamento del content script.

## Message passing
Comunicazione tra componenti tramite messaggi invece di chiamate di funzione nello stesso scope. PlumePilot usa sia il messaging WebExtension sia `window.postMessage`.

## Race condition
Condizione in cui il risultato dipende dall'ordine temporale di operazioni concorrenti. Il bug può apparire o scomparire in base al timing.

## Source of truth
Sistema o rappresentazione che possiede l’autorità finale su un dato. Cache, snapshot, indici e UI possono copiarlo o derivarlo senza diventare automaticamente autorevoli.

## State machine
Modello in cui un sistema può trovarsi in un insieme definito di stati e passare da uno all'altro attraverso eventi o transizioni. L'autoplay sarà studiato anche con questo modello mentale.

## Command
Messaggio che esprime l'intenzione di far eseguire un'azione a un altro componente. `PEGASO_START_EXPORT` è un esempio.

## Correlation ID
Identificatore usato per collegare richieste, aggiornamenti ed eventi appartenenti allo stesso workflow. In PlumePilot `operationId` svolge questo ruolo durante gli export.

## Deduplicazione
Strategia con cui un componente riconosce una richiesta o un evento già processato e ne evita la ripetizione degli effetti.

## Dispatcher
Componente che riceve messaggi e li instrada verso handler diversi in base a un discriminante, per esempio `message.type`.

## Event
Fatto o segnale già avvenuto che il sistema può elaborare e che può provocare una transizione, per esempio il completamento di una raccolta o l’aggiornamento del progresso.

## Eventual consistency
Modello in cui componenti diversi possono possedere temporaneamente snapshot differenti dello stato, convergendo attraverso aggiornamenti successivi.

## Fire-and-forget
Invio di un messaggio senza attendere una risposta applicativa prima di proseguire.

## Handshake
Scambio iniziale con cui due componenti verificano o sincronizzano il proprio stato. In PlumePilot `content.js` richiede esplicitamente lo stato autoplay dopo aver registrato il listener, evitando di dipendere da un evento di startup eventualmente già perso.

## Protocollo
Insieme di messaggi, payload, regole e aspettative che permette a componenti separati di comunicare in modo comprensibile e coerente.

## Query
Messaggio il cui scopo principale è ottenere informazioni, anziché chiedere un cambiamento di stato.

## Request/response
Pattern in cui un mittente invia una richiesta e attende una risposta correlata prima di considerare conclusa quella interazione.

## Snapshot
Rappresentazione dello stato conosciuto in un determinato momento. Può essere usata per inizializzare un nuovo subscriber prima di ricevere aggiornamenti incrementali.

## DOM adapter
Layer che traduce il markup e i comportamenti di una pagina host in operazioni e concetti più stabili per il dominio dell'estensione, per esempio `getChapters()` o `openChapter(identity)`.

## DOM snapshot
Fotografia dello stato del DOM in un preciso momento. Le collezioni restituite da `querySelectorAll()` sono statiche: future mutazioni della pagina non ne aggiornano automaticamente la membership.

## Event delegation
Tecnica che gestisce gli eventi su un antenato stabile e usa il target dell'evento per capire quale elemento dinamico è stato coinvolto. È utile quando i figli vengono creati e distrutti frequentemente.

## Hierarchy of evidence
Ordine di affidabilità tra più fonti che descrivono lo stesso stato. PlumePilot può usare, per esempio, un valore API esatto con priorità rispetto a una baseline DOM o a un'euristica.

## Logical identity
Identità di un'entità del dominio indipendente dal particolare oggetto DOM che la rappresenta in un dato momento.

## MutationObserver
API Web che notifica mutazioni dell'albero DOM. In PlumePilot viene usata come segnale che elementi rilevanti, come il player video, potrebbero essere comparsi o cambiati.

## Polling
Verifica ripetuta di una condizione a intervalli finché la condizione viene soddisfatta o scade una deadline. `waitFor()` usa questo modello.

## Precondition recovery
Strategia con cui il software prova a ripristinare una condizione necessaria prima di continuare, per esempio riaprire un capitolo chiuso prima di cercarne le attività.

## Readiness condition
Condizione osservabile che indica che un componente o uno stato è effettivamente pronto, preferibile quando possibile a un'attesa temporale arbitraria.

## Resolve late
Strategia che conserva un'identità stabile e risolve il riferimento concreto il più vicino possibile al momento dell'uso, riducendo il rischio di usare riferimenti diventati obsoleti.

## Selector contract
Dipendenza implicita dalla struttura, dagli attributi o dalle classi CSS della pagina host usati per individuare elementi significativi.

## Stale DOM reference
Riferimento a un nodo ottenuto in passato che è stato rimosso, sostituito o non rappresenta più lo stato corrente dell'interfaccia.

## API adapter
Componente che traduce un'API esterna in un'interfaccia interna più stabile, nascondendo dettagli come URL, autenticazione, parsing e formato grezzo delle risposte.

## Anti-corruption layer
Layer che protegge il modello interno dell'applicazione dalle strutture e convenzioni di un sistema esterno, traducendole in concetti propri del dominio locale.

## Asymmetric error cost
Situazione in cui tipi diversi di errore hanno conseguenze differenti. Un algoritmo può quindi preferire l'incertezza a un falso positivo particolarmente costoso.

## Bearer token
Credenziale trasportata tipicamente nell'header HTTP `Authorization: Bearer ...`. Il server decide quali privilegi associare a quella credenziale.

## Boundary normalization
Validazione e trasformazione dei dati nel punto in cui attraversano il confine tra un sistema esterno e il modello interno dell'applicazione.

## Bounded cache
Cache con un limite esplicito al numero o alla dimensione degli elementi conservati, così da impedire crescita indefinita della memoria.

## Cache hit
Lookup in cui una chiave è presente e la relativa entry è utilizzabile per la richiesta corrente. Nel libro distinguiamo il semplice hit fisico da un **semantic hit**, in cui freshness, completezza e identità rendono davvero riutilizzabile il dato.

## Cache miss
Lookup in cui la cache non contiene una entry utilizzabile. Un miss può avvenire anche quando la chiave esiste ma l'entry è stale, incompleta o semanticamente incompatibile.

## Composite key
Chiave costruita combinando più componenti dell'identità. `courseCode:lessonNumber` impedisce che la lezione `3` di corsi diversi collida nella stessa entry.

## Eviction
Rimozione intenzionale di entry da una cache, spesso per rispettare un limite di capacità. È distinta dall'invalidazione: una entry può essere ancora valida ma venire rimossa perché la cache è piena.

## LRU cache
Cache con politica **Least Recently Used**: quando viene superata la capacità, viene rimossa l'entry utilizzata meno recentemente. Risolve un problema di capacità, non di freschezza.

## Read model
Rappresentazione dei dati costruita per rispondere bene alle letture richieste dall'applicazione. `lessonApiCache` conserva un modello normalizzato utile a PlumePilot invece del JSON API grezzo.

## Semantic freshness
Validità di un dato determinata anche dal suo significato, non soltanto dall'età. Un test pending stale può richiedere refresh mentre un completamento monotono già confermato può restare riutilizzabile.

## Credential minimization
Principio secondo cui una credenziale dovrebbe essere accessibile al minor numero possibile di componenti e per il minor tempo ragionevolmente necessario.

## Defensive integration
Approccio a un sistema esterno che assume possibili cambi di schema, dati incompleti ed errori, usando validazione, fallback e una classificazione esplicita dei fallimenti.

## Monotonic state
Stato che secondo le regole del dominio può avanzare ma non dovrebbe regredire. In PlumePilot il progresso già completato viene spesso trattato come monotono.

## Passive caching
Riutilizzo di dati osservati durante richieste che l'applicazione host avrebbe comunque effettuato, evitando quando possibile richieste duplicate.

## Pacing
Distribuzione temporale intenzionale di una sequenza di richieste per evitare burst eccessivi pur non trattandosi di retry.

## Reconciliation
Processo di allineamento tra due rappresentazioni diverse dello stesso dominio, per esempio una struttura visuale del corso e l'indice restituito da una API.

## Semantic retry
Retry effettuato perché una risposta tecnicamente riuscita non contiene ancora dati sufficienti per continuare l'operazione.

## TTL
Time to live: intervallo oltre il quale un dato in cache viene considerato troppo vecchio per determinati usi.

## Event loop
Meccanismo del runtime che coordina task, microtask, eventi e completamenti asincroni, decidendo quando il JavaScript può riprendere l’esecuzione.

## Run-to-completion
Proprietà per cui un job JavaScript sincrono termina prima che un altro job venga eseguito nello stesso agent. Non rende però atomico un workflow separato da `await`.

## Call stack
Stack dei contesti di esecuzione JavaScript attualmente attivi. Quando torna vuoto, il runtime può proseguire con microtask e lavoro successivo dell’event loop.

## Task
Unità di lavoro programmata dall’event loop, per esempio un evento utente o il callback di un timer.

## Microtask
Unità di lavoro eseguita dopo il task corrente e prima del task successivo; le continuazioni delle Promise e `MutationObserver` dipendono da questo meccanismo.

## Promise
Oggetto che rappresenta un risultato futuro e può passare da pending a fulfilled oppure rejected.

## Concurrency
Situazione in cui più operazioni sono in-flight nello stesso intervallo temporale, anche se il loro codice JavaScript non viene eseguito simultaneamente.

## Parallelism
Esecuzione realmente simultanea di più operazioni da parte di unità di esecuzione differenti.

## Critical section
Regione logica che accede a stato condiviso e deve essere protetta da interleaving incompatibili.

## Operation serialization
Strategia che forza operazioni concorrenti a essere eseguite in sequenza. In PlumePilot alcune critical section sono protette tramite code di Promise per evitare read-modify-write concorrenti.

## Reentrancy
Possibilità che un workflow venga richiamato nuovamente prima che una sua esecuzione precedente sia terminata. Flag come `busy` possono agire da reentrancy guard locale.

## Cooperative cancellation
Cancellazione in cui il workflow controlla periodicamente un flag o un segnale e termina volontariamente in punti sicuri.

## AbortController
API Web che produce un `AbortSignal` per comunicare la cancellazione a operazioni compatibili, come `fetch()` e il builder EPUB.

## Timeout
Deadline applicativa oltre la quale un’attesa non viene più considerata accettabile. Non è sinonimo di delay, retry o cancellazione.

## Backpressure
Meccanismo con cui il produttore di lavoro viene rallentato o limitato quando uno stage o una risorsa esterna non riesce a consumarlo abbastanza rapidamente. Pacing, pipeline sequenziali e bounded concurrency sono forme possibili.

## Safety
Proprietà secondo cui stati o transizioni proibite non devono verificarsi, per esempio due operazioni globali incompatibili attive contemporaneamente.

## Liveness
Proprietà secondo cui il sistema deve continuare a poter fare progresso e non restare bloccato indefinitamente, per esempio liberando operazioni il cui owner non esiste più.

## Ephemeral state
Stato legato alla vita di una specifica istanza JavaScript e che può essere ricostruito senza perdita semantica quando quella istanza termina.

## Durable state
Stato conservato in un supporto con lifetime più lungo del processo o contesto che lo usa, così da poter essere recuperato dopo reload o ricreazioni del runtime.

## Lifetime matching
Principio secondo cui la durata del meccanismo di storage dovrebbe corrispondere alla durata realmente richiesta dal dato, evitando sia perdita prematura sia persistenza eccessiva.

## Stored intent
Configurazione persistita che rappresenta la scelta dell'utente, anche quando il runtime deve temporaneamente derivarne uno stato effettivo diverso per rispettare altri vincoli.

## Effective state
Stato realmente applicato dal runtime dopo aver combinato preferenze, vincoli e contesto corrente.

## Orphan state
Stato persistente che fa riferimento a un owner o workflow non più esistente e deve quindi essere riconciliato o rimosso.

## Negative caching
Memorizzazione temporanea anche di un risultato negativo o fallito, per evitare tentativi ridondanti o conservare informazione diagnostica.

## Cache fingerprint
Firma derivata da input significativi e usata per stabilire se una cache strutturale è ancora compatibile con lo stato corrente.

## Event-driven invalidation
Strategia di invalidazione in cui una cache viene rimossa in risposta a un evento concreto che dimostra che il dato non è più valido, invece che per sola scadenza temporale.

## Data provenance
Informazione sulla provenienza di un valore e sul grado di autorità o completezza della fonte che lo ha prodotto.

## Rebase (stato/cache)
Riallineamento di uno stato derivato a una nuova baseline autorevole, azzerando o ricalcolando i delta locali per evitare doppio conteggio.

## Durable handoff
Passaggio di un payload tra producer e consumer con lifecycle indipendenti tramite uno storage sufficientemente durevole da sopravvivere alla creazione del consumer.

## Lazy migration
Migrazione di dati persistenti eseguita progressivamente quando un valore viene letto o riscritto, invece che tramite una conversione globale preventiva.

## Schema migration
Processo con cui dati persistiti in una versione precedente vengono letti, normalizzati o trasformati nel formato previsto dalla versione corrente del software.

## Finite State Machine (FSM)
Modello di comportamento composto da un insieme finito di stati e da transizioni fra essi, normalmente attivate da eventi.

## State
Modalità corrente di un sistema che determina quali eventi e comportamenti sono validi in quel momento.

## Transition
Passaggio da uno stato a un altro in risposta a un evento e, quando presenti, alle relative guardie.

## Guard
Condizione che deve risultare vera perché una transizione sia abilitata.

## Action / Effect
Side effect eseguito in relazione a una transizione, per esempio un click, una richiesta HTTP, una scrittura su storage o una notifica.

## Extended state / Context
Dati associati a una state machine che influenzano il comportamento senza dover diventare ciascuno uno stato finito separato.

## Delayed transition
Transizione che può avvenire dopo un intervallo temporale, a condizione che al momento dell'esecuzione le guardie e il contesto siano ancora validi.

## State history
Informazione conservata sullo stato o contesto precedente per poter riprendere correttamente un workflow interrotto.

## State explosion
Crescita combinatoria del numero di stati quando molte proprietà indipendenti vengono appiattite in un'unica macchina a stati finiti.

## Hierarchical state
Stato che contiene sottostati e consente di rappresentare workflow complessi senza appiattire ogni dettaglio allo stesso livello.

## Orthogonal state
Aspetti indipendenti dello stato che possono essere attivi contemporaneamente e che, in uno statechart, possono essere modellati come regioni parallele.

## Fail closed
Strategia conservativa in cui un sistema, davanti a un'incertezza rilevante, blocca o limita la transizione invece di procedere assumendo una condizione favorevole.

## Invariant
Proprietà che deve rimanere vera attraverso tutti gli stati e le transizioni rilevanti del sistema.

## Transition coverage
Copertura delle transizioni significative di una state machine — incluse guardie e percorsi negativi — distinta dalla semplice esecuzione delle righe che implementano quegli stati.

## Search space
Insieme dei candidati che un algoritmo deve potenzialmente esaminare per trovare una soluzione. Ridurre lo spazio di ricerca può diminuire drasticamente il numero di operazioni costose anche quando la complessità asintotica rimane lineare.

## Heuristic
Regola o segnale usato per guidare una ricerca verso candidati promettenti senza garantire, da solo, la correttezza definitiva del risultato.

## Index
Struttura o rappresentazione compatta usata per localizzare più rapidamente dati o candidati senza dover leggere ogni record completo. Un indice non coincide necessariamente con la source of truth.

## Candidate ordering
Strategia con cui un algoritmo decide in quale ordine verificare i possibili risultati. Può migliorare il costo medio senza modificare l'insieme dei candidati che rimangono verificabili.

## Stable partition
Partizionamento di una sequenza in gruppi che preserva l'ordine relativo originale degli elementi dentro ciascun gruppo. Nel bookmark di PlumePilot i capitoli sospetti `<100%` vengono anticipati senza riordinarli per percentuale.

## Short-circuit
Interruzione anticipata di una ricerca o valutazione appena il risultato necessario è stato determinato, evitando lavoro successivo inutile.

## Progressive refinement
Strategia che parte da informazioni economiche e grossolane, restringe progressivamente i candidati e usa fonti o verifiche più costose solo quando servono.

## Targeted fallback
Fallback applicato direttamente al candidato incerto che ha richiesto verifica, preservando il lavoro già svolto invece di ricominciare l'intero workflow.

## False positive
Caso in cui un algoritmo classifica un elemento come appartenente alla categoria cercata quando in realtà non vi appartiene.

## False negative
Caso in cui un algoritmo esclude un elemento che in realtà appartiene alla categoria cercata. Nella ricerca della prima attività incompleta può portare a saltare un'attività realmente pendente.

## Ternary knowledge
Modello in cui una proprietà può assumere tre stati epistemici, per esempio `complete`, `incomplete` e `unknown`, evitando di convertire l'assenza di informazione in un falso valore certo.

## Evidence precedence
Regola che stabilisce quale fonte debba prevalere quando più evidenze sullo stesso dato hanno affidabilità, completezza o freshness differenti.

## Generation token
Contatore o versione associata a un’operazione asincrona. Una continuation vecchia si auto-annulla quando il token corrente non coincide più con quello con cui era partita.

## Precision / Recall
Coppia di concetti dell'information retrieval usabile come modello mentale: la precision indica quanto spesso i candidati selezionati sono rilevanti; la recall quanto bene la ricerca riesce a non perdere risultati realmente rilevanti.

## ArrayBuffer
Blocco di memoria binaria grezza usato dalle API Web come contenitore di byte. Non attribuisce da solo un significato ai dati; view tipizzate come `Uint8Array` permettono di interpretarli.

## Uint8Array
Typed array JavaScript in cui ogni elemento rappresenta un intero unsigned da 8 bit. È una rappresentazione naturale per file binari, immagini compresse, PDF ed archivi.

## Blob (Web API)
Oggetto Web API che rappresenta dati binari immutabili file-like. Può essere associato a un MIME type e trasformato in una Object URL per download o visualizzazione locale.

## Object URL
URL opaca creata con `URL.createObjectURL()` che mantiene accessibile un `Blob` o altro oggetto compatibile. Deve essere revocata quando non serve più per evitare di trattenere inutilmente la risorsa sottostante.

## MIME type
Identificatore del tipo di contenuto, ad esempio `application/pdf`, `text/html` o `application/epub+zip`, usato per comunicare come una risorsa debba essere interpretata.

## Data serialization
Trasformazione di una struttura in una rappresentazione trasferibile o persistibile, per esempio un oggetto JavaScript in JSON o un modello PDF/EPUB in una sequenza finale di byte.

## Rasterization
Trasformazione di una rappresentazione vettoriale o descrittiva in una griglia di pixel. In PlumePilot PDF.js rasterizza pagine o regioni PDF su canvas quando la preservazione visuale è più sicura del reflow.

## Reflow
Capacità del contenuto di riadattarsi dinamicamente a dimensioni dello schermo, font e preferenze del reader. È tipica dell'EPUB reflowable e contrasta con il layout a coordinate fisse di un PDF.

## Fixed layout
Rappresentazione in cui geometria e posizione degli elementi sono sostanzialmente prestabilite, come avviene normalmente nelle pagine PDF.

## Lossless / lossy transformation
Una trasformazione lossless conserva l'informazione rilevante senza perdita; una trasformazione lossy accetta una possibile perdita o reinterpretazione. Il merge PDF è vicino al primo caso, mentre PDF→EPUB richiede inevitabilmente scelte interpretative.

## Intermediate Representation (IR)
Rappresentazione intermedia tra input e output finali di una pipeline. Rendere esplicita una IR può separare parsing, trasformazione e serializzazione e migliorare testabilità e manutenzione.

## Content-addressable storage
Strategia in cui l'identità di un asset deriva dal suo contenuto, spesso tramite hash crittografico. Nell'EPUB di PlumePilot immagini identiche possono essere riconosciute tramite SHA-256 e riutilizzate.

## Working set
Insieme delle risorse che devono rimanere vive contemporaneamente durante un'elaborazione. Il suo volume influenza la pressione sulla memoria più direttamente della sola dimensione dell'output finale.

## Peak memory
Massimo consumo di memoria raggiunto durante l'esecuzione di una pipeline. Può essere molto superiore alla dimensione finale del file prodotto.

## Ownership
Modello mentale che identifica quale componente è responsabile di mantenere una risorsa e quando può rilasciarla. È utile anche in JavaScript per buffer, canvas, URL temporanee, listener e asset binari.

## Cooperative scheduling
Tecnica in cui un task lungo cede periodicamente il controllo all'event loop per permettere al browser di aggiornare UI, processare eventi o reagire alla cancellazione.

## Partial success
Esito in cui un batch produce comunque un artefatto utile pur registrando fallimenti su una parte degli elementi, invece di applicare sempre una semantica all-or-nothing.

## Golden file
Artefatto di riferimento usato nei test per confrontare l'output di una pipeline di generazione documenti. Spesso conviene verificarne struttura e semantica invece dei byte esatti.

## Editing host
Elemento modificabile, tipicamente tramite `contenteditable`, che il browser tratta come radice di una regione di editing. Gestisce input e caret ma non fornisce da solo un document model di alto livello.

## Selection
Rappresentazione della selezione corrente dell'utente nel documento. Può contenere un intervallo di contenuto oppure essere collassata in un singolo punto, che corrisponde al caret.

## Range
Intervallo strutturale del DOM definito da un punto iniziale e uno finale, ciascuno composto da container e offset. Può essere clonato, estratto, collassato o usato per inserire nuovi nodi.

## Caret
Indicatore della posizione di inserimento del testo. Nelle Selection API può essere modellato come una selezione collassata il cui inizio e fine coincidono.

## Collapsed selection
Selection o Range senza estensione testuale, in cui punto iniziale e finale coincidono. Non significa assenza di informazione: identifica una precisa posizione di inserimento.

## DocumentFragment
Contenitore DOM leggero che può contenere nodi senza essere direttamente parte del documento visualizzato. `Range.extractContents()` restituisce un `DocumentFragment` con il contenuto estratto.

## Tree rewriting
Trasformazione strutturale di un albero, per esempio dividere un wrapper evidenziato in tre segmenti o spostare un item fuori da una checklist mantenendo l'ordine dei nodi.

## DOM normalization
Passo successivo a un'operazione di editing che riporta il DOM in una forma coerente con le invarianti dell'applicazione, correggendo strutture valide per il browser ma semanticamente indesiderate.

## Structural guard
Condizione che blocca una trasformazione quando la struttura coinvolta non può essere modificata in modo sicuro, per esempio una selezione che attraversa blocchi incompatibili.

## Rich-text mark
Annotazione inline applicata a una porzione di testo, come grassetto, corsivo, evidenziazione, apice o una maschera di studio.

## Rich-text block
Elemento strutturale a livello di blocco, come paragrafo, elemento di lista o callout, la cui semantica riguarda una regione più ampia del testo inline.

## Sanitization allowlist
Strategia di sanitizzazione che ricostruisce il contenuto accettando soltanto tag, attributi e valori esplicitamente previsti dal formato, invece di tentare di enumerare tutto ciò che deve essere rifiutato.

## Undo history
Cronologia delle operazioni editoriali che consente di annullare e ripristinare modifiche. Le API native del browser e le manipolazioni DOM custom possono interagire con questa cronologia in modi differenti.

## Transaction model
Rappresentazione esplicita di una modifica come operazione atomica sul document model, con stato precedente, trasformazione e stato risultante. È tipica degli editor rich-text più strutturati.

## Document model
Rappresentazione logica indipendente dalla UI di un documento ricco, composta da blocchi, testo, mark e attributi. In un editor avanzato il DOM può diventare una proiezione di questo modello invece di coincidere con esso.

## Editing normalization loop
Pattern `inspect → mutate → inspect/normalize` usato quando il browser può produrre una struttura DOM valida ma non conforme alla semantica dell'applicazione dopo un comando di editing.

## Presentation layer
Layer che trasforma stato e regole applicative in una rappresentazione adatta alla UI senza diventare proprietario del dominio. In PlumePilot `menu-ux.js` condivide regole di presentazione lasciando storage e operation ownership ai controller delle singole superfici.

## Derived state
Informazione calcolata a partire da altro stato invece di essere persistita autonomamente. La summary autoplay è derivata da skip video, comportamento test, limite capitoli e soglia del 70%.

## View model
Struttura di dati già preparata per una vista. Riduce la quantità di regole che il renderer deve ricostruire e può diventare un boundary fra dominio e presentazione.

## Progressive disclosure
Strategia di interaction design che mantiene immediatamente visibili attività frequenti e sposta configurazioni o dettagli secondari dietro una navigazione o un'espansione esplicita.

## Roving tabindex
Pattern di focus management in cui un solo elemento di un gruppo possiede `tabIndex=0` mentre gli altri usano `-1`; la navigazione interna viene gestita con tasti direzionali. È comune nelle tablist accessibili.

## Focus restoration
Ripristino intenzionale del focus sull'elemento che ha aperto una vista, un dialog o un pannello dopo la chiusura. Mantiene prevedibile la navigazione da tastiera.

## UI invariant
Proprietà che l'interfaccia deve mantenere vera attraverso tutti i render e le preferenze. Esempio: un'operazione attiva deve lasciare raggiungibile il relativo controllo di cancellazione.

## Design token
Valore semantico condiviso per colore, dimensione, spaziatura, tipografia o altri aspetti visivi. Le custom properties `--ux-*` permettono alla stessa scala di ruolo di valere nel popup e nel menu fluttuante.

## DOM protocol
Convenzione stabile di attributi, ruoli o struttura DOM che collega markup e comportamento fra più renderer. Gli attributi `data-ux-*` e `data-menu-*` della 2.35.2 costituiscono un piccolo protocollo interno.

## Reactive synchronization
Pattern in cui la modifica di una sorgente condivisa produce notifiche che fanno aggiornare le viste interessate. In PlumePilot `chrome.storage.onChanged` sincronizza popup e floating menu senza messaging diretto fra le due UI.

## Constrained customization
Personalizzazione consentita entro invarianti stabilite dal prodotto. Nel layout dei pulsanti l'utente controlla ordine e visibilità dentro gruppi semantici, ma non elimina la gerarchia di task né il percorso di cancellazione di un'operazione attiva.

## Shadow DOM
Sottoalbero DOM incapsulato collegato a un host. Isola soprattutto struttura e styling dal documento circostante; non è un security sandbox. Il menu fluttuante di PlumePilot usa un `ShadowRoot` chiuso.

## Hot path
Percorso di esecuzione invocato molto frequentemente o responsabile di una parte significativa del costo totale. Una hot path va identificata con misurazioni, non soltanto per intuizione.

## Fast path
Percorso ottimizzato per il caso comune o facilmente riconoscibile, che evita elaborazioni più costose. Nel converter EPUB il reflow testuale è un fast path rispetto al rendering visuale.

## Slow path
Percorso più costoso attivato quando il fast path non può garantire correttezza o qualità sufficiente. Può includere fallback visuali, retry o verifiche più profonde.

## Coalescing
Tecnica che raggruppa più segnali ravvicinati in una sola elaborazione. È utile quando molte mutazioni DOM possono essere trattate con un singolo scan successivo.

## In-flight deduplication
Riutilizzo della stessa operazione asincrona già in corso per più consumer equivalenti. Salvare una Promise in cache permette a richieste simultanee della stessa risorsa di condividere una sola fetch.

## Bounded growth
Proprietà di una struttura dati il cui numero di entry o volume massimo è limitato esplicitamente o dal lifecycle del context. Evita crescita indefinita anche quando ogni singola entry è piccola.

## Admission control
Decisione presa prima di avviare o allocare un'operazione costosa per rispettare un budget. `visualRenderScale()` limita dimensione e pixel del canvas prima della rasterizzazione.

## Data locality
Principio per cui dati e cache vengono mantenuti vicino al componente che li usa e ne controlla il lifecycle, riducendo trasferimenti e ownership ambigua fra context.

## Cancellation latency
Intervallo fra la richiesta di cancellazione e il momento in cui il lavoro effettivamente si interrompe. Dipende dalla frequenza dei cancellation point e dalla cancellabilità delle operazioni sottostanti.

## Cost-based optimization
Ottimizzazione che ordina o seleziona operazioni considerando il loro costo reale, non soltanto il numero di iterazioni. Dare priorità ai capitoli sospetti può ridurre detail call e transizioni DOM pur mantenendo complessità asintotica lineare.

## Resource invariant
Proprietà verificabile che deve restare vera rispetto al lifecycle delle risorse, per esempio che un canvas temporaneo venga ridotto dopo l'encoding o che una cache non superi un limite stabilito.

## Working-set control
Strategia che limita quante risorse pesanti restano vive contemporaneamente. La conversione EPUB sequenziale usa meno concorrenza per contenere il picco di memoria.

## Perceived latency
Percezione soggettiva della durata di un'operazione, influenzata non solo dal wall time ma anche da progress, responsiveness, feedback e possibilità di cancellazione.

## Runtime compatibility
Compatibilità del comportamento eseguibile con il motore e le API disponibili in un browser. È distinta dalla possibilità di impacchettare e pubblicare lo stesso codice in uno store.

## Distribution compatibility
Compatibilità dell'artefatto con manifest, metadata, localizzazioni, regole di packaging e requisiti dello store target.

## Manifest compatibility
Compatibilità delle dichiarazioni del `manifest.json` con il modello di estensione del browser target, per esempio `background.service_worker` in Chromium o `background.scripts` nel target Firefox di PlumePilot.

## Policy compatibility
Compatibilità con le policy di review e distribuzione di uno store. Un programma può essere runtime-compatible ma non policy-compatible.

## Build-time specialization
Generazione di artefatti differenti a partire dallo stesso source tree risolvendo durante la build differenze note di manifest, permission, locale o runtime adapter.

## Capability detection
Verifica della presenza di una specifica capacità, per esempio `chrome.offscreen?.createDocument`, invece di inferirla dal nome o user agent del browser.

## Compatibility adapter
Componente che traduce una capacità di dominio verso l'API o il meccanismo disponibile in uno specifico ambiente, mantenendo il caller indipendente dalla piattaforma.

## Semantic parity
Equivalenza del comportamento osservabile fra target diversi anche quando l'implementazione interna non è identica. Chrome può usare un offscreen document e Firefox un content tab mantenendo la stessa semantica della notifica sonora.

## Divergence budget
Costo di manutenzione associato alle differenze browser-specifiche. Ogni branch o artefatto specializzato aumenta la matrice di casi da comprendere, testare e rilasciare.

## Deterministic build
Build che, dati gli stessi input e un ambiente controllato, produce lo stesso output. Timestamp ZIP fissi e ordinamento stabile dei file riducono fonti di non determinismo.

## Reproducible build
Build che un soggetto indipendente può ricostruire a partire dal source dichiarato e confrontare con l'artefatto distribuito.

## Fail-closed transformation
Trasformazione di build che si interrompe quando le precondizioni attese non sono soddisfatte, invece di applicare una patch parziale o ambigua. `replaceExactly()` richiede che il frammento upstream compaia una sola volta.

## Source submission
Archivio di sorgenti leggibili, dipendenze e istruzioni di build fornito a un reviewer per ricostruire e verificare un artefatto runtime generato.

## Artifact test
Test eseguito sull'artefatto finale di distribuzione, per verificare manifest, file inclusi, checksum, permission e invarianti di packaging che i test del source tree non possono coprire.

## Supply-chain provenance
Informazioni che permettono di ricostruire origine, versione, checksum e trasformazioni di una dipendenza o di un artefatto di release.

## Checksum pinning
Associazione di un file atteso a un digest crittografico noto, usata per rilevare modifiche accidentali o non previste ai bytes di una dipendenza.

## Artifact identity
Identità dei byte esatti di un output distribuibile, tipicamente espressa tramite checksum. È distinta dall’identità del commit sorgente e dalla versione logica del prodotto; uno stesso commit può generare artifact browser-specifici differenti.

## Release matrix
Matrice che esplicita quali feature, manifest, adapter, package e verifiche devono essere validi per ogni target supportato.

## Polyfill
Implementazione sostitutiva di un'API mancante che prova a riprodurne la stessa interfaccia e semantica. È diverso da un fallback, che raggiunge l'obiettivo tramite una strategia alternativa.

## Fallback adapter
Percorso alternativo usato quando la capability preferita non è disponibile, mantenendo per quanto possibile la stessa semantica di dominio.

## Release compiler
Modello mentale in cui il sistema di build trasforma un source tree comune in rappresentazioni target-specifiche, analogamente a un compiler che effettua lowering e code generation per target differenti.

## Executable invariant
Regola di progetto codificata in un validator o test invece di rimanere conoscenza informale. Esempio: il pacchetto Firefox non deve contenere la permission `offscreen`.

## Regression test
Test introdotto per impedire il ritorno di un bug già osservato. Idealmente codifica la proprietà violata, non soltanto la sequenza accidentale che ha prodotto il sintomo.

## Root cause
Causa strutturale che rende possibile un comportamento errato. È distinta dal sintomo visibile e dai fattori che ne aumentano la probabilità.

## Minimal reproducer
Caso più piccolo che conserva la failure osservata. Riduce lo spazio di ricerca durante il debugging e rende più facile costruire un test deterministico.

## Test double
Sostituzione controllata di una dipendenza reale durante un test. Stub, fake, mock e spy sono forme diverse di test double.

## Failure injection
Introduzione intenzionale di errori, timeout, dati mancanti o cancellazioni per verificare i percorsi di recovery e fallback.

## Architecture test
Test che protegge invarianti strutturali del sistema, come ordine di caricamento, dipendenze fra moduli, presenza di risorse nel manifest o precedenza fra guardie.

## Flaky test
Test che, a parità apparente di codice e input, può passare o fallire in esecuzioni diverse. Spesso deriva da timer reali, scheduling, rete, animazioni o stato condiviso non controllato.

## Hermetic test
Test che controlla fortemente le proprie dipendenze esterne e riduce rete, clock, storage e altri input non deterministici.

## Golden test
Test che confronta un risultato con un output di riferimento noto. È utile per documenti generati e fixture, purché il golden rappresenti proprietà significative e non rumore accidentale.

## Behavioral coverage
Insieme delle proprietà osservabili realmente protette dalla suite. Una percentuale elevata di line coverage non implica necessariamente buona behavioral coverage.

## Test seam
Boundary in cui una dipendenza può essere sostituita in modo controllato durante il test, per esempio clock, fetch, storage o DOM adapter.

## Failure oracle
Regola che decide se un esperimento o un test deve essere considerato riuscito o fallito. Un buon oracle verifica la proprietà rilevante, non un dettaglio incidentale.

## Observer effect
Alterazione del comportamento del sistema causata dallo strumento usato per osservarlo. Un esempio nelle extension è DevTools che può mantenere attivo un service worker e nascondere bug di lifecycle.

## Executable specification
Requisito espresso come test o validator eseguibile. Quando la proprietà viene violata, la specifica fallisce automaticamente.

## Test brittleness
Fragilità di un test che fallisce per cambiamenti non semantici o dettagli d'implementazione non pertinenti alla proprietà che dovrebbe proteggere.

## Contract drift
Cambiamento di un boundary esterno — API, DOM, manifest o policy — che rende obsolete le assunzioni del consumer. I contract test cercano di rilevarlo vicino alla sorgente.

## Safety property
Proprietà che afferma che un evento sbagliato non deve accadere, per esempio non ricaricare una pagina nascosta o non avanzare una lezione diversa da quella selezionata.

## Liveness property
Proprietà che afferma che il sistema deve prima o poi riuscire a progredire, per esempio riprendere una wait quando il tab torna visibile.

## Functional core, imperative shell
Pattern che separa decisioni quanto più pure possibile dagli effetti browser/DOM/storage. Il core è più semplice da testare; la shell concentra gli effetti imperativi.

## Git blob
Oggetto Git che conserva il contenuto binario di un file senza il suo pathname. Il collegamento tra nome del file e blob è rappresentato dal tree.

## Git tree
Oggetto Git che descrive uno snapshot strutturale di directory, nomi e riferimenti a blob o altri tree. Due commit possono puntare allo stesso tree pur appartenendo a storie differenti.

## Git commit
Oggetto immutabile che collega un tree a uno o più parent e contiene metadata come autore, committer e messaggio. Cambiare parent produce un commit differente anche a parità di tree.

## Git ref
Puntatore nominato e mobile a un oggetto Git. Un branch è normalmente un ref che avanza verso nuovi commit.

## HEAD
Riferimento che rappresenta la posizione corrente del checkout Git. Normalmente punta a un branch; in detached HEAD punta direttamente a un commit.

## Merge commit
Commit con più parent che registra l'integrazione di linee di storia differenti senza comprimere i commit dei branch coinvolti.

## Squash merge
Strategia di integrazione che combina gli effetti di più commit di una pull request in un nuovo singolo commit sulla base. Semplifica la mainline ma modifica l'ancestry rispetto ai commit originali.

## Git rebase
Ricostruzione di una serie di commit sopra una nuova base. Poiché cambiano i parent, vengono creati nuovi commit con nuovi hash anche quando le patch sono semanticamente equivalenti.

## Cherry-pick
Operazione Git che applica la modifica introdotta da un commit in un altro punto della storia, creando un nuovo commit.

## Revert
Nuovo commit che annulla gli effetti di un cambiamento precedente senza rimuovere quel cambiamento dalla storia pubblica.

## Merge base
Ancestor comune usato da Git come riferimento per confrontare e integrare due linee di storia. Squash e rebase possono cambiarlo anche quando parte del contenuto è semanticamente già condivisa.

## Tree equality
Condizione in cui due commit puntano allo stesso Git tree e quindi rappresentano lo stesso snapshot completo dei file, pur potendo avere parent, messaggi e identità di commit differenti.

## Stacked PR
Pull request costruita sopra il branch di un'altra pull request non ancora integrata nel target finale. Riduce la dimensione delle diff ma richiede disciplina quando la PR di base viene squashed o rebased.

## Force-with-lease
Aggiornamento forzato di un branch remoto che viene accettato solo se il ref remoto corrisponde ancora allo stato atteso dal client. Riduce il rischio di sovrascrivere lavoro concorrente rispetto a un force push cieco.

## Release candidate
Stato del software considerato potenzialmente pubblicabile e sottoposto alle verifiche finali di test, packaging e compatibilità prima del rilascio.

## Release provenance
Catena verificabile che collega source commit, processo di build, artefatto prodotto, checksum e canale di distribuzione.

## Deployment history
Sequenza delle versioni effettivamente distribuite nei diversi canali o store. Può divergere dalla Git history e dalla sequenza delle GitHub Release.

## Roll-forward
Strategia di correzione in cui una release problematica viene riparata pubblicando una nuova versione superiore, spesso reintroducendo comportamento precedente, invece di tentare di far regredire il sistema di aggiornamento a una versione già superata.

## Evidence hierarchy
Ordine esplicito di autorità fra più fonti che descrivono lo stesso fatto. Permette di decidere quale segnale può confermare, smentire o soltanto suggerire uno stato.

## Temporal validity
Validità di uno state rispetto al tempo. Un dato corretto prima di un `await` può non esserlo più quando la continuation riprende.

## Revalidation
Rilettura o verifica dello state dopo un punto asincrono e prima di un side effect, per evitare di agire su informazioni diventate stale.

## Volatility boundary
Boundary progettato per confinare componenti che cambiano frequentemente, come DOM host o API esterne, proteggendo le parti semanticamente più stabili del sistema.

## Architecture fitness function
Test o validator che verifica automaticamente nel tempo una proprietà architetturale, per esempio che una cache resti bounded o che un artifact Firefox non contenga capability vietate.

## Human-in-the-loop automation
Automazione che assiste l'utente senza sottrargli il controllo: un'intenzione manuale esplicita più recente prevale sulle continuation automatiche già pianificate.

## Scaling debt
Scelta inizialmente adeguata che diventa costosa quando il sistema cresce e cambiano scala, numero di feature o frequenza delle modifiche. Non implica che la decisione originale fosse un errore.

## Strangler refactor
Strategia di modernizzazione incrementale in cui nuove parti sostituiscono gradualmente responsabilità del sistema esistente, evitando una riscrittura totale e un singolo cut-over ad alto rischio.

## Platform adapter
Boundary che traduce differenze di una piattaforma esterna — DOM, URL, API o capability — in un’interfaccia interna più stabile usata dal core.

## Repository pattern
Boundary che centralizza accesso, chiavi, normalizzazione e migrazione della persistenza, evitando che i caller conoscano direttamente i dettagli dello storage.

## In-flight coalescing
Riutilizzo della stessa Promise o richiesta già in corso per più caller che chiedono contemporaneamente la stessa risorsa, evitando lavoro duplicato e cache stampede.

## Structured diagnostics
Diagnostica rappresentata come eventi o record con campi espliciti — identity, fase, durata, motivo del fallback — invece di sole stringhe di log libere.

## Decision reversal cost
Costo tecnico e operativo necessario per invertire una scelta dopo che altre parti del sistema, dati o workflow vi hanno costruito sopra.

## Wrong abstraction
Astrazione introdotta prima di comprendere correttamente ciò che è davvero comune fra i casi; può aumentare coupling e complessità più della duplicazione che cercava di eliminare.

---

[← Indice](index.md)
