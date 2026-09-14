# PlumePilot — Third-party notices

PlumePilot è distribuito sotto GPL-3.0-only. I componenti elencati in questo documento rimangono soggetti alle rispettive licenze.

I checksum si riferiscono ai file inclusi nella release sorgente PlumePilot 2.32.10.

## pdf-lib 1.17.1

- Uso: creazione, unione e metadati dei PDF.
- Licenza: MIT.
- Progetto e release: <https://github.com/Hopding/pdf-lib/tree/v1.17.1>
- Pacchetto ufficiale: <https://www.npmjs.com/package/pdf-lib/v/1.17.1>
- File: `vendor/pdf-lib.min.js`.
- SHA-256: `0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f`.
- Testo della licenza: `vendor/pdf-lib-LICENSE.md`.

## @pdf-lib/fontkit 1.1.1

- Uso: incorporamento dei font nei PDF dei test.
- Licenza: MIT.
- Progetto: <https://github.com/Hopding/fontkit>
- Pacchetto ufficiale: <https://www.npmjs.com/package/@pdf-lib/fontkit/v/1.1.1>
- File: `vendor/fontkit.umd.min.js`.
- SHA-256: `d8df561b9fba98e24f2e5130e40948809281bbbc55a20c412359f1a0a5eb35a6`.
- Testo della licenza: `vendor/fontkit-LICENSE.txt`.
- Metadati della release: `vendor/fontkit-package.json`.

## PDF.js 5.6.205

- Uso: lettura, estrazione e rendering locale delle dispense durante la creazione EPUB.
- Licenza: Apache License 2.0.
- Progetto e tag: <https://github.com/mozilla/pdf.js/tree/v5.6.205>
- Distribuzione ufficiale standard: <https://github.com/mozilla/pdf.js/releases/download/v5.6.205/pdfjs-5.6.205-dist.zip>.
- SHA-256 distribuzione: `0555ef47464e456125dcd0b9742cfa2aaed6d282e804e4dd1f1b99316b46ac00`.
- File API leggibile: `vendor/pdf.mjs`.
- SHA-256 API: `43c67d941a73a2d65be72c97f5e68d9a7963df53b219cc1c0aa85f2b8bd1c9bd`.
- File worker leggibile: `vendor/pdf.worker.mjs`.
- SHA-256 worker: `08ee175af31a8537ee0ddee910717db78c6751e2016c4ddc3f033d5047ed5aa0`.
- Testo della licenza: `vendor/pdfjs-LICENSE.txt`.

## JSZip 3.10.1

- Uso: creazione dei pacchetti EPUB e degli archivi di release.
- Licenza: MIT oppure GPL-3.0.
- Progetto e tag: <https://github.com/Stuk/jszip/tree/v3.10.1>
- Pacchetto ufficiale: <https://www.npmjs.com/package/jszip/v/3.10.1>
- File: `vendor/jszip.min.js`.
- SHA-256: `acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e`.
- Avvisi di licenza: `vendor/jszip-LICENSE.md`.

## Pixelify Sans

- Uso: titoli e controlli brevi della modalità Gaming.
- Licenza: SIL Open Font License 1.1.
- Progetto: <https://github.com/eifetx/Pixelify-Sans>
- File: `assets/fonts/pixelify-sans-latin.ttf`.
- SHA-256: `d941c77301c1569ddb7b3735cc53e5e050bce22632dde64f2f7934458b6532a6`.
- Testo della licenza: `assets/fonts/OFL.txt`.

## Font standard PDF.js

I font nella cartella `vendor/standard_fonts/` provengono dalla distribuzione `pdfjs-dist` 5.6.205 e sono utilizzati localmente per il rendering e la generazione dei PDF.

- Liberation Sans: licenza in `vendor/standard_fonts/LICENSE_LIBERATION`.
- Font Foxit: licenza in `vendor/standard_fonts/LICENSE_FOXIT`.
- Sorgente della distribuzione: <https://www.npmjs.com/package/pdfjs-dist/v/5.6.205>

## Verifica per la revisione AMO

Prima di ogni invio a Firefox Add-ons occorre verificare che le copie incluse siano identiche alle release ufficiali indicate e riportare questi collegamenti nelle **Notes for Reviewers**.
