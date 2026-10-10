# Anatomia — atlas 3D dla techników masażystów

Interaktywny, trójwymiarowy atlas kręgosłupa, obręczy barkowej, czaszki i mięśni grzbietu, który działa w przeglądarce. Model można obracać, przybliżać i klikać. Każdy kręg, łopatka, obojczyk i każda kość czaszki ma nazwy swoich części, opis budowy i uwagi „dla masażysty”, a każdy mięsień — przyczepy (zaznaczone na kościach), działanie i unerwienie.

**Strona:** https://bartmannn.github.io/Anatomia/

> **Wersja robocza.** Opisy i położenie etykiet wymagają weryfikacji przez nauczyciela anatomii. Atlas jest pomocą do nauki, a nie źródłem wiedzy medycznej.

## Po co to powstaje

To projekt hobbystyczny i niekomercyjny. Powstaje jako pomoc do nauki anatomii dla uczniów szkoły policealnej na kierunku **technik masażysta**. Podręcznikowe ryciny pokazują kość z jednej strony. Tutaj można ją obejrzeć ze wszystkich stron, zobaczyć, gdzie leży względem sąsiednich kręgów, i sprawdzić, które miejsca da się wyczuć pod palcami.

Atlas mogą swobodnie wykorzystywać uczniowie i nauczyciele. Uwagi i poprawki są mile widziane.

## Co potrafi

