# FOSS.chat 2.3: grandezza del testo, temi Autunno e Limoni, «Rendi privata», super notifica, chat con te stesso
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')

def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)

FONT = "parseFloat(getComputedStyle(document.querySelector('#msgs .bolla .testo')).fontSize)"

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME)
        for w, h, mob, nome in ((1366, 820, False, 'pc'), (390, 844, True, 'tel')):
            print('— grandezza del testo,', nome)
            dims = {}
            for t in ('piccolo', 'medio', 'grande'):
                ctx, p = await pagina(b, w, h, mobile=mob, cfg={'chat': {'benvenuto': True, 'tema': 'scuro', 'testo': t}})
                await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1200)
                await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.G1')); await p.wait_for_timeout(900)
                dims[t] = await p.evaluate(FONT)
                if t == 'grande': await p.screenshot(path=OUT + '/c16-%s-testo-grande.png' % nome)
                await ctx.close()
            ok(dims['piccolo'] < dims['medio'] < dims['grande'], 'piccolo %.1f < medio %.1f < grande %.1f' % (dims['piccolo'], dims['medio'], dims['grande']))

        print('— temi ritoccati')
        for col, atteso in (('autunno', '#1E1411'), ('limoni', '#121810')):
            ctx, p = await pagina(b, 390, 844, mobile=True, cfg={'chat': {'benvenuto': True, 'tema': 'scuro', 'colori': col}})
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1200)
            app = await p.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--app').trim()")
            ok(app.upper() == atteso, col + ': sfondo scuro ' + app)
            await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.G1')); await p.wait_for_timeout(800)
            await p.screenshot(path=OUT + '/c16-%s.png' % col)
            await ctx.close()

        print('— rendi privata (tocco lungo / tasto destro sulla chat)')
        ctx, p = await pagina(b, 1366, 820, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
        await p.add_init_script("window.__PIN = '1234'")
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1200)
        c1 = await p.evaluate('__mock.C1')
        bb = await p.locator('.riga[data-id="%s"]' % c1).bounding_box()
        await p.mouse.click(bb['x'] + 100, bb['y'] + 30, button='right'); await p.wait_for_timeout(300)
        voci = await p.evaluate("[...document.querySelectorAll('#menuPop button, .menu-pop button')].map(x=>x.innerText.trim())")
        ok('Rendi privata' in voci, 'voce «Rendi privata» nel menu: %s' % voci)
        await p.click('button:has-text("Rendi privata")'); await p.wait_for_timeout(400)
        ok(await p.evaluate("!!document.getElementById('pinPunti')"), 'chiede il codice')
        await p.screenshot(path=OUT + '/c16-rendi-privata.png')
        for n in '1234': await p.click('.pin-tasti [data-n="%s"]' % n); await p.wait_for_timeout(60)
        await p.wait_for_timeout(700)
        ok(await p.evaluate("__mock.db.chat_membri.find(x=>x.conv_id===__mock.C1&&x.utente_id===__mock.D).bloccata") == True, 'chat resa privata')
        ok(await p.evaluate("document.querySelector('.riga[data-id=\"%s\"]').innerText.includes('Chat privata')" % c1), 'nell\'elenco: «Chat privata»')
        # codice sbagliato: non la rende privata
        g1 = await p.evaluate('__mock.G1')
        bb = await p.locator('.riga[data-id="%s"]' % g1).bounding_box()
        await p.mouse.click(bb['x'] + 100, bb['y'] + 30, button='right'); await p.wait_for_timeout(300)
        await p.click('button:has-text("Rendi privata")'); await p.wait_for_timeout(400)
        for n in '9999': await p.click('.pin-tasti [data-n="%s"]' % n); await p.wait_for_timeout(60)
        await p.wait_for_timeout(600)
        await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
        x = await p.evaluate("document.querySelector('.pin-tasti [data-x]')")
        if x: await p.click('.pin-tasti [data-x]'); await p.wait_for_timeout(300)
        ok(not await p.evaluate("__mock.db.chat_membri.find(x=>x.conv_id===__mock.G1&&x.utente_id===__mock.D).bloccata"), 'codice sbagliato: resta normale')
        await ctx.close()

        print('— super notifica (solo amministratore)')
        for admin in (True, False):
            ctx, p = await pagina(b, 1366, 820, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
            if not admin: await p.add_init_script("window.__NON_ADMIN = true")
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
            await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.G1')); await p.wait_for_timeout(900)
            await p.click('#testoIn'); await p.keyboard.type('Domani alle 9 tutti sul set'); await p.keyboard.press('Enter'); await p.wait_for_timeout(700)
            mid = await p.evaluate("(()=>{const l=__mock.db.chat_messaggi.filter(m=>m.tipo==='testo'&&m.autore===__mock.D); return l[l.length-1].id})()")
            bx = await p.locator('.msg[data-id="%s"] .bolla' % mid).bounding_box()
            await p.mouse.click(bx['x'] + 20, bx['y'] + 10, button='right'); await p.wait_for_timeout(350)
            if await p.evaluate("!!document.querySelector('#fmMenu [data-fm=\"altro\"]')"):
                await p.click('#fmMenu [data-fm="altro"]'); await p.wait_for_timeout(250)
            voci = await p.evaluate("[...document.querySelectorAll('#fmMenu .fm-voce .fm-tx')].map(x=>x.textContent)")
            if not admin:
                ok('Super notifica' not in voci, 'chi non è amministratore non la vede')
                await ctx.close(); continue
            ok('Super notifica' in voci, 'in «Altro»: Super notifica')
            ok(await p.evaluate("!!document.querySelector('#fmMenu .fm-voce:has(.fm-tx) svg') && [...document.querySelectorAll('#fmMenu .fm-voce')].some(v=>v.innerText.includes('Super notifica') && v.querySelector('rect'))"), 'con l\'icona della mail')
            await p.screenshot(path=OUT + '/c16-super-menu.png')
            await p.click('#fmMenu .fm-voce:has-text("Super notifica")'); await p.wait_for_timeout(300)
            await p.screenshot(path=OUT + '/c16-super-conferma.png')
            await p.click('.foglio button:has-text("Manda la mail")'); await p.wait_for_timeout(900)
            ok(await p.evaluate("(window.__super||[]).length") == 1, 'mandata alla funzione')
            ok(await p.evaluate("document.body.innerText.includes('Super notifica mandata per email a 2 persone')"), 'avviso «mandata a 2 persone»')
            await ctx.close()

        print('— chat con te stesso')
        for w, h, mob, nome in ((1366, 820, False, 'pc'), (390, 844, True, 'tel')):
            ctx, p = await pagina(b, w, h, mobile=mob, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1200)
            await p.evaluate("document.querySelector('[data-a=\"nuova\"]').click()"); await p.wait_for_timeout(500)
            ok(await p.evaluate("!!document.querySelector('#pannelloSxC [data-a=\"scrivi-a\"][data-id=\"'+__mock.D+'\"]')"), nome + ': «(tu)» nella nuova chat')
            await p.screenshot(path=OUT + '/c16-%s-nuova.png' % nome)
            await p.evaluate("document.querySelector('#pannelloSxC [data-a=\"scrivi-a\"][data-id=\"'+__mock.D+'\"]').click()"); await p.wait_for_timeout(1000)
            await p.click('#testoIn'); await p.keyboard.type('Promemoria: comprare le batterie')
            if mob: await p.click('.manda'); 
            else: await p.keyboard.press('Enter')
            await p.wait_for_timeout(800)
            c = await p.evaluate("(()=>{const c=__mock.db.chat_conversazioni.find(x=>x.coppia===__mock.D+':'+__mock.D); return c && {n: __mock.db.chat_membri.filter(m=>m.conv_id===c.id).length, msg: __mock.db.chat_messaggi.filter(m=>m.conv_id===c.id).length}})()")
            ok(c and c['n'] == 1 and c['msg'] == 1, nome + ': chat con un solo membro e messaggio salvato')
            ok(await p.evaluate("document.querySelector('.conv-testa, .ios-testa') && document.body.innerText.includes('(tu)')"), nome + ': si chiama «… (tu)»')
            await p.screenshot(path=OUT + '/c16-%s-con-te.png' % nome)
            # di nuovo: stessa chat, non una nuova
            await p.evaluate("document.querySelector('[data-a=\"nuova\"]') && document.querySelector('[data-a=\"nuova\"]').click()"); await p.wait_for_timeout(500)
            el = await p.evaluate("!!document.querySelector('#pannelloSxC [data-a=\"scrivi-a\"][data-id=\"'+__mock.D+'\"]')")
            if el:
                await p.evaluate("document.querySelector('#pannelloSxC [data-a=\"scrivi-a\"][data-id=\"'+__mock.D+'\"]').click()"); await p.wait_for_timeout(800)
                ok(await p.evaluate("__mock.db.chat_conversazioni.filter(x=>x.coppia===__mock.D+':'+__mock.D).length") == 1, nome + ': riaperta la stessa chat')
            await ctx.close()
        await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
