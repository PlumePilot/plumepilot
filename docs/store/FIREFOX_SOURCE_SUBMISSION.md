# PlumePilot — pacchetto sorgente per Firefox Add-ons

Queste istruzioni accompagnano il sorgente inviato privatamente ai revisori AMO. Il codice della repository non richiede transpiling, bundling o minificazione. Il solo processo di build seleziona i file di runtime, adatta il manifest al browser e crea ZIP deterministici.

## Ambiente

- Sistema consigliato: Ubuntu 24.04.
- Node.js: 24.x.
- npm: non necessario.
- Accesso alla rete: non necessario.

Tutte le dipendenze usate dal builder e dall'estensione sono incluse nel sorgente. Il builder importa la copia locale di JSZip da `vendor/jszip.min.js`.

## Generazione

Dalla radice del sorgente eseguire:

```bash
node scripts/build-release.mjs
```

Gli archivi vengono creati in `release/`. Il file destinato ad AMO è:

```text
release/plumepilot-vX.Y.Z-firefox.zip
```

Per usare una directory diversa:

```bash
node scripts/build-release.mjs --output-dir=dist
```

## Verifica

Eseguire:

```bash
node scripts/validate-release.mjs
```

Il validatore controlla i tre manifest, la struttura degli ZIP, i riferimenti ai file, l'assenza di codice dinamico o script remoti e la presenza delle licenze.

Per confrontare la build con il pacchetto caricato su AMO:

```bash
sha256sum release/plumepilot-vX.Y.Z-firefox.zip
```

Il builder usa una data ZIP fissa, ordinamento stabile dei file e compressione DEFLATE livello 9. A parità di sorgente e runtime compatibile, l'archivio prodotto è deterministico.

## Librerie di terze parti

Le librerie minificate presenti in `vendor/` non sono generate dal processo di build PlumePilot. Sono copie delle release upstream e restano invariate durante la creazione degli ZIP. `THIRD_PARTY_NOTICES.md` contiene per ogni componente:

- nome e versione;
- progetto e pacchetto ufficiale;
- licenza;
- SHA-256 dei file inclusi.

I testi delle licenze e i metadati necessari alla verifica sono conservati nella repository e, quando richiesto, nel pacchetto dell'estensione.

## File esclusi dalla release runtime

Il builder esclude documentazione di sviluppo, script di build, directory Git, file di release precedenti, l'icona sorgente 512×512 e README vendor non necessari durante l'esecuzione. Le esclusioni sono definite in `scripts/build-release.mjs`.
