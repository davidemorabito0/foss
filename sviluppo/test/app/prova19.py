# FOSS.chat 2.6.1: aperta dall'icona sull'iPhone la chat riempie tutto lo schermo (niente fascia vuota in basso); con la tastiera si accorcia
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)
FINTO = """(()=>{ let manca = 59; const vv = new EventTarget(); Object.defineProperty(vv, 'height', {get: () => innerHeight - manca});
  Object.defineProperty(vv, 'offsetTop', {get: () => 0}); Object.defineProperty(window, 'visualViewport', {get: () => vv});
  window.__manca = n => { manca = n; vv.dispatchEvent(new Event('resize')); }; })()"""
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME)
        ctx, p = await pagina(b, 430, 932, mobile=True, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
        await p.add_init_script(FINTO)
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
        h = await p.evaluate("[document.getElementById('app').getBoundingClientRect().height, innerHeight]")
        ok(abs(h[0] - h[1]) < 1, 'senza tastiera: la chat è alta quanto lo schermo (%d su %d)' % tuple(h))
        bar = await p.evaluate("(()=>{const t=document.querySelector('.ios-tabbar, .ios-tab, nav'); return t ? innerHeight - t.getBoundingClientRect().bottom : -1})()")
        print('   distanza della barra dal fondo:', bar)
        await p.screenshot(path=OUT + '/c19-iphone.png')
        await p.evaluate("__manca(336)"); await p.wait_for_timeout(300)
        h2 = await p.evaluate("document.getElementById('app').getBoundingClientRect().height")
        ok(abs(h2 - (932 - 336)) < 2, 'con la tastiera: si accorcia sopra la tastiera (%d)' % h2)
        await p.evaluate("__manca(59)"); await p.wait_for_timeout(300)
        h3 = await p.evaluate("document.getElementById('app').getBoundingClientRect().height")
        ok(abs(h3 - 932) < 1, 'tastiera chiusa: torna a tutto schermo')
        await ctx.close(); await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
