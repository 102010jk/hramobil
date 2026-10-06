# Vaječná kráva: Strike

Taktická 3D střílečka z vlastního pohledu ve stylu Counter-Strike, s tématem Vaječné krávy.
**Kravaři** (obránci) hrají proti **Vaječníkům** (útočníci). Hraje se proti botům na počítači i na mobilu (PWA nebo APK).

## Co ve hře je

- **Soutěžní režim s bombou:** Vaječníci pokládají *Zlaté vejce* na místo A nebo B, Kravaři ho zneškodňují.
  Hraje se na kola do 8 vyhraných, s nákupní fází, ekonomikou jako v CS (výhra/prohra, odměny za zabití, série proher),
  vestami a helmami a zneškodňovací sadou.
- **Týmový deathmatch:** oživování, zbraně zdarma, 5 minut nebo 60 zabití.
- **Boti** na 4 obtížnostech (lehká až expert):
  - hledají cestu přes A*,
  - vidí a slyší nepřátele,
  - mají reakční dobu a chybu míření, střílejí dávkami, úkrokují a přikrčují se,
  - nakupují podle peněz,
  - pokládají a zneškodňují bombu, hází granáty a sbírají zbraně padlých.
- **5 map:** *Kravín* (prašná farma), *Líheň* (průmyslová líheň), *Pastvina* (vesnice s loukou),
  *Přelud* (rozložení podle Mirage: dlouhý mid, apartmány na B, rampa a palác na A) a
  *Jaderka* (podle Nuke: venkovní dvůr, chatka a hala A, rampa a průduchy na B; vše v jednom patře).
  Po mapách se pasou krávy a snáší vejce, která doplňují zdraví.
- **40 zbraní** v 6 kategoriích (pistole, samopaly, pušky, odstřelovačky, brokovnice, těžké), např. AK-47 Bučák,
  M4A4 Mléčný, AWP Vaječný drak, Pouštní Kráva, Negev Neděle.
  - Každá zbraň má vlastní poškození, kadenci, rozptyl, zpětný ráz, průraz vesty, cenu a pohyblivost.
  - Headshoty (×4), poškození klesá se vzdáleností, odstřelovačky mají zoom.
  - K tomu nůž (bodnutí do zad zabíjí) a granáty: vaječný granát, žloutkový záblesk a mléčný dým, který blokuje výhled.
- **Časky (bedny) se skiny:** 5 časek, při otevření se točí ruleta.
  - Vzácnosti: armádní, omezená, utajená, tajná a mimořádná ★.
  - Opotřebení od *Továrně nové* po *Zničené bojem*, číslo vzoru a **KravTrak™** počítadlo zabití.
  - Skiny jsou na zbraně, nože (karambit, motýlek, bajonet), rukavice, **krávy** (jak vypadají krávy na mapách)
    a **agenty** (vzhled tvé postavy).
- **Komunitní trh:** nabídky ostatních „hráčů“, cenové grafy, vystavení vlastních předmětů a rychlý prodej.
  Hra je offline, takže trh je **simulovaný**: nabídky se mění každou hodinu a kupci nakupují podle toho, jak férová je cena.
- **Grafika:** PBR materiály s procedurálními texturami (omítka, cihly, plech, dřevo, beton, tráva, písek), stíny,
  filmové tónování (ACES), obloha s odrazy na kovu a viewmodel zbraně s rukama.
  Postavy a zbraně jsou skládané ze základních tvarů, protože hra nemá žádné externí 3D modely.

## Ovládání

- **PC:**
  - pohyb: WASD, myš míří (klikni do hry), Shift chůze, C/Ctrl přikrčení, mezerník skok
  - střelba: levé tlačítko střílí, pravé zoomuje nebo bodá, R nabíjí
  - zbraně: 1–5 sloty, Q poslední zbraň, G zahodit
  - ostatní: B nákup, E položit/zneškodnit, Tab skóre, Esc pauza
- **Mobil (na šířku):**
  - levý palec ovládá joystick, pravým táhneš a míříš
  - tlačítko ◎ střílí (a dá se jím i mířit)
  - další tlačítka: zoom, skok, přikrčení, nabití, změna zbraně, granát, 🛒 nákup, ☰ skóre

## Spuštění

```bash
npx http-server vajecna-krava -p 8080 -c-1   # http://localhost:8080
```

## Na PC a pro kamaráda

Na GitHubu v Releases → **`vajecna-krava-pc`** jsou dva soubory (staví je workflow „Build PC (Vaječná kráva)“):

- **`VajecnaKrava-HTML.zip`** (~200 kB): nejmenší, co se dá poslat. Uvnitř je jeden soubor `vajecna-krava.html`.
  Stačí ho rozbalit a otevřít dvojklikem v Chrome, Edge nebo Firefoxu. Funguje na Windows, Macu i Linuxu, i bez internetu.
- **`VajecnaKrava-Windows.zip`** (~2,6 MB): obsahuje `VajecnaKrava.exe`. Po spuštění se hra otevře ve vlastním okně
  (přes Edge nebo Chrome, které na Windows 10/11 bývají) a po zavření okna se exe samo ukončí.
  Exe není podepsané, takže Windows může ukázat „Systém Windows ochránil váš počítač“.
  Pak stačí kliknout na **Další informace → Přesto spustit**.

Postup se ukládá do prohlížeče, ve kterém hra běží: u HTML do toho, ve kterém ho otevřeš, u exe do Edge/Chrome.

Ručně se obojí sestaví příkazem `node vajecna-krava/tools/build-pc.mjs` (potřeba je Node a Go), výsledek je ve `vajecna-krava/dist/`.

## Do telefonu

- **Android APK:** GitHub → Releases → **`apk-vajecna-krava`** → `VajecnaKrava.apk`
  (staví workflow „Build Android APK (Vaječná kráva)“, aplikace běží na šířku).
- **Web / PWA:** workflow „Deploy web (PWA)“ ji nasadí na `https://102010jk.github.io/hramobil/vajecna-krava/`.

## Struktura

- `js/main.js`: renderer, světla, obloha, smyčka
- `js/match.js`: zápas (hráč, boti, střelba, kola, bomba, ekonomika, granáty, HUD, nákup, skóre)
- `js/maps.js`: 5 map (grid), kolize, raycast pro střelbu, A* navigace
- `js/weapons.js`: 40 zbraní, nůž a granáty, včetně 3D modelů
- `js/skins.js`: povrchové úpravy, vzácnosti, opotřebení, časky, náhledy
- `js/characters.js`: agenti (vojáci), krávy, ruce v pohledu z první osoby
- `js/profile.js`: inventář, vybavení, odměny, simulovaný trh (ukládá se do zařízení)
- `js/ui.js`: menu, inventář, otevírání časek, trh, 3D prohlížení skinů, výsledky
- `js/textures.js`: procedurální textury a obloha
- `js/audio.js`: syntetizované zvuky (výstřely, bomba, časky, bučení…)
- `tools/build-pc.mjs`, `launcher/`: sestavení jednoho HTML souboru a Windows exe (spouštěč v Go)
- `js/vendor/three.module.min.js`: [three.js](https://threejs.org) r170 (MIT)
