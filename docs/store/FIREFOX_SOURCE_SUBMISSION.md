# PlumePilot — pacchetto sorgente per Firefox Add-ons

Queste istruzioni accompagnano il sorgente inviato privatamente ai revisori AMO. La copia inglese da usare direttamente nel pacchetto è `AMO_SOURCE_README.md`. Il codice della repository non richiede transpiling, bundling o minificazione. Il solo processo di build seleziona i file di runtime, adatta il manifest al browser e crea ZIP deterministici.

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

Gli archivi vengono creati in `release/`. I file destinati ad AMO sono:

```text
release/plumepilot-vX.Y.Z-firefox.zip
release/plumepilot-vX.Y.Z-source.zip
```

La directory di output deve essere priva di ZIP e di un precedente `SHA256SUMS.txt`. Il builder interrompe l'operazione prima di scrivere se trova artefatti di release esistenti, così una build precedente non può essere sovrascritta o confusa con quella corrente.

Per usare una directory diversa:

```bash
node scripts/build-release.mjs --output-dir=dist
```

## Verifica

Eseguire:

```bash
node scripts/validate-release.mjs
```

Il validatore controlla i tre manifest, la struttura degli ZIP, i riferimenti ai file, l'assenza di codice dinamico o script remoti nel codice applicativo, la presenza delle licenze e i file richiesti nel pacchetto sorgente AMO.

Il builder crea inoltre `SHA256SUMS.txt` nella directory di output. Il validatore ricalcola gli hash dei tre archivi browser e del pacchetto sorgente e richiede che coincidano esattamente con questo file.

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
