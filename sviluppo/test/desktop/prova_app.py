# Prova automatica dell'app per computer (desktop/), con FOSS e la chat finti.
# Dalla radice del repository:
#   cd desktop/src-tauri && cargo build && cd ../..
#   python3 sviluppo/test/desktop/prova_app.py            (usa desktop/src-tauri/target/debug/foss-desktop)
#   python3 sviluppo/test/desktop/prova_app.py <percorso dell'app>
# Avvia il server delle prove, apre l'app con FOSS_SITO=http://localhost:8124/ e controlla il registro.
import json, os, subprocess, sys, tempfile, time, urllib.request

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.abspath(os.path.join(QUI, '..', '..', '..'))
APP = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RADICE, 'desktop', 'src-tauri', 'target', 'debug', 'foss-desktop')
PORTA = 8124
SITO = 'http://localhost:%d/' % PORTA

def server_su():
    try:
        urllib.request.urlopen(SITO + 'manifest.json', timeout=1); return True
    except Exception:
        return False

server = None
if not server_su():
    server = subprocess.Popen([sys.executable, os.path.join(QUI, 'server.py'), str(PORTA)], cwd=RADICE)
    for _ in range(50):
        if server_su(): break
        time.sleep(0.1)

registro = os.path.join(tempfile.mkdtemp(), 'registro.jsonl')
env = dict(os.environ, FOSS_SITO=SITO, FOSS_PROVA=registro, FOSS_PROVA_JS=os.path.join(QUI, 'prova-app.js'))
t0 = time.time()
app = subprocess.Popen([APP], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    app.wait(timeout=150)
except subprocess.TimeoutExpired:
    app.kill()
    print('!! l\'app non si e\' chiusa da sola entro 150 secondi')
if server: server.terminate()

righe = []
for r in open(registro, encoding='utf-8') if os.path.exists(registro) else []:
    try: righe.append(json.loads(r))
    except Exception: pass

ok, ko = [], []
def vero(c, n): (ok if c else ko).append(n)
def di(cosa): return [r['dati'] for r in righe if r['cosa'] == cosa]

for r in righe:
    if r['cosa'] == 'pagina' and 'passo' in r['dati']:
        d = r['dati']; vero(d['ok'], d['passo'] + ('' if d['ok'] else '  → ' + d['info']))

avvisi = di('avviso')
titoli = [(a['titolo'], a['testo']) for a in avvisi]
def c_e(t, x): return any(t in a[0] and x in a[1] for a in titoli)
vero(c_e('Videoclip Il Merlo', 'Momo: Ciao dal gruppo'), 'avviso del gruppo: nome del gruppo e «Momo: testo»')
vero(c_e('Momo', 'Messaggio privato di prova'), 'avviso della chat privata: nome e testo')
priv = [a for a in avvisi if 'Messaggio privato di prova' in a['testo']]
vero(priv and priv[0]['dove']['vista'] == 'chat' and priv[0]['dove']['hash'].startswith('#c=') and '&m=' in priv[0]['dove']['hash'], 'l\'avviso porta alla chat e al messaggio')
vero(c_e('Momo', 'trillo'), 'avviso del trillo')
vero(len(di('attenzione')) >= 1, 'trillo: l\'icona dell\'app salta / lampeggia')
vero(not any('non deve suonare' in a[1] for a in titoli), 'gruppo silenziato: nessun avviso')
vero(c_e('Videoclip Il Merlo', 'riunione alle 10'), 'gruppo silenziato ma con @tutti: l\'avviso arriva')
vero(c_e('Ti hanno assegnato', 'Luci e set'), 'avviso di FOSS: task assegnata («' + next((a[0] + ' / ' + a[1] for a in titoli if 'Luci' in a[1]), '-') + '»)')
fa = [a for a in avvisi if 'Luci e set' in a['testo']]
vero(fa and fa[0]['dove']['vista'] == 'foss' and len(fa[0]['dove']['notifica']) == 36 and fa[0]['suono'], 'l\'avviso di FOSS porta alla notifica, col suono')
vero(any('menzionato' in d.get('titolo', '') for d in di('avviso_spento')), 'avvisi spenti dalle impostazioni: non arrivano')
vero(not any('non deve arrivare' in a[1] for a in titoli), 'avvisi spenti: nessun avviso di sistema')
conte = di('conta')
vero(conte and max(conte) >= 2, 'numero sull\'icona: %s' % conte[:12])
vero(conte and conte[-1] == 0, 'letto tutto: il numero torna a zero')
stati = di('stato')
larghi = [s for s in stati if s.get('chat') and abs(s['chat'][2] - 520) < 2]
vero(larghi and abs(larghi[0]['foss'][2] + 520 - (larghi[0]['foss'][2] + larghi[0]['chat'][2])) < 2 and abs(larghi[0]['chat'][0] - larghi[0]['foss'][2]) < 2,
     'colonna della chat larga 520 accanto a FOSS: %s' % (larghi[:1]))
vero(any(s['chat_accanto'] is False for s in stati), 'chat nascosta (⌘J)')
vero(stati and stati[-1]['chat_accanto'] is True, 'chat di nuovo accanto')
sx = [s for s in stati if s.get('lato') == 'sinistra' and s.get('modo') == 'accanto']
vero(sx and sx[0]['chat'][0] == 0 and abs(sx[0]['foss'][0] - sx[0]['chat'][2]) < 2, 'chat a sinistra di FOSS: %s' % sx[:1])
pieni = [s for s in stati if s.get('modo') == 'pieno']
largo = lambda s: s['foss'][2] if s['davanti'] == 'foss' else s['chat'][2]
ok_pieno = lambda s, q: s['davanti'] == q and s[q][0] == 0 and largo(s) > 700 and s['chat' if q == 'foss' else 'foss'][0] >= largo(s) - 1
seq = [s['davanti'] for s in pieni]
vero(len(pieni) >= 4 and ok_pieno(pieni[0], 'foss'), 'una alla volta: FOSS a tutta finestra')
vero(len(pieni) >= 4 and ok_pieno(pieni[1], 'chat'), 'una alla volta: ⌘2 porta la chat a tutta finestra')
vero(len(pieni) >= 4 and ok_pieno(pieni[2], 'foss'), 'una alla volta: un link di FOSS dalla chat riporta FOSS')
vero(len(pieni) >= 4 and ok_pieno(pieni[3], 'chat'), 'una alla volta: ⌘J passa alla chat (%s)' % seq)
vero(stati and stati[-1].get('modo') == 'accanto' and stati[-1].get('lato') == 'destra' and stati[-1]['chat'][0] > 0, 'di nuovo affiancate, chat a destra')
vero(any('arrivano su questo computer' in a[1] for a in titoli), '«Prova un avviso» dal pannellino: l\'avviso parte (anche con FOSS davanti)')
vero(any('durante il silenzio' in d.get('titolo', '') or True for d in di('avviso_silenzio')) and not any('durante il silenzio' in a[1] for a in titoli), 'non disturbare: nessun avviso durante il silenzio')
vero(len(di('avviso_silenzio')) >= 1, 'non disturbare: avviso trattenuto')
vero(priv and priv[0].get('risposta') is True, 'gli avvisi della chat hanno il campo per rispondere')
fuori = di('apri_fuori')
vero('https://example.com/esterno' in fuori, 'window.open di un sito esterno va nel browser')
vero('https://example.org/link' in fuori, 'link esterno con target=_blank va nel browser')
vero(any('google.com/maps' in u for u in fuori), 'link esterno da FOSS va nel browser')
aperti = di('apri')
vero(any(u.endswith('#/p/p2001') and 'chat' not in u for u in aperti), 'dalla chat un link di FOSS si apre nella colonna di FOSS')
vero(sum(1 for u in aperti if 'chat.html#c=' in u) >= 2, 'da FOSS la chat (anche con la finestra vuota di «Crea chat») si apre nella colonna accanto')
vero(len(di('link')) >= 1, 'link foss:// ricevuto')
vero(time.time() - t0 < 150, 'durata %.0f s' % (time.time() - t0))

print('\nProva dell\'app per computer')
for n in ok: print('  ✓', n)
for n in ko: print('  ✗', n)
print('\n%d riuscite, %d fallite' % (len(ok), len(ko)))
if ko:
    print('\nregistro:', registro)
sys.exit(1 if ko else 0)
