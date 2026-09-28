# Licencja modeli 3D

Pliki `kregoslup.glb` i `zebra.glb` powstały z danych **BodyParts3D**, © The Database Center for Life Science (DBCLS),
udostępnionych na licencji **Creative Commons Uznanie autorstwa – Na tych samych warunkach 2.1 Japonia (CC BY-SA 2.1 JP)**:
https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en

Wymagane oznaczenie autorstwa:

> BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan

Źródło plików STL: https://github.com/Kevin-Mattheus-Moerman/BodyParts3D (assets/BodyParts3D_data/stl, wersja 3.0 / 20110915).

Zmiany: wybór części (kręgi C1–L5, kość krzyżowa, krążki międzykręgowe, 24 żebra), uproszczenie siatek żeber, wycięcie powierzchni dołków żebrowych, zmiana układu osi i skali,
scalenie wierzchołków, obliczenie normalnych, kwantyzacja, zapis do glTF 2.0 (GLB) skryptami `tools/build_glb.py` i `tools/ribs.py`.

Te pliki są udostępniane na tej samej licencji: CC BY-SA 2.1 JP.

Identyfikatory części (FMA) zapisano w pliku GLB w polu `extras.fma` każdego węzła.
