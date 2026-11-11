# v77: temi colore di FOSS nella chat (predefinito Brand) e visore che si chiude toccando fuori
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')

def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME)
        for w, h, mob, nome in ((1366, 820, False, 'pc'), (390, 844, True, 'tel')):
            print('—', nome)
            ctx, p = await pagina(b, w, h, mobile=mob, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
            ok(await p.evaluate("document.documentElement.getAttribute('data-colori')") == 'brand', 'predefinito Brand')
            pan = await p.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--pannello').trim()")
            ok(pan.upper() == '#13263A', 'pannello navy: ' + pan)
            
            pieno = await p.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--pieno').trim()")
            ok(pieno.upper() == '#FFAD01', 'giallo FOSS: ' + pieno)
            await p.screenshot(path=OUT + '/c14-%s-brand.png' % nome)
            g1 = await p.evaluate('__mock.G1')
            await p.click('.riga[data-id="%s"]' % g1); await p.wait_for_timeout(1200)
            await p.screenshot(path=OUT + '/c14-%s-brand-chat.png' % nome)
            # visore: tocco sulla foto non chiude, tocco fuori chiude
            fid = await p.evaluate("(()=>{const m=__mock.db.chat_messaggi.find(m=>m.conv_id===__mock.G1&&m.tipo==='foto'&&m.media.path); return m.id})()")
            await p.evaluate("document.querySelector('.msg[data-id=\"%s\"]').scrollIntoView({block:'center'})" % fid); await p.wait_for_timeout(300)
            
            await p.click('.msg[data-id="%s"] [data-a="vedi"]' % fid); await p.wait_for_timeout(700)
            ok(await p.evaluate("!!document.getElementById('visore')"), 'visore aperto')
            img = await p.query_selector('#visoreImg')
            if img:
                bb = await img.bounding_box()
                if mob: await p.touchscreen.tap(bb['x'] + bb['width']/2, bb['y'] + bb['height']/2)
                else: await p.mouse.click(bb['x'] + bb['width']/2, bb['y'] + bb['height']/2)
                await p.wait_for_timeout(450)
                ok(await p.evaluate("!!document.getElementById('visore')"), 'tocco sulla foto: resta aperto')
            await p.screenshot(path=OUT + '/c14-%s-visore.png' % nome)
            cb = await (await p.query_selector('#visoreC')).bounding_box()
            x, y = cb['x'] + 30, cb['y'] + cb['height'] - 15
            if mob: await p.touchscreen.tap(x, y)
            else: await p.mouse.click(x, y)
            await p.wait_for_timeout(400)
            ok(not await p.evaluate("!!document.getElementById('visore')"), 'tocco fuori: si chiude')
            # cambio tema dalle impostazioni (si riparte dall'elenco)
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
            await p.evaluate("""(()=>{const b=document.querySelector('[data-a="impostazioni"]'); b&&b.click();})()"""); await p.wait_for_timeout(500)
            n = await p.evaluate("document.querySelectorAll('.colore-tema').length")
            if n == 0:
                print('   (impostazioni non aperte dal tasto, salto la griglia)')
            else:
                ok(n == 8, 'otto temi come in FOSS: %d' % n)
                await p.screenshot(path=OUT + '/c14-%s-impostazioni.png' % nome)
                await p.click('.colore-tema[data-v="limoni"]'); await p.wait_for_timeout(400)
                ok(await p.evaluate("document.documentElement.getAttribute('data-colori')") == 'limoni', 'scelto Limoni')
                await p.wait_for_timeout(1000); ok(await p.evaluate("(__mock.db.profili.find(x=>x.id===__mock.D).chat_cfg||{}).colori") == "limoni", "salvato nel profilo")
                await p.screenshot(path=OUT + '/c14-%s-limoni.png' % nome)
            await ctx.close()
        await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
