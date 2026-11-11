import asyncio, sys, json
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from prova1 import BASE, OUT, MOCK, errori
from playwright.async_api import async_playwright

FINTO = r"""
window.__chiuse = []; window.__fuoco = true;
document.hasFocus = () => window.__fuoco !== false;
function __avviso(tag){ return {tag, close(){ window.__chiuse.push(tag); window.__avvisi = window.__avvisi.filter(x => x.tag !== tag); }}; }
window.__nuoviAvvisi = function(){
  const m = window.__mock;
  window.__avvisi = ['fosschat-' + m.C1, 'fosschat-colpetto-' + m.C1, 'fosschat-' + m.G1, 'fosschat-prom-11111111-2222-3333-4444-555555555555', 'foss-abc'].map(__avviso);
};
if(navigator.serviceWorker){
  navigator.serviceWorker.getRegistration = async () => ({
    getNotifications: async (o) => { if(!window.__avvisi) window.__nuoviAvvisi(); return window.__avvisi.filter(n => !o || !o.tag || n.tag === o.tag).slice(); }
  });
}
"""

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx = await b.new_context(viewport={'width': 1366, 'height': 820})
        async def rotta(route):
            u = route.request.url
            if 'supabase-js' in u: await route.fulfill(status=200, content_type='application/javascript', body=MOCK)
            elif u.startswith(BASE): await route.continue_()
            else: await route.abort()
        await ctx.route('**/*', rotta)
        await ctx.add_init_script('window.__CFG = ' + json.dumps({'chat': {'benvenuto': True, 'tema': 'scuro'}}) + ';')
        await ctx.add_init_script(FINTO)
        p = await ctx.new_page()
        p.on('pageerror', lambda e: errori.append('PAGEERROR ' + str(e)))
        await p.goto(BASE + 'chat.html'); await p.wait_for_timeout(1500)
        c1 = await p.evaluate('__mock.C1'); g1 = await p.evaluate('__mock.G1'); d = await p.evaluate('__mock.D'); mo = await p.evaluate('__mock.MO')
        ok = []; ko = []
        def vero(c, n): (ok if c else ko).append(n)

        chiuse = await p.evaluate('window.__chiuse.slice()')
        vero(chiuse == [], 'all\'apertura: le chat da leggere tengono i loro avvisi (%s)' % chiuse)
        titolo = await p.title()
        vero(titolo.startswith('(2)'), 'titolo con 2 chat da leggere: ' + titolo)

        # 1. apro la privata: spariscono i suoi avvisi (messaggio e colpetto), gli altri restano
        await p.click('.riga[data-id="%s"]' % c1); await p.wait_for_timeout(900)
        chiuse = await p.evaluate('window.__chiuse.slice()')
        vero(sorted(chiuse) == sorted(['fosschat-' + c1, 'fosschat-colpetto-' + c1]), 'letta la privata: chiusi solo i suoi avvisi (%s)' % chiuse)

        prima = await p.evaluate("(document.querySelector('.riga[data-id=\"%s\"] .contatore') || {}).textContent || ''" % g1)
        vero(prima.strip() == '1', 'prima: il gruppo ha 1 da leggere (%r)' % prima)
        # 2. letta su un altro dispositivo: qui il numero e l'avviso del gruppo spariscono
        await p.evaluate("window.__chiuse = []")
        await p.evaluate("__mock.legge(__mock.G1, __mock.D)"); await p.wait_for_timeout(500)
        chiuse = await p.evaluate('window.__chiuse.slice()')
        vero(chiuse == ['fosschat-' + g1], 'gruppo letto sul telefono: avviso chiuso anche qui (%s)' % chiuse)
        titolo = await p.title()
        vero(titolo == 'FOSS.chat', 'titolo senza numero: ' + titolo)
        badge = await p.evaluate("(document.querySelector('.riga[data-id=\"%s\"] .contatore') || {}).textContent || ''" % g1)
        vero(badge.strip() == '', 'nessun numero sul gruppo nella lista (%r)' % badge)

        # 3. finestra non attiva (sei in un altro programma): il messaggio nella chat aperta resta da leggere
        await p.evaluate("window.__fuoco = false")
        await p.evaluate("__mock.arriva(__mock.C1, __mock.MO, 'Ti scrivo mentre sei in Premiere')"); await p.wait_for_timeout(600)
        titolo = await p.title()
        vero(titolo.startswith('(1)'), 'finestra non attiva: il messaggio resta da leggere (' + titolo + ')')
        # torni sulla finestra: diventa letto
        await p.evaluate("window.__fuoco = true; window.dispatchEvent(new Event('focus'))"); await p.wait_for_timeout(700)
        titolo = await p.title()
        vero(titolo == 'FOSS.chat', 'tornato sulla finestra: letto (' + titolo + ')')
        letto = await p.evaluate("new Date(__mock.db.chat_membri.find(m => m.conv_id === __mock.C1 && m.utente_id === __mock.D).letto_fino) > new Date(Date.now() - 5000)")
        vero(letto, 'la lettura arriva al database')

        # 4. finestra attiva: il messaggio nella chat aperta si legge subito (come prima)
        await p.evaluate("__mock.arriva(__mock.C1, __mock.MO, 'E adesso che sei qui?')"); await p.wait_for_timeout(700)
        titolo = await p.title()
        vero(titolo == 'FOSS.chat', 'finestra attiva: letto subito (' + titolo + ')')

        # 5. tornando sulla chat, via gli avvisi arrivati intanto per chat gia' lette; il promemoria e FOSS restano
        await p.evaluate("window.__chiuse = []; window.__nuoviAvvisi()")
        await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(500)
        chiuse = await p.evaluate('window.__chiuse.slice()')
        vero(sorted(chiuse) == sorted(['fosschat-' + c1, 'fosschat-colpetto-' + c1, 'fosschat-' + g1]), 'pulizia: chiusi solo gli avvisi delle chat lette (%s)' % chiuse)
        rimasti = await p.evaluate('window.__avvisi.map(n => n.tag)')
        vero(sorted(rimasti) == sorted(['fosschat-prom-11111111-2222-3333-4444-555555555555', 'foss-abc']), 'restano promemoria e FOSS (%s)' % rimasti)

        # 6. un messaggio in un'altra chat mentre ne guardi una: resta da leggere, con il suo numero
        await p.evaluate("__mock.arriva(__mock.G1, __mock.AN, 'Domani porto io il drone')"); await p.wait_for_timeout(600)
        titolo = await p.title()
        vero(titolo.startswith('(1)'), 'messaggio in un\'altra chat: da leggere (' + titolo + ')')
        await p.screenshot(path=OUT + '/e01-avvisi.png')
        await b.close()
        for n in ok: print('ok ', n)
        for n in ko: print('XX ', n)
    print('\n'.join(errori) if errori else 'NESSUN ERRORE')
asyncio.run(main())
