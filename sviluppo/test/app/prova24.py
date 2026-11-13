# FOSS.chat 2.7.4 + FOSS v73: iPhone, app aperta dall'icona (iOS 26).
# - la pagina e' alta almeno quanto lo schermo (regola html in display-mode standalone): cosi' iOS la disegna intera
# - la barra in basso e' tutta dentro lo schermo (niente etichette tagliate)
# - le chat (e in FOSS il contenuto) finiscono sopra la barra: dietro ai tre tasti non si vede niente
# - con la tastiera la chat si accorcia ancora
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import BASE, OUT, errori, MOCK
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)
async def contesto(b):
    ctx = await b.new_context(viewport={'width': 402, 'height': 874}, is_mobile=True, has_touch=True)
    async def rotta(route):
        u = route.request.url
        if 'supabase-js' in u: await route.fulfill(status=200, content_type='application/javascript', body=MOCK)
        elif u.startswith(BASE): await route.continue_()
        else: await route.abort()
    await ctx.route('**/*', rotta)
    await ctx.add_init_script('window.__CFG = ' + json.dumps({'chat': {'benvenuto': True, 'tema': 'scuro'}}) + ';' + "Object.defineProperty(navigator, 'standalone', {get: () => true});")
    p = await ctx.new_page(); p.on('pageerror', lambda e: errori.append('PAGEERROR ' + str(e)))
    cdp = await ctx.new_cdp_session(p)
    await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'display-mode', 'value': 'standalone'}]})
    try:
        await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': {'top': 62, 'bottom': 34}})
        bordi = True
    except Exception as e:
        print('   (bordi del telefono non simulabili:', str(e)[:80], ')'); bordi = False
    return ctx, p, bordi
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME)
        # ---------- chat ----------
        ctx, p, bordi = await contesto(b)
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1400)
        v = await p.evaluate("""(()=>{
          const r = e => document.querySelector(e).getBoundingClientRect();
          const cs = getComputedStyle(document.documentElement);
          return {standalone: document.documentElement.classList.contains('da-icona'), minH: cs.minHeight, htmlH: document.documentElement.getBoundingClientRect().height,
            inner: innerHeight, app: r('#app').height, tabTop: r('.ios-tab').top, tabBot: r('.ios-tab').bottom,
            lista: r('#lista').bottom, sch: getComputedStyle(document.documentElement).getPropertyValue('--schermo'),
            ultima: (()=>{ const L = document.getElementById('lista'); L.scrollTop = 1e6; return L.getBoundingClientRect().bottom; })()}
        })()""")
        print('  ', v)
        ok(v['standalone'], 'simulo l\'app aperta dall\'icona')
        ok(v['minH'] not in ('0px', 'auto') , 'regola «pagina alta quanto lo schermo» attiva (%s)' % v['minH'])
        ok(abs(v['htmlH'] - v['inner']) < 1, 'nessuno scorrimento in più: pagina = schermo (%d)' % v['htmlH'])
        ok(abs(v['app'] - v['inner']) < 1, 'la chat è alta quanto la pagina, non di più (%d)' % v['app'])
        ok(v['tabBot'] <= v['inner'] - 10, 'la barra in basso è tutta visibile, etichette comprese (fondo %d su %d)' % (v['tabBot'], v['inner']))
        ok(v['lista'] <= v['tabTop'] - 5, 'le chat finiscono sopra la barra (%d ≤ %d)' % (v['lista'], v['tabTop']))
        ok(v['sch'].strip() == '', 'niente più altezza «inventata» dallo schermo')
        if bordi: ok(abs((v['inner'] - v['tabBot']) - 44) < 1, 'la barra sta 10px sopra il bordo del telefono')
        await p.screenshot(path=os.path.join(OUT, 'p24-chat.png'))
        await p.evaluate("""(()=>{ const vv = window.visualViewport; Object.defineProperty(vv, 'height', {get: () => 540, configurable: true}); vv.dispatchEvent(new Event('resize')); })()""")
        await p.wait_for_timeout(300)
        h = await p.evaluate("document.getElementById('app').getBoundingClientRect().height")
        ok(abs(h - 540) < 2, 'con la tastiera la chat si accorcia (%d)' % h)
        await p.evaluate("""(()=>{ const vv = window.visualViewport; Object.defineProperty(vv, 'height', {get: () => 874, configurable: true}); vv.dispatchEvent(new Event('resize')); })()""")
        await p.wait_for_timeout(300)
        h = await p.evaluate("document.getElementById('app').getBoundingClientRect().height")
        ok(abs(h - 874) < 1, 'tastiera chiusa: di nuovo tutta la pagina (%d)' % h)
        await ctx.close()
        # ---------- FOSS ----------
        ctx, p, bordi = await contesto(b)
        await p.goto(BASE + 'index.html'); await p.wait_for_timeout(1500)
        await p.evaluate("document.getElementById('tabbar').hidden = false; window.dispatchEvent(new Event('resize'))")
        await p.wait_for_timeout(500)
        v = await p.evaluate("""(()=>{
          const tb = document.getElementById('tabbar'); tb.hidden = false;
          const app = document.getElementById('app'); app.classList.add('con-nav');
          const cs = getComputedStyle(document.documentElement);
          return {minH: cs.minHeight, htmlH: document.documentElement.getBoundingClientRect().height, inner: innerHeight,
            navh: cs.getPropertyValue('--nav-h'), tabTop: tb.getBoundingClientRect().top, tabBot: tb.getBoundingClientRect().bottom,
            stage: document.getElementById('stage').getBoundingClientRect().bottom, tbH: tb.offsetHeight}
        })()""")
        print('  ', v)
        ok(v['minH'] not in ('0px', 'auto'), 'FOSS: regola «pagina alta quanto lo schermo» attiva (%s)' % v['minH'])
        ok(abs(v['htmlH'] - v['inner']) < 1, 'FOSS: nessuno scorrimento in più (%d)' % v['htmlH'])
        ok(v['tabBot'] <= v['inner'] - 10, 'FOSS: la barra è tutta visibile')
        ok(v['stage'] <= v['tabTop'] - 5, 'FOSS: il contenuto finisce sopra la barra (%d ≤ %d)' % (v['stage'], v['tabTop']))
        await p.screenshot(path=os.path.join(OUT, 'p24-foss.png'))
        await ctx.close(); await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
