# Jak pomóc w rozwijaniu atlasu

Dziękuję, że chcesz pomóc! Atlas powstaje hobbystycznie, do nauki anatomii na kierunku technik masażysta. Każda poprawka opisu czy etykiety przyda się całej grupie.

**Do większości poprawek nie trzeba nic instalować ani umieć programować.** Wystarczy przeglądarka i (dla sposobów 2 i 3) darmowe konto na [GitHubie](https://github.com/signup).

Strona: https://bartmannn.github.io/Anatomia/
Repozytorium: https://github.com/Bartmannn/Anatomia

---

## 1. Zgłoś błąd lub uwagę

Najprostszy sposób. Zauważyłeś błędną nazwę, literówkę albo źle przyczepioną etykietę?

- Załóż zgłoszenie w zakładce [Issues](https://github.com/Bartmannn/Anatomia/issues) → *New issue*,
- albo po prostu napisz do mnie na grupie.

Najszybciej: w opisie kręgu kliknij **Zgłoś brak lub błąd** — otworzy się gotowe zgłoszenie z nazwą kręgu, wystarczy dopisać, czego brakuje.

Podaj, **który kręg** (np. Th7) i **co jest nie tak**. Jeśli to kwestia merytoryczna, dopisz **źródło**, np. podręcznik i stronę albo notatki z zajęć. Zrzut ekranu też bardzo pomaga.

## 2. Popraw tekst opisu (bez instalowania czegokolwiek)

Teksty o kościach są w pliku [`content.js`](content.js), a o mięśniach w [`content-miesnie.js`](content-miesnie.js).

1. Otwórz plik [`content.js`](content.js) (albo `content-miesnie.js`) na GitHubie i kliknij ikonę ołówka (*Edit this file*).
2. Znajdź tekst do poprawy, np. przez `Ctrl+F`, i zmień go.
3. Na dole strony (albo po kliknięciu *Commit changes…*) krótko opisz zmianę i podaj źródło.
4. Kliknij *Propose changes*, a potem *Create pull request*. Przejrzę zmianę i ją dołączę.
5. Po chwili przy propozycji pojawi się wynik automatycznego testu. Zielony ✓ — wszystko w porządku. Czerwony ✗ — kliknij *Details*: test pokaże plik, numer wiersza i co poprawić (np. zgubiony cudzysłów). Popraw to w tej samej propozycji (znowu ikona ołówka), test uruchomi się ponownie.

Kilka zasad, żeby strona się nie zepsuła:

- zmieniaj tylko tekst **między cudzysłowami** `'…'`,
- nie usuwaj cudzysłowów, przecinków ani nawiasów,
- jeśli w tekście potrzebny jest apostrof, napisz go jako `\'`.

## 3. Popraw położenie etykiet na modelu albo dodaj brakujący punkt

Brakuje jakiejś części kręgu? W trybie **Popraw lub dodaj punkty** jest formularz *Brakuje punktu?*: wpisz nazwę, kliknij **Dodaj i wskaż na modelu** i kliknij na kości. Dalej postępuj jak przy poprawkach poniżej (pobierz `landmarks-fix.js`). Przy dodanym punkcie jest też link **Zgłoś ten punkt na GitHubie** z gotowym opisem i położeniem — przyda się, jeśli nie chcesz wysyłać pliku.


Etykiety (trzon, wyrostki, otwór kręgowy…) zostały rozmieszczone automatycznie, więc trzeba je sprawdzić kręg po kręgu. Robi się to na samej stronie.

1. Otwórz stronę i **odśwież ją** (`Ctrl+F5`), żeby mieć najnowsze poprawki innych osób.
2. Wybierz kręg i w panelu po prawej kliknij **Popraw punkty**.
3. Obejrzyj kręg z kilku stron (przyciski *Przód*, *Bok*, *Tył*, *Góra*).
4. Jeśli punkt jest w złym miejscu, wybierz część (przy parzystych także stronę: lewą lub prawą — chodzi o stronę ciała, nie ekranu), kliknij na kości w poprawnym miejscu i ewentualnie dopracuj strzałkami. Strzałka przesuwa o 1 mm, z Shiftem o 5 mm, a PgUp/PgDn przesuwa punkt w głąb.
5. Gdy **wszystkie** punkty kręgu są dobre, zaznacz **Sprawdziłem punkty tego kręgu**.
6. Po skończonej pracy kliknij **Pobierz landmarks-fix.js** i:
   - wyślij mi ten plik,
   - albo wgraj go sam: w repozytorium *Add file → Upload files*, przeciągnij plik (zastąpi istniejący) i utwórz pull request jak w punkcie 2.

Twoje poprawki zapisują się w przeglądarce, więc możesz pracować z przerwami na tym samym komputerze i w tej samej przeglądarce.

### Podział pracy

Pobrany plik zawiera wszystkie poprawki, jakie były na stronie w chwili rozpoczęcia pracy, plus Twoje. Gdy dwie osoby pracują równocześnie, ich pliki trzeba potem połączyć. Dlatego:

- **umawiajmy się na odcinki**, np. jedna osoba odcinek szyjny, druga piersiowy, trzecia lędźwiowy z kością krzyżową,
- zanim zaczniesz, odśwież stronę, żeby mieć najnowszą wersję.

Poprawki różnych kręgów łączę bez problemu, bo każdy kręg jest w pliku w osobnej linii.

### Skąd wiedzieć, gdzie powinien być punkt?

Porównuj z ryciną z podręcznika lub atlasu. Kilka wskazówek:

- **wyrostek stawowy górny** wystaje ku górze za trzonem, a **dolny** ku dołowi,
- **wyrostek kolczysty** jest skierowany do tyłu, w odcinku piersiowym mocno w dół,
- **dołki żebrowe** (kręgi piersiowe) są zaznaczone kolorem; po włączeniu *Żebra* widać, gdzie opiera się głowa i guzek żebra,
- **otwór kręgowy** leży w środku, między trzonem a łukiem; punkt można wsunąć do środka klawiszami PgUp/PgDn,
- przy wątpliwościach nie zaznaczaj „Sprawdziłem”, tylko opisz problem w zgłoszeniu.

## 4. Dla osób technicznych

Strona to czysty HTML, CSS i JavaScript (three.js), bez budowania. Uruchomienie lokalne, np. przez `docker compose up`, opisuje [README](README.md#uruchomienie).

- Zmiany proponuj przez fork i pull request.
- Opisy są w `content.js`, punkty automatyczne w `landmarks.js` (generuje je `tools/landmarks.py`), a poprawki ręczne w `landmarks-fix.js`.
- Nie commituj archiwów `.zip` z danymi źródłowymi.

## Licencja wkładu

Wysyłając poprawkę, zgadzasz się na jej udostępnienie na licencji danego pliku: opisy w `content.js` i `content-miesnie.js` na CC BY-SA 4.0, punkty etykiet na CC BY-SA 2.1 JP (jak modele), kod na MIT.
