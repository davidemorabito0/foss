# FOSS.chat 2.9.5: due tocchi su un vocale aprono in basso la trascrizione (senza farlo partire);
# un tocco solo no; oltre i 2 minuti un messaggio e nessuna trascrizione; velocità sempre visibile;
# il tasto «Torna a FOSS» si vede sul telefono e sul computer.
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
        b = await pw.chromium.launch(executable_path=CHROME, args=['--autoplay-policy=no-user-gesture-required'])
        for w, h, mob, nome in ((390, 844, True, 'tel'), (1366, 820, False, 'pc')):
            print('—', nome)
            ctx, p = await pagina(b, w, h, mobile=mob, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
            sel = '.ios-riga .vai-foss' if mob else '.lato-testa .vai-foss'
            ok(await p.locator(sel).is_visible(), 'il tasto «Torna a FOSS» si vede')
            await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.G1')); await p.wait_for_timeout(900)
            v = p.locator('.vocale').first
            await v.scroll_into_view_if_needed()
            ok(await v.locator('.vel').is_visible(), 'la velocità (1×, 1,5×, 2×) si vede anche prima di ascoltare')
            await v.locator('.vel').click(); await v.locator('.vel').click()
            ok((await v.locator('.vel').text_content()).strip() == '2×', 'la velocità arriva a 2×')
            await v.locator('.vel').click()
            # un tocco solo: niente trascrizione
            await v.locator('.onda').click(); await p.wait_for_timeout(600)
            ok(await p.locator('#trascrVelo').count() == 0, 'un tocco solo non apre la trascrizione')
            # il tocco solo l'ha fatto partire: lo fermo, poi due tocchi sull'onda
            if await p.evaluate("document.querySelector('.vocale .vp').dataset.ic === 'pausa'"): await v.locator('.vp').click(); await p.wait_for_timeout(300)
            await v.locator('.onda').click(); await p.wait_for_timeout(100); await v.locator('.onda').click()
            await p.wait_for_timeout(200)
            ok(await p.locator('#trascrVelo').count() == 1, 'due tocchi aprono la finestra in basso')
            await p.wait_for_timeout(1300)
            t = await p.locator('#trascrC').text_content()
            ok('trascrizione di prova' in t, 'mostra il testo del vocale (%s…)' % t[:30])
            await p.screenshot(path=OUT + '/c26-%s-trascrizione.png' % nome)
            await p.click('#trascrVelo [data-x]'); await p.wait_for_timeout(400)
            # oltre i 2 minuti
            n0 = await p.evaluate("(window.__trascr||[]).length")
            lungo = await p.evaluate("__mock.arriva(__mock.G1, __mock.MO, null, {tipo: 'vocale', media: {path: __mock.G1 + '/l.m4a', dur: 150, onda: 'ABCDEFGH'}})")
            await p.wait_for_timeout(1200)
            vl = p.locator('.vocale[data-voc="%s"]' % lungo)
            await vl.scroll_into_view_if_needed()
            await vl.locator('.vav').click(); await p.wait_for_timeout(100); await vl.locator('.vav').click(); await p.wait_for_timeout(400)
            t = await p.locator('#trascrC').text_content()
            ok('supera i 2 minuti' in t and await p.evaluate("(window.__trascr||[]).length") == n0, 'oltre i 2 minuti: lo dice e non trascrive')
            await ctx.close()
        await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
