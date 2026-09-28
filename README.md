# SKK Anatomia — atlas kręgosłupa 3D

Interaktywny atlas kręgosłupa dla uczniów kierunku technik masażysta. W przeglądarce można obracać model, wybierać kręgi i krążki, czytać opisy z uwagami dla masażysty i rozwiązywać quiz.

> **Wersja robocza.** Opisy w `content.js` wymagają weryfikacji przez nauczyciela anatomii.

## Co jest w środku

| Plik / folder | Co to jest |
|---|---|
| `index.html`, `styles.css`, `app.js` | Strona (Three.js, bez frameworków i bez budowania) |
| `content.js` | Wszystkie opisy i nazwy części kości — można je edytować w zwykłym edytorze tekstu |
| `landmarks.js` | Położenie etykiet (trzon, wyrostki, otwór kręgowy…) wyznaczone automatycznie |
| `landmarks-fix.js` | Ręczne poprawki tych punktów i lista sprawdzonych kręgów (tworzy go tryb „Popraw punkty”) |
| `models/kregoslup.glb` | 24 kręgi (C1–L5), kość krzyżowa i 23 krążki międzykręgowe w jednym pliku (~5,4 MB) |
| `vendor/three/` | Biblioteka three.js r170 (licencja MIT) |
| `tools/build_glb.py` | Skrypt, który zamienia pliki STL z BodyParts3D na `kregoslup.glb` |
| `tools/landmarks.py` | Skrypt, który wyznacza z geometrii kości punkty do `landmarks.js` |

W modelu nie ma kości guzicznej (brak w zbiorze danych).

## Poprawianie punktów etykiet

Etykiety części kręgów są wyznaczane automatycznie z kształtu kości (skrajne punkty, promienie przez otwór kręgowy), więc każdy kręg warto sprawdzić:

1. Wybierz kręg i w panelu kliknij **Popraw punkty**.
2. Wybierz część (przy parzystych — stronę 1 lub 2) i kliknij na kości w miejscu, gdzie powinien być punkt. Dopracuj strzałkami (1 mm, z Shift 5 mm), PgUp/PgDn przesuwa w głąb.
3. Gdy wszystkie punkty kręgu są dobre, zaznacz **Sprawdziłem punkty tego kręgu**. Uczniowie zobaczą przy nim informację, że etykiety sprawdzono ręcznie.
4. Kliknij **Pobierz landmarks-fix.js**, podmień plik w folderze projektu i zrób commit.

Poprawki zapisują się w przeglądarce do czasu pobrania pliku. `landmarks.js` można w każdej chwili wygenerować od nowa skryptem — poprawki z `landmarks-fix.js` nie zginą.

## Uruchomienie na komputerze

Przeglądarka nie wczyta modelu z pliku otwartego podwójnym kliknięciem, potrzebny jest prosty serwer:

```
python -m http.server 8000
```

Potem otwórz http://localhost:8000.

## Publikacja na GitHub Pages

1. Załóż publiczne repozytorium na GitHubie (np. `skk-anatomia`).
2. Wgraj zawartość tego folderu (przycisk *Add file → Upload files* albo `git push`). Nie wgrywaj pliku `skk-kregoslup-zrodla.zip` — to tylko surowe dane źródłowe.
3. W repozytorium: *Settings → Pages → Build and deployment → Source: Deploy from a branch*, gałąź `main`, folder `/ (root)`.
4. Po minucie strona będzie pod adresem `https://<twoja-nazwa>.github.io/skk-anatomia/`.

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
