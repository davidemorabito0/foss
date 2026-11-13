# FOSS.chat 2.7: se un file non parte si può riprovare (anche documenti e vocali); si può fermare; riprova da solo quando torna la rete;
# i suoni della chat non fermano la musica (audio «di contorno»)
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)
SESS = "navigator.audioSession = {type: 'auto'}; window.__tipi = []; const _d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(navigator.audioSession), 'type');"
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME)
        for w, h, mob, nome in ((1366, 820, False, 'pc'), (390, 844, True, 'tel')):
            print('—', nome)
            ctx, p = await pagina(b, w, h, mobile=mob, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}}, init="window.__sess={type:'auto'}; Object.defineProperty(navigator,'audioSession',{get:()=>window.__sess});")
            stato = {'rete': False}
            async def carica(route):
                if not stato['rete']: return await route.abort()
                u = route.request.url
                if 'media.foss.team' in u: return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'url': 'https://media.foss.team/f/' + u.split('/')[-1]}))
                return await route.fulfill(status=200, content_type='application/json', body='{"Key":"ok"}')
            await ctx.route('**/carica/**', carica); await ctx.route('**/storage/v1/object/chat/**', carica)
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
            await p.evaluate("window.__RETE_GIU = true")
            ok(await p.evaluate("window.__sess.type") == 'ambient', 'suoni «di contorno»: non fermano Spotify')
            await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.C1')); await p.wait_for_timeout(900)
            # un documento che non parte (rete giù)
            await p.evaluate("""(()=>{ const f = new File([new Uint8Array(3000)], 'preventivo.pdf', {type: 'application/pdf'});
               const dt = new DataTransfer(); dt.items.add(f); const c = document.getElementById('conv');
               c.dispatchEvent(new DragEvent('dragenter', {bubbles: true, cancelable: true, dataTransfer: dt}));
               c.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: dt})); })()""")
            await p.wait_for_timeout(800)
            await p.click('[data-a="ai-manda"]'); await p.wait_for_timeout(3000)
            n = await p.evaluate("document.querySelectorAll('.riprova-b').length")
            ok(n >= 1, 'file non partito: compare «Non inviato · Riprova»')
            await p.screenshot(path=OUT + '/c20-%s-errore.png' % nome)
            stato['rete'] = True; await p.evaluate("window.__RETE_GIU = false")
            if n:
                await p.click('.riprova-b'); await p.wait_for_timeout(2500)
                ok(await p.evaluate("document.querySelectorAll('.riprova-b').length") == 0, 'toccando «Riprova» parte')
                ok(await p.evaluate("__mock.db.chat_messaggi.some(m=>m.tipo==='file'&&m.media&&m.media.nome==='preventivo.pdf')"), 'il documento arriva nella chat')
            await p.screenshot(path=OUT + '/c20-%s-riprovato.png' % nome)
            # un caricamento che si blocca: lo fermi tu toccando l'anello, poi riprovi
            await p.evaluate("window.__APPESO = true")
            await p.evaluate("""(()=>{ const f = new File([new Uint8Array(5000)], 'scaletta.pdf', {type: 'application/pdf'});
               const dt = new DataTransfer(); dt.items.add(f); const c = document.getElementById('conv');
               c.dispatchEvent(new DragEvent('dragenter', {bubbles: true, cancelable: true, dataTransfer: dt}));
               c.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: dt})); })()""")
            await p.wait_for_timeout(600); await p.click('[data-a="ai-manda"]'); await p.wait_for_timeout(1200)
            ok(await p.evaluate("!!document.querySelector('[data-a=\"annulla-carica\"]')"), 'durante il caricamento si può fermare')
            await p.evaluate("document.querySelector('[data-a=\"annulla-carica\"]').click()"); await p.wait_for_timeout(600)
            ok(await p.evaluate("document.querySelectorAll('.riprova-b').length") == 1, 'fermato: «Riprova»')
            await p.evaluate("window.__APPESO = false; window.dispatchEvent(new Event('online'))"); await p.wait_for_timeout(3500)
            ok(await p.evaluate("__mock.db.chat_messaggi.some(m=>m.tipo==='file'&&m.media&&m.media.nome==='scaletta.pdf')"), 'quando torna la rete riprova da solo')
            await ctx.close()
        await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e and 'net::' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
