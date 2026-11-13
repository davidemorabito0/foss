# FOSS.chat 2.7.2: il vocale registrato ha l'onda vera e, quando lo ascolti, il pallino scorre da inizio a fine
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
        b = await pw.chromium.launch(executable_path=CHROME, args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
        for w, h, mob, nome in ((390, 844, True, 'tel'), (1366, 820, False, 'pc')):
            print('—', nome)
            ctx, p = await pagina(b, w, h, mobile=mob, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
            await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.C1')); await p.wait_for_timeout(900)
            bb = await p.locator('#mandaB').bounding_box()
            await p.mouse.move(bb['x'] + bb['width']/2, bb['y'] + bb['height']/2); await p.mouse.down(); await p.wait_for_timeout(4200); await p.mouse.up()
            if not mob: await p.click('#regManda')
            await p.wait_for_timeout(2500)
            m = await p.evaluate("(()=>{const l=__mock.db.chat_messaggi.filter(m=>m.tipo==='vocale'); return l[l.length-1]})()")
            ok(m is not None, 'vocale registrato e mandato')
            onda = (m or {}).get('media', {}).get('onda', '')
            ok(len(set(onda)) > 3 and not all(c in 'ABCD' for c in onda), 'l\'onda ha i picchi veri (%s…)' % onda[:16])
            # ascolto: il pallino deve muoversi
            await p.evaluate("document.querySelector('.vocale[data-voc=\"%s\"] .vp').click()" % m['id'])
            pos = []
            for _ in range(5):
                await p.wait_for_timeout(600)
                pos.append(await p.evaluate("parseFloat((document.querySelector('.vocale[data-voc=\"%s\"] .pallino')||{style:{}}).style.left)||0" % m['id']))
            print('   posizioni del pallino:', [round(x, 1) for x in pos])
            ok(all(pos[i] < pos[i+1] for i in range(len(pos)-1)) and pos[-1] > 20, 'il pallino scorre in avanti mentre ascolti')
            dbg = await p.evaluate("(()=>{const v=document.querySelector('.vocale[data-voc=\"%s\"]'); return v ? (v.querySelector('.pallino') ? getComputedStyle(v.querySelector('.pallino')).display : 'senza pallino') : 'vocale sparito: ' + document.querySelectorAll('.vocale').length})()" % m['id'])
            ok(dbg != 'none' and 'sparito' not in dbg and 'senza' not in dbg, 'il pallino si vede (%s)' % dbg)
            await p.screenshot(path=OUT + '/c22-%s-ascolto.png' % nome)
            await p.wait_for_timeout(2500)
            fine = await p.evaluate("document.querySelector('.vocale[data-voc=\"%s\"]').classList.contains('va')" % m['id'])
            ok(not fine, 'a fine vocale torna all\'inizio')
            # come l'iPhone: il file dichiara una durata enorme -> il pallino deve scorrere lo stesso (usa quella salvata)
            await p.evaluate("""Object.defineProperty(HTMLMediaElement.prototype, 'duration', {get(){ return 86400; }, configurable: true})""")
            await p.evaluate("document.querySelector('.vocale[data-voc=\"%s\"] .vp').click()" % m['id']); await p.wait_for_timeout(1800)
            x = await p.evaluate("parseFloat(document.querySelector('.vocale[data-voc=\"%s\"] .pallino').style.left)||0" % m['id'])
            ok(x > 25, 'anche con la durata sbagliata (come sull\'iPhone) il pallino scorre (%.0f%%)' % x)
            await ctx.close()
        await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
