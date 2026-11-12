# FOSS.chat 2.4 (idee di MSN): messaggio personale, «è appena entrato», cornice della foto, sfondi animati col colpetto
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
            await p.add_init_script("window.__MSN = true")
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
            c1 = await p.evaluate('__mock.C1'); an = await p.evaluate('__mock.AN')
            # la cornice di Momo si vede a tutti
            ok(await p.evaluate("!!document.querySelector('.riga[data-id=\"%s\"] .av.cr-oro')" % c1), 'cornice d\'oro di Momo nell\'elenco')
            # il suo messaggio personale
            await p.click('.riga[data-id="%s"]' % c1); await p.wait_for_timeout(900)
            testa = await p.evaluate("(document.querySelector('.conv-testa') || document.body).innerText")
            ok('Sul set fino alle 18' in testa, 'messaggio personale nella testata: ' + testa.replace('\n', ' | ')[:80])
            await p.screenshot(path=OUT + '/c17-%s-testata.png' % nome)
            # sfondo animato + colpetto
            await p.evaluate("document.querySelector('[data-a=\"impostazioni\"]') && 0")
            if mob: await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1200); c1 = await p.evaluate('__mock.C1')
            await p.evaluate("document.querySelector('[data-a=\"impostazioni\"]').click()"); await p.wait_for_timeout(600)
            ok(await p.evaluate("!!document.getElementById('fraseIn')"), 'impostazioni: campo messaggio personale')
            await p.fill('#fraseIn', 'In montaggio, rispondo dopo'); await p.press('#fraseIn', 'Enter'); await p.wait_for_timeout(1500)
            ok(await p.evaluate("(__mock.db.profili.find(x=>x.id===__mock.D).chat_cfg||{}).frase") == 'In montaggio, rispondo dopo', 'messaggio personale salvato nel profilo')
            n = await p.evaluate("document.querySelectorAll('.cornice-b').length")
            ok(n == 9, 'nove scelte di cornice (%d)' % n)
            await p.click('.cornice-b[data-v="neon"]'); await p.wait_for_timeout(1300)
            ok(await p.evaluate("(__mock.db.profili.find(x=>x.id===__mock.D).chat_cfg||{}).cornice") == 'neon', 'cornice salvata')
            ok(await p.evaluate("!!document.querySelector('.profilo-big .av.cr-neon, #pannelloSxC .voce .av.cr-neon')"), 'la mia foto ha la cornice neon')
            await p.evaluate("document.querySelector('.cornice-b[data-v=\"neon\"]').scrollIntoView({block:'center'})"); await p.wait_for_timeout(200)
            await p.screenshot(path=OUT + '/c17-%s-cornici.png' % nome)
            await p.evaluate("document.querySelector('.opz.vivi button[data-v=\"lucciole\"]').scrollIntoView({block:'center'})")
            await p.click('.opz.vivi button[data-v="lucciole"]'); await p.wait_for_timeout(400)
            await p.wait_for_timeout(1200); ok(await p.evaluate("(__mock.db.profili.find(x=>x.id===__mock.D).chat_cfg||{}).vivo") == 'lucciole', 'sfondo animato scelto e salvato')
            await p.screenshot(path=OUT + '/c17-%s-sfondi.png' % nome)
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1200)
            c1 = await p.evaluate('__mock.C1')
            await p.click('.riga[data-id="%s"]' % c1); await p.wait_for_timeout(1200)
            ok(await p.evaluate("!!document.querySelector('.msgs-wrap canvas.sfondo-vivo')"), 'sfondo animato dietro ai messaggi')
            px = await p.evaluate("(()=>{const c=document.querySelector('canvas.sfondo-vivo'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n})()")
            ok(px > 200, 'si disegna davvero (%d punti)' % px)
            await p.screenshot(path=OUT + '/c17-%s-lucciole.png' % nome)
            await p.evaluate("__mock.arriva(__mock.C1, __mock.MO, null, {tipo: 'colpetto', media: {a: __mock.D}})")
            await p.wait_for_timeout(250)
            await p.screenshot(path=OUT + '/c17-%s-colpetto.png' % nome)
            # entra Antonio: avviso «è appena entrato»
            await p.wait_for_timeout(6200)
            await p.evaluate("__mock.entra(__mock.AN)"); await p.wait_for_timeout(700)
            t = await p.evaluate("(document.getElementById('entrati')||{innerText:''}).innerText")
            ok('appena entrato' in t and 'Antonio' in t, 'avviso «Antonio è appena entrato»')
            await p.screenshot(path=OUT + '/c17-%s-entrato.png' % nome)
            # di nuovo subito: niente doppione
            await p.evaluate("__mock.esce(__mock.AN)"); await p.wait_for_timeout(200)
            await p.evaluate("__mock.entra(__mock.AN)"); await p.wait_for_timeout(500)
            ok(await p.evaluate("document.querySelectorAll('#entrati .entrato').length") == 1, 'non ripete l\'avviso subito')
            await p.click('#entrati .entrato'); await p.wait_for_timeout(1000)
            ok(await p.evaluate("document.body.innerText.includes('Antonio')") and await p.evaluate("!!document.querySelector('#testoIn')"), 'toccando l\'avviso si apre la chat con lui')
            await ctx.close()
        await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