- **Moduły do wyboru.** Kości: *Cały kręgosłup*, *Pojedyncze kręgi* (jeden kręg naraz, w pełnej szczegółowości), *Kręgi piersiowe i żebra*, *Obręcz barkowa* i *Czaszka*. Mięśnie: *Mięśnie grzbietu*. Strona pobiera tylko wybrany moduł.
- **Obręcz barkowa:** łopatka (kąty, brzegi, grzebień z trójkątem grzebienia, wyrostki barkowy i kruczy, kąt barkowy, panewka z guzkami nad- i podpanewkowym, doły nad- i podgrzebieniowy oraz podłopatkowy, wcięcie łopatki) i obojczyk (końce mostkowy i barkowy, trzon, guzek stożkowaty) na tle kręgosłupa, żeber i kości ramiennych — widać, że kąt górny łopatki leży na wysokości Th2, przyśrodkowy koniec grzebienia Th3, a kąt dolny Th7. Części łopatki są podzielone na **zestawy podpisów** (*Kąty i brzegi*, *Grzebień i wyrostki*, *Panewka i doły*, przyciski nad modelem albo nagłówki w opisie): kropki wszystkich części zostają na modelu w kolorach zestawów, a podpisany jest tylko wybrany zestaw (albo *Wszystkie*). Najechanie kursorem albo dotknięcie kropki pokazuje jej nazwę. Podpisy części leżących po niewidocznej stronie kości chowają się przy obracaniu. Podział jest w `content-obrecz.js` (pole `group`, nazwy w `OBRECZ_LABEL_GROUPS`). Przycisk *Sama kość* pokazuje tylko jedną łopatkę albo jeden obojczyk (przełącznik *Lewa / Prawa*), bez tła, w pełnej szczegółowości — link do tego widoku to np. `…/Anatomia/#obrecz/scapula/prawa`. Na telefonie przy łopatce podpisane są najważniejsze części wyczuwalne, a pozostałe są kropkami (nazwa pojawia się po wskazaniu części w opisie).
- **Czaszka:** kości mózgoczaszki (czołowa, ciemieniowe, potyliczna, skroniowe, klinowa, sitowa) i twarzoczaszki (nosowe, łzowe, jarzmowe, szczęki, żuchwa, lemiesz, podniebienne, małżowiny nosowe dolne) oraz 28 zębów. Na modelu są szwy (wieńcowy, strzałkowy, węgłowy, łuskowe) i kresa skroniowa (linia przerywana); po najechaniu na szew w opisie świeci on na modelu. Przycisk *Kolory kości* koloruje każdą kość inaczej, jak w atlasie. Kości leżące głęboko (np. sitową, lemiesz) najlepiej oglądać z włączonym *Tylko wybrany*.
- **Mięśnie grzbietu warstwami.** Warstwa powierzchowna: mięsień czworoboczny (części zstępująca, poprzeczna i wstępująca) i najszerszy grzbietu. Warstwa pośrednia: mięśnie równoległoboczne (większy i mniejszy), dźwigacz łopatki i mięśnie zębate tylne (górny i dolny). Warstwa głęboka: prostownik grzbietu — mięśnie biodrowo-żebrowy, najdłuższy i kolcowy (z częściami lędźwiową, piersiową, szyjną i głowową) — oraz mięśnie płatowate głowy i szyi. Po wybraniu mięśnia z głębszej warstwy warstwy nad nim stają się przezroczyste. Po wybraniu mięśnia jego przyczepy podświetlają się na kościach (kręgi, łopatka, obojczyk, kość ramienna, potyliczna, biodrowa, żebra), a po najechaniu na część w opisie — tylko przyczepy tej części. Najgłębszych mięśni (poprzeczno-kolcowych, np. wielodzielnego) jeszcze nie ma.
- **Model 3D kręgosłupa:** 24 kręgi (C1–L5), kość krzyżowa i 23 krążki międzykręgowe.
- **Nazwy części kości** z liniami odniesienia, np. trzon, łuk, otwór kręgowy, wyrostki kolczysty, poprzeczne i stawowe. Kręgi C1 i C2, kość krzyżowa i krążki mają własne nazwy. Kręg z więcej niż 8 częściami ma **zestawy podpisów** jak łopatka: typowy kręg — *Trzon i łuk*, *Wyrostki*, *Połączenia z żebrami* (piersiowe); C1 — *Łuki i otwór*, *Części boczne*, *Wyrostki poprzeczne*; C2 — *Ząb*, *Trzon i łuk*, *Wyrostki i powierzchnie stawowe*; kość krzyżowa — *Podstawa i części boczne*, *Grzebienie i otwory*, *Wierzchołek i kość guziczna*. Podział jest w `content.js` → `VERTEBRA_LABEL_GROUPS`, a punkt dodany w trybie poprawiania dostaje zestaw w formularzu *Brakuje punktu?*.
- **Żebra i ich połączenia z kręgami piersiowymi**: dołki żebrowe trzonu (górny i dolny) i wyrostka poprzecznego są zaznaczone kolorem, a po włączeniu przycisku *Żebra* widać, jak układają się w nich głowa i guzek żebra (staw głowy żebra, staw żebrowo-poprzeczny).
- **Punkty wyczuwalne pod palcami** w widoku całego kręgosłupa: C2, C7, Th3, Th7, L4, S2.
- **Opisy każdego kręgu:** cechy budowy, wskazówki dla masażysty (palpacja, na co uważać), przyczepy mięśni.
- **Widoki** przód, bok, tył i góra. Można też pokazać tylko wybrany kręg, pokolorować odcinki albo ukryć krążki.
- **Quiz** z kilkoma rodzajami pytań: *Który kręg?* (podświetlony kręg, a w module *Pojedyncze kręgi* — sam kształt), *Która kość?* (czaszka), *Która część?* (zaznaczony punkt na kręgu lub kości; przy kościach parzystych raz po lewej, raz po prawej), *Który mięsień?* i *Czyje przyczepy?* (świecą tylko przyczepy na kościach).
- **Tryb „Popraw lub dodaj punkty”** do ręcznego poprawiania położenia etykiet i dodawania brakujących części, a także przycisk **Zgłoś brak lub błąd** (opis niżej).
- **Linki do konkretnego widoku**, np. `…/Anatomia/#kregi/Th7` (moduł / kręg) albo `…/Anatomia/#czaszka/temporal`, `…/Anatomia/#obrecz/scapula` — wygodne do wysłania w grupie.
- Działa na komputerze i na telefonie, w jasnym i ciemnym motywie, także **bez internetu** (po zapisaniu modułu) i jako ikona na ekranie głównym telefonu.

W modelu nie ma kości guzicznej, kości gnykowej ani trzecich zębów trzonowych (zębów mądrości), bo nie ma ich w użytym zbiorze danych albo nie zostały jeszcze dodane.

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
| Obręcz barkowa | ok. 330 kB | ok. 40 kB (obojczyki) i 190 kB (łopatki) po wybraniu kości |
| Czaszka | ok. 290 kB | 7–190 kB za każdą wybraną lub mocno przybliżoną kość |
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

Dopisz `&debug` na końcu adresu (np. `http://localhost:8000/#kregoslup/C7&debug`, wielkość liter bez znaczenia), żeby zobaczyć licznik: klatki na sekundę, czas rysowania, liczbę trójkątów, aktualną rozdzielczość, przełącznik jakości oświetlenia i przełącznik **modele: dokładne / automatycznie**. Strona przeładowuje się sama po dopisaniu albo usunięciu `debug`.

