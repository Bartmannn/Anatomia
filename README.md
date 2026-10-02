# Anatomia — atlas 3D dla techników masażystów

Interaktywny, trójwymiarowy atlas kręgosłupa i mięśni grzbietu, który działa w przeglądarce. Model można obracać, przybliżać i klikać. Każdy kręg ma nazwy swoich części, opis budowy i uwagi „dla masażysty”, a każdy mięsień — przyczepy (zaznaczone na kościach), działanie i unerwienie.

**Strona:** https://bartmannn.github.io/Anatomia/

> **Wersja robocza.** Opisy i położenie etykiet wymagają weryfikacji przez nauczyciela anatomii. Atlas jest pomocą do nauki, a nie źródłem wiedzy medycznej.

## Po co to powstaje

To projekt hobbystyczny i niekomercyjny. Powstaje jako pomoc do nauki anatomii dla uczniów szkoły policealnej na kierunku **technik masażysta**. Podręcznikowe ryciny pokazują kość z jednej strony. Tutaj można ją obejrzeć ze wszystkich stron, zobaczyć, gdzie leży względem sąsiednich kręgów, i sprawdzić, które miejsca da się wyczuć pod palcami.

Atlas mogą swobodnie wykorzystywać uczniowie i nauczyciele. Uwagi i poprawki są mile widziane.

## Co potrafi

- **Moduły do wyboru.** Kości: *Cały kręgosłup*, *Pojedyncze kręgi* (jeden kręg naraz, w pełnej szczegółowości) i *Kręgi piersiowe i żebra*. Mięśnie: *Mięśnie grzbietu*. Strona pobiera tylko wybrany moduł.
- **Mięśnie grzbietu warstwami.** Warstwa powierzchowna: mięsień czworoboczny (części zstępująca, poprzeczna i wstępująca) i najszerszy grzbietu. Warstwa pośrednia: mięśnie równoległoboczne (większy i mniejszy), dźwigacz łopatki i mięśnie zębate tylne (górny i dolny). Warstwa głęboka: prostownik grzbietu — mięśnie biodrowo-żebrowy, najdłuższy i kolcowy (z częściami lędźwiową, piersiową, szyjną i głowową) — oraz mięśnie płatowate głowy i szyi. Po wybraniu mięśnia z głębszej warstwy warstwy nad nim stają się przezroczyste. Po wybraniu mięśnia jego przyczepy podświetlają się na kościach (kręgi, łopatka, obojczyk, kość ramienna, potyliczna, biodrowa, żebra), a po najechaniu na część w opisie — tylko przyczepy tej części. Najgłębszych mięśni (poprzeczno-kolcowych, np. wielodzielnego) jeszcze nie ma.
- **Model 3D kręgosłupa:** 24 kręgi (C1–L5), kość krzyżowa i 23 krążki międzykręgowe.
- **Nazwy części kości** z liniami odniesienia, np. trzon, łuk, otwór kręgowy, wyrostki kolczysty, poprzeczne i stawowe. Kręgi C1 i C2, kość krzyżowa i krążki mają własne nazwy.
- **Żebra i ich połączenia z kręgami piersiowymi**: dołki żebrowe trzonu (górny i dolny) i wyrostka poprzecznego są zaznaczone kolorem, a po włączeniu przycisku *Żebra* widać, jak układają się w nich głowa i guzek żebra (staw głowy żebra, staw żebrowo-poprzeczny).
- **Punkty wyczuwalne pod palcami** w widoku całego kręgosłupa: C2, C7, Th3, Th7, L4, S2.
- **Opisy każdego kręgu:** cechy budowy, wskazówki dla masażysty (palpacja, na co uważać), przyczepy mięśni.
- **Widoki** przód, bok, tył i góra. Można też pokazać tylko wybrany kręg, pokolorować odcinki albo ukryć krążki.
- **Quiz** z kilkoma rodzajami pytań: *Który kręg?* (podświetlony kręg, a w module *Pojedyncze kręgi* — sam kształt), *Która część?* (zaznaczony punkt na kręgu), *Który mięsień?* i *Czyje przyczepy?* (świecą tylko przyczepy na kościach).
- **Tryb „Popraw lub dodaj punkty”** do ręcznego poprawiania położenia etykiet i dodawania brakujących części, a także przycisk **Zgłoś brak lub błąd** (opis niżej).
- **Linki do konkretnego widoku**, np. `…/Anatomia/#kregi/Th7` (moduł / kręg) — wygodne do wysłania w grupie.
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

