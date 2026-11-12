# v2.2: la chat resta in tempo reale anche se il collegamento cade, senza ricaricare la pagina
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')

def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)

async def visibile(p):
    await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))")

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME)
        ctx, p = await pagina(b, 1366, 820, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
        await p.clock.install(); await p.clock.resume()
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
        g1 = await p.evaluate('__mock.G1'); c1 = await p.evaluate('__mock.C1')
        await p.click('.riga[data-id="%s"]' % g1); await p.wait_for_timeout(900)
        conta = "document.querySelectorAll('#msgs .msg').length"
        print('— collegamento normale')
        await p.evaluate("__mock.arriva(__mock.G1, __mock.MO, 'in diretta 1')"); await p.wait_for_timeout(500)
        ok(await p.evaluate("[...document.querySelectorAll('#msgs .msg')].some(x=>x.innerText.includes('in diretta 1'))"), 'messaggio in diretta')
        print('— il collegamento cade in silenzio, arrivano messaggi')
        await p.evaluate("__mock.cade()")
        await p.evaluate("__mock.arrivaZitto(__mock.G1, __mock.MO, 'perso mentre ero via')")
        await p.evaluate("__mock.arrivaZitto(__mock.C1, __mock.MO, 'privato perso')")
        await p.wait_for_timeout(500)
        ok(not await p.evaluate("[...document.querySelectorAll('#msgs .msg')].some(x=>x.innerText.includes('perso mentre ero via'))"), '(non arrivato finché è giù)')
        await p.evaluate("__mock.torna()")
        await visibile(p); await p.wait_for_timeout(1500)
        ok(await p.evaluate("[...document.querySelectorAll('#msgs .msg')].some(x=>x.innerText.includes('perso mentre ero via'))"), 'torni sulla chat: recuperato senza ricaricare')
        ok(await p.evaluate("[...document.querySelectorAll('.riga')].some(x=>x.innerText.includes('privato perso'))"), 'anche l\'elenco è aggiornato')
        ok(await p.evaluate("__mock.canaliAperti()") >= 1, 'canali ricollegati')
        await p.evaluate("__mock.arriva(__mock.G1, __mock.MO, 'in diretta 2')"); await p.wait_for_timeout(500)
        ok(await p.evaluate("[...document.querySelectorAll('#msgs .msg')].some(x=>x.innerText.includes('in diretta 2'))"), 'dopo il ricollegamento torna in diretta')
        print('— cade senza che tu cambi scheda: ci pensa il controllo periodico')
        await p.evaluate("__mock.cade()")
        await p.evaluate("__mock.arrivaZitto(__mock.G1, __mock.AN, 'arrivato col controllo')")
        await p.evaluate("__mock.torna()")
        for _ in range(2):
            await p.clock.fast_forward(21000); await p.wait_for_timeout(1500)
            if await p.evaluate("__mock.canaliAperti()"): break
        ok(await p.evaluate("[...document.querySelectorAll('#msgs .msg')].some(x=>x.innerText.includes('arrivato col controllo'))"), 'entro 20 secondi, da solo')
        print('— errore del canale: si ricollega da solo')
        await p.evaluate("__mock.cadeRumoroso()"); await p.evaluate("__mock.torna()")
        await p.clock.fast_forward(4000); await p.wait_for_timeout(800)
        ok(await p.evaluate("__mock.canaliAperti()") >= 1, 'ricollegato dopo l\'errore')
        await p.evaluate("__mock.arriva(__mock.G1, __mock.MO, 'in diretta 3')"); await p.wait_for_timeout(500)
        ok(await p.evaluate("[...document.querySelectorAll('#msgs .msg')].some(x=>x.innerText.includes('in diretta 3'))"), 'di nuovo in diretta')
        print('— collegamento sano: il controllo periodico non ridisegna per niente')
        await p.clock.fast_forward(15000); await p.wait_for_timeout(500)
        await p.evaluate("window.__rpcConta = {}")
        await p.clock.fast_forward(21000); await p.wait_for_timeout(800)
        n = await p.evaluate("(window.__rpcConta||{}).chat_elenco || 0")
        ok(n == 1, 'solo il controllo leggero, niente ricarica (chiamate: %d)' % n)
        await p.evaluate("window.__chiusi = 0"); await p.clock.fast_forward(60000); await p.wait_for_timeout(800)
        ok(await p.evaluate("window.__chiusi || 0") == 0, 'canali stabili: nessun ricollegamento a vuoto')
        ok(await p.evaluate("[...document.querySelectorAll('#msgs .msg')].filter(x=>x.innerText.includes('in diretta 3')).length") == 1, 'nessun doppione')
        await p.screenshot(path=OUT + '/c15-tempo-reale.png')
        await ctx.close(); await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
