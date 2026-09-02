# Contribuire a PlumePilot

Grazie per l'interesse nel progetto. Prima di proporre modifiche sostanziali, apri una issue per concordare obiettivo e comportamento atteso.

## Flusso consigliato

1. crea un fork e un branch dedicato;
2. mantieni la modifica circoscritta e documentata;
3. verifica il comportamento su Chrome, Firefox ed Edge quando la modifica riguarda codice condiviso;
4. esegui `node scripts/build-release.mjs` e `node scripts/validate-release.mjs`;
5. apri una pull request descrivendo test svolti, rischi e impatto sui dati locali.

Non includere credenziali, token, dati personali, materiali didattici o dati reali degli esami. Le modifiche accettate vengono distribuite secondo GPL-3.0-only.

Le chiavi di storage e gli identificatori interni con prefisso storico `studywing` sono mantenuti intenzionalmente per la compatibilità del formato dati negli aggiornamenti successivi: non rinominarli senza una migrazione esplicita e verificata. Il cambio dell'ID Firefox pre-pubblicazione resta un cambio separato dell'identità dell'add-on e non migra lo storage delle vecchie build temporanee.
