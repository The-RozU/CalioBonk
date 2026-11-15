# CalioBonk

Gra 3D w świecie Calionu, inspirowana roguelike survival games. Projekt odrębny od **Calion Survivors**.

**Wersja:** 0.0.29  
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

## Zakres v0.0.28

- Leśna mapa 3D z ruinami i punktem docelowym.
- Model łucznika low-poly z łukiem, kołczanem i animacją naciągania; zachowano chód, skok i doskok.
- Automatyczne namierzanie najbliższego Slime'a do 13,5 m w Solo (zwiększane kartą zasięgu) i widoczne strzały w locie.
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
- **Solo v0.0.22:** niekończące się **serie** 4–10 Slime’ów przywoływane co około 3,6–6,5 sekundy aktywnej rozgrywki. Potwory pojawiają się 21–29 jednostek od gracza, w świetlistej strefie przywołania, z 1,3-sekundowym ostrzeżeniem. Limit żywych rośnie wraz z czasem do 115; nie ma numerów fal.
- **Solo v0.0.19:** miękkie odpychanie Slime’ów z indeksem przestrzennym, dystansem około 0,72 jednostki i bez sztywnych kolizji, zarówno dla sprite’ów, jak i modelu 3D.
- **Solo v0.0.22:** zegar przetrwania MM:SS i czas do kolejnej serii w HUD. Pauza i wybieranie kart w Solo zatrzymują zegar oraz potwory; ekran śmierci pokazuje czas, poziom i liczbę zabójstw. Panele HP/EXP i celu/walki tworzą osobne, niekolidujące pionowe kolumny.
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

Uruchom `npm run test:solo`, aby sprawdzić tempo krótkich serii, ich limity, dystans przywołań i rozdzielenie 250 nałożonych sprite’ów. Mechanika jest dostępna w Solo bez uruchamiania serwera. Multiplayer ALFA pozostawiono bez zmian i nadal wymaga lokalnego serwera; osobne testy protokołu online to `npm run test:multiplayer` i `npm run test:horde`.

Pierwsze przywołanie: 4–5 Slime’ów po 1,3 sekundy świetlnego ostrzeżenia. Następne grupy nadchodzą co około 6,5 sekundy czasu aktywnej rozgrywki, z czasem coraz szybciej. Zegar zatrzymuje się podczas pauzy i wyboru ulepszenia. Panel `?debug=1` nadal umożliwia test 25–300 wrogów, niezależnie od normalnego balansu Solo.


## v0.0.20: cztery odmiany Slime’ów w Solo

Nowe typy wprowadzane stopniowo, bez zmiany zasad multiplayer ALFA:

| Typ | Od czasu Solo | HP | Ruch | Obrażenia kontaktowe | EXP | Właściwość |
| --- | --- | ---: | --- | ---: | ---: | --- |
| Zielony | start | 36 | zwykły (3,0) | 12 | 5 | podstawowy przeciwnik |
| Niebieski | ~38 s | 24 | szybki (4,8), zygzaki | 9 | 5 | częste skoki |
| Czerwony | ~76 s | 96 | powolny (2,0), większy | 18 | 12 | wytrzymały i groźny przy kontakcie |
| Toksyczny | ~114 s | 48 | umiarkowany (2,7) | 10 | 8 | po lądowaniu pozostawia kałuże trucizny |

