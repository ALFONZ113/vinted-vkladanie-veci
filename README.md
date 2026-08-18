# Do Vinted

Jednoduchá mobilní aplikace na přípravu inzerátů pro Vinted CZ.

Nic na Vinted sama nevystaví. Připraví fotky, název, popis a cenu. Ty to zkopíruješ a vložíš ručně.

**GitHub:** https://github.com/ALFONZ113/vinted-vkladanie-veci

## Veřejný náhled

Po nasazení z větve `main`:

https://alfonz113.github.io/vinted-vkladanie-veci/

## Lokální spuštění

```powershell
cd "C:\grok praca app\vinted"
npm run dev
```

Otevři v telefonu nebo v prohlížeči: [http://localhost:5174](http://localhost:5174)

## První verze umí

1. Vyfotit nebo nahrát oblečení
2. Doplnit značku, velikost, stav a cenu
3. Sestavit český název a popis
4. Kopírovat text
5. Stáhnout fotky
6. Otevřít stránku nového inzerátu na Vinted

Data zůstávají v tomto prohlížeči. Žádné heslo, žádný účet.

## Záměrně to nedělá

- nepřihlašuje se na Vinted
- nestahuje data z Vintedu
- nevystavuje inzerát automaticky
- nevymýšlí značku, když ji neuvedeš
