"""Szybki test strony w prawdziwej przeglądarce: czy każdy moduł się wczytuje i nie ma błędów.

Użycie:
    pip install playwright
    python -m playwright install chromium
    python tools/smoke_test.py

Uruchamia własny serwer na wolnym porcie, otwiera stronę w Chromium bez okna (WebGL programowy)
i przechodzi przez moduły, quiz i tryb poprawiania punktów. Kończy się kodem 1, jeśli coś jest nie tak.
Uruchamia się też automatycznie na GitHubie (.github/workflows/testy.yml).
"""
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
failures = []


def check(cond, msg):
    print(('  ✓ ' if cond else '  ✗ ') + msg)
    if not cond: failures.append(msg)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def main():
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_port}/index.html'

    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])

        def open_page(hash_='', mobile=False):
            ctx = browser.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1280, 'height': 800},
                                      is_mobile=mobile, has_touch=mobile)
            page = ctx.new_page()
            errs, packs = [], []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
            page.on('requestfinished', lambda r: packs.append(r.url) if '.pak' in r.url else None)
            page.goto(base + hash_, wait_until='domcontentloaded')
            return ctx, page, errs, packs

        def wait_loaded(page):
            page.wait_for_function("document.getElementById('loader').hidden && document.querySelector('#panel h2, #panel .quiz-q')", timeout=90000)
            page.wait_for_timeout(1200)

        print('Ekran wyboru modułu')
        ctx, page, errs, packs = open_page()
        page.wait_for_timeout(1500)
        check(page.is_visible('#picker'), 'pierwsze wejście pokazuje wybór modułu')
        check(not packs, 'przed wyborem nic się nie pobiera')
        check(page.locator('.pk-card').count() >= 4, 'są karty modułów')
        page.click('[data-mod=kregoslup]')
        wait_loaded(page)
        check(not errs, 'brak błędów po wybraniu modułu' + (f': {errs[:3]}' if errs else ''))
        ctx.close()

        for hash_, name in [('#kregoslup/C7', 'Cały kręgosłup'), ('#kregi/L4', 'Pojedyncze kręgi'),
                            ('#zebra/Th7', 'Kręgi piersiowe i żebra'), ('#obrecz/scapula', 'Obręcz barkowa'),
                            ('#czaszka/temporal', 'Czaszka'),
                            ('#grzbiet/trapezius', 'Mięśnie grzbietu')]:
            print(name)
            ctx, page, errs, packs = open_page(hash_)
            wait_loaded(page)
            check(bool(packs), 'pobrano paczki modelu')
            check(page.inner_text('#panel h2').strip() != '', 'panel z opisem: ' + page.inner_text('#panel h2').strip())
            check(page.locator('.lbl:not([hidden])').count() > 0, 'etykiety na modelu')
            # quiz: każdy rodzaj pytań
            page.click('[data-mode=quiz]')
            page.wait_for_timeout(1500)
            for qt in page.eval_on_selector_all('[data-qt]', 'bs => bs.map(b => b.dataset.qt)'):
                page.click(f'[data-qt={qt}]')
                page.wait_for_timeout(2500)
                check(page.locator('.answers button').count() == 4, f'quiz „{qt}”: 4 odpowiedzi')
                page.click('.answers button >> nth=0')
                page.wait_for_timeout(500)
                check(page.is_visible('#next'), f'quiz „{qt}”: po odpowiedzi jest „Następne pytanie”')
            page.click('[data-mode=atlas]')
            page.wait_for_timeout(1000)
            check(not errs, 'brak błędów w konsoli' + (f': {errs[:3]}' if errs else ''))
            ctx.close()

        print('Czaszka: szwy, kolory kości, punkty')
        ctx, page, errs, _ = open_page('#czaszka/parietal')
        wait_loaded(page)
        n = page.evaluate("import('./js/stan.js').then((s) => s.lineMeshes.filter((m) => m.visible).length)")
        check(n > 0, f'szwy i kresa skroniowa na modelu ({n} odcinków)')
        page.click('#tint')
        page.wait_for_timeout(500)
        page.click('#r-mandible')
        page.wait_for_timeout(2500)
        check(page.inner_text('#panel h2').strip() == 'Żuchwa', 'wybór kości z listy')
        check(page.locator('.lbl:not([hidden])').count() >= 6, 'etykiety części żuchwy')
        page.click('[data-action=edit]')
        page.wait_for_timeout(1500)
        check(page.locator('.erow').count() >= 6, 'poprawianie punktów czaszki')
        check(not errs, 'brak błędów w konsoli' + (f': {errs[:3]}' if errs else ''))
        ctx.close()

        print('Obręcz barkowa: kości tła, obojczyk, punkty')
        ctx, page, errs, _ = open_page('#obrecz/scapula')
        wait_loaded(page)
        n = page.evaluate("import('./js/stan.js').then((s) => s.ctxMeshes.filter((m) => m.visible).length)")
        check(n == 2, f'kości ramienne jako tło ({n})')
        check(page.locator('#lgroups [data-lg]').count() == 4, 'zestawy podpisów łopatki (3 i „Wszystkie”)')
        first = page.locator('.lbl:not([hidden])').count()
        page.click('#lgroups [data-lg=all]')
        page.wait_for_timeout(600)
        check(page.locator('.lbl:not([hidden])').count() > first, f'„Wszystkie” podpisuje więcej części niż jeden zestaw ({first})')
        page.click('.pgroup[data-lg=doly]')
        page.wait_for_timeout(600)
        check(page.get_attribute('#lgroups [data-lg=doly]', 'aria-pressed') == 'true', 'nagłówek zestawu w opisie przełącza podpisy')
        page.click('#isolate')
        page.wait_for_timeout(1500)
        vis = page.evaluate("import('./js/stan.js').then((s) => Object.values(s.parts).filter((m) => m.visible).map((m) => m.name))")
        check(vis == ['scapula'] and page.is_visible('#sidepick'), f'„Sama kość”: widać tylko łopatkę ({vis})')
        page.click('#sidepick [data-side="0"]')
        page.wait_for_timeout(800)
        check(page.evaluate('location.hash').endswith('/scapula/lewa'), '„Sama kość”: lewa łopatka i link do widoku')
        page.click('#isolate')
        page.wait_for_timeout(800)
        page.click('#r-clavicle')
        page.wait_for_timeout(2500)
        check(page.inner_text('#panel h2').strip() == 'Obojczyk', 'wybór kości z listy')
        page.click('[data-action=edit]')
        page.wait_for_timeout(1500)
        check(page.locator('.erow').count() >= 4, 'poprawianie punktów obojczyka')
        check(not errs, 'brak błędów w konsoli' + (f': {errs[:3]}' if errs else ''))
        ctx.close()

        print('Zestawy podpisów kręgów')
        ctx, page, errs, _ = open_page('#kregi/S')
        wait_loaded(page)
        check(page.locator('#lgroups [data-lg]').count() == 4, 'kość krzyżowa: 3 zestawy i „Wszystkie”')
        check(page.locator('.pgroup').count() == 3, 'zestawy jako nagłówki w opisie')
        page.goto(base + '#kregi/C5')
        page.wait_for_timeout(2500)
        check(page.locator('#lgroups').is_hidden(), 'kręg z kilkoma częściami: bez zestawów, wszystkie podpisy')
        check(not errs, 'brak błędów w konsoli' + (f': {errs[:3]}' if errs else ''))
        ctx.close()

        print('Mięśnie po czaszce: kość potyliczna w tle')
        ctx, page, errs, _ = open_page('#czaszka/occipital')
        wait_loaded(page)
        page.goto(base + '#grzbiet/trapezius')
        wait_loaded(page)
        n = page.evaluate("import('./js/stan.js').then((s) => s.ctxMeshes.filter((m) => m.visible).length)")
        check(n == 9, f'wszystkie kości tła mięśni, także potyliczna ({n} z 9)')
        ctx.close()

        print('Tryb poprawiania punktów')
        ctx, page, errs, _ = open_page('#kregoslup/Th7')
        wait_loaded(page)
        page.click('[data-action=edit]')
        page.wait_for_timeout(1500)
        check(page.locator('.erow').count() > 5, 'lista części do poprawienia')
        check(page.is_visible('#addform'), 'formularz „Brakuje punktu?”')
        page.click('#copy')
        page.wait_for_timeout(300)
        text = page.input_value('#exportText')
        check('export const FIXES' in text and 'export const EXTRA' in text, 'eksport landmarks-fix.js')
        check(not errs, 'brak błędów w konsoli' + (f': {errs[:3]}' if errs else ''))
        ctx.close()

        print('Bez internetu')
        ctx, page, errs, _ = open_page('#kregoslup/C7')
        wait_loaded(page)
        page.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller', timeout=30000)
        page.click('#modbtn')
        page.wait_for_timeout(300)
        page.click('[data-save=grzbiet]')
        page.wait_for_function("document.querySelector('[data-save=grzbiet]').textContent.includes('Zapisany')", timeout=90000)
        check(True, 'zapis modułu „Mięśnie grzbietu” na urządzeniu')
        page_errors = []
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        ctx.set_offline(True)
        page.goto(base + '#grzbiet/longissimus', wait_until='domcontentloaded')
        wait_loaded(page)
        check(page.inner_text('#panel h2').strip() == 'Mięsień najdłuższy', 'bez internetu otwiera się zapisany moduł (warstwa 3)')
        check(page.is_visible('#net') and 'Bez internetu' in page.inner_text('#net'), 'informacja „Bez internetu”')
        check(not page_errors, 'brak błędów skryptu bez internetu' + (f': {page_errors[:3]}' if page_errors else ''))
        ctx.close()

        print('Telefon')
        ctx, page, errs, _ = open_page('#kregoslup/C7', mobile=True)
        wait_loaded(page)
        check(not errs, 'brak błędów na telefonie' + (f': {errs[:3]}' if errs else ''))
        ctx.close()
        browser.close()
    srv.shutdown()

    if failures:
        print(f'\nNie przeszło: {len(failures)}')
        sys.exit(1)
    print('\n✓ Strona działa.')


if __name__ == '__main__':
    main()
