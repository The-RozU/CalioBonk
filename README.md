# CalioBonk

Gra 3D w świecie Calionu, inspirowana roguelike survival games. Projekt odrębny od **Calion Survivors**.

**Wersja:** 0.0.5  
**Technologia:** Three.js + TypeScript + Vite  
**Zakres:** prototyp eksploracji 3D z doskokiem, bez walki

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
| Mysz | Obrót kamery bez wygładzania wejścia |
| Shift (naciśnięcie) | Krótki doskok w kierunku ruchu (1,4 s odnowienia) |
| Spacja | Skok |
| Esc | Pauza i uwolnienie kursora |

## Zakres v0.0.5

- Leśna mapa 3D z ruinami i punktem docelowym.
- Model postaci low-poly z animacją chodu, skoku i doskoku.
- Kamera trzecioosobowa i kolizje terenowe.
- HUD, menu startowe i pauza, znacznik celu i odkrycie lokacji.
- Tekstury `.webp`.
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

Przeciwnicy, automatyczny atak, obrażenia i HP w następnej wersji po naprawie publikacji.
