# Controllo di base di FOSS (index.html), senza database: supabase-js viene bloccato, quindi FOSS parte in
# modalità locale con i dati dimostrativi. Apre la Home, entra in uno spazio, apre un lavoro, il Profilo,
# e fa lo stesso sul telefono. Si ferma su qualunque errore della pagina.
# Uso (dalla radice del repository, con «python3 -m http.server 8123» acceso):
#   CHROME="/percorso/di/chrome" python3 sviluppo/test/app/prova-foss.py
import asyncio, os, sys
from playwright.async_api import async_playwright

BASE = os.environ.get('BASE', 'http://localhost:8123/')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shot')
os.makedirs(OUT, exist_ok=True)
errori = []

def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)

async def pagina(b, w, h, mobile=False):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile,
                              service_workers='block')
    p = await ctx.new_page()
    p.set_default_timeout(8000)
    p.errori = []
    p.on('pageerror', lambda e: p.errori.append(str(e)))
    p.on('console', lambda m: p.errori.append(m.text) if m.type == 'error' else None)
    # niente database: FOSS lavora in locale con i dati dimostrativi
    await p.route('**/*supabase*', lambda r: r.abort())
    return ctx, p

async def apri_spazio(p):
    await p.goto(BASE + 'index.html'); await p.wait_for_timeout(2500)
    await p.locator('text=Video Milano').last.click(); await p.wait_for_timeout(1500)

def senza_rumore(l):
    # gli errori di rete voluti (supabase bloccato) non contano
    return [e for e in l if 'supabase' not in e.lower() and 'ERR_FAILED' not in e and 'net::' not in e]

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME)

        print('— computer (1500 x 950)')
        ctx, p = await pagina(b, 1500, 950)
        await p.goto(BASE + 'index.html'); await p.wait_for_timeout(2500)
        ok(await p.locator('text=I tuoi spazi di lavoro').count() > 0, 'la Home mostra gli spazi di lavoro')
        await apri_spazio(p)
        ok(await p.locator('text=In corso').count() > 0, 'nello spazio si vedono le colonne dei progetti')
        ok(await p.locator('.sp2-info').is_visible(), 'accanto ai progetti c\'è la scheda dello spazio')
        ok(await p.locator('.sp2-info >> text=Descrizione dello spazio').count() > 0, 'la scheda ha la descrizione')
        lb = await p.locator('.sp2-main').bounding_box()
        ok(lb and lb['width'] > 600, 'i progetti hanno abbastanza posto (%d px)' % (lb['width'] if lb else 0))
        await p.screenshot(path=OUT + '/foss-spazio-pc.png')
        # la scheda si chiude e si riapre
        await p.click('[data-action="scheda-chiudi"]'); await p.wait_for_timeout(500)
        ok(await p.locator('.sp2-info').count() == 0 and await p.locator('.sp2-ling').is_visible(), 'la scheda si chiude e resta la linguetta')
        await p.click('[data-action="scheda-apri"]'); await p.wait_for_timeout(500)
        ok(await p.locator('.sp2-info').is_visible(), 'dalla linguetta la scheda si riapre')
        # un lavoro: si apre sulle fasi e il fumetto dei commenti si vede
        await p.locator('.tile.tk').first.click(); await p.wait_for_timeout(2000)
        ok(await p.locator('.work').count() > 0, 'il lavoro si apre')
        op = await p.evaluate("(()=>{const b=document.querySelector('.cm-btn'); return b ? +getComputedStyle(b).opacity : -1})()")
        ok(op >= 0.5, 'il fumetto per commentare si vede (opacità %.2f)' % op)
        await p.screenshot(path=OUT + '/foss-lavoro-pc.png')
        # profilo: c'è il numero di versione
        await p.click('#meBtn'); await p.wait_for_timeout(1500)
        ver = await p.locator('.pf-ver').text_content() if await p.locator('.pf-ver').count() else ''
        ok(ver.startswith('FOSS v'), 'il Profilo dice la versione (%s)' % ver.strip())
        e = senza_rumore(p.errori)
        ok(not e, 'nessun errore nella pagina' + ('' if not e else ': ' + ' | '.join(e[:3])))
        await ctx.close()

        print('— telefono (390 x 844)')
        ctx, p = await pagina(b, 390, 844, mobile=True)
        await p.goto(BASE + 'index.html'); await p.wait_for_timeout(2500)
        await p.locator('text=Video Milano').first.click(); await p.wait_for_timeout(1500)
        ok(await p.locator('.tel-rp').count() > 0, 'sul telefono la scheda dello spazio sta sotto ai progetti')
        await p.screenshot(path=OUT + '/foss-spazio-tel.png', full_page=True)
        e = senza_rumore(p.errori)
        ok(not e, 'nessun errore nella pagina' + ('' if not e else ': ' + ' | '.join(e[:3])))
        await ctx.close()
        await b.close()

    print('\n' + ('NESSUN ERRORE' if not errori else '\n'.join(errori)))
    sys.exit(1 if errori else 0)

asyncio.run(main())
