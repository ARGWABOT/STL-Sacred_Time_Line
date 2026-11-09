# Saca fotogramas de un video en tiempos dados y los junta en hojas de 2 x 3, con el tiempo escrito en cada uno.
# Uso: python -I hoja_de_fotogramas.py <video> <carpeta_salida> <mm:ss> [<mm:ss> ...]
import os
import subprocess
import sys

from PIL import Image, ImageDraw

video, salida, tiempos = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(salida, exist_ok=True)
cuadros = []
for t in tiempos:
    destino = os.path.join(salida, f'f_{t.replace(":", "")}.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', t, '-i', video, '-frames:v', '1', destino], check=True)
    im = Image.open(destino).convert('RGB')
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 70, 22), fill=(0, 0, 0))
    d.text((6, 5), t, fill=(255, 255, 0))
    cuadros.append(im)
w, h = cuadros[0].size
for n in range(0, len(cuadros), 6):
    grupo = cuadros[n:n + 6]
    hoja = Image.new('RGB', (w * 2, h * 3), (40, 40, 40))
    for i, im in enumerate(grupo):
        hoja.paste(im, ((i % 2) * w, (i // 2) * h))
    hoja.save(os.path.join(salida, f'hoja_{n // 6 + 1}.png'))
print('hojas:', (len(cuadros) + 5) // 6)
