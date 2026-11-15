# FOSS.chat 2.9.6: un vocale che stava ancora partendo quando l'app viene chiusa non si perde.
# Lo si registra con il caricamento bloccato (rete che non risponde), si ricarica la pagina (come chiudere
# e riaprire) e si controlla che ricompaia nella sua chat e arrivi a destinazione da solo, una volta sola.
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)
# le due chat finte con lo stesso indirizzo a ogni caricamento (il vocale in sospeso deve ritrovare la sua chat)
FISSE = """(() => { const veri = crypto.randomUUID.bind(crypto), fissi = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
  let n = 0; crypto.randomUUID = () => n < 2 ? fissi[n++] : veri(); })();"""
VOC = "__mock.db.chat_messaggi.filter(m=>m.tipo==='vocale' && m.conv_id===__mock.C1).length"
DA_PARTE = """new Promise(ok => { const q = indexedDB.open('fosschat', 1); q.onupgradeneeded = () => q.result.createObjectStore('sospesi', {keyPath: 'id'});
  q.onsuccess = () => { const g = q.result.transaction('sospesi').objectStore('sospesi').count(); g.onsuccess = () => { ok(g.result); q.result.close(); }; }; })"""
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME, args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
        ctx, p = await pagina(b, 1366, 820, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}}, init=FISSE)
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))       # «vuoi davvero uscire?»: sì
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
        c1 = await p.evaluate('__mock.C1')
        await p.click('.riga[data-id="%s"]' % c1); await p.wait_for_timeout(900)
        await p.evaluate("window.__APPESO = true")                         # il file non sale
        await p.click('#mandaB'); await p.wait_for_timeout(2600)
        await p.click('#regManda'); await p.wait_for_timeout(1500)
        ok(await p.evaluate("document.querySelectorAll('.vocale').length") == 1 and await p.evaluate(VOC) == 0, 'il vocale è a schermo ma non è ancora partito')
        ok(await p.evaluate(DA_PARTE) == 1, 'intanto è messo da parte sul dispositivo')
        # chiudo e riapro
        await p.reload(); await p.wait_for_timeout(1300)
        ok(await p.evaluate('__mock.C1') == c1, 'la chat finta è la stessa dopo la riapertura')
        await p.wait_for_timeout(8000)
        ok(await p.evaluate(VOC) == 1, 'alla riapertura il vocale parte da solo e arriva')
        ok(await p.evaluate(DA_PARTE) == 0, 'arrivato: non resta più da parte')
        await p.click('.riga[data-id="%s"]' % c1); await p.wait_for_timeout(900)
        ok(await p.evaluate("document.querySelectorAll('.vocale').length") == 1, 'nella chat si vede, una volta sola')
        await p.screenshot(path=OUT + '/c27-vocale-ripreso.png')
        await ctx.close(); await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
