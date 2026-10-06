# Vaječná kráva

Arkádová hra na mobil: kráva **Bětka** se prochází po obláčku a snáší vejce. Ty je chytáš do košíku.

- **Chytej vejce** – táhni prstem kdekoli po obrazovce (relativní ovládání, prst nezakrývá košík), na počítači myš nebo šipky / A, D.
- **Zlatá vejce** jsou za 5× víc bodů i vajíček do obchodu.
- **Kravince** nechytej – stojí život. Nech je spadnout na trávu.
- Každé **rozbité vejce** stojí život, máš 3 srdíčka.
- **Kombo** – chytáš-li bez chyby, body se násobí až ×5.
- **Bonusy**: 🥛 mléko (zpomalení), 🧲 magnet na vejce, 🧺 obří košík, ❤️ život navíc.
- **Úrovně** – každá je rychlejší, obloha se mění (den → západ → noc → svítání), na 5. úrovni přijde Bára, na 10. Líza a každou 4. úroveň začne **vaječná smršť**.
- **Obchod** – za vajíčka nasbíraná ve hrách kupuješ vylepšení (širší košík, život navíc, delší bonusy, víc zlatých vajec) a nové krávy (Hnědka, Fialka, Noční Bára, Duhovka, Zlatá kráva).
- Zvuky jsou syntetizované (WebAudio, včetně bučení), funguje offline (PWA), rekord a obchod se ukládají v zařízení.

## Spuštění

```bash
npx http-server vajecna-krava -p 8080 -c-1   # http://localhost:8080
```

## Do telefonu

- **Android APK**: GitHub → Releases → **`apk-vajecna-krava`** → `VajecnaKrava.apk`
  (staví workflow „Build Android APK (Vaječná kráva)“ při každé změně ve složce `vajecna-krava/`).
- **Web / PWA**: workflow „Deploy web (PWA)“ ji nasadí na `https://102010jk.github.io/hramobil/vajecna-krava/`
  (Android: Chrome → Přidat na plochu, iPhone: Safari → Sdílet → Přidat na plochu).

## Struktura

- `index.html`, `css/style.css` – obrazovky (menu, hra, pauza, konec, obchod, nápověda)
- `js/game.js` – herní smyčka, logika, ovládání, obchod a ukládání
- `js/draw.js` – kreslení krav, vajec, kravinců, bonusů a košíku na canvas
- `js/audio.js` – syntetizované zvuky
- `sw.js`, `manifest.webmanifest`, `icons/` – PWA
- `assets/` – zdroje ikony a splash screenu pro Android build
