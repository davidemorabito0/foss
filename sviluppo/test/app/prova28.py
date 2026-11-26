# 2.9.14 — niente «rimbalzo» mandando un messaggio (telefono).
# La lista dei messaggi parte dal fondo: mandando, i messaggi sopra salgono una volta sola e in modo continuo,
# senza mai scendere; la casella resta la stessa (non perde il fuoco); se la tastiera o la casella cambiano
# altezza il fondo resta fermo; se stai leggendo piu' in alto, un messaggio che arriva non ti sposta.
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright

def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)

# registra a ogni fotogramma la posizione (sullo schermo) del messaggio che era l'ultimo prima dell'invio
REGISTRA = '''(ms) => new Promise(fatto => {
  const M = document.getElementById('msgs');
  const tutti = M.querySelectorAll('.msg'); const ref = tutti[tutti.length - 1];
  const serie = []; const t0 = performance.now();
  const giro = () => {
    serie.push({y: ref.getBoundingClientRect().top, st: M.scrollTop});
    if(performance.now() - t0 < ms) requestAnimationFrame(giro); else fatto(serie);
  };
  requestAnimationFrame(giro);
  window.__regPartito = true;
})'''

async def parti(p):
    reg = asyncio.ensure_future(p.evaluate(REGISTRA, 900))
    for _ in range(100):
        if await p.evaluate('window.__regPartito === true'): break
        await p.wait_for_timeout(10)
    await p.evaluate('window.__regPartito = false')
    return reg

async def manda(p, testo):
    await p.fill('#testoIn', testo)
    await p.wait_for_timeout(150)
    reg = await parti(p)
    box = await p.locator('#mandaB').bounding_box()
    await p.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    await p.mouse.down(); await p.mouse.up()
    return await reg

