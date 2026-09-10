# PlumePilot — verbale smoke test finale

Compilare questo documento esclusivamente sulla build congelata destinata agli store. Non committare credenziali DEMO, dati personali o screenshot non oscurati.

## Identità della release

- Versione: `[VERSIONE]`
- Commit/tag: `[COMMIT O TAG]`
- Data test: `[DATA]`
- Responsabile: `[NOME]`
- Chrome ZIP SHA-256: `[SHA-256]`
- Edge ZIP SHA-256: `[SHA-256]`
- Firefox ZIP SHA-256: `[SHA-256]`
- File `SHA256SUMS.txt` verificato: `[SÌ/NO]`

## Ambienti

| Browser | Versione | Sistema operativo | Installazione pulita | Esito |
|---|---|---|---|---|
| Chrome Stable | `[VERSIONE]` | `[OS]` | `[SÌ/NO]` | `[PASS/FAIL]` |
| Microsoft Edge Stable | `[VERSIONE]` | `[OS]` | `[SÌ/NO]` | `[PASS/FAIL]` |
| Firefox | `[VERSIONE, >=140]` | `[OS]` | `[SÌ/NO]` | `[PASS/FAIL]` |

## Casi funzionali

Usare `PASS`, `FAIL`, `N/A` o `BLOCCATO`. Annotare ogni anomalia con browser, passaggi e messaggio esatto.

| Caso | Chrome | Edge | Firefox | Note |
|---|---|---|---|---|
| Apertura popup e persistenza preferenze |  |  |  |  |
| Attivazione/disattivazione globale |  |  |  |  |
| Prima attività incompleta |  |  |  |  |
| Autoplay, limite sessione e arresto ai test |  |  |  |  |
| Completamento Test e Obiettivi |  |  |  |  |
| Raccolta test PDF e HTML |  |  |  |  |
| Capitolo/test non recuperabile senza disallineamento |  |  |  |  |
| Master index con `folder_id: 0` e ID non consecutivi |  |  |  |  |
| Test presente ma vuoto senza disallineamento |  |  |  |  |
| Titolo video abbreviato con `testId` corretto |  |  |  |  |
| `testId` ricevuto differente: response respinta |  |  |  |  |
| Caso reale 29 capitoli `20 + 9` |  |  |  |  |
| Generazione PDF/EPUB e annullamento |  |  |  |  |
| Progressione e avviso 70% |  |  |  |  |
| Stato commissione e cancellazione cache |  |  |  |  |
| Menu fluttuante Piccolo/Medio/Grande |  |  |  |  |
| Menu fluttuante: header/tab fissi |  |  |  |  |
| Menu principale: header/tab fissi e margine superiore costante |  |  |  |  |
| Ko-fi in Preferenze → Informazioni |  |  |  |  |
| Standard: nessun claim o messaggio EXP |  |  |  |  |
| Gaming: EXP, Traguardi e ricompense |  |  |  |  |
| Reset Gaming |  |  |  |  |
| Tema Sistema/Chiaro/Scuro |  |  |  |  |
| Ricaricamento, nuova scheda e riavvio browser |  |  |  |  |

## Console e rete

- Errori inattesi nella console dell'estensione: `[NESSUNO/DETTAGLI]`
- Errori inattesi nella console della pagina: `[NESSUNO/DETTAGLI]`
- Token, header Authorization o payload sensibili nei log: `[ASSENTI/DETTAGLI]`
- Richieste verso host non dichiarati: `[ASSENTI/DETTAGLI]`

## Anomalie accettate

Un test Pegaso isolato può restare non disponibile dopo i tentativi automatici. È accettabile soltanto se:

- viene indicato in **Test non inclusi**;
- il resto della raccolta viene generato;
- capitoli e domande successivi restano correttamente associati;
- una nuova esecuzione può recuperarlo senza alterare la raccolta precedente.

## Chiusura

- Gate funzionali completati: `[SÌ/NO]`
- Hash confrontati con i pacchetti da caricare: `[SÌ/NO]`
- Screenshot ottenuti dalla stessa build: `[SÌ/NO]`
- Approvazione al merge/tag/upload: `[NOME E DATA]`
- Note finali: `[TESTO]`