## Bez internetu i na telefonie

- **Praca offline.** Strona zapisuje w przeglądarce swój kod i wszystko, co było oglądane (`sw.js`). Na zajęciach bez Wi-Fi otworzy się z tych plików. Przed zajęciami można zapisać cały moduł: menu *Moduł* → *Bez internetu* → *Zapisz* (od ok. 0,6 MB dla obręczy barkowej do ok. 2,3 MB dla całego kręgosłupa).
- **Aktualizacje.** Kod strony jest pobierany najpierw z sieci, więc poprawki widać od razu. Modele mają w adresie swój rozmiar (`?v=…`), więc po przebudowie paczek pobiorą się nowe. Po zmianie three.js, czcionek albo ikon podnieś `WERSJA` w `sw.js`. Nowy plik w `js/` trzeba dopisać do listy `PLIKI_STRONY` w `sw.js` — przypomni o tym test.
- **Ikona na ekranie głównym.** Na telefonie: menu przeglądarki → *Dodaj do ekranu głównego* (Android) albo *Udostępnij → Do ekranu początkowego* (iPhone). Atlas otwiera się wtedy jak aplikacja (`manifest.webmanifest`, `icons/`).
- **Podgląd linku.** Po wklejeniu linku na Messengerze, Discordzie czy Facebooku pokazuje się obrazek `og.jpg` z opisem. Adres obrazka musi być pełny — przy innym hostingu zmień `og:url` i `og:image` w `index.html`.

## Testy

Przy każdej zmianie w repozytorium i każdej propozycji zmian (pull request) GitHub sam uruchamia testy (`.github/workflows/testy.yml`). Wynik widać w zakładce *Actions* i przy propozycji zmian: zielony ✓ albo czerwony ✗ z opisem, co jest nie tak.

- **Sprawdzenie treści** (`tools/check_content.mjs`, wystarczy Node.js): czy `content.js`, `content-miesnie.js`, `content-czaszka.js`, `content-obrecz.js` i pliki z punktami dają się wczytać (zgubiony cudzysłów albo przecinek jest wskazany z numerem wiersza), czy każdy kręg, kość i mięsień ma nazwy i opisy, czy każda część kości czaszki, łopatki i obojczyka ma punkt (parzysta — dwa), czy klucze kręgów i kości nie mają literówek, czy są wszystkie pliki modeli, czcionek i ikon, czy `sw.js` zna wszystkie pliki strony, i czy strona nie odwołuje się do zewnętrznych serwerów.
- **Test w przeglądarce** (`tools/smoke_test.py`, Python + Playwright): otwiera każdy moduł, przechodzi przez wszystkie rodzaje pytań w quizie i tryb poprawiania punktów, zapisuje moduł i otwiera go bez internetu, sprawdza widok telefonu i to, czy nie ma błędów.

Lokalnie:

```
node tools/check_content.mjs
pip install playwright
python -m playwright install chromium
python tools/smoke_test.py
```

Warto w ustawieniach repozytorium (*Settings → Branches → Add rule* dla gałęzi `main`) zaznaczyć *Require status checks to pass* i wybrać test „testy” — wtedy propozycji zmian z błędem nie da się zatwierdzić.

## Publikacja na GitHub Pages

1. W repozytorium na GitHubie wejdź w *Settings → Pages*.
2. W *Build and deployment* wybierz *Source: Deploy from a branch*, gałąź `main`, folder `/ (root)`.
3. Po chwili strona będzie dostępna pod adresem `https://<nazwa-użytkownika>.github.io/<nazwa-repozytorium>/`.

Nie wgrywaj do repozytorium archiwów `.zip` z danymi źródłowymi. Są wykluczone w `.gitignore`.

## Jak pomóc

Chcesz poprawić opis albo położenie etykiety? Do większości poprawek nie trzeba niczego instalować. Wszystko jest opisane krok po kroku w pliku [CONTRIBUTING.md](CONTRIBUTING.md).

## Poprawianie punktów etykiet

Etykiety części kręgów, kości czaszki, łopatki i obojczyka są wyznaczane automatycznie z kształtu kości (skrajne punkty, przekroje, promienie przez otwory, miejsca styku kości), więc każdą kość warto sprawdzić:

