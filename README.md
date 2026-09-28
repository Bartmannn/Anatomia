# Anatomia — atlas kręgosłupa 3D

Interaktywny, trójwymiarowy atlas kręgosłupa, który działa w przeglądarce. Model można obracać, przybliżać i klikać. Każdy kręg ma nazwy swoich części, opis budowy, uwagi „dla masażysty” i wybrane przyczepy mięśni.

**Strona:** https://bartmannn.github.io/Anatomia/

> **Wersja robocza.** Opisy i położenie etykiet wymagają weryfikacji przez nauczyciela anatomii. Atlas jest pomocą do nauki, a nie źródłem wiedzy medycznej.

## Po co to powstaje

To projekt hobbystyczny i niekomercyjny. Powstaje jako pomoc do nauki anatomii dla uczniów szkoły policealnej na kierunku **technik masażysta**. Podręcznikowe ryciny pokazują kość z jednej strony. Tutaj można ją obejrzeć ze wszystkich stron, zobaczyć, gdzie leży względem sąsiednich kręgów, i sprawdzić, które miejsca da się wyczuć pod palcami.

Atlas mogą swobodnie wykorzystywać uczniowie i nauczyciele. Uwagi i poprawki są mile widziane.

## Co potrafi

- **Model 3D kręgosłupa:** 24 kręgi (C1–L5), kość krzyżowa i 23 krążki międzykręgowe.
- **Nazwy części kości** z liniami odniesienia, np. trzon, łuk, otwór kręgowy, wyrostki kolczysty, poprzeczne i stawowe. Kręgi C1 i C2, kość krzyżowa i krążki mają własne nazwy.
- **Punkty wyczuwalne pod palcami** w widoku całego kręgosłupa: C2, C7, Th3, Th7, L4, S2.
- **Opisy każdego kręgu:** cechy budowy, wskazówki dla masażysty (palpacja, na co uważać), przyczepy mięśni.
- **Widoki** przód, bok, tył i góra. Można też pokazać tylko wybrany kręg, pokolorować odcinki albo ukryć krążki.
- **Quiz** — rozpoznawanie podświetlonego kręgu.
- **Tryb „Popraw punkty”** do ręcznego poprawiania położenia etykiet (opis niżej).
- Działa na komputerze i na telefonie, w jasnym i ciemnym motywie.

W modelu nie ma kości guzicznej, bo nie ma jej w użytym zbiorze danych.

## Uruchomienie

Strona nie wymaga instalowania zależności ani budowania. Wystarczy przeglądarka i dowolny prosty serwer HTTP.

> Otwarcie `index.html` podwójnym kliknięciem **nie zadziała**. Przeglądarka blokuje wczytywanie modelu z plików lokalnych (`file://`), dlatego potrzebny jest serwer.

### Docker

