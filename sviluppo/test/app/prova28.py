# FOSS.chat 2.9.19: la chat «Richieste dal sito» è di soli avvisi.
# Niente casella per scrivere (al suo posto una riga che lo spiega), niente nome/foto di chi scrive,
# niente «Rispondi» nel menu, l'email della richiesta si tocca. Le altre chat restano come prima.
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)
async def giro(b, w, h, tel):
    nome = 'telefono' if tel else 'computer'
    ctx, p = await pagina(b, w, h, mobile=tel, cfg={'chat': {'benvenuto': True}}, init='window.__AVVISI = true;')
    await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
    a1 = await p.evaluate('__mock.A1'); c1 = await p.evaluate('__mock.C1')
    riga = await p.evaluate("document.querySelector('.riga[data-id=\"%s\"]').innerText" % a1)
    ok('Nuova richiesta' in riga and 'Utente FOSS' not in riga, nome + ': nell\'elenco l\'anteprima senza «Utente FOSS:» (%r)' % riga[:80])
    await p.click('.riga[data-id="%s"]' % a1); await p.wait_for_timeout(900)
    ok(await p.evaluate("!!document.getElementById('soloAvvisi') && !document.getElementById('testoIn')"), nome + ': al posto della casella c\'è la riga «solo avvisi»')
    ok(await p.evaluate("!document.querySelector('#msgs .msg .autore') && !document.querySelector('#msgs .msg .av-g')"), nome + ': nessun nome o foto di chi scrive')
    ok(await p.evaluate("!!document.querySelector('#msgs a[href=\"mailto:prova@example.com\"]')"), nome + ': l\'email si tocca (mailto)')
    ok(await p.evaluate("!!document.querySelector('#msgs .bolla b')"), nome + ': il grassetto si vede')
    await p.screenshot(path=OUT + '/c28-avvisi-%s.png' % nome)
    if not tel:
        bx = await p.locator('#msgs .msg .bolla').last.bounding_box()
        await p.mouse.click(bx['x'] + 30, bx['y'] + 20, button='right'); await p.wait_for_timeout(350)
        voci = await p.evaluate("[...document.querySelectorAll('#fmVoci button')].map(x=>x.innerText.trim())")
        ok(len(voci) > 0 and 'Rispondi' not in voci and 'Inoltra' in voci, 'nel menu del messaggio niente «Rispondi» (%s)' % voci)
        await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    # un'altra chat: la casella torna
    if tel:
        await p.click('[data-a="chiudi-conv"]'); await p.wait_for_timeout(700)
    await p.click('.riga[data-id="%s"]' % c1); await p.wait_for_timeout(900)
    ok(await p.evaluate("!!document.getElementById('testoIn') && !document.getElementById('soloAvvisi')"), nome + ': nelle altre chat la casella c\'è')
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME)
        await giro(b, 1366, 820, False)
        await giro(b, 390, 844, True)
        await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
