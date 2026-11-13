# FOSS.chat 2.6: colori del gruppo (primario, secondario, palette dello sfondo) per tutti; trillo che si sente anche da chi lo manda
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prova1 import pagina, BASE, OUT, errori
from playwright.async_api import async_playwright
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')

def ok(cond, cosa):
    print(('  ok  ' if cond else '  XX  ') + cosa)
    if not cond: errori.append('PROVA FALLITA: ' + cosa)

SUONI = "window.__suoni=[]; const AC=window.AudioContext; window.AudioContext=function(){ const a=new AC(); const co=a.createOscillator.bind(a); a.createOscillator=function(){ window.__suoni.push(Date.now()); return co(); }; return a; };"

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME, args=['--autoplay-policy=no-user-gesture-required'])
        for w, h, mob, nome in ((1366, 820, False, 'pc'), (390, 844, True, 'tel')):
            print('—', nome)
            ctx, p = await pagina(b, w, h, mobile=mob, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
            await p.add_init_script(SUONI)
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1300)
            g1 = await p.evaluate('__mock.G1')
            await p.click('.riga[data-id="%s"]' % g1); await p.wait_for_timeout(900)
            await p.evaluate("document.querySelector('.conv-testa [data-a=\"info\"]').click()"); await p.wait_for_timeout(700)
            ok(await p.evaluate("!!document.querySelector('[data-a=\"colori-gruppo\"]:not([disabled])')"), 'info del gruppo: «Colori del gruppo» (sei tu che l\'hai creato)')
            await p.evaluate("document.querySelector('[data-a=\"colori-gruppo\"]').click()"); await p.wait_for_timeout(500)
            ok(await p.evaluate("document.querySelectorAll('.cg-p').length") == 10, 'dieci palette')
            await p.click('.colore[data-g="primario"][data-col="#FF2A6D"]')
            await p.click('.colore[data-g="secondario"][data-col="#2A1F3D"]')
            await p.click('.cg-p[data-pal="neon"]'); await p.wait_for_timeout(300)
            await p.screenshot(path=OUT + '/c18-%s-scelta.png' % nome)
            await p.click('.foglio button:has-text("Salva per tutti")'); await p.wait_for_timeout(1200)
            await p.evaluate("(document.querySelector('[data-a=\"chiudi-info\"]')||{click(){}}).click()"); await p.wait_for_timeout(300)
            await p.click('#testoIn'); await p.keyboard.type('Ci sono!')
            if mob: await p.click('.manda')
            else: await p.keyboard.press('Enter')
            await p.wait_for_timeout(800)
            st = await p.evaluate("__mock.db.chat_conversazioni.find(x=>x.id===__mock.G1).stile")
            ok(st == {'primario': '#FF2A6D', 'secondario': '#2A1F3D', 'palette': 'neon'}, 'salvati per tutti: %s' % st)
            if mob or await p.evaluate("!!document.querySelector('.info.aperta, #info:not([hidden])')"):
                await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
            await p.evaluate("(document.querySelector('[data-a=\"chiudi-info\"]')||{click(){}}).click()"); await p.wait_for_timeout(400)
            v = await p.evaluate("(()=>{const c=document.getElementById('conv'); const cs=getComputedStyle(c); const m=document.querySelector('#msgs .msg.mio .bolla'); return {pieno: cs.getPropertyValue('--pieno').trim(), mio: m && getComputedStyle(m).backgroundColor, img: getComputedStyle(document.getElementById('msgs')).backgroundImage.slice(0,30), fondo: getComputedStyle(document.querySelector('.msgs-wrap')).backgroundColor}})()")
            ok(v['pieno'].upper() == '#FF2A6D', 'colore primario applicato')
            ok(v['mio'] == 'rgb(42, 31, 61)', 'bolle mie col secondario: %s' % v['mio'])
            ok('svg' in v['img'] and v['fondo'] == 'rgb(13, 2, 33)', 'sfondo con la palette Neon')
            await p.screenshot(path=OUT + '/c18-%s-gruppo.png' % nome)
            # un altro membro: non può cambiarli
            await p.evaluate("__mock.db.chat_conversazioni.find(x=>x.id===__mock.G1).creata_da = __mock.MO")
            await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1200)
            print('   (dopo il ricaricamento i dati di prova ripartono da zero)')
            await ctx.close()

        print('— chi non ha creato il gruppo li vede ma non li cambia')
        ctx, p = await pagina(b, 1366, 820, cfg={'chat': {'benvenuto': True, 'tema': 'chiaro'}})
        await p.add_init_script("window.__G1_MO = true; window.__G1_STILE = {primario: '#2EC4B6', palette: 'agrumi'}")
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1200)
        await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.G1')); await p.wait_for_timeout(900)
        v = await p.evaluate("(()=>({pieno: getComputedStyle(document.getElementById('conv')).getPropertyValue('--pieno').trim(), fondo: getComputedStyle(document.querySelector('.msgs-wrap')).backgroundColor}))()")
        ok(v['pieno'].upper() == '#2EC4B6' and v['fondo'] == 'rgb(255, 246, 224)', 'vede i colori scelti da chi ha creato il gruppo (anche col tema chiaro)')
        await p.screenshot(path=OUT + '/c18-altro-membro.png')
        await p.evaluate("document.querySelector('.conv-testa [data-a=\"info\"]').click()"); await p.wait_for_timeout(600)
        ok(await p.evaluate("!!document.querySelector('[data-a=\"colori-gruppo\"][disabled]')"), 'ma non può cambiarli')
        await ctx.close()

        print('— il trillo si sente (anche da chi lo manda)')
        ctx, p = await pagina(b, 1366, 820, cfg={'chat': {'benvenuto': True, 'tema': 'scuro'}})
        await p.add_init_script(SUONI)
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1200)
        await p.click('.riga[data-id="%s"]' % await p.evaluate('__mock.C1')); await p.wait_for_timeout(900)
        await p.evaluate("window.__suoni=[]")
        await p.evaluate("__mock.arriva(__mock.C1, __mock.MO, null, {tipo: 'colpetto', media: {a: __mock.D}})"); await p.wait_for_timeout(600)
        n1 = await p.evaluate("window.__suoni.length")
        ok(n1 >= 8, 'ricevuto: suona forte (%d voci)' % n1)
        await p.evaluate("window.__suoni=[]")
        await p.evaluate("document.querySelector('.conv-testa [data-a=\"info\"]').click()"); await p.wait_for_timeout(600)
        await p.evaluate("document.querySelector('[data-a=\"colpetto\"]').click()"); await p.wait_for_timeout(600)
        n2 = await p.evaluate("window.__suoni.length")
        ok(n2 >= 8, 'mandato: lo senti anche tu (%d voci)' % n2)
        await ctx.close()
        await b.close()
    print('\n'.join(e for e in errori if 'ERR_FAILED' not in e) or 'NESSUN ERRORE')
asyncio.run(main())
