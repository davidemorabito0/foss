# Ricompone chat.html (nella radice del sito) dai pezzi di questa cartella.
# Uso: python3 sviluppo/chat/build.py
import glob, os
d = os.path.dirname(os.path.abspath(__file__))
radice = os.path.abspath(os.path.join(d, '..', '..'))
parti = [open(os.path.join(d, 'head.html')).read(), open(os.path.join(d, 'chat.css')).read(), open(os.path.join(d, 'body.html')).read()]
js = '(function(){\n' + '\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(d, 'js', '*.js')))) + '\n})();\n'
parti.append(js)
parti.append(open(os.path.join(d, 'fine.html')).read())
out = ''.join(parti)
open(os.path.join(radice, 'chat.html'), 'w').write(out)
print(len(out), 'byte -> chat.html')
