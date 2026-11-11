import asyncio, sys, json
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright

def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx, p = await pagina(b, 1366, 820, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
        await p.clock.install()
        await p.clock.resume()
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
        c1 = await p.evaluate('__mock.C1')
        await p.click('.riga[data-id="%s"]' % c1); await p.wait_for_timeout(900)
        print('— promemoria che scatta')
        mid = await p.evaluate("(()=>{const l=__mock.db.chat_messaggi.filter(m=>m.conv_id===__mock.C1&&m.tipo==='testo'); return l[l.length-1].id})()")
        await p.locator('.msg[data-id="%s"] .bolla' % mid).scroll_into_view_if_needed()
        box = await p.locator('.msg[data-id="%s"] .bolla' % mid).bounding_box()
        await p.mouse.click(box['x'] + 20, box['y'] + 10, button='right'); await p.wait_for_timeout(300)
        await p.click('#fmMenu .fm-voce:has-text("Ricordamelo")'); await p.wait_for_timeout(300)
        await p.click('[data-q]:has-text("Tra un")'); await p.wait_for_timeout(500)
        ok(await p.evaluate("!!document.querySelector('.msg[data-id=\"%s\"] .meta .mt-ic[title^=\"Promemoria\"]')" % mid), 'sveglia sul messaggio')
        await p.clock.fast_forward("01:00:05"); await p.wait_for_timeout(600)
        t = await p.evaluate("(document.getElementById('toast')||{}).innerText||''")
        ok('⏰' in t, 'richiamo nella chat: ' + t)
        ok(await p.evaluate("!document.querySelector('.msg[data-id=\"%s\"] .meta .mt-ic[title^=\"Promemoria\"]')" % mid), 'sveglia tolta dopo lo scatto')
        await p.screenshot(path=OUT + '/c09-promemoria-scattato.png')
        print('— modifica: dopo 15 minuti non si puo\' piu\'')
        await p.fill('#testoIn', 'scritto adesso'); await p.press('#testoIn', 'Enter'); await p.wait_for_timeout(500)
        mid2 = await p.evaluate("(()=>{const l=__mock.db.chat_messaggi.filter(m=>m.autore===__mock.D&&m.testo==='scritto adesso'); return l[0].id})()")
        await p.clock.fast_forward("00:16:00"); await p.wait_for_timeout(300)
        await p.locator('.msg[data-id="%s"] .bolla' % mid2).scroll_into_view_if_needed()
        box = await p.locator('.msg[data-id="%s"] .bolla' % mid2).bounding_box()
        await p.mouse.click(box['x'] + 20, box['y'] + 10, button='right'); await p.wait_for_timeout(300)
        voci = await p.evaluate("[...document.querySelectorAll('#fmMenu .fm-voce .fm-tx')].map(x=>x.textContent)")
        ok('Modifica' not in voci, 'niente «Modifica» dopo 15 minuti')
        await ctx.close(); await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
