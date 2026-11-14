# CalioBonk

Gra 3D w świecie Calionu, inspirowana roguelike survival games. Projekt odrębny od **Calion Survivors**.

**Wersja:** 0.0.9  
**Technologia:** Three.js + TypeScript + Vite  
**Zakres:** eksploracja 3D z doskokiem, skaczącymi Slime'ami i automatyczną walką dystansową

## Uruchomienie lokalnie

Wymagany Node.js 22+ i npm:

```bash
npm install
npm run dev
```

Otwórz adres podany przez Vite, zazwyczaj `http://localhost:5173/`. Nie uruchamiaj `index.html` bezpośrednio jako pliku. Aby przygotować wersję produkcyjną:

```bash
npm run build
npm run preview
```

## Sterowanie

| Klawisz | Akcja |
| --- | --- |
| W / A / S / D | Ruch względem kamery |
| Mysz | Obrót kamery; kółko przybliża i oddala widok (do ok. 14 m) |
| Shift (naciśnięcie) | Krótki doskok w kierunku ruchu (1,4 s odnowienia) |
| Spacja | Skok |
| Esc | Pauza i uwolnienie kursora |

## Zakres v0.0.9

- Leśna mapa 3D z ruinami i punktem docelowym.
- Model łucznika low-poly z łukiem, kołczanem i animacją naciągania; zachowano chód, skok i doskok.
- Automatyczne namierzanie najbliższego Slime'a do 24 m i widoczne strzały w locie.
- Kamera trzecioosobowa i kolizje terenowe.
- HUD, menu startowe i pauza, znacznik celu i odkrycie lokacji.
- Tekstury `.webp`.
- Zielone, skaczące Slime'y podążają za graczem, mają po 36 HP i animację trafienia.
- Automatyczne strzały zadające 18 obrażeń co 0,78 s (2 trafienia do pokonania Slime'a).
- Bohater ma 100 HP; kontakt ze Slime'em zadaje 12 obrażeń z sygnalizacją trafienia i krótkim cooldownem.
- Przy 0 HP pojawia się ekran końca wyprawy z przyciskiem ponownego startu.
- Każdy pokonany Slime pozostawia widoczny kryształ wart 5 EXP; kryształy przyciągają się do gracza.
- Bohater zaczyna na poziomie 1; wymagania kolejnych poziomów wynoszą 15, 30, 45 EXP, a następnie rosną o 15.
- HUD pokazuje poziom, postęp EXP i krótki efekt awansu.
- Awans zatrzymuje wyprawę i wyświetla trzy różne karty; wybór jednej wznawia grę, a kolejne awanse są kolejkowane.
- Osiem pasywnych ulepszeń do maksymalnego poziomu 5 zwiększa obrażenia, szybkostrzelność, ruch, HP, zasięg, magnetyzm, krytyki lub odporność.
- Podgląd buildu pokazuje zdobyte karty; wybór kart nie wywołuje menu pauzy.
- Liczniki przeciwników i pokonanych Slime'ów; nowych wrogów pojawia się maksymalnie 6 naraz.
- Zmiana nazwy projektu na **CalioBonk**, przygotowanie automatycznej publikacji na Pages z gałęzi `dev-mode`.

## GitHub Pages i gałęzie

Docelowe repozytorium: `The-RozU/CalioBonk` (osobne od `Calion Survivors`).

1. Utwórz repozytorium `CalioBonk` na GitHubie. Możesz zaznaczyć utworzenie początkowego README, żeby GitHub utworzył `main`.
2. Utwórz gałąź `dev-mode` na podstawie `main` i umieść na niej **zawartość tego folderu**. Nie kopiuj plików do `main`.
3. Wejdź w **Settings → Pages → Build and deployment**, ustaw źródło **GitHub Actions**.
4. Plik `.github/workflows/pages.yml` uruchomi build i wdrożenie z `dev-mode` (także przy kolejnych zmianach w tej gałęzi).
5. Gdy workflow zakończy się sukcesem, adres gry powinien mieć postać **https://the-rozu.github.io/CalioBonk/**, jeśli GitHub Pages jest włączony i repozytorium jest publiczne.

Plik `vite.config.ts` ustawia docelową ścieżkę zasobów (`base: '/CalioBonk/'`), a skrypt `scripts/verify-dist.mjs` sprawdza, czy zbudowany `index.html` odwołuje się do istniejących plików CSS i JavaScript. Workflow instaluje pakiety npm, kompiluje projekt i publikuje katalog `dist`; nie publikuje surowego `index.html`.

## Kolejny etap

W kolejnej wersji: rozwój postaci i zdobywanie doświadczenia.