Aktualna przeglądarka z obsługą WebGL: Chrome, Edge, Firefox lub Safari (iOS 16.4 lub nowszy). Przy pierwszym wejściu strona pyta, co chcesz oglądać, i nic nie pobiera przed wyborem:

| Moduł | Na start | Potem |
|---|---|---|
| Cały kręgosłup | ok. 260 kB | 22–150 kB za każdy wybrany lub mocno przybliżony kręg |
| Pojedyncze kręgi | 22–150 kB | tyle samo za każdy kolejny kręg |
| Kręgi piersiowe i żebra | ok. 220 kB | szczegóły kręgu i 2 par żeber przy nim |
| Mięśnie grzbietu | ok. 590 kB | ok. 85 kB za warstwę pośrednią i 130 kB za głęboką (po włączeniu) |

Dla porównania pełny model w jednym pliku miał ok. 8 MB.

## Wydajność

Strona jest przygotowana z myślą o telefonach:

- **Pobieranie na żądanie i poziomy szczegółów.** Na start wczytuje się model uproszczony (ok. 2 tys. trójkątów na kręg, razem ok. 70 tys. zamiast 600 tys.). Pełna siatka kręgu dochodzi, gdy kręg jest wybrany albo zajmuje dużo miejsca na ekranie, a po oddaleniu widoku kręg wraca do wersji uproszczonej. Sąsiednie kręgi pobierają się w tle, chyba że w telefonie włączone jest oszczędzanie danych. Pobrane części zostają w pamięci, więc powrót do nich nic nie kosztuje.
- **Rysowanie na żądanie.** Nowa klatka powstaje tylko, gdy coś się zmienia. W spoczynku karta nie obciąża procesora ani karty graficznej.
- **Rozdzielczość zależna od ruchu.** Przy szybkim obracaniu obraz jest rysowany w 75% albo 50% rozdzielczości (do osobnego bufora, więc zmiana poziomu nie przebudowuje płótna), a po zatrzymaniu wraca pełna ostrość. Słabsze urządzenia dostają dodatkowo niższy pułap, wyliczany z czasu klatki.
- **Płynne przybliżanie kółkiem.** Każdy „ząbek” kółka myszy jest rozkładany na kilka klatek zamiast skoku o kilka procent naraz.
- **Tańszy materiał na telefonach.** Na ekranach dotykowych (i automatycznie, gdy urządzenie nie nadąża) zamiast realistycznego materiału używany jest matcap, czyli oświetlenie zapisane w jednej teksturze.
- **Szybkie celowanie.** Trafienia kursorem i zasłanianie etykiet są liczone na uproszczonych bryłach (ok. 8× mniej trójkątów), a podświetlanie pod kursorem najwyżej raz na klatkę.

Dopisz `&debug` na końcu adresu (np. `http://localhost:8000/#kregoslup/C7&debug`), żeby zobaczyć licznik: klatki na sekundę, czas rysowania, liczbę trójkątów, aktualną rozdzielczość i przełącznik jakości.

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
2. Wybierz część (przy parzystych także stronę: lewą lub prawą — to strona ciała, nie ekranu) i kliknij na kości w miejscu, gdzie powinien być punkt. Dopracuj położenie strzałkami (1 mm, z Shift 5 mm). PgUp/PgDn przesuwa punkt w głąb.
3. Gdy wszystkie punkty kręgu są dobre, zaznacz **Sprawdziłem punkty tego kręgu**. Uczniowie zobaczą przy nim informację, że etykiety sprawdzono ręcznie.
4. Kliknij **Pobierz landmarks-fix.js**, podmień plik w folderze projektu i zrób commit.

