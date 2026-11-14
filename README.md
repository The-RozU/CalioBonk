# CalioBonk

Gra 3D w świecie Calionu, inspirowana roguelike survival games. Projekt odrębny od **Calion Survivors**.

**Wersja:** 0.0.19  
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

## Zakres v0.0.19

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
- Pokonane Slime’y upuszczają Gwiazdy Esencji (sprite’y); każda warta jest 5 EXP. Gwiazdki pulsują, obracają się i przyciągają się do gracza.
- Przy scalaniu pobliskich gwiazdek zwiększa się wartość i zmienia ich odcień (zielony od 25 EXP, złoty od 100 EXP); EXP nie przepada.
- Gwiazdki współdzielą jedną proceduralną teksturę/material i są ponownie wykorzystywane przez pulę obiektów.
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
- **Solo v0.0.19:** fale Slime’ów zamiast pojedynczych spawnów (7, 10, 13, 16 itd., maksymalnie 42 nowe potwory na falę), kolejne co 25 sekund lub szybciej po wybiciu całej grupy; maksymalna liczba aktywnych mobów rośnie wraz z falą do 120.
- **Solo v0.0.19:** miękkie odpychanie Slime’ów z indeksem przestrzennym, dystansem około 0,72 jednostki i bez sztywnych kolizji, zarówno dla sprite’ów, jak i modelu 3D.
- **Solo v0.0.19:** zegar przetrwania MM:SS, numer fali i czas do kolejnej grupy w HUD. Pauza i wybieranie kart w Solo zatrzymują zegar i potwory; ekran śmierci pokazuje czas, falę oraz zabójstwa.
- Zmiana nazwy projektu na **CalioBonk**, przygotowanie automatycznej publikacji na Pages z gałęzi `dev-mode`.

## GitHub Pages i gałęzie

Repozytorium: `The-RozU/CalioBonk`. Zmiany rozwojowe trafiają wyłącznie do `dev-mode`; `main` pozostaje bez zmian.

Workflow `.github/workflows/pages.yml` uruchamia się po zmianach na `dev-mode`: instaluje zależności, sprawdza grę, buduje `dist` i publikuje go przez GitHub Pages. Adres gry: **https://the-rozu.github.io/CalioBonk/**.

Do porównania wariantów użyj `?debug=1&slime=sprite` oraz `?debug=1&slime=3d`. W panelu wybierz ten sam limit hordy (25, 50, 100, 200 lub 300) i porównuj FPS oraz wywołania rysowania na tym samym urządzeniu.

Plik `vite.config.ts` ustawia ścieżkę zasobów (`base: '/CalioBonk/'`), a `scripts/verify-dist.mjs` sprawdza, czy zbudowany `index.html` odwołuje się do istniejących plików CSS i JavaScript.

## Dalsze prace

Wykonać pomiary obu wariantów na tym samym urządzeniu przy kolejnych limitach hordy, a następnie dostroić renderowanie i gęstość przeciwników na podstawie odczytów FPS oraz wywołań rysowania.


## Multiplayer ALFA: lokalny test dwóch graczy

Serwer synchronizuje pozycję i kierunek graczy oraz wspólną podstawową hordę Slime’ów (spawn, ruch, 36 HP, podstawowy atak łuku 18 obrażeń co 0,78 s, śmierć, licznik zabójstw), stan HP graczy i EXP drużyny (+5 na pokonanego Slime’a). Pokoje są prywatne (5-znakowy kod, do 4 osób). Gra Solo działa bez serwera.

**v0.0.18:** w online Slime’y pojawiają się falami: pierwsza fala 18 sztuk, następne co około 16 sekund (lub wcześniej, gdy poprzednia została wybita), kolejne fale rosną, do limitu 80 aktywnych wrogów. Serwer wysyła `waveStarted` i `arrowFired`. Obie przeglądarki animują widoczne strzały własnego oraz drugiego łucznika; serwer nalicza trafienia dopiero po czasie lotu strzały, a także synchronizuje obrażenia i śmierci Slime’ów. HUD wskazuje numer fali i liczbę wrogów.

To nadal PROTOTYP: atak łuku w online używa podstawowego tempa i obrażeń, a specjalne ataki, poison, efekty buildów oraz serwerowe kolizje mapy nie są jeszcze zsynchronizowane. EXP trafia bezpośrednio do wszystkich uczestników po zabójstwie, bez gwiazdek na ziemi. Lokalna pauza Esc lub zmiana okna **nie pauzuje wspólnego pokoju**: bohater może dalej automatycznie strzelać i otrzymywać obrażenia. Na etapie ALFA nie ma ochrony przed obrażeniami podczas wyboru kart.

Po zainstalowaniu zależności uruchom DWA terminale w katalogu repozytorium:

Terminal 1:
    npm install
    npm run dev:server

Terminal 2:
    npm run dev

Otwórz lokalny adres gry podany przez Vite w dwóch oknach przeglądarki, zwykle http://localhost:5173/CalioBonk/ . W obu kliknij GRA ZE ZNAJOMYMI · ALFA. W pierwszym utwórz pokój i skopiuj kod; w drugim dołącz tym kodem. Następnie w obu kliknij WEJDŹ DO WYPRAWY. W jednym momencie mysz może być przechwycona tylko przez jedno aktywne okno.

Serwer to mała usługa Node.js z biblioteką ws, obsługująca podstawowe współdzielone potwory i obrażenia (bez wszystkich umiejętności i pełnej walidacji ruchu). Domyślnie nasłuchuje na 127.0.0.1:2567; zmienne HOST i PORT pozwalają dostosować adres. Aby użyć innego serwera, skonfiguruj VITE_MULTIPLAYER_WS w pliku .env.local przed uruchomieniem Vite, np. VITE_MULTIPLAYER_WS=ws://127.0.0.1:2567 . NIE wystawiaj testowego serwera bezpośrednio do internetu.

GitHub Pages nadal publikuje tylko klienta. Bez oddzielnego hostingu WSS multiplayer internetowy nie działa. Przed publiczną kooperacją należy rozszerzyć symulację o specjalne ataki i buildy, walidację ruchu, synchronizację EXP w postaci gwiazdek, poprawne kolizje mapy, ochronę przed oszustwami oraz ponowne połączenia.

Test fal i pocisków: npm run test:horde

Test protokołu dwóch klientów: npm run test:multiplayer

Dostosowanie v0.0.18: fale rozdzielane są między aktywnych graczy, a obrażenia kontaktowe obniżono do 6 na 1,2 s, aby testowanie rosnących hord było możliwe. Test integracyjny weryfikuje strzały obu graczy bez zakładania kolejności trafień.

## Testy rozgrywki Solo v0.0.19

Uruchom `npm run test:solo`, aby sprawdzić narastanie fal, limity aktywnych mobów, brak odpychania odległych Slime’ów i rozdzielenie 250 nałożonych sprite’ów. Mechanika jest dostępna w Solo bez uruchamiania serwera. Multiplayer ALFA pozostawiono bez zmian i nadal wymaga lokalnego serwera; osobne testy protokołu online to `npm run test:multiplayer` i `npm run test:horde`.

Pierwsza fala: 7 Slime’ów, druga: 10, trzecia: 13. Fale nadchodzą co około 25 sekund czasu aktywnej rozgrywki; gdy wszystkie wcześniejsze potwory zginą, kolejna grupa pojawi się po krótkim odpoczynku. Licznik czasu nie nalicza pauzy ani wyboru ulepszenia. Panel `?debug=1` nadal pozwala testować 25–300 wrogów, bez wpływania na zwykły balans Solo.