- Kolory sprite’ów uzyskiwane są proceduralnie z oryginalnej tekstury i współdzielone przez wszystkie Slime’y tego typu. Modele 3D również mają przypisane kolory. Nie trzeba pobierać dodatkowych obrazów.
- Kałuże trucizny są widoczne na ziemi, trwają 4,2 s i zadają 7 obrażeń przy wejściu; można je przeskoczyć. Ich liczba jest ograniczona do 28, a zasoby wizualne są zwalniane po zniknięciu kałuży.
- Nagrody EXP zależą od typu, także podczas scalania Gwiazd Esencji. Na początku rozgrywki pojawiają się wyłącznie Zielone Slime’y.
- Około 38., 76. i 114. sekundy aktywnej gry komunikat sygnalizuje odblokowanie nowego typu przeciwnika. Poprzedni system fal multiplayer nadal pozostaje bez zmian.
- Testy zasad i balansu typów: \`npm run test:variants\`. Testy działają również w GitHub Actions.

**v0.0.21:** poprawka zgodności z rygorystycznym sprawdzaniem TypeScript przy generowaniu kolorów tekstur Slime’ów. Brak zmian w mechanikach rozgrywki.


## v0.0.22: ciągły napływ Slime’ów, przywołania i HUD

- Zamiast fal numerowanych w Solo pojawiają się niewielkie serie Slime’ów. Ich tempo i liczebność rosną płynnie z czasem.
- Każde miejsce przywołania jest zapowiedziane kolumną światła z nieba, rozświetlonym kręgiem i drobnymi iskrami. Efekt zanika po około 3,5 sekundy. Slime’y wychodzą z tej strefy po 1,3 sekundy.
- Zasięg podstawowego i specjalnych ataków łucznika wynosi bazowo 13,5 jednostki; karta zasięgu nadal go zwiększa. Wszystkie Slime’y aktywnie podążają w kierunku postaci, niezależnie od odległości, i próbują obejść przeszkody.
- Lewa i prawa część HUD mają niezależne pionowe kolumny, więc panele nie powinny na siebie nachodzić. Zamiast fali HUD Solo wyświetla czas do następnej serii.
- Multiplayer pozostaje eksperymentalny i **nie jest objęty** nowym systemem spawnów. Nie wymaga uruchamiania serwera przy grze Solo.

**v0.0.23:** porządkowa poprawka kompilacji strict TypeScript: usunięto nieużywane pole trybu debugowania przywołań. Wszystkie zmiany rozgrywki z v0.0.22 pozostają aktywne.

## Poprawka modelu łucznika v0.0.26

- Naprawiono kaptur: pełna ciemna osłona głowy z niewielkim otworem na twarz zastępuje wcześniejszą półkulę, przez którą wystawała jasna głowa.
- Łuk jest zamocowany przy lewej dłoni, wysuniętej w przód i na bok, zamiast zachodzić na klatkę piersiową.
- Kompensowanie obrotu ramienia utrzymuje łuk pionowo przy chodzeniu, doskoku i naciąganiu. Zmniejszono średnicę ramion łuku i cięciwy.
- Poprawiono pozę spoczynkową i animację strzału. Bez zmian mechaniki celowania, hitboxa, statystyk ani zasobów multiplayer.
- Test statyczny kontroluje osadzenie broni i animacji, a kompilacja TypeScript/Vite w GitHub Actions sprawdza zgodność kodu.

**v0.0.27:** skrypt kontroli automatycznie porównuje numer wersji w HUD z `package.json`, bez wpisywania kolejnego numeru na sztywno. Poprawki modelu z v0.0.26 bez zmian.

**v0.0.28:** poprawiono chwyt łuku: środek rękojeści znajduje się przy dłoni, a cięciwa jest napięta w poprzek łuku. Przy strzale lewa ręka wysuwa łuk, prawa zgina przedramię i przyciąga dłoń do twarzy; na czas naciągania pojawia się strzała, która znika przed wypuszczeniem pocisku. Ruch, skok, doskok, hitbox i logika ataku pozostają bez zmian.


## v0.0.29: rzadkości kart i jedno przelosowanie na wyprawę

- Po awansie losujesz **3 różne karty**, z ograniczeniem maksymalnie dwóch rodzajów odblokowanych ataków specjalnych (jak dotychczas).
- Każda karta ma rzadkość: **Zwykła** (1 poziom), **Rzadka** (2), **Epicka** (3) albo **Legendarna** (4). Wartość bonusu i ranga ulepszenia rosną o rzeczywistą liczbę przyznanych poziomów, najwyżej do poziomu 5. Jeśli karta dobiłaby do limitu, wyświetlana rzadkość odzwierciedla realną siłę.
- Szanse zależą lekko od poziomu bohatera. Na pierwszym poziomie wynoszą około 65%/27%/7%/1%; przy wysokim poziomie około 45%/36%/16%/3%.
- Masz **jedno przelosowanie na całą wyprawę**. Karty po przelosowaniu starają się nie powtarzać, o ile jest dostatecznie dużo dostępnych ulepszeń. Przelosowanie nie zużywa awansu.
- Dostępna jest również nowa, powtarzalna karta **Zapas Bandaży**: +5 maks. HP i +10 aktualnego HP za każdy przyznany poziom. Zapobiega pustemu ekranowi wyboru w bardzo długich rundach.
- Karty mają własne kolory rzadkości i etykiety rang. Pauza wyboru w Solo nie wpływa na zegar przetrwania. Multiplayer oraz modele, animacje i mechanika łuku nie były w tej wersji zmieniane.
- Testy losowania, rzadkości, limitów aktywnych umiejętności i przelosowania: npm run test:upgrades.
