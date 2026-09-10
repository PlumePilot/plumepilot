# Pubblicazione sugli store

Questa cartella raccoglie i materiali operativi per pubblicare PlumePilot su Chrome Web Store, Microsoft Edge Add-ons e Firefox Add-ons.

- [`PUBLICATION_CHECKLIST.md`](PUBLICATION_CHECKLIST.md): gate di rilascio, asset, test e flusso per i tre store.
- [`SUBMISSION_COPY_IT.md`](SUBMISSION_COPY_IT.md): testi italiani, scopo unico, permessi e dichiarazioni dati.
- [`REVIEWER_NOTES_IT.md`](REVIEWER_NOTES_IT.md): modello privato per credenziali DEMO e istruzioni di verifica.
- [`FIREFOX_SOURCE_SUBMISSION.md`](FIREFOX_SOURCE_SUBMISSION.md): ambiente e build riproducibile per i revisori AMO.
- [`SCREENSHOT_CAPTURE_GUIDE.md`](SCREENSHOT_CAPTURE_GUIDE.md): sequenza, formato e controlli privacy per le immagini degli store.
- [`SMOKE_TEST_REPORT.md`](SMOKE_TEST_REPORT.md): verbale da compilare sulla build congelata nei tre browser.

I file di questa cartella sono esclusi automaticamente dai pacchetti runtime tramite `scripts/build-release.mjs`. Le credenziali DEMO reali non devono mai essere salvate nella repository.