1. Wybierz kręg lub kość i w panelu kliknij **Popraw lub dodaj punkty**.
   Wybrana kość jest zawsze w pełnej szczegółowości. Zaznacz **Dokładne modele wszystkich kości**, żeby pełne siatki miały też kości sąsiednie (wybór zapamiętuje przeglądarka; pobiera ok. 1–2 MB).
2. Wybierz część (przy parzystych także stronę: lewą lub prawą — to strona ciała, nie ekranu) i kliknij na kości w miejscu, gdzie powinien być punkt. Dopracuj położenie strzałkami (1 mm, z Shift 5 mm). PgUp/PgDn przesuwa punkt w głąb.
3. Gdy wszystkie punkty są dobre, zaznacz **Sprawdziłem punkty tego kręgu** (tej kości). Uczniowie zobaczą przy nim informację, że etykiety sprawdzono ręcznie.
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
| Zestawy podpisów kręgów (które części są w którym zestawie, także punkty dodane ręcznie) | `content.js` → `VERTEBRA_LABEL_GROUPS` |
| Opisy kręgów (nazwa kręgu, cechy, uwagi dla masażysty) | `content.js` → `PARTS` |
| Kości czaszki: opisy, nazwy części i szwów, które części są parzyste (`pair`) i wyczuwalne (`palp`) | `content-czaszka.js` → `SKULL_PARTS`, `SKULL_LABELS` |
| Łopatka i obojczyk: opisy, nazwy części, które są parzyste (`pair`) i wyczuwalne (`palp`), zestawy podpisów (`group`) | `content-obrecz.js` → `OBRECZ_PARTS`, `OBRECZ_LABELS`, `OBRECZ_LABEL_GROUPS` |
| Mięśnie, ich części i przyczepy | `content-miesnie.js` |
| Punkty dodane ręcznie | `landmarks-fix.js` → `EXTRA` (pole `name`) albo w trybie „Popraw lub dodaj punkty” → *Nazwa i opis tego punktu* |

Każdy wpis ma `name` (nazwa polska), `latin` (łacińska) i `def` (opis). Zmiana nazwy w `PART_LABELS` działa we wszystkich kręgach naraz, a wpis w `PART_LABELS_SPECIAL` tylko w wybranym. Położenia punktów to osobna sprawa — są w `landmarks.js` i `landmarks-fix.js`.

Wszystkie teksty o kręgosłupie, czyli nazwy kręgów, cechy, uwagi dla masażysty, przyczepy mięśni, nazwy części kości i punkty wyczuwalne, są w pliku `content.js`. Teksty o czaszce są w `content-czaszka.js`, o łopatce i obojczyku — w `content-obrecz.js`. Opisy mięśni (przyczepy, działanie, unerwienie, masaż i listy kości do podświetlenia) są w `content-miesnie.js`. Można go edytować w zwykłym edytorze tekstu, bez znajomości reszty kodu. Po zapisaniu wystarczy odświeżyć stronę.

## Struktura projektu