def analizza(serie, nome):
    ys = [s['y'] for s in serie]
    giu = max([ys[i] - ys[i - 1] for i in range(1, len(ys))] + [0])
    salita = ys[0] - ys[-1]
    # quante volte cambia verso (su -> giu)
    ok(giu <= 0.5, nome + ': i messaggi non scendono mai (massimo in giu %.1f px)' % giu)
    ok(salita > 10, nome + ': i messaggi salgono (%.0f px)' % salita)
    passi = sum(1 for i in range(1, len(ys)) if ys[i] < ys[i - 1] - .5)
    ok(passi >= 3, nome + ': salgono in piu\' fotogrammi, non di colpo (%d)' % passi)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx, p = await pagina(b, 390, 760, mobile=True, cfg={'chat': {'benvenuto': True}})
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
        g1 = await p.evaluate('__mock.G1')
        await p.click('.riga[data-id="%s"]' % g1); await p.wait_for_timeout(900)
        # riempio la chat perche' scorra
        for i in range(14):
            await p.evaluate("__mock.arriva(__mock.G1, __mock.MO, 'Messaggio di riempimento numero %d')" % i)
        await p.wait_for_timeout(1200)
        await p.evaluate("(() => { const M = document.getElementById('msgs'); M.scrollTop = M.scrollTop > 0 ? M.scrollHeight : 0; })()")
        await p.wait_for_timeout(400)
        await p.evaluate("document.getElementById('testoIn')._mia = 1")
        await p.click('#testoIn')

        print('— lista ancorata al fondo')
        inv = await p.evaluate("(() => { const M = document.getElementById('msgs'); return {dir: getComputedStyle(M).flexDirection, dentro: !!document.getElementById('msgsIn')}; })()")
        ok(inv['dir'] == 'column-reverse' and inv['dentro'], 'colonna rovesciata con #msgsIn')

        print('— un messaggio breve')
        s = await manda(p, 'Ciao, arrivo')
        analizza(s, 'breve')
        await p.wait_for_timeout(300)
        stato = await p.evaluate("""(() => { const t = document.getElementById('testoIn'); const M = document.getElementById('msgs');
            const u = [...M.querySelectorAll('.msg')].pop(); const rm = M.getBoundingClientRect(), ru = u.getBoundingClientRect();
            return {stessa: t._mia === 1, fuoco: document.activeElement === t, vuota: t.value === '', ultimo: u.textContent, sotto: rm.bottom - ru.bottom}; })()""")
        ok(stato['stessa'], 'la casella e\' la stessa (non ricreata)')
        ok(stato['fuoco'], 'la casella resta col fuoco (la tastiera non si chiude)')
        ok(stato['vuota'], 'la casella si svuota')
        ok('Ciao, arrivo' in stato['ultimo'] and 0 <= stato['sotto'] < 40, 'il messaggio nuovo e\' in fondo (%.0f px dal bordo)' % stato['sotto'])

        print('— un messaggio su piu\' righe (la casella si rimpicciolisce)')
        await p.fill('#testoIn', 'riga uno\nriga due\nriga tre\nriga quattro')
        await p.evaluate("document.getElementById('testoIn').dispatchEvent(new Event('input'))")
        await p.wait_for_timeout(200)
        s = await manda(p, 'riga uno\nriga due\nriga tre\nriga quattro')
        analizza(s, 'piu\' righe')
        await p.wait_for_timeout(300)

        print('— la tastiera cambia altezza: il fondo resta fermo')
        prima = await p.evaluate("(() => { const M = document.getElementById('msgs'); const u = [...M.querySelectorAll('.msg')].pop(); return M.getBoundingClientRect().bottom - u.getBoundingClientRect().bottom; })()")
        await p.evaluate("document.documentElement.style.setProperty('--alto', '480px')")
        await p.wait_for_timeout(250)
        dopo = await p.evaluate("(() => { const M = document.getElementById('msgs'); const u = [...M.querySelectorAll('.msg')].pop(); return M.getBoundingClientRect().bottom - u.getBoundingClientRect().bottom; })()")
        await p.evaluate("document.documentElement.style.removeProperty('--alto')")
        await p.wait_for_timeout(250)
        ok(abs(prima - dopo) < 1, 'ultimo messaggio sempre attaccato al fondo (%.1f -> %.1f)' % (prima, dopo))

        print('— leggo piu\' in alto e arriva un messaggio: non mi sposta')
        await p.evaluate("(() => { const M = document.getElementById('msgs'); M.scrollTop -= 400; })()")
        await p.wait_for_timeout(400)
        y0 = await p.evaluate("(() => { const M = document.getElementById('msgs'), r = M.getBoundingClientRect(); const v = [...M.querySelectorAll('.msg')].find(n => n.getBoundingClientRect().top > r.top + 60); window.__vista = v; return v.getBoundingClientRect().top; })()")
        await p.evaluate("__mock.arriva(__mock.G1, __mock.AN, 'Arrivato mentre leggi sopra')")
        await p.wait_for_timeout(700)
        y1 = await p.evaluate("window.__vista.getBoundingClientRect().top")
        ok(abs(y1 - y0) < 1, 'quello che leggi resta fermo (%.1f -> %.1f)' % (y0, y1))
        giu = await p.evaluate("(() => { const b = document.getElementById('giuB'); return !b.classList.contains('nascosto') && (b.textContent || '').trim(); })()")
        ok(giu == '1', 'il tasto «vai in fondo» conta 1 nuovo (%s)' % giu)
        await p.click('#giuB'); await p.wait_for_timeout(700)
        fondo = await p.evaluate("(() => { const M = document.getElementById('msgs'); const u = [...M.querySelectorAll('.msg')].pop(); return M.getBoundingClientRect().bottom - u.getBoundingClientRect().bottom; })()")
        ok(0 <= fondo < 40, '«vai in fondo» porta in fondo (%.0f px)' % fondo)

        print('— arriva un messaggio mentre sono in fondo: sale morbido')
        reg = await parti(p)
        await p.evaluate("__mock.arriva(__mock.G1, __mock.MO, 'Risposta da Momo')")
        analizza(await reg, 'in arrivo')

        print('— in cima si caricano i messaggi vecchi e la data galleggia')
        await p.evaluate("(() => { const M = document.getElementById('msgs'); M.scrollTop = -M.scrollHeight; M.dispatchEvent(new Event('scroll')); })()")
        await p.wait_for_timeout(800)
        await p.screenshot(path=OUT + '/r28-cima.png')
        await p.evaluate("(() => { const M = document.getElementById('msgs'); M.scrollTop = 0; })()")
        await p.wait_for_timeout(300)
        await p.screenshot(path=OUT + '/r28-fondo.png')

        await ctx.close(); await b.close()
    altri = [e for e in errori if not e.startswith('PROVA FALLITA')]
    for e in altri: print('  XX  ' + e)
    print('FINE prova28:', 'tutto ok' if not errori else '%d problemi' % len(errori))

asyncio.run(main())
