# Inside PlumePilot

## Anatomia di una browser extension reale

**JavaScript, WebExtensions, DOM, API, asincronia e software engineering attraverso un progetto reale.**

> Questo libro usa PlumePilot come caso di studio. L'obiettivo non è soltanto capire *cosa fa il codice*, ma imparare a riconoscere problemi, concetti e decisioni architetturali riutilizzabili in altri progetti.

Il manoscritto è completo: **Introduzione + Capitoli 1–17, glossario e fonti**. Per la lettura senza connessione è disponibile anche un **singolo file HTML self-contained**, con indice laterale, ricerca, tema chiaro/scuro, navigazione fra capitoli e ripristino locale della posizione di lettura.

[Inizia dall'introduzione →](00-introduzione.md) · [Edizione HTML offline](Inside-PlumePilot.html) · [Glossario](glossario.md) · [Fonti](FONTI.md) · [Edizione completa in un solo Markdown](https://github.com/PlumePilot/plumepilot/blob/main/INSIDE_PLUMEPILOT.md) · [Repository PlumePilot](https://github.com/PlumePilot/plumepilot)

---

## Versioni di riferimento

Il libro segue volutamente l'evoluzione reale del progetto invece di riscrivere retroattivamente la storia come se l'architettura finale fosse sempre esistita.

- **Capitoli 00–10:** PlumePilot 2.35.1, commit `a8007425f81792e7570516dbdf1e7fb2cbda4d53`.
- **Capitoli 11–12:** candidato UI/UX 2.35.2, commit `4d32a8c2a6cd291e4fe389bdf10fdbaf1856a8c2`.
- **Capitoli 13–17:** candidato release 2.35.2, commit `f6fcb4c29c83ba9150df0be31da04fc91dffb634`.

Quando un capitolo cita una scelta poi modificata, la mantiene come parte del caso di studio: capire **perché una soluzione sembrava corretta, dove ha fallito e quale informazione mancava** è parte del percorso.

---

## Indice

| # | Capitolo |
|---|---|
| 00 | [Introduzione — Dal problema al prodotto](00-introduzione.md) |
| 01 | [Anatomia di PlumePilot — Cosa succede quando l'estensione prende vita](01-anatomia-estensione.md) |
| 02 | [Contesti e messaging — Far parlare mondi separati](02-contesti-messaging.md) |
| 03 | [DOM e pagine dinamiche — Lavorare in una UI che non controlliamo](03-dom-pagine-dinamiche.md) |
| 04 | [API e reverse engineering — Capire la piattaforma osservandone il traffico](04-api-reverse-engineering.md) |
| 05 | [Asincronia JavaScript — Eventi, Promise, timeout e race condition](05-asincronia-javascript.md) |
| 06 | [Stato, cache e storage — Dove vive la verità](06-stato-cache-storage.md) |
| 07 | [Autoplay come state machine](07-autoplay-state-machine.md) |
| 08 | [Trovare la prima attività incompleta — Euristiche, master call e fallback](08-prima-attivita-incompleta.md) |
| 09 | [Generare PDF, HTML ed EPUB nel browser](09-generazione-documenti.md) |
| 10 | [Un piccolo rich-text editor — Selection, Range, liste e callout](10-rich-text-editor.md) |
| 11 | [UI senza framework — Popup, menu fluttuante e sincronizzazione](11-ui-senza-framework.md) |
| 12 | [Performance e memoria — Quando il browser diventa il nostro runtime](12-performance-memoria.md) |
| 13 | [Chrome, Edge e Firefox — Una base comune, runtime diversi](13-cross-browser.md) |
| 14 | [Debug, test e regressioni — Trasformare un bug in conoscenza permanente](14-debug-test-regressioni.md) |
| 15 | [Git, branch, PR, build e release engineering — Il software oltre il codice](15-git-pr-release.md) |
| 16 | [Lezioni architetturali — I pattern emersi dal progetto reale](16-lezioni-architetturali.md) |
| 17 | [Cosa rifaremmo diversamente oggi? — Una retrospettiva senza senno di poi](17-cosa-rifaremmo-oggi.md) |

Sono inclusi anche il [Glossario](glossario.md) e le [Fonti e riferimenti](FONTI.md).

---

## Percorsi di studio

Non è obbligatorio leggere tutto in ordine.

**Fondamenti di browser extension**  
`01 → 02 → 03 → 06 → 13`

**Architettura e asincronia**  
`02 → 05 → 06 → 07 → 08 → 12 → 16 → 17`

**Document generation**  
`05 → 09 → 12`

**Software engineering**  
`14 → 15 → 16 → 17`

---

## Come leggere gli esempi

I capitoli riportano estratti e riferimenti al codice reale di PlumePilot. Le versioni di riferimento sopra servono a rendere stabile il contesto storico: il progetto continuerà a evolversi, mentre il libro conserva le decisioni studiate nel momento in cui sono state prese.

I diagrammi Mermaid sono leggibili direttamente su GitHub; il testo resta comunque autosufficiente anche quando un renderer non li visualizza graficamente.

---

## Correzioni e contributi

Se trovi un errore tecnico, un link rotto o un passaggio poco chiaro, puoi aprire una [GitHub Issue](https://github.com/PlumePilot/plumepilot/issues) o proporre una pull request sul repository.

**Inizia da:** [00 — Introduzione: dal problema al prodotto](00-introduzione.md)


## Edizione offline

L'[edizione HTML offline](Inside-PlumePilot.html) contiene l'intero libro in un singolo file e non carica risorse remote. Tema e ultima posizione di lettura vengono salvati soltanto nel browser locale. I diagrammi Mermaid rimangono disponibili come sorgente leggibile nell'HTML offline; GitHub li renderizza graficamente nelle pagine Markdown del repository.


### Rigenerare l'HTML

L'edizione offline è generata dai capitoli Markdown. Con Node.js e [Pandoc](https://pandoc.org/) installato:

```bash
node scripts/build-inside-plumepilot.mjs
```

Il comando ricostruisce `docs/inside-plumepilot/Inside-PlumePilot.html`; i file Markdown restano la sorgente canonica.
