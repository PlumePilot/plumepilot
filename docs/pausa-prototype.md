# Pausa? — seconda prova giocabile

Questa prova parte da PlumePilot `main` 2.34.0 e dal primo graybox. Si apre da **Preferenze → Pausa?** nel popup. È un livello unico da 90 secondi, senza EXP, salvataggio del risultato o Game Over.

## Come leggere la mappa

Lo schizzo dell'utente è una guida al ritmo e alle tre fasce di altezza, non un disegno in scala o un conteggio letterale dei cerchi. `pausa/level.js` contiene i tempi precisi. I cerchi gialli sono stati sviluppati in curve di cinque collezionabili ogni cinque secondi; ogni tipo compare esattamente 30 volte.

| Secondi | Collezionabili | Ostacoli che raggiungono Plume nel tratto |
|---|---|---|
| 0–5 | D D D D T | — |
| 5–10 | D D D D O | — |
| 10–15 | D D D T T | — |
| 15–20 | D D D T O | Libri ×2 · 18,2 s |
| 20–25 | D D T T O | Nuvola ×1 · 21,5 s |
| 25–30 | D D T T O | Libri ×3 · 27 s |
| 30–35 | D D T T O | Matita alta · 31,3 s |
| 35–40 | D D T T O | Nuvola ×1 · 36,4 s |
| 40–45 | D T T T O | Libri ×1 · 41,4 s |
| 45–50 | D T T T O | Libri ×2 · 46,1 s; nuvole ×3 · 49,3 s |
| 50–55 | D T T O O | Libri ×2 · 54 s |
| 55–60 | D T T T O | Matita bassa · 56 s; nuvole ×2 · 58,8 s |
| 60–65 | D T T O O | Nuvola ×1 · 62,8 s |
| 65–70 | D T T O O | Libri ×2 · 66,5 s; nuvola ×1 · 69 s |
| 70–75 | D T O O O | Libri ×3 · 71 s; matita centrale · 74,7 s |
| 75–80 | D T O O O | Nuvole ×3 · 76,3 s; libri ×2 · 77,2 s |
| 80–85 | T O O O O | Nuvola ×1 · 80 s; matita bassa · 81,5 s; libri ×3 · 84 s |
| 85–90 | O O O O O | Nuvola ×1 · 86,2 s; arrivo |

D/T/O = dispensa/test/obiettivo. Le quantità 1–3 dei libri e delle nuvole indicano sprite impilati. La matita entra da destra, ruota e percorre una linea orizzontale nella fascia indicata. I primi 15 secondi sono privi di ostacoli. Il tratto 65–85 s è più fitto, ma un passaggio verticale rimane sempre disponibile.

## Sprite e collisioni

Gli sprite forniti dall'utente sono copiati senza modifiche in `pausa/assets/`. I tre collezionabili e la matita hanno quattro fotogrammi da 16×16; libro e nuvola sono statici da 13×9. La nuvola resta ferma, evitando confusione con la matita mobile. Tutti i collezionabili usano la stessa hitbox circolare. Libri e nuvole usano la superficie rettangolare della pila, con un raggio di Plume più piccolo dello sprite; la matita ha una hitbox che cambia fra fotogrammi orizzontali e verticali, in linea con i pixel visibili. Gli oggetti non sono collocati dentro gli ostacoli.

Plume usa ancora lo sprite temporaneo già presente nell'estensione. Una variante diurna con occhiali e una notturna senza candela potranno sostituirlo quando saranno disponibili gli asset.

## Regole e audio

Spazio/clic/tocco fanno salire Plume; P mette in pausa e il cambio di scheda sospende la partita. Un urto sottrae l'ultimo oggetto raccolto, fa rimbalzare Plume e concede 1,7 secondi di invulnerabilità. Il finale mostra `round(30 × raccolti / 90)` CFU di Plume e privilegia **Torna a studiare**.

Il tema segue la preferenza dell'estensione. Sole/luna partono davanti a Plume e terminano alle sue spalle. Le stelle notturne hanno posizioni fisse e irregolari. L'audio resta facoltativo, senza musica; un cinguettio breve e raro compare in punti definiti del percorso e rispetta il controllo audio del minigioco.

## Prossimo playtest

Valutare la leggibilità degli sprite alla scala scelta, il margine del passaggio fra libri e nuvole a 76–77 s, la quota della matita centrale a 74,7 s, la frequenza degli urti e la raggiungibilità delle curve di collezionabili. Se la parte finale risulta troppo affollata, spostare tempi e altezze senza cambiare i totali 30/30/30.
