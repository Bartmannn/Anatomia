# Licencja modeli 3D

Pliki `kregoslup.glb`, `zebra.glb` i paczki w folderze `pakiety/` powstały z danych **BodyParts3D**, © The Database Center for Life Science (DBCLS),
udostępnionych na licencji **Creative Commons Uznanie autorstwa – Na tych samych warunkach 2.1 Japonia (CC BY-SA 2.1 JP)**:
https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en

Wymagane oznaczenie autorstwa:

> BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan

Źródło plików STL: https://github.com/Kevin-Mattheus-Moerman/BodyParts3D (assets/BodyParts3D_data/stl, wersja 3.0 / 20110915).

Zmiany: wybór części (kręgi C1–L5, kość krzyżowa, krążki międzykręgowe, 24 żebra, mięśnie grzbietu, łopatki, obojczyki, kości ramienne, biodrowe i potyliczna), uproszczenie siatek żeber, wycięcie powierzchni dołków żebrowych, zmiana układu osi i skali,
scalenie wierzchołków, obliczenie normalnych, kwantyzacja, zapis do glTF 2.0 (GLB) skryptami `tools/build_glb.py` i `tools/ribs.py`.
Paczki `pakiety/*.pak` (skrypt `tools/build_packs.py`): podział na kręgi i pary żeber, wersje uproszczone (przegląd),
kwantyzacja do 0,02 mm i kompresja (format opisany w skrypcie). Mięśnie i kości tła: `tools/muscles.py` (uproszczenie siatek, punkty etykiet).

Te pliki są udostępniane na tej samej licencji: CC BY-SA 2.1 JP.

Identyfikatory części (FMA) zapisano w plikach GLB w polu `extras.fma` każdego węzła, a w paczkach w nagłówku każdej siatki (`extras.fma`).
