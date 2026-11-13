# FOSS.chat 2.7.1: il microfono funziona anche con i suoni «di contorno» (iPhone); se è negato, spiega dove sbloccarlo
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)
# come l'iPhone: con la sessione audio «ambient» il microfono viene negato
IPHONE = """Object.defineProperty(navigator, 'userAgent', {get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'}); window.__sess = {type: 'auto'}; Object.defineProperty(navigator, 'audioSession', {get: () => window.__sess});
const _gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
navigator.mediaDevices.getUserMedia = c => { window.__tipoAlMic = window.__sess.type;
  if(window.__NEGATO || window.__sess.type === 'ambient'){ const e = new Error('negato'); e.name = 'NotAllowedError'; return Promise.reject(e); } return _gum(c); };"""
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME, args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        for neg in (False, True):
            ctx, p = await pagina(b, 390, 844, mobile=True, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}}, init=IPHONE + ("window.__NEGATO = true;" if neg else ""))
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
            await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.C1')); await p.wait_for_timeout(900)
            mic = p.locator('#mandaB')
            bb = await mic.bounding_box()
            await p.mouse.move(bb['x'] + bb['width']/2, bb['y'] + bb['height']/2); await p.mouse.down(); await p.wait_for_timeout(1800)
            if not neg:
                ok(await p.evaluate("window.__tipoAlMic") == 'play-and-record', 'prima di chiedere il microfono passa in modalità «registra»')
                ok(await p.evaluate("!!document.querySelector('.registra, .reg')"), 'la registrazione parte')
                await p.mouse.up(); await p.wait_for_timeout(1500)
                ok(await p.evaluate("__mock.db.chat_messaggi.some(m=>m.tipo==='vocale')"), 'il vocale arriva')
                ok(await p.evaluate("window.__sess.type") == 'ambient', 'dopo, i suoni tornano «di contorno»')
            else:
                await p.mouse.up(); await p.wait_for_timeout(500)
                t = await p.evaluate("(document.querySelector('.foglio')||{innerText:''}).innerText")
                ok('Impostazioni' in t and 'Safari' in t and 'Microfono' in t, 'microfono negato: spiega dove sbloccarlo')
                await p.screenshot(path=OUT + '/c21-microfono.png')
            await ctx.close()
        await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