Wymaga [Docker Desktop](https://www.docker.com/products/docker-desktop/). W folderze projektu uruchom:

```
docker compose up
```

i otwórz http://localhost:8080. Folder jest podpięty „na żywo”: po zapisaniu zmian w plikach (np. `content.js`) wystarczy odświeżyć stronę. Zatrzymanie: `Ctrl+C`.

Można też zbudować samodzielny obraz:

```
docker build -t anatomia .
docker run --rm -p 8080:80 anatomia
```

### Python

Wymaga zainstalowanego [Pythona 3](https://www.python.org/downloads/). W folderze projektu uruchom:

```
python -m http.server 8000
```

Na Windowsie, jeśli `python` nie działa, spróbuj `py -m http.server 8000`. Potem otwórz http://localhost:8000.

### Node.js

Wymaga zainstalowanego [Node.js](https://nodejs.org/). Bez niego polecenie `npx` nie będzie rozpoznawane.

```
npx serve .
```

### Visual Studio Code

Zainstaluj rozszerzenie **Live Server**, otwórz folder projektu, kliknij prawym przyciskiem na `index.html` i wybierz *Open with Live Server*.

### Wymagania

Aktualna przeglądarka z obsługą WebGL: Chrome, Edge, Firefox lub Safari. Przy pierwszym wejściu strona pobiera ok. 6 MB (głównie model 3D).

## Publikacja na GitHub Pages

1. W repozytorium na GitHubie wejdź w *Settings → Pages*.
2. W *Build and deployment* wybierz *Source: Deploy from a branch*, gałąź `main`, folder `/ (root)`.
3. Po chwili strona będzie dostępna pod adresem `https://<nazwa-użytkownika>.github.io/<nazwa-repozytorium>/`.

Nie wgrywaj do repozytorium archiwów `.zip` z danymi źródłowymi. Są wykluczone w `.gitignore`.

## Jak pomóc

Chcesz poprawić opis albo położenie etykiety? Do większości poprawek nie trzeba niczego instalować. Wszystko jest opisane krok po kroku w pliku [CONTRIBUTING.md](CONTRIBUTING.md).

## Poprawianie punktów etykiet

Etykiety części kręgów są wyznaczane automatycznie z kształtu kości (skrajne punkty, promienie przez otwór kręgowy), więc każdy kręg warto sprawdzić:

1. Wybierz kręg i w panelu kliknij **Popraw punkty**.
2. Wybierz część (przy parzystych także stronę 1 lub 2) i kliknij na kości w miejscu, gdzie powinien być punkt. Dopracuj położenie strzałkami (1 mm, z Shift 5 mm). PgUp/PgDn przesuwa punkt w głąb.
3. Gdy wszystkie punkty kręgu są dobre, zaznacz **Sprawdziłem punkty tego kręgu**. Uczniowie zobaczą przy nim informację, że etykiety sprawdzono ręcznie.
4. Kliknij **Pobierz landmarks-fix.js**, podmień plik w folderze projektu i zrób commit.

Poprawki zapisują się w przeglądarce do czasu pobrania pliku. `landmarks.js` można w każdej chwili wygenerować od nowa skryptem, a poprawki z `landmarks-fix.js` nie zginą.

## Edycja opisów

Wszystkie teksty, czyli nazwy kręgów, cechy, uwagi dla masażysty, przyczepy mięśni, nazwy części kości i punkty wyczuwalne, są w pliku `content.js`. Można go edytować w zwykłym edytorze tekstu, bez znajomości reszty kodu. Po zapisaniu wystarczy odświeżyć stronę.

## Struktura projektu

| Plik / folder | Co to jest |
|---|---|
| `index.html`, `styles.css`, `app.js` | Strona (three.js, bez frameworków i bez budowania) |
| `content.js` | Wszystkie opisy i nazwy części kości |
| `landmarks.js` | Położenie etykiet wyznaczone automatycznie |
| `landmarks-fix.js` | Ręczne poprawki etykiet i lista sprawdzonych kręgów (tworzy go tryb „Popraw punkty”) |
| `models/kregoslup.glb` | Model 3D: kręgi, kość krzyżowa i krążki w jednym pliku (~5,4 MB) |
| `vendor/three/` | Biblioteka three.js r170 |
| `tools/build_glb.py` | Zamienia pliki STL z BodyParts3D na `models/kregoslup.glb` |
| `tools/landmarks.py` | Wyznacza z geometrii kości punkty do `landmarks.js` |
| `Dockerfile`, `compose.yaml`, `docker/` | Uruchomienie strony w kontenerze (nginx) |
| `CONTRIBUTING.md` | Jak zgłaszać i wprowadzać poprawki |

## Odtworzenie modelu z danych źródłowych

Potrzebne są Python 3 z biblioteką `numpy` oraz pliki STL kręgów z repozytorium [BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) (folder `assets/BodyParts3D_data/stl`). Listę użytych plików (identyfikatory FMA) znajdziesz na początku skryptów.

```
pip install numpy
python tools/build_glb.py <folder_z_plikami_stl> models/kregoslup.glb
python tools/landmarks.py <folder_z_plikami_stl> landmarks.js
```

## Licencje i autorzy

**Modele 3D** — BodyParts3D, © The Database Center for Life Science (DBCLS), licencja [CC BY-SA 2.1 JP](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en).
Dane pobrane z repozytorium [Kevin-Mattheus-Moerman/BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) (wersja 3.0 / 20110915, pliki STL przekonwertowane z oryginalnych OBJ).
Wprowadzone zmiany: wybór części kręgosłupa, zmiana układu osi i skali, scalenie wierzchołków, obliczenie normalnych, kwantyzacja i zapis do formatu glTF (GLB). Pliki `models/kregoslup.glb`, `landmarks.js` i `landmarks-fix.js` (współrzędne na tych samych modelach) są udostępniane na tej samej licencji CC BY-SA 2.1 JP.

Publikacja źródłowa:
> Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. *BodyParts3D: 3D structure database for anatomical concepts.* Nucleic Acids Res. 2009;37(Database issue):D782–5. https://doi.org/10.1093/nar/gkn613
> Archiwum danych: https://doi.org/10.18908/lsdba.nbdc00837-000

**three.js** — © three.js authors, licencja MIT (`vendor/three/LICENSE`).

**Kod strony i skrypty** (`index.html`, `styles.css`, `app.js`, `tools/`) — licencja MIT (`LICENSE`).

**Opisy** (`content.js`) — licencja CC BY-SA 4.0.

Dziękujemy autorom BodyParts3D za udostępnienie ich pracy.
