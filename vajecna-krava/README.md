# Vaječná kráva: Ufoni útočí!

3D střílečka z vlastního pohledu (FPS) pro mobil i počítač. Ufoni přiletěli na farmu a chtějí unést krávu **Bětku**.
Bráníš ji se dvěma parťačkami v kaskách, **Kájou** a **Míšou**.

- **Zbraně**: Vajíčkomet (nekonečné náboje), Mléčný kulomet a Zlatá brokovnice.
- **Ufoni**: zelení střelci, fialoví rychlí skokani a oranžoví tanci, kteří vydrží hodně ran. Každá vlna je silnější.
- **UFO boss** přiletí každou 5. vlnu a začne Bětku vysávat paprskem. Sestřel ho, než ji unese!
- **Kája a Míša** hlídají Bětku a střílejí po ufonech. Když padnou, za chvíli vstanou; když k nim dojdeš, vstanou dřív.
- **Bětka snáší vejce**: bílé ti doplní zdraví, zlaté přidá náboje.
- Prohraješ, když padneš ty, když Bětce dojde zdraví, nebo když ji UFO unese.
- Zvuky jsou syntetizované (WebAudio, i bučení), hra funguje offline (PWA) a pamatuje si rekord a nastavení.

## Ovládání

- **Mobil** (nejlíp na šířku): levým palcem chodíš (joystick se objeví tam, kam sáhneš), pravým táhneš a míříš.
  Tlačítko s terčem střílí a dá se jím i mířit. Další tlačítka: skok, nabít, změna zbraně. Pomoc s mířením jde vypnout v Nastavení.
- **Počítač**: WASD chůze, myš míření (klikni do hry), levé tlačítko střelba, Shift sprint, mezerník skok,
  R nabít, 1–3 nebo kolečko zbraně, Esc pauza.

## Spuštění

```bash
npx http-server vajecna-krava -p 8080 -c-1   # http://localhost:8080
```

## Do telefonu

- **Android APK**: GitHub → Releases → **`apk-vajecna-krava`** → `VajecnaKrava.apk`
  (staví workflow „Build Android APK (Vaječná kráva)“ při každé změně ve složce `vajecna-krava/`).
- **Web / PWA**: workflow „Deploy web (PWA)“ ji nasadí na `https://102010jk.github.io/hramobil/vajecna-krava/`.

## Struktura

- `index.html`, `css/style.css` – obrazovky, HUD a dotykové ovládání
- `js/game.js` – herní smyčka, hráč, zbraně, AI ufonů a parťaček, vlny, UFO
- `js/models.js` – low-poly modely (kráva, holky v kaskách, ufoni, UFO, zbraně, vejce)
- `js/world.js` – farma (stodola, silo, statek, traktor, balíky sena, bedny, stromy, plot) a kolize
- `js/audio.js` – syntetizované zvuky
- `js/vendor/three.module.min.js` – [three.js](https://threejs.org) r170 (MIT), přibalené kvůli offline hraní
- `sw.js`, `manifest.webmanifest`, `icons/` – PWA
- `assets/` – zdroje ikony a splash screenu pro Android build