| Plik / folder | Co to jest |
|---|---|
| `index.html`, `styles.css` | Strona (three.js, bez frameworków i bez budowania) |
| `app.js` | Wejście: wczytuje moduły z `js/` i uruchamia atlas |
| `js/` | Kod strony podzielony na moduły (szczegóły niżej) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Praca bez internetu i instalacja na telefonie |
| `og.jpg` | Obrazek podglądu linku |
| `content.js` | Opisy kręgów i nazwy części kości |
| `content-miesnie.js` | Opisy mięśni i ich przyczepów |
| `content-czaszka.js` | Opisy kości czaszki, ich części i szwów |
| `content-obrecz.js` | Opisy łopatki i obojczyka oraz ich części |
| `landmarks.js` | Położenie etykiet wyznaczone automatycznie |
| `landmarks-czaszka.js` | Punkty etykiet czaszki i przebieg szwów oraz kresy skroniowej (wyznaczone automatycznie) |
| `landmarks-obrecz.js` | Punkty etykiet łopatki i obojczyka (wyznaczone automatycznie) |
| `landmarks-fix.js` | Ręczne poprawki etykiet i lista sprawdzonych kręgów (tworzy go tryb „Popraw punkty”) |
| `models/pakiety/` | Model podzielony na małe paczki, które strona pobiera na żądanie: przegląd odcinków, pełne kręgi, pary żeber, czaszka i obręcz barkowa (przegląd i pojedyncze kości), mięśnie (`spis.js` — lista z rozmiarami) |
| `models/kregoslup.glb` | Pełny model kręgosłupa w standardowym formacie glTF (~5,4 MB); źródło paczek, strona go nie pobiera |
| `models/zebra.glb` | 24 żebra i powierzchnie dołków żebrowych w formacie glTF (~2,8 MB); źródło paczek |
| `landmarks-ribs.js` | Punkty połączeń żeber z kręgami (dołki, głowa, szyjka i guzek żebra) |
| `vendor/three/` | Biblioteka three.js r170 |
| `fonts/` | Czcionki strony (woff2) z licencjami |
| `tools/check_content.mjs`, `tools/smoke_test.py`, `.github/workflows/testy.yml` | Testy: sprawdzenie treści i strony w przeglądarce |
| `tools/build_glb.py` | Zamienia pliki STL z BodyParts3D na `models/kregoslup.glb` |
| `tools/landmarks.py` | Wyznacza z geometrii kości punkty do `landmarks.js` |
| `tools/ribs.py` | Buduje `models/zebra.glb` i wyznacza stawy żebrowo-kręgowe do `landmarks-ribs.js` |
| `tools/build_packs.py` | Dzieli oba modele na paczki w `models/pakiety/` i przygotowuje wersje uproszczone |
| `tools/muscles.py` | Buduje paczki mięśni (`models/pakiety/miesnie/`) i kości tła (`kosci-tla.pak`) |
| `tools/czaszka.py` | Buduje paczki czaszki (`czaszka-przeglad.pak`, `czaszka/`) i wyznacza punkty, szwy i kresę skroniową do `landmarks-czaszka.js` |
| `tools/obrecz.py` | Buduje paczki obręczy barkowej (`obrecz-przeglad.pak` z kośćmi ramiennymi jako tłem, `obrecz/`) i wyznacza punkty do `landmarks-obrecz.js` (w płaszczyźnie trzonu łopatki, bo łopatka leży skośnie na żebrach) |
| `Dockerfile`, `compose.yaml`, `docker/` | Uruchomienie strony w kontenerze (nginx) |
| `CONTRIBUTING.md` | Jak zgłaszać i wprowadzać poprawki |

### Moduły w `js/`

| Plik | Za co odpowiada |
|---|---|
| `stan.js` | Stan aplikacji, stałe (kolejność kręgów, lista modułów), wspólne zbiory siatek. Zależy tylko od `miesnie.js` i `zestawy.js` |
| `widok.js` | Renderer, scena, kamera, sterowanie, materiały, kadrowanie. Zależy tylko od `stan.js` |
| `petla.js` | Pętla rysowania: rysowanie na żądanie, rozdzielczość zależna od ruchu, płynne przybliżanie, licznik `&debug` z przełącznikiem dokładnych modeli |
| `paczki.js` | Pobieranie paczek modeli, dekodowanie formatu `.pak`, poziomy szczegółów |
| `malowanie.js` | Kolory z motywu, malowanie kości, żeber i mięśni, podświetlanie przyczepów, jakość materiałów |
| `punkty.js` | Punkty etykiet: automatyczne, poprawione i dodane ręcznie; nazwy części |
| `etykiety.js` | Etykiety na modelu: wybór, zasłanianie, rozkład w kolumnach |
| `celowanie.js` | Wybór myszką i palcem, podświetlanie pod kursorem (na uproszczonych bryłach) |
| `panel.js` | Lewa kolumna (kręgi, kości zestawu albo mięśnie) i panel z opisem |
| `quiz.js` | Quiz: rodzaje pytań, odpowiedzi, wynik |
| `edytor.js` | Tryb „Popraw lub dodaj punkty”, eksport `landmarks-fix.js`, zgłoszenia |
| `moduly.js` | Wybór modułu, zapis na urządzeniu, zasłona wczytywania, adres strony, przyciski i klawiatura |
| `miesnie.js` | Część modułu mięśni niezależna od 3D (lista, panel, etykiety, przyczepy) |
| `zestawy.js` | Zestawy kości oglądanych osobno, z nazwanymi częściami (czaszka, obręcz barkowa): wspólne treści, punkty, paczki, kolory, kierunki kamery i lista po lewej. Nowy zestaw to plik `js/<zestaw>.js` z `SET`, wpis w `SETS` i moduł w `MODULES` (`stan.js`) |
| `czaszka.js` | Ustawienia czaszki (kolory kości, kierunki kamery, kości małe i głęboko położone) i kości przy szwach |
| `obrecz.js` | Ustawienia obręczy barkowej (kolory kości, kierunki kamery) |
| `szwy.js` | Szwy czaszki i kresa skroniowa na modelu |
| `tresci.js` | Wspólny dostęp do opisów kręgosłupa i zestawów kości |

