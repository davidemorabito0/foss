import asyncio, json, sys, os
from playwright.async_api import async_playwright

QUI = os.path.dirname(os.path.abspath(__file__))
BASE = 'http://localhost:8123/'
MOCK = open(os.path.join(QUI, 'mock-supabase.js')).read()
OUT = os.path.join(QUI, 'shot')
os.makedirs(OUT, exist_ok=True)
errori = []

async def pagina(browser, w, h, mobile=False, cfg=None, init=''):
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile,
                                    permissions=['microphone', 'camera'])
    async def rotta(route):
        u = route.request.url
        if 'supabase-js' in u:
            await route.fulfill(status=200, content_type='application/javascript', body=MOCK)
        elif u.startswith(BASE):
            await route.continue_()
        else:
            await route.abort()
    await ctx.route('**/*', rotta)
    await ctx.add_init_script('window.__CFG = ' + json.dumps(cfg or {}) + ';' + init)
    p = await ctx.new_page()
    p.on('pageerror', lambda e: errori.append('PAGEERROR ' + str(e)))
    p.on('console', lambda m: errori.append('CONSOLE ' + m.type + ': ' + m.text) if m.type in ('error',) else None)
    return ctx, p

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
        ctx, p = await pagina(b, 1366, 820)
        await p.goto(BASE + 'chat.html')
        await p.wait_for_timeout(1500)
        await p.screenshot(path=OUT + '/01-benvenuto.png')
        await p.click('[data-b="no"]')
        await p.wait_for_timeout(500)
        await p.screenshot(path=OUT + '/02-lista.png')
        # apro il gruppo
        g1 = await p.evaluate('__mock.G1'); c1 = await p.evaluate('__mock.C1')
        await p.click('.riga[data-id="%s"]' % g1)
        await p.wait_for_timeout(1800)
        await p.screenshot(path=OUT + '/03-gruppo.png')
        # scrivo
        await p.fill('#testoIn', 'Ciao a tutti, *domani* si gira! https://foss.team')
        await p.press('#testoIn', 'Enter')
        await p.wait_for_timeout(800)
        # risposta da Momo e reazione
        mid = await p.evaluate("__mock.arriva(__mock.G1, __mock.MO, 'Arrivo alle 8:30 🎬')")
        await p.wait_for_timeout(600)
        await p.evaluate("__mock.legge(__mock.G1, __mock.MO); __mock.legge(__mock.G1, __mock.AN)")
        await p.wait_for_timeout(500)
        await p.evaluate("__mock.reagisce('%s', __mock.AN, '❤️')" % mid)
        await p.wait_for_timeout(500)
        await p.screenshot(path=OUT + '/04-scritto.png')
        # effetti: tasto destro sul manda
        await p.fill('#testoIn', 'Consegnato!!!')
        await p.click('#mandaB', button='right')
        await p.wait_for_timeout(400)
        await p.click('[data-s="schermo"]')
        await p.click('[data-k="fuochi"]')
        await p.wait_for_timeout(1200)
        await p.screenshot(path=OUT + '/05-effetti.png')
        await p.click('[data-s="anim"]')
        await p.click('[data-k="onda"]')
        await p.click('[data-e="invia"]')
        await p.wait_for_timeout(1500)
        await p.screenshot(path=OUT + '/06-fuochi.png')
        await p.wait_for_timeout(3500)
        # pannello sticker
        await p.click('#emojiB'); await p.wait_for_timeout(300)
        await p.click('[data-pe="sticker"]'); await p.wait_for_timeout(300)
        await p.screenshot(path=OUT + '/07-sticker.png')
        await p.click('[data-foss="sigira"]'); await p.wait_for_timeout(600)
        await p.click('[data-pe="gif"]'); await p.wait_for_timeout(300)
        await p.screenshot(path=OUT + '/08-gif.png')
        await p.click('#emojiB'); await p.wait_for_timeout(300)
        # foto: anteprima con didascalia
        async with p.expect_file_chooser() as fc:
            await p.click('#allegaB'); await p.wait_for_timeout(200)
            await p.click('#menuPop button:nth-child(2)')
        f = await fc.value
        await f.set_files(os.path.join(QUI, 'foto.jpg'))
        await p.wait_for_timeout(600)
        await p.fill('#aiDid', 'La scena 3')
        await p.screenshot(path=OUT + '/09-anteprima.png')
        await p.click('[data-a="ai-manda"]')
        await p.wait_for_timeout(1200)
        await p.screenshot(path=OUT + '/10-foto-inviata.png')
        # vocale (registrazione bloccata col click su desktop)
        await p.click('#mandaB'); await p.wait_for_timeout(2200)
        await p.screenshot(path=OUT + '/11-registra.png')
        await p.click('#regManda'); await p.wait_for_timeout(1500)
        await p.screenshot(path=OUT + '/12-vocale.png')
        # menu messaggio e risposta
        n = await p.query_selector('.msg.suo:last-of-type .bolla')
        await p.evaluate("document.querySelector('.msg[data-id=\"%s\"] .bolla').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:600,clientY:400}))" % mid)
        await p.wait_for_timeout(300)
        await p.screenshot(path=OUT + '/13-menu-msg.png')
        await p.click('#menuPop button:first-child')
        await p.fill('#testoIn', 'Perfetto')
        await p.press('#testoIn', 'Enter'); await p.wait_for_timeout(600)
        # info gruppo
        await p.click('#convTesta .chi'); await p.wait_for_timeout(500)
        await p.screenshot(path=OUT + '/14-info.png')
        await p.click('[data-a="chiudi-info"]')
        # blocco chat con codice
        await p.click('[data-a="menu-conv"]'); await p.wait_for_timeout(200)
        await p.click('#menuPop button:has-text("Blocca chat")'); await p.wait_for_timeout(300)
        await p.click('.foglio-f .btn.pieno'); await p.wait_for_timeout(300)
        for k in '1234': await p.keyboard.press(k)
        await p.wait_for_timeout(400)
        for k in '1234': await p.keyboard.press(k)
        await p.wait_for_timeout(800)
        await p.screenshot(path=OUT + '/15-bloccata.png')
        await p.click('.riga[data-id="%s"]' % c1); await p.wait_for_timeout(600)
        await p.click('.riga[data-id="%s"]' % g1); await p.wait_for_timeout(500)
        await p.screenshot(path=OUT + '/16-chiede-pin.png')
        for k in '9999': await p.keyboard.press(k)
        await p.wait_for_timeout(600)
        await p.screenshot(path=OUT + '/17-pin-errato.png')
        for k in '1234': await p.keyboard.press(k)
        await p.wait_for_timeout(1000)
        aperta = await p.evaluate("document.querySelector('#convTesta b') && document.querySelector('#convTesta b').textContent")
        print('aperta dopo pin:', aperta)
        # impostazioni
        await p.click('[data-a="impostazioni"]'); await p.wait_for_timeout(500)
        await p.screenshot(path=OUT + '/18-impostazioni.png')
        await p.click('[data-a="chiudi-pannello"]')
        # nuovo gruppo
        await p.click('.lato-testa [data-a="nuova"]'); await p.wait_for_timeout(300)
        await p.screenshot(path=OUT + '/19-nuova.png')
        await p.click('[data-a="nuovo-gruppo"]'); await p.wait_for_timeout(300)
        await p.click('[data-sce]'); await p.wait_for_timeout(200)
        await p.click('[data-a="gruppo-avanti"]'); await p.wait_for_timeout(300)
        await p.fill('#ngNome', 'Spot Bugaboo'); await p.click('#ngCrea'); await p.wait_for_timeout(1200)
        await p.screenshot(path=OUT + '/20-gruppo-nuovo.png')
        # disegno
        await p.click('#allegaB'); await p.wait_for_timeout(200)
        await p.click('#menuPop button:has-text("Disegno")'); await p.wait_for_timeout(500)
        box = await (await p.query_selector('#edTratti')).bounding_box()
        await p.mouse.move(box['x'] + 100, box['y'] + 100); await p.mouse.down()
        for i in range(30): await p.mouse.move(box['x'] + 100 + i * 10, box['y'] + 100 + (i % 7) * 15)
        await p.mouse.up()
        await p.screenshot(path=OUT + '/21-disegno.png')
        await p.click('[data-d="fatto"]'); await p.wait_for_timeout(600)
        await p.click('[data-a="ai-manda"]'); await p.wait_for_timeout(1300)
        await p.screenshot(path=OUT + '/22-disegno-inviato.png')
        # tema chiaro
        await p.evaluate("document.documentElement.setAttribute('data-tema','chiaro')")
        await p.wait_for_timeout(300)
        await p.screenshot(path=OUT + '/23-chiaro.png')
        await ctx.close()

        # telefono
        ctx, p = await pagina(b, 390, 844, mobile=True, cfg={'chat': {'benvenuto': True}})
        await p.goto(BASE + 'chat.html')
        await p.wait_for_timeout(1500)
        await p.screenshot(path=OUT + '/30-tel-lista.png')
        g1 = await p.evaluate('__mock.G1')
        await p.tap('.riga[data-id="%s"]' % g1)
        await p.wait_for_timeout(1500)
        await p.screenshot(path=OUT + '/31-tel-gruppo.png')
        await p.tap('#stkB'); await p.wait_for_timeout(300)
        await p.screenshot(path=OUT + '/32-tel-emoji.png')
        await p.tap('#stkB')
        await p.tap('[data-a="chiudi-conv"]'); await p.wait_for_timeout(500)
        await p.screenshot(path=OUT + '/33-tel-indietro.png')
        await ctx.close()
        await b.close()
    print('\n'.join(errori) or 'NESSUN ERRORE')

if __name__ == "__main__": asyncio.run(main())
