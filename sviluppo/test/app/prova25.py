# FOSS.chat 2.9.4: vocali col dito. Tenuto premuto e lasciato = invia; scorri in su = bloccato (si registra
# a mani libere e si manda col tasto); scorri a sinistra = annullato; la barra compare subito, anche
# se il microfono ci mette un po' ad accendersi; il vocale mandato compare subito nella chat.
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)
# il microfono ci mette 600 ms ad accendersi (come certi telefoni)
LENTO = """const _g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
navigator.mediaDevices.getUserMedia = c => new Promise(r => setTimeout(r, 600)).then(() => _g(c));"""
VOC = "__mock.db.chat_messaggi.filter(m=>m.tipo==='vocale').length"
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME, args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
        ctx, p = await pagina(b, 390, 844, mobile=True, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}}, init=LENTO)
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
        await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.C1')); await p.wait_for_timeout(900)
        ok(await p.evaluate("matchMedia('(hover:none)').matches"), 'il telefono finto è «a dito»')
        async def premi():
            bb = await p.locator('#mandaB').bounding_box()
            x, y = bb['x'] + bb['width']/2, bb['y'] + bb['height']/2
            await p.mouse.move(x, y); await p.mouse.down()
            return x, y
        # 1. la barra compare subito; tenuto premuto e lasciato: parte
        n0 = await p.evaluate(VOC)
        x, y = await premi(); await p.wait_for_timeout(120)
        ok(await p.evaluate("!!document.querySelector('.registra') && !!document.getElementById('regBlocco')"), 'la barra e il lucchetto compaiono subito, prima che il microfono sia acceso')
        await p.wait_for_timeout(2500)
        await p.screenshot(path=OUT + '/c25-tieni.png')
        await p.mouse.up(); await p.wait_for_timeout(150)
        ok(await p.evaluate("document.querySelectorAll('.vocale').length") >= 1, 'il vocale compare subito nella chat')
        await p.wait_for_timeout(1800)
        ok(await p.evaluate(VOC) == n0 + 1, 'tenuto premuto e lasciato: il vocale parte')
        # 2. scorri in su: bloccato, lasciando non parte; poi col tasto sì
        n0 = await p.evaluate(VOC)
        x, y = await premi(); await p.wait_for_timeout(1200)
        await p.mouse.move(x - 4, y - 100, steps=8); await p.wait_for_timeout(100)
        ok(await p.evaluate("document.querySelector('.registra').classList.contains('bloccata')"), 'scorrendo in su la registrazione si blocca')
        await p.mouse.up(); await p.wait_for_timeout(1500)
        ok(await p.evaluate("!!document.querySelector('.registra.bloccata')") and await p.evaluate(VOC) == n0, 'bloccata: lasciando il dito continua a registrare')
        ok(await p.evaluate("getComputedStyle(document.getElementById('regVivo')).display") == 'flex', 'bloccata: si vede l\'onda dal vivo')
        await p.screenshot(path=OUT + '/c25-bloccata.png')
        await p.click('#regManda'); await p.wait_for_timeout(1800)
        ok(await p.evaluate(VOC) == n0 + 1, 'bloccata: il tasto invia la manda')
        # 3. scorri a sinistra: annullato
        n0 = await p.evaluate(VOC)
        x, y = await premi(); await p.wait_for_timeout(1200)
        await p.mouse.move(x - 150, y + 2, steps=8); await p.mouse.up(); await p.wait_for_timeout(1500)
        ok(await p.evaluate(VOC) == n0 and await p.evaluate("!!document.getElementById('testoIn')"), 'scorrendo a sinistra si annulla')
        # 4. tocco breve: resta aperta (bloccata)
        x, y = await premi(); await p.wait_for_timeout(100); await p.mouse.up(); await p.wait_for_timeout(900)
        ok(await p.evaluate("!!document.querySelector('.registra.bloccata')"), 'un tocco breve apre la registrazione a mani libere')
        await p.click('[data-a="reg-annulla"]'); await p.wait_for_timeout(500)
        ok(await p.evaluate("!document.querySelector('.registra')"), 'il cestino la chiude')
        await ctx.close(); await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