### Brakujący punkt

Jeśli w kręgu brakuje jakiejś części, w trybie **Popraw lub dodaj punkty** jest formularz *Brakuje punktu?*: wpisz nazwę (opcjonalnie nazwę łacińską, opis, czy jest parzysta i czy wyczuwalna pod palcami), kliknij **Dodaj i wskaż na modelu** i kliknij na kości. Nowy punkt pojawia się w opisie kręgu i na modelu z dopiskiem „dodany”, trafia też do quizu „Która część?”. Zapisuje się w `landmarks-fix.js` (sekcja `EXTRA`) razem z pozostałymi poprawkami.

Kto nie ma dostępu do repozytorium, może kliknąć **Zgłoś brak lub błąd** w opisie kręgu. Otwiera się gotowe zgłoszenie (GitHub Issues) z nazwą kręgu; przy dodanym punkcie także z jego nazwą i położeniem. Potrzebne jest konto na GitHubie.

Poprawki zapisują się w przeglądarce do czasu pobrania pliku. `landmarks.js` można w każdej chwili wygenerować od nowa skryptem, a poprawki z `landmarks-fix.js` nie zginą.

## Edycja opisów

### Gdzie zmienić nazwę punktu

| Co | Gdzie |
|---|---|
| Nazwy części wspólne dla większości kręgów (trzon, łuk, wyrostki, dołki żebrowe, części żeber) | `content.js` → `PART_LABELS` |
| Nazwy części nietypowych kręgów i ich wyjątki (C1, C2, C3–C5, Th1, Th10–Th12, odcinek lędźwiowy, kość krzyżowa, krążki) | `content.js` → `PART_LABELS_SPECIAL` |
| Punkty wyczuwalne pod palcami w widoku całego kręgosłupa (C2, C7, Th3, Th7, L4, S2) | `content.js` → `PALPATION` |
| Opisy kręgów (nazwa kręgu, cechy, uwagi dla masażysty) | `content.js` → `PARTS` |
| Mięśnie, ich części i przyczepy | `content-miesnie.js` |
| Punkty dodane ręcznie | `landmarks-fix.js` → `EXTRA` (pole `name`) albo w trybie „Popraw lub dodaj punkty” → *Nazwa i opis tego punktu* |

Każdy wpis ma `name` (nazwa polska), `latin` (łacińska) i `def` (opis). Zmiana nazwy w `PART_LABELS` działa we wszystkich kręgach naraz, a wpis w `PART_LABELS_SPECIAL` tylko w wybranym. Położenia punktów to osobna sprawa — są w `landmarks.js` i `landmarks-fix.js`.

Wszystkie teksty, czyli nazwy kręgów, cechy, uwagi dla masażysty, przyczepy mięśni, nazwy części kości i punkty wyczuwalne, są w pliku `content.js`. Opisy mięśni (przyczepy, działanie, unerwienie, masaż i listy kości do podświetlenia) są w `content-miesnie.js`. Można go edytować w zwykłym edytorze tekstu, bez znajomości reszty kodu. Po zapisaniu wystarczy odświeżyć stronę.

## Struktura projektu

