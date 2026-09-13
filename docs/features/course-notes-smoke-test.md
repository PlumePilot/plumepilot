# Raccolta appunti — test PR #11

Build di sviluppo basata su integration/next-release, non destinata agli store. La versione manifest resta 2.32.8: riconoscere questa build dal pacchetto PR11 e dal commit, non dal numero di versione. Eseguire i controlli su Firefox, Chrome e Edge prima dell'integrazione.

1. In un corso, annotare due video di capitoli differenti; creare almeno due note in uno stesso video e lasciare un altro video senza note. Includere accenti, simboli matematici, elenchi, grassetto e corsivo. Non serve trasmettere le note personali allo sviluppatore.
2. Avviare **Crea raccolta appunti del corso** da Attività nel popup. Verificare ordine e corrispondenza di capitoli/video; la raccolta deve ignorare i video senza note. Ripetere dal menù fluttuante.
3. Provare **Interrompi raccolta appunti** mentre la raccolta è attiva. Il builder non deve aprirsi; le altre operazioni devono tornare disponibili. Verificare anche ricaricamento/chiusura della scheda durante la raccolta.
4. Durante la raccolta, cambiare scheda nel popup: il banner deve riportare al controllo di annullamento. Le altre esportazioni non devono avviarsi in parallelo.
5. Scaricare PDF e HTML. Controllare l'indice cliccabile, note multiple, accenti/simboli e un appunto lungo su più pagine. Il PDF segnala i caratteri non supportati e suggerisce HTML; non li sostituisce silenziosamente.
6. Aprire l'HTML senza connessione. Modificare il testo nella copia e aggiungere un'integrazione contenente `<test>`, `&`, accenti e una nuova riga. Cambiare tema, scaricare la copia aggiornata e riaprirla: contenuto e tema devono essere conservati. Pegaso deve rimanere invariato.
7. Modificare una nota su Pegaso e creare un'altra raccolta: deve contenere il nuovo testo. Un errore di recupero deve apparire nell'elenco degli elementi non recuperati, anche nei documenti esportati.
8. Provare un corso privo di note: messaggio esplicito, nessun documento vuoto e nessun traguardo. In Gaming il primo documento non vuoto assegna **Pensieri in viaggio** una volta; la seconda esportazione non ripete i 25 EXP. In Standard nessun premio o messaggio Gaming.
9. Verificare i pulsanti a Piccolo/Medio/Grande, Standard/Gaming e Chiaro/Scuro. Chiudere il builder durante la generazione: nessun blocco persistente delle operazioni.

Restano da confermare con dati reali: struttura della risposta vuota, più note per video, eventuale paginazione e unità di tracking_time. Il minutaggio è conservato come metadato nell'HTML senza attribuirgli unità.

La privacy nel branch è aggiornata per la futura release; la pagina pubblica e le dichiarazioni store andranno riconciliate prima della pubblicazione.
