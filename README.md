# CalioBonk

Gra 3D w świecie Calionu, inspirowana roguelike survival games. Projekt odrębny od **Calion Survivors**.

**Wersja:** 0.0.13  
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

## Zakres v0.0.13

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
- Potrójny Strzał, Zatruta Strzała i Przebijająca Strzała są odblokowywane jako osobne ataki z własnymi cooldownami; maksymalnie aktywne są trzy ataki łącznie z łukiem.
- Ulepszenia tych ataków zwiększają ich skuteczność; obrażenia krytyczne, liczby obrażeń i zielony efekt trucizny poprawiają czytelność walki.
- Slime został pomniejszony, uproszczony do galaretowatej kulki, a hitbox i zasięg kontaktu dopasowano do nowej skali.
- Panel diagnostyczny dostępny przez `?debug=1` pokazuje FPS, wrogów, pociski, efekty, kryształy EXP, tryb Slime’ów i liczbę wywołań rysowania.
- Dodano proceduralny sprite Slime’a jako wariant billboardowy. `?slime=sprite` włącza sprite’y, a `?slime=3d` wraca do modelu low-poly; domyślny wariant to sprite.
- Oba warianty korzystają z tej samej logiki ruchu, skoków, HP, obrażeń, trucizny, EXP i hitboxów.
- Panel `?debug=1` udostępnia limity testowe hord: 25, 50, 100, 200 i 300 Slime’ów.
- Kolizje świata używają indeksu przestrzennego; pociski są ponownie wykorzystywane, liczby obrażeń mają limit, a bliskie kryształy łączą EXP bez strat.
- Liczniki przeciwników i pokonanych Slime'ów; nowych wrogów pojawia się maksymalnie 6 naraz.
- Zmiana nazwy projektu na **CalioBonk**, przygotowanie automatycznej publikacji na Pages z gałęzi `dev-mode`.

## GitHub Pages i gałęzie

Repozytorium: `The-RozU/CalioBonk`. Zmiany rozwojowe trafiają wyłącznie do `dev-mode`; `main` pozostaje bez zmian.

Workflow `.github/workflows/pages.yml` uruchamia się po zmianach na `dev-mode`: instaluje zależności, sprawdza grę, buduje `dist` i publikuje go przez GitHub Pages. Adres gry: **https://the-rozu.github.io/CalioBonk/**.

Do porównania wariantów użyj `?debug=1&slime=sprite` oraz `?debug=1&slime=3d`. W panelu wybierz ten sam limit hordy (25, 50, 100, 200 lub 300) i porównuj FPS oraz wywołania rysowania na tym samym urządzeniu.

Plik `vite.config.ts` ustawia ścieżkę zasobów (`base: '/CalioBonk/'`), a `scripts/verify-dist.mjs` sprawdza, czy zbudowany `index.html` odwołuje się do istniejących plików CSS i JavaScript.

## Dalsze prace

Wykonać pomiary obu wariantów na tym samym urządzeniu przy kolejnych limitach hordy, a następnie dostroić renderowanie i gęstość przeciwników na podstawie odczytów FPS oraz wywołań rysowania.