Moduły z górnego poziomu korzystają tylko ze `stan.js` i `widok.js`; pozostałe zależności są wywoływane dopiero w funkcjach, dlatego kolejność wczytywania nie ma znaczenia. Uruchomienie (podpięcie przycisków, pętla) jest w `app.js`.

## Odtworzenie modelu z danych źródłowych

Potrzebne są Python 3 z bibliotekami `numpy` i `scipy` oraz pliki STL kręgów, żeber, mięśni, kości tła, czaszki i obręczy barkowej z repozytorium [BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) (folder `assets/BodyParts3D_data/stl`), najlepiej wszystkie w jednym folderze. Listę użytych plików (identyfikatory FMA) znajdziesz na początku skryptów.

```
pip install numpy scipy
python tools/build_glb.py <folder_z_plikami_stl> models/kregoslup.glb
python tools/landmarks.py <folder_z_plikami_stl> landmarks.js
python tools/ribs.py <folder_z_plikami_stl>
python tools/build_packs.py
python tools/muscles.py <folder_z_plikami_stl>
python tools/czaszka.py <folder_z_plikami_stl>
python tools/obrecz.py <folder_z_plikami_stl>
```

`tools/czaszka.py <folder> --punkty` przelicza tylko punkty i szwy (kilka sekund), bez przebudowy paczek; tak samo `tools/obrecz.py <folder> --punkty`.

Ostatni krok (ok. minuty) trzeba powtórzyć po każdej zmianie `models/kregoslup.glb` lub `models/zebra.glb`.

## Licencje i autorzy

**Modele 3D** — BodyParts3D, © The Database Center for Life Science (DBCLS), licencja [CC BY-SA 2.1 JP](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en).
Dane pobrane z repozytorium [Kevin-Mattheus-Moerman/BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) (wersja 3.0 / 20110915, pliki STL przekonwertowane z oryginalnych OBJ).
Wprowadzone zmiany: wybór kręgów, krążków, żeber, mięśni grzbietu, kości czaszki i zębów oraz kości obręczy barkowej, kości ramiennej, biodrowej i potylicznej, uproszczenie siatek żeber, zmiana układu osi i skali, scalenie wierzchołków, obliczenie normalnych, kwantyzacja i zapis do formatu glTF (GLB), podział na paczki z wersjami uproszczonymi i kompresja. Pliki `models/kregoslup.glb`, `models/zebra.glb`, `models/pakiety/`, `landmarks.js`, `landmarks-ribs.js`, `landmarks-czaszka.js`, `landmarks-obrecz.js` i `landmarks-fix.js` (współrzędne na tych samych modelach) są udostępniane na tej samej licencji CC BY-SA 2.1 JP.

Publikacja źródłowa:
> Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. *BodyParts3D: 3D structure database for anatomical concepts.* Nucleic Acids Res. 2009;37(Database issue):D782–5. https://doi.org/10.1093/nar/gkn613
> Archiwum danych: https://doi.org/10.18908/lsdba.nbdc00837-000

**three.js** — © three.js authors, licencja MIT (`vendor/three/LICENSE`).

**Czcionki** (`fonts/`) — Archivo, Hanken Grotesk i JetBrains Mono, licencja SIL Open Font License 1.1 (pliki `fonts/OFL-*.txt`). Są w repozytorium, więc strona nie łączy się z Google Fonts.

**Kod strony i skrypty** (`index.html`, `styles.css`, `app.js`, `js/`, `sw.js`, `tools/`) — licencja MIT (`LICENSE`).

**Opisy** (`content.js`, `content-miesnie.js`, `content-czaszka.js`, `content-obrecz.js`) — licencja CC BY-SA 4.0.

**Obrazek podglądu** (`og.jpg`) zawiera render modeli BodyParts3D, więc jest na licencji CC BY-SA 2.1 JP. Ikony (`icons/`) — MIT, jak kod.

Dziękujemy autorom BodyParts3D za udostępnienie ich pracy.