| Plik / folder | Co to jest |
|---|---|
| `index.html`, `styles.css`, `app.js` | Strona (three.js, bez frameworków i bez budowania) |
| `content.js` | Opisy kręgów i nazwy części kości |
| `content-miesnie.js` | Opisy mięśni i ich przyczepów |
| `miesnie.js` | Część strony obsługująca moduł mięśni (panel, lista mięśni, etykiety) |
| `landmarks.js` | Położenie etykiet wyznaczone automatycznie |
| `landmarks-fix.js` | Ręczne poprawki etykiet i lista sprawdzonych kręgów (tworzy go tryb „Popraw punkty”) |
| `models/pakiety/` | Model podzielony na małe paczki, które strona pobiera na żądanie: przegląd odcinków, pełne kręgi, pary żeber (`spis.js` — lista z rozmiarami) |
| `models/kregoslup.glb` | Pełny model kręgosłupa w standardowym formacie glTF (~5,4 MB); źródło paczek, strona go nie pobiera |
| `models/zebra.glb` | 24 żebra i powierzchnie dołków żebrowych w formacie glTF (~2,8 MB); źródło paczek |
| `landmarks-ribs.js` | Punkty połączeń żeber z kręgami (dołki, głowa, szyjka i guzek żebra) |
| `vendor/three/` | Biblioteka three.js r170 |
| `tools/build_glb.py` | Zamienia pliki STL z BodyParts3D na `models/kregoslup.glb` |
| `tools/landmarks.py` | Wyznacza z geometrii kości punkty do `landmarks.js` |
| `tools/ribs.py` | Buduje `models/zebra.glb` i wyznacza stawy żebrowo-kręgowe do `landmarks-ribs.js` |
| `tools/build_packs.py` | Dzieli oba modele na paczki w `models/pakiety/` i przygotowuje wersje uproszczone |
| `tools/muscles.py` | Buduje paczki mięśni (`models/pakiety/miesnie/`) i kości tła (`kosci-tla.pak`) |
| `Dockerfile`, `compose.yaml`, `docker/` | Uruchomienie strony w kontenerze (nginx) |
| `CONTRIBUTING.md` | Jak zgłaszać i wprowadzać poprawki |

## Odtworzenie modelu z danych źródłowych

Potrzebne są Python 3 z bibliotekami `numpy` i `scipy` oraz pliki STL kręgów, żeber, mięśni i kości tła z repozytorium [BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) (folder `assets/BodyParts3D_data/stl`), najlepiej wszystkie w jednym folderze. Listę użytych plików (identyfikatory FMA) znajdziesz na początku skryptów.

```
pip install numpy scipy
python tools/build_glb.py <folder_z_plikami_stl> models/kregoslup.glb
python tools/landmarks.py <folder_z_plikami_stl> landmarks.js
python tools/ribs.py <folder_z_plikami_stl>
python tools/build_packs.py
python tools/muscles.py <folder_z_plikami_stl>
```

Ostatni krok (ok. minuty) trzeba powtórzyć po każdej zmianie `models/kregoslup.glb` lub `models/zebra.glb`.

## Licencje i autorzy

**Modele 3D** — BodyParts3D, © The Database Center for Life Science (DBCLS), licencja [CC BY-SA 2.1 JP](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en).
Dane pobrane z repozytorium [Kevin-Mattheus-Moerman/BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) (wersja 3.0 / 20110915, pliki STL przekonwertowane z oryginalnych OBJ).
Wprowadzone zmiany: wybór kręgów, krążków, żeber, mięśni grzbietu i kości obręczy barkowej, kości ramiennej, biodrowej i potylicznej, uproszczenie siatek żeber, zmiana układu osi i skali, scalenie wierzchołków, obliczenie normalnych, kwantyzacja i zapis do formatu glTF (GLB), podział na paczki z wersjami uproszczonymi i kompresja. Pliki `models/kregoslup.glb`, `models/zebra.glb`, `models/pakiety/`, `landmarks.js`, `landmarks-ribs.js` i `landmarks-fix.js` (współrzędne na tych samych modelach) są udostępniane na tej samej licencji CC BY-SA 2.1 JP.

Publikacja źródłowa:
> Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. *BodyParts3D: 3D structure database for anatomical concepts.* Nucleic Acids Res. 2009;37(Database issue):D782–5. https://doi.org/10.1093/nar/gkn613
> Archiwum danych: https://doi.org/10.18908/lsdba.nbdc00837-000

**three.js** — © three.js authors, licencja MIT (`vendor/three/LICENSE`).

**Kod strony i skrypty** (`index.html`, `styles.css`, `app.js`, `miesnie.js`, `tools/`) — licencja MIT (`LICENSE`).

**Opisy** (`content.js`, `content-miesnie.js`) — licencja CC BY-SA 4.0.

Dziękujemy autorom BodyParts3D za udostępnienie ich pracy.
