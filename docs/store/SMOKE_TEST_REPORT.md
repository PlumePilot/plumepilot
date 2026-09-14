# PlumePilot — verbale smoke test finale

Compilare questo documento esclusivamente sulla build congelata destinata agli store. Non committare credenziali DEMO, dati personali o screenshot non oscurati.

## Identità della release

- Versione: `v2.32.10`
- Commit/tag: `PR #12 fix/chrome-code-readability-2.32.10` (tag da creare sul commit definitivo in `main`)
- Data test: `14/09/2026`
- Responsabile: `Fabio Floris`
- Chrome ZIP SHA-256: `984be0daa4c93c92669e6a63c944a74b621820a8b04400b39d510d8489b13880`
- Edge ZIP SHA-256: `984be0daa4c93c92669e6a63c944a74b621820a8b04400b39d510d8489b13880`
- Firefox ZIP SHA-256: `60470ce2676d4035da501b5d5aca7d9cfdbfb146c4ecd0081ac274f86189a9fa`
- File `SHA256SUMS.txt` verificato: `SÌ`

## Ambienti

| Browser | Versione | Sistema operativo | Installazione pulita | Esito |
|---|---|---|---|---|
| Chrome Stable | `152.0.7977.83` | `Microsoft Windows 11 Pro` | `SÌ` | `PASS` |
| Microsoft Edge Stable | `152.0.4191.66` | `Microsoft Windows 11 Pro` | `SÌ` | `PASS` |
| Firefox | `155.0.1, >=140` | `Microsoft Windows 11 Pro` | `SÌ` | `PASS` |

La matrice funzionale completa è stata eseguita sulla `v2.32.7`. Dopo la rifinitura circoscritta della `v2.32.8` sono stati ripetuti i controlli mirati su stati operativi, tipografia responsive, temi, modalità Standard/Gaming e pacchetti installabili. Sulla `v2.32.10` è stato inoltre eseguito su Chrome il controllo manuale mirato della generazione delle dispense: l'esportazione PDF/EPUB continua a completarsi correttamente con la distribuzione standard leggibile PDF.js 5.6.205. Le funzioni non coinvolte restano coperte dallo smoke test completo precedente.

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

- Gate funzionali completati: `SÌ`
- Hash confrontati con i pacchetti da caricare: `SÌ`
- Screenshot ottenuti dalla stessa build: `SÌ — cinque immagini 1280×800 verificate per browser`
- Approvazione al merge/tag/upload: `Fabio Floris — 14/09/2026: test manuale PDF/EPUB superato; merge della PR #12 e nuovo invio Chrome autorizzati`
- Note finali: `Smoke test completo eseguito sulla v2.32.7 con esito PASS su Chrome, Edge e Firefox. La v2.32.8 modifica soltanto feedback operativo e tipografia responsive: sintassi, regressioni dell'export, invarianti UI, struttura dei tre pacchetti e checksum sono stati verificati; i controlli manuali mirati e la resa degli screenshot sono stati confermati. La v2.32.10 sostituisce esclusivamente i bundle PDF.js legacy minificati con la distribuzione standard leggibile della stessa versione 5.6.205 e disabilita la compilazione dinamica: test automatici, struttura dei pacchetti, hash upstream e generazione manuale PDF/EPUB su Chrome hanno esito PASS. Gli occasionali falsi incompleti dell'indice master sono gestiti dalla verifica visuale; non sono stati osservati falsi completi.`
