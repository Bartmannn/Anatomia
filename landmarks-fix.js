// Ręczne poprawki punktów etykiet. Plik tworzy tryb „Popraw punkty” na stronie (przycisk „Pobierz landmarks-fix.js”).
// Współrzędne w układzie modeli (1 jednostka = 10 cm). null = punkt usunięty.
// REVIEWED: data sprawdzenia punktów danego kręgu albo kości.
// EXTRA: punkty dodane ręcznie (części, których brakowało). name — nazwa (można ją tu poprawić), latin, def — opis,
//        pair — parzysty ([lewa, prawa]), palp — wyczuwalny pod palcami, pts — współrzędne.
export const FIXES = {
  "C1": {"arcus_ant":[[0.0645,3.4495,0.3753]],"arcus_post":[[0.0988,3.3783,0.0182]],"fovea_dentis":null,"massa_lat":null},
  "C2": {"art_sup":null,"art_inf":[[0.1892,3.129,0.129],[-0.2274,3.1297,0.1287]],"spinous":[[-0.0168,3.1378,-0.0988]]},
  "Th4": {"art_inf":[[0.0717,1.7247,-0.1574],[-0.1595,1.6822,-0.1504]]},
  "Th6": {"fov_sup":null,"transverse":[[-0.3339,1.4083,-0.4144],[0.2326,1.3893,-0.432]],"fov_tp":[[-0.3548,1.3382,-0.4162],[0.2808,1.3315,-0.4194]],"art_sup":[[-0.1362,1.4747,-0.2945],[0.1001,1.4855,-0.3073]],"lamina":null,"fov_inf":null,"pedicle":null,"art_inf":[[-0.1603,1.1274,-0.3713],[0.1127,1.1382,-0.3883]]},
  "L2": {"art_sup":[[0.0938,-0.9016,0.0412],[-0.141,-0.9114,0.0684]],"art_inf":[[0.104,-1.3235,0.0683],[-0.1308,-1.329,0.0917]],"spinous":[[-0.002,-1.2762,-0.2243]]},
  "S": {"promontorium":[[0.0169,-2.3874,0.347]],"canal":null,"apex":null,"ala":[[0.4243,-2.4112,-0.147],[-0.4948,-2.3999,-0.0351]]},
};
export const REVIEWED = {
  "C1": "2026-10-09",
  "C2": "2026-10-09",
  "Th6": "2026-10-09",
  "L2": "2026-10-09",
  "S": "2026-10-09"
};
export const EXTRA = {
  "C1": {
    "x_guzek_przedni": {"pts":[[-0.0116,3.4265,0.411]],"name":"Guzek przedni"},
    "x_guzek_wiezadla_poprzecznego_kreg": {"pts":[[0.0873,3.389,0.2509]],"name":"Guzek więzadła poprzecznego kręgu szczytowego"},
    "x_czesc_boczna": {"pts":[[-0.2705,3.4648,0.3188]],"name":"Część boczna"},
    "x_guzek_tylny": {"pts":[[-0.0129,3.3769,-0.0482]],"name":"Guzek tylny"},
    "x_bruzda_tetnicy_kregowej": {"pts":[[0.1789,3.4043,0.1126]],"name":"Bruzda tętnicy kręgowej"},
    "x_powierzchnia_stawowa_opis": {"pts":[[0.1607,3.448,0.2133]],"name":"Powierzchnia stawowa (opis)","def":"Powierzchnia stawowa górna części bocznej dla kłykcia potylicznego"},
    "x_powierzchnia_stawowa_dla_zeba_kr": {"pts":[[-0.0076,3.3958,0.368]],"name":"Powierzchnia stawowa dla zęba kręgu obrotowego"},
    "x_otwor_wyrostka_poprzecznego": {"pts":[[0.2725,3.3776,0.2459],[-0.3055,3.393,0.254]],"name":"Otwór wyrostka poprzecznego","pair":true},
    "x_powierzchnia_stawowa_dolna_opis": {"pts":[[0.144,3.3371,0.2679]],"name":"Powierzchnia stawowa dolna (opis)","def":"Powierzchnia stawowa dolna części bocznej dla kręgu obrotowego"},
  },
  "C2": {
    "x_powierzchnia_stawowa_gorna_opis": {"pts":[[-0.1712,3.327,0.2929],[0.1449,3.3199,0.2763]],"name":"Powierzchnia stawowa górna (opis)","def":"Powierzchnia stawowa górna dla kręgu szczytowego","pair":true},
    "x_powierzchnia_stawowa_dolna_opis": {"pts":[[-0.2065,3.1578,0.1584],[0.1654,3.1536,0.1629]],"name":"Powierzchnia stawowa dolna (opis)","def":"Powierzchnia stawowa dolna dla kręgu C3","pair":true},
    "x_nasada": {"pts":[[0.0339,3.3268,0.3659]],"name":"Nasada"},
    "x_czesc_miedzystawowa": {"pts":[[0.1623,3.2562,0.3394]],"name":"Część międzystawowa"},
    "x_powierzchnia_stawowa_przednia": {"pts":[[-0.0025,3.4209,0.3653]],"name":"Powierzchnia stawowa przednia","def":"Powierzchnia stawowa przednia dla łuku przedniego kręgu szczytowego"},
    "x_czesc_miedzystawowa_2": {"pts":[[0.1709,3.2385,0.1301]],"name":"Część międzystawowa"},
    "x_powierzchnia_stawowa_tylna": {"pts":[[-0.0136,3.4294,0.2436]],"name":"Powierzchnia stawowa tylna","def":"Powierzchnia stawowa tylna dla więzadła poprzecznego kręgu szczytowego"},
  },
  "Th6": {
    "x_poldolek_zebrowy_gorny": {"pts":[[-0.1614,1.3422,-0.1947],[0.11,1.3486,-0.2101]],"name":"Półdołek żebrowy górny","pair":true},
    "x_luk_kregu": {"pts":[[-0.07,1.3217,-0.3999]],"name":"Łuk kręgu"},
    "x_poldolek_zebrowy_dolny": {"pts":[[-0.1699,1.1764,-0.2293],[0.1336,1.1825,-0.2351]],"name":"Półdołek żebrowy dolny","pair":true},
  },
  "L2": {
    "x_wyrostek_dodatkowy": {"pts":[[0.1163,-1.2368,-0.006],[-0.1725,-1.2498,-0.0095]],"name":"Wyrostek dodatkowy","def":"Tego nie jestem pewny","pair":true},
    "x_wyrostek_suteczkowaty": {"pts":[[0.1559,-0.9784,-0.0477],[-0.2345,-0.9808,-0.0328]],"name":"Wyrostek suteczkowaty","pair":true},
    "x_wciecie_miedzykregowe_dolne": {"pts":[[0.1541,-1.1619,0.1445]],"name":"Wcięcie międzykręgowe dolne","def":"W widoku bocznego lepiej widać"},
    "x_wciecie_miedzykregowe_gorne": {"pts":[[0.1633,-0.9502,0.1373]],"name":"Wcięcie międzykręgowe górne"},
  },
  "S": {
    "x_podstawa_kosci_krzyzowej": {"pts":[[-0.0015,-2.2835,0.2144]],"name":"Podstawa kości krzyżowej"},
    "x_skrzydlo_kosci_krzyzowej": {"pts":[[0.4005,-2.3026,0.1606],[-0.4451,-2.308,0.1261]],"name":"Skrzydło kości krzyżowej","pair":true},
    "x_kresy_poprzeczne": {"pts":[[0.0095,-2.6722,-0.1796]],"name":"Kresy poprzeczne","def":"Te poziome wybrzuszenia na powierzchni"},
    "x_wierzcholek_kosci_krzyzowej": {"pts":[[-0.0244,-3.1415,-0.3391]],"name":"Wierzchołek kości krzyżowej"},
    "x_kosc_guziczna": {"pts":[[-0.0249,-3.4412,-0.2524],[-0.0218,-3.2523,-0.3263]],"name":"Kość guziczna","def":"P - początek ; L - koniec","pair":true},
    "x_staw_krzyzowo_guziczny": {"pts":[[-0.0238,-3.1966,-0.3251]],"name":"Staw krzyżowo - guziczny"},
    "x_otwory_krzyzowe_przednie": {"pts":[null],"name":"Otwory krzyżowe przednie"},
    "x_otwory_krzyzowe_przednie_2": {"pts":[[-0.1764,-2.7513,-0.3375]],"name":"Otwory krzyżowe","def":"Te wszystkie otwory na krzyżu, w zależności od strony z jakiej patrzymy, są tylne i przednie"},
    "x_rozki_krzyzowe": {"pts":[[0.0736,-3.0991,-0.5067],[-0.127,-3.0619,-0.4847]],"name":"Różki krzyżowe","pair":true},
    "x_rozki_guziczne": {"pts":[[0.0622,-3.2098,-0.4571],[-0.1134,-3.252,-0.4448]],"name":"Różki guziczne","pair":true},
    "x_kanal_krzyzowy": {"pts":[[-0.0061,-2.2717,-0.013]],"name":"Kanał krzyżowy"},
    "x_powierzchnia_uchowata": {"pts":[[0.5626,-2.514,0.1521],[-0.5777,-2.51,0.1223]],"name":"Powierzchnia uchowata","pair":true},
    "x_grzebien_krzyzowy_boczny": {"pts":[[0.3637,-2.5949,-0.329],[-0.3773,-2.5723,-0.3305]],"name":"Grzebień krzyżowy boczny","pair":true},
    "x_rozwor_krzyzowy": {"pts":[[-0.0281,-3.0731,-0.4443]],"name":"Rozwór krzyżowy","def":"Na modelu słabo go widać, ale powinien być w tym miejscu, tj. zagłębienie"},
    "x_guzowatosc_kosci_krzyzowej": {"pts":[[-0.4958,-2.2631,-0.0608]],"name":"Guzowatość kości krzyżowej"},
  },
};
