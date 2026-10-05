# Veritdoku

Logická hra ve stylu Queens / Meowdoku. Do mřížky umísti **verity** tak, aby

- v každém **řádku**, každém **sloupci** a každé **barevné oblasti** byl přesně požadovaný počet verit (**1**, od levelu 61 **dvě**, od levelu 85 **tři**),
- se **žádné dvě verity nedotýkaly**, ani úhlopříčně.

Ve hře najdeš:

- **86 druhů verit** – Cruelty, Lovity, Obesity, Gravity, Toxicity, Celebrity, Insanity, Royalty, Anxiety, Chillity… každá barevná oblast má svůj druh; objevené verity se sbírají ve **Veritáriu**,

- **levely 1–100** – volně volitelné; od 5×5 (5 verit) až po levely 93–100: **13×13 se 39 veritami** (3 v každé řadě, sloupci i oblasti),
- **3 životy** – špatně položená verita stojí život; po prohře **žádné oživení**, ale **podrobný rozbor**: co bylo u každé chyby špatně, kde verita opravdu byla, jaký lepší tah šel v tu chvíli udělat a na co si dát příště pozor,
- **křížkování** – ťuknutí = křížek, tažením zakřížkuješ víc polí; **dvojklik = verita**,
- **fixy** – přepínatelný režim, ve kterém si kreslíš po mřížce (barvy, tloušťka, guma, zpět),
- **nápovědu a řešič** – logický „učitel“, který každý krok vysvětlí česky; řešič umí jít krok za krokem nebo vyřešit vše (pak bez hvězd),
- **průvodce řešením** – celé řešení krok za krokem s vysvětlením,
- každá mřížka má **jediné řešení** a jde vyřešit čistou logikou (ověřeno generátorem),
- moderní tmavý design, zoom dvěma prsty, offline hraní (PWA / Android aplikace).

## Spuštění lokálně

```bash
npm install
npm run serve      # http://localhost:8080
```

Generování levelů (předgenerované jsou ve `www/levels.json`):

```bash
npm run generate-levels             # všech 100 levelů, paralelně, s cache v tools/.levels-cache.json
node tools/generate-levels.mjs --from 90 --to 100 --variants 2
npm test                            # kontrola: jednoznačnost, logická řešitelnost, rozbor chyb
```

## Jak dostat hru do telefonu

### a) Android – APK

1. Na GitHubu otevři **Releases → `apk-latest`** (název „Veritdoku – nejnovější APK“) a stáhni **`Veritdoku.apk`**.
   - Alternativa: **Actions → poslední běh „Build Android APK“ → Artifacts → `Veritdoku-apk`**.
2. Soubor otevři v telefonu a povol **instalaci z neznámých zdrojů** (Nastavení → Zabezpečení / Aplikace).
3. Nainstaluj a hraj.

APK se automaticky staví při každém pushi (GitHub Actions + Capacitor).

### b) PWA – Android, iPhone i počítač

1. Zapni GitHub Pages: **Settings → Pages → Source: GitHub Actions** (jednorázově).
2. Po doběhnutí workflow „Deploy web (PWA)“ otevři **https://102010jk.github.io/hramobil/**
   - Android: Chrome → menu ⋮ → **Přidat na plochu** / **Nainstalovat aplikaci**.
   - iPhone: Safari → **Sdílet** → **Přidat na plochu**.
3. Hra pak funguje i offline.

> **iPhone:** APK nejde nainstalovat, na iOS použij pouze PWA (Safari → Sdílet → Přidat na plochu).

## Struktura

- `www/` – hra (HTML/CSS/JS, `levels.json`, `manifest.webmanifest`, `sw.js`, `icons/`)
  - `js/engine.js` – pravidla, exhaustivní řešič, generátor a vysvětlující logický řešič
  - `js/explain.js` – rozbor chyb po prohře
  - `js/ink.js` – fixy (kreslení)
  - `js/verities.js` – druhy verit (SVG skládané z těla, očí, pusy a doplňků)
  - `js/main.js` – UI a herní logika
- `tools/` – generátor levelů a self-test
- `assets/` – zdroje ikony a splash screenu pro `@capacitor/assets`
- `capacitor.config.json` – nastavení Capacitoru (`cz.veritdoku.app`)
- `.github/workflows/` – sestavení APK a nasazení webu
