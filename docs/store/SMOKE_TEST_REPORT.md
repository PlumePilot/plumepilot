# PlumePilot — verbale smoke test finale

Compilare questo documento esclusivamente sulla build congelata destinata agli store. Non committare credenziali DEMO, dati personali o screenshot non oscurati.

## Identità della release

- Versione: `v2.32.9`
- Commit/tag: `chore/amo-submission-2.32.9` (commit definitivo e tag non ancora creati)
- Data test: `11/09/2026`
- Responsabile: `Fabio Floris`
- Chrome ZIP SHA-256: `5f04f8e8eb980d32d43732c91fe165a740116986235a73d61fe6cbb8652ff062`
- Edge ZIP SHA-256: `5f04f8e8eb980d32d43732c91fe165a740116986235a73d61fe6cbb8652ff062`
- Firefox ZIP SHA-256: `22b0cd7e281bec6395e742b6cef570e8d48a03da6b6d85c8a3f38f35eed2e97f`
- Source ZIP SHA-256: `c052c95e01d9192ffa5a8c69df2a09096457d2a91a8b038715d306950a797b84`
- File `SHA256SUMS.txt` verificato: `SÌ`

## Ambienti

| Browser | Versione | Sistema operativo | Installazione pulita | Esito |
|---|---|---|---|---|
| Chrome Stable | `152.0.7977.83` | `Microsoft Windows 11 Pro` | `SÌ` | `PASS` |
| Microsoft Edge Stable | `152.0.4191.66` | `Microsoft Windows 11 Pro` | `SÌ` | `PASS` |
| Firefox | `155.0.1, >=140` | `Microsoft Windows 11 Pro` | `SÌ` | `PASS` |

La matrice funzionale completa è stata eseguita sulla `v2.32.7`. Dopo la rifinitura circoscritta della `v2.32.8` sono stati ripetuti i controlli mirati su stati operativi, tipografia responsive, temi, modalità Standard/Gaming e pacchetti installabili. La `v2.32.9` modifica soltanto metadati Firefox, decodifica inerte delle entità HTML, build del sorgente e documentazione: test automatici, sintassi, build, validatore interno e lint AMO locale sono PASS; resta da eseguire una verifica manuale mirata del pacchetto Firefox definitivo.

## Controlli specifici v2.32.9

- Test automatici Node: `PASS` — 2/2.
- Build deterministica dei tre browser e del sorgente: `PASS`.
- Validatore release interno: `PASS`.
- `web-ext lint 10.6.0`: `PASS` — 0 errori, 0 notice, 14 warning documentati.
- Confronto vendor con pacchetti npm ufficiali tramite `npm pack` e `cmp`: `PASS` — 5/5 file.
- Installazione pulita e prova raccolta test su Firefox: `DA RIPETERE` sul pacchetto definitivo dopo il merge.

## Casi funzionali

Usare `PASS`, `FAIL`, `N/A` o `BLOCCATO`. Annotare ogni anomalia con browser, passaggi e messaggio esatto.

| Caso | Chrome | Edge | Firefox | Note |
|---|---|---|---|---|
| Apertura popup e persistenza preferenze | PASS | PASS | PASS |  |
| Attivazione/disattivazione globale | PASS | PASS | PASS |  |
| Prima attività incompleta | PASS | PASS | PASS |  |
| Autoplay, limite sessione e arresto ai test | PASS | PASS | PASS |  |
| Completamento Test e Obiettivi | PASS | PASS | PASS |  |
| Raccolta test PDF e HTML | PASS | PASS | PASS |  |
| Capitolo/test non recuperabile senza disallineamento | PASS | PASS | PASS |  |
| Master index con `folder_id: 0` e ID non consecutivi | PASS | PASS | PASS |  |
| Test presente ma vuoto senza disallineamento | PASS | PASS | PASS |  |
| Titolo video abbreviato con `testId` corretto | PASS | PASS | PASS |  |
| `testId` ricevuto differente: response respinta | PASS | PASS | PASS |  |
| Caso reale 29 capitoli `20 + 9` | PASS | PASS | PASS |  |
| Generazione PDF/EPUB e annullamento | PASS | PASS | PASS |  |
| Progressione e avviso 70% | PASS | PASS | PASS |  |
| Stato commissione e cancellazione cache | PASS | PASS | PASS |  |
| Menu fluttuante Piccolo/Medio/Grande | PASS | PASS | PASS |  |
| Menu fluttuante: header/tab fissi | PASS | PASS | PASS |  |
| Menu principale: header/tab fissi e margine superiore costante | PASS | PASS | PASS |  |
| Ko-fi in Preferenze → Informazioni | PASS | PASS | PASS |  |
| Standard: nessun claim o messaggio EXP | PASS | PASS | PASS |  |
| Gaming: EXP, Traguardi e ricompense | PASS | PASS | PASS |  |
| Reset Gaming | PASS | PASS | PASS |  |
| Tema Sistema/Chiaro/Scuro | PASS | PASS | PASS |  |
| Ricaricamento, nuova scheda e riavvio browser | PASS | PASS | PASS |  |

## Console e rete

- Errori inattesi nella console dell'estensione: `NESSUNO`
- Errori inattesi nella console della pagina: `NESSUNO`
- Token, header Authorization o payload sensibili nei log: `ASSENTI`
- Richieste verso host non dichiarati: `ASSENTI`

## Anomalie accettate

Un test Pegaso isolato può restare non disponibile dopo i tentativi automatici. È accettabile soltanto se:

- viene indicato in **Test non inclusi**;
- il resto della raccolta viene generato;
- capitoli e domande successivi restano correttamente associati;
- una nuova esecuzione può recuperarlo senza alterare la raccolta precedente.

## Chiusura

- Gate funzionali completati: `IN ATTESA DELLA VERIFICA MANUALE MIRATA FIREFOX 2.32.9`
- Hash confrontati con i pacchetti da caricare: `SÌ PER LA BUILD CANDIDATA; DA RIPETERE DOPO IL MERGE`
- Screenshot: `SÌ — cinque immagini 1280×800 della v2.32.8, ancora rappresentative perché la v2.32.9 non modifica la UI`
- Approvazione al merge/tag/upload: `in attesa della revisione della PR v2.32.9 e della prova manuale Firefox`
- Note finali: `Smoke test completo eseguito sulla v2.32.7 con esito PASS su Chrome, Edge e Firefox; verifiche UI mirate della v2.32.8 completate. La v2.32.9 ha superato test automatici, build, validazione interna e lint AMO locale. Gli occasionali falsi incompleti dell'indice master sono gestiti dalla verifica visuale; non sono stati osservati falsi completi.`
