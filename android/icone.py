# Prepara le immagini dell'app Android a partire dalle icone del sito (le stesse di FOSS e della chat):
# icona nelle varie misure, icona «adattiva», schermata di avvio, icona della scorciatoia «Chat».
# Lo lancia l'azione di GitHub prima di costruire:  pip install pillow && python3 android/icone.py
import os
from PIL import Image
QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(QUI)
RES = os.path.join(QUI, 'app', 'src', 'main', 'res')
def salva(img, cartella, nome):
    d = os.path.join(RES, cartella); os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, nome)); print(' ', cartella + '/' + nome, img.size)

icona = Image.open(os.path.join(RADICE, 'foss-icona-512.png')).convert('RGB')
chat = Image.open(os.path.join(RADICE, 'chat-icona-192.png')).convert('RGBA')
fondo = icona.getpixel((6, 6))                      # il colore di fondo dell'icona (uguale in tutto il bordo)
esad = '#%02X%02X%02X' % fondo
print('fondo', esad)

# icona classica (Android fino al 7)
for nome, lato in (('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)):
    salva(icona.resize((lato, lato), Image.LANCZOS), 'mipmap-' + nome, 'ic_launcher.png')
# icona adattiva (Android 8+): 108dp di cui si vedono i 72 centrali; la F rimpicciolita un po' cosi' sta nel cerchio
tela = Image.new('RGB', (432, 432), fondo)
dentro = icona.resize((388, 388), Image.LANCZOS)
tela.paste(dentro, ((432 - 388) // 2, (432 - 388) // 2))
salva(tela, 'mipmap-xxxhdpi', 'ic_launcher_foreground.png')
# schermata di avvio e scorciatoia
salva(icona, 'drawable-nodpi', 'splash.png')
salva(chat.resize((192, 192), Image.LANCZOS), 'drawable-xxxhdpi', 'shortcut_chat.png')
with open(os.path.join(RES, 'values', 'colori_icona.xml'), 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="iconBackground">%s</color>\n</resources>\n' % esad)
print('fatto')
