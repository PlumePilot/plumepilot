# Pausa? — prima prova giocabile

Questa prova parte dal `main` PlumePilot 2.34.0. Si apre da **Preferenze → Pausa?** nel popup. È un livello unico da 90 secondi, senza stato di avanzamento persistente, EXP o Game Over. Si può uscire in ogni momento.

## Mappa temporale

Ogni blocco contiene cinque collezionabili a tempi fissi (`pausa/level.js`). Le lettere D, T e O indicano dispensa, test e obiettivo. Le coordinate verticali sono normalizzate tra 0 e 1. Gli ostacoli sono altrettanto deterministici.

| Secondi | Oggetti | Battuta | Ostacoli |
|---|---|---|---|
| 0–5 | D D D D T | Comandi e volo | — |
| 5–10 | D D D D O | Prime dispense | — |
| 10–15 | D D D T T | Percorso libero | — |
| 15–20 | D D D T O | Prima pila | Libri 18 s |
| 20–25 | D D T T O | Alternanza | — |
| 25–30 | D D T T O | Prima nuvola | Nuvola 25 s |
| 30–35 | D D T T O | Respiro | Libri 32 s |
| 35–40 | D D T T O | Primo bug | Bug 38 s |
| 40–45 | D T T T O | Libri e dispense | Nuvola 44 s |
| 45–50 | D T T T O | Cambia traiettoria | — |
| 50–55 | D T T O O | Nuvola e bug | Libri 50 s |
| 55–60 | D T T T O | Centro | Bug 55 s |
| 60–65 | D T T O O | Libri e obiettivi | Nuvola 61 s |
| 65–70 | D T T O O | Nuvole leggere | Libri 67 s |
| 70–75 | D T O O O | Respiro | Bug 73 s |
| 75–80 | D T O O O | Ultimi ostacoli | Nuvola 78 s |
| 80–85 | T O O O O | Verso il traguardo | Libri 82 s |
| 85–90 | O O O O O | Arrivo | — |

Totali: **30 dispense, 30 test, 30 obiettivi**. La traiettoria attuale è un primo bilanciamento da provare, non una disposizione grafica definitiva.

## Regole di prova

- Spazio, clic o tocco spingono Plume verso l'alto; P mette in pausa. Il cambio di scheda mette in pausa automaticamente.
- Un urto fa rimbalzare Plume, sottrae l'ultimo oggetto raccolto e dà 1,7 secondi di invulnerabilità. I bordi del campo limitano la posizione senza interrompere il livello.
- CFU di Plume = `round(30 × oggetti raccolti / 90)`. Il risultato non viene salvato.
- Il tema segue `themePreference` (sistema/chiaro/scuro). Sole e luna partono in alto davanti a Plume e finiscono alla sua sinistra, alle sue spalle, in un arco leggero legato ai 90 secondi.
- La scelta audio è separata dalle notifiche. Alla prima apertura usa il valore delle notifiche sonore come predefinito; poi conserva `pausaSoundEnabled`. Gli effetti sono sintetizzati localmente, brevi e senza musica.
- Plume usa lo sprite locale esistente. Oggetti e ostacoli sono ancora forme segnaposto per concentrare il primo test su controllo, ritmo e leggibilità.

## Cosa osservare nel playtest

Provare soprattutto se la fisica consente correzioni facili, se i 90 oggetti si leggono senza confusione, se l'ultimo oggetto a 89,22 s resta raggiungibile e se le collisioni sono troppo frequenti. Dopo il test si potranno correggere tempi, altezze e impulsi in piccoli passi, poi sostituire i segnaposto con sprite dedicati.
