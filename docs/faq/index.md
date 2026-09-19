---
layout: default
title: FAQ di PlumePilot
---

# FAQ e messaggi di PlumePilot

Questa pagina spiega i principali avvisi che possono comparire durante l’uso di PlumePilot. Un messaggio di errore non indica necessariamente un problema dell’estensione: spesso significa che la pagina del corso non ha ancora fornito tutti i dati necessari o che Pegaso non rende disponibile una determinata attività.

## Test e Obiettivi

### “Le domande ricevute non corrispondono al test richiesto”

Pegaso ha restituito un test diverso da quello che PlumePilot stava elaborando. L’operazione viene fermata per evitare di associare domande o risposte al capitolo sbagliato. Apri manualmente il test interessato, torna alla pagina dei contenuti e riprova.

### “Nessun test con domande è stato trovato”

Le sezioni analizzate non contenevano test utilizzabili oppure Pegaso non ne ha restituito le domande. Verifica che il corso contenga effettivamente dei test e che siano accessibili dall’account in uso.

### “Impossibile verificare il test corrente. Avanzamento fermato per sicurezza.”

PlumePilot non è riuscito a confermare con certezza l’identità del test aperto. L’avanzamento automatico viene interrotto per non completare l’attività sbagliata. Ricarica la pagina del corso e riprova; se il messaggio ricompare, completa quel test manualmente.

### “API non disponibile. Nessun Obiettivo è stato modificato.”

La pagina non ha ancora esposto la sessione necessaria per comunicare con Pegaso. Nessun Obiettivo è stato modificato. Mantieni aperta la scheda del corso, ricaricala e riprova dopo qualche secondo.

## Dispense ed esportazioni

### “Nessuna sezione trovata. Apri prima la pagina dei contenuti del corso.”

PlumePilot non riesce a vedere l’indice del corso dalla pagina corrente. Apri la pagina che mostra capitoli, video, test e dispense, quindi ripeti l’operazione.

### “Nessuna dispensa trovata”

Il corso non espone dispense per le sezioni analizzate oppure Pegaso non ha restituito dati sufficienti. Verifica manualmente che le dispense siano presenti e accessibili. Se lo sono, ricarica l’indice del corso e riprova.

### “Dati della dispensa non disponibili tramite API”

Pegaso non ha fornito il collegamento della dispensa attraverso i dati del corso. PlumePilot può tentare il recupero visitando le sezioni interessate; alcune dispense potrebbero comunque essere saltate se non risultano accessibili.

### “Impossibile trovare le dispense raccolte”

I dati temporanei dell’esportazione non sono più disponibili, per esempio dopo una chiusura o un riavvio del browser. Avvia nuovamente **Esporta dispense del corso**.

### “Identità dei capitoli ambigua nell’indice master”

I dati restituiti da Pegaso non permettono di associare con certezza uno o più capitoli al loro ordine nell’indice. L’operazione viene fermata per evitare raccolte errate o duplicate. Se il problema persiste, apri una segnalazione indicando il corso e l’operazione eseguita, senza includere credenziali o dati personali.

## Operazioni e pagina del corso

### “Un’altra operazione di PlumePilot è già in corso”

Raccolte, completamenti automatici e ricerche condividono alcune risorse e non possono essere eseguiti contemporaneamente. Attendi la conclusione dell’operazione corrente oppure interrompila prima di avviarne un’altra.

### “Impossibile avviare l’operazione. Ricarica la pagina del corso e riprova.”

Il popup non riesce a comunicare con una scheda Pegaso compatibile. Apri o ricarica la pagina del corso, attendi che sia completamente caricata e riprova.

### “Dati API incompleti” o “Risposta incompleta”

Pegaso ha restituito soltanto una parte della struttura del corso. PlumePilot tenta automaticamente di riutilizzare la cache o di ripetere la richiesta; se non basta, visita la lezione interessata e riprova.

## Serve ancora aiuto?

Controlla di usare l’ultima versione di PlumePilot e ripeti l’operazione dalla pagina dei contenuti del corso. Se il problema continua, [apri una segnalazione su GitHub](https://github.com/PlumePilot/plumepilot/issues) riportando il messaggio completo, il browser e i passaggi eseguiti. Non pubblicare password, token, matricola o altri dati personali.

[Torna alla pagina principale](../)
