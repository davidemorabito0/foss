# Server delle prove dell'app per computer: serve il sito dalla radice del repository e
# al posto di supabase-js mette il Supabase finto (../app/mock-supabase.js + mock-foss.js).
# Uso: python3 sviluppo/test/desktop/server.py 8124   (dalla radice del repository)
import http.server, os, sys, json
QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.abspath(os.path.join(QUI, '..', '..', '..'))
CDN = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>'
FINTO = ('<script>window.__CFG = ' + json.dumps({'chat': {'benvenuto': True, 'tema': 'scuro'}}) + ';</script>'
         '<script src="/sviluppo/test/app/mock-supabase.js"></script><script src="/sviluppo/test/desktop/mock-foss.js"></script>')

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RADICE, **k)
    def log_message(self, *a):
        pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_GET(self):
        p = self.path.split('?')[0].split('#')[0]
        if p in ('/', '/index.html', '/chat.html', '/chat'):
            f = os.path.join(RADICE, 'chat.html' if p.startswith('/chat') else 'index.html')
            s = open(f, encoding='utf-8').read()
            assert CDN in s, 'manca supabase-js in ' + f
            b = s.replace(CDN, FINTO).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(b)))
            self.end_headers()
            self.wfile.write(b)
            return
        return super().do_GET()

porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8124
http.server.ThreadingHTTPServer(('127.0.0.1', porta), H).serve_forever()
