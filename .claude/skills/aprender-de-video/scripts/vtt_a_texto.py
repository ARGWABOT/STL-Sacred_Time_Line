# Convierte unos subtítulos automáticos de YouTube (.vtt) en texto limpio con marcas de tiempo cada ~30 s.
# Los automáticos repiten cada renglón varias veces: se quitan las repeticiones y las etiquetas de tiempo internas.
# Uso: python -I vtt_a_texto.py <entrada.vtt> <salida.txt>
import re
import sys

entrada, salida = sys.argv[1], sys.argv[2]
texto = open(entrada, encoding='utf-8').read()
bloques = re.split(r'\n\n+', texto)
vistos, renglones = set(), []
ultimo_tiempo = -999
actual = []
for b in bloques:
    m = re.search(r'(\d\d):(\d\d):(\d\d)\.\d+ -->', b)
    if not m:
        continue
    seg = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
    for linea in b.split('\n')[1:]:
        if '-->' in linea:
            continue
        limpia = re.sub(r'<[^>]+>', '', linea).strip()
        if not limpia or limpia in vistos:
            continue
        vistos.add(limpia)
        if seg - ultimo_tiempo >= 30:
            if actual:
                renglones.append(' '.join(actual))
            actual = [f'\n[{seg // 60:02d}:{seg % 60:02d}]']
            ultimo_tiempo = seg
        actual.append(limpia)
if actual:
    renglones.append(' '.join(actual))
open(salida, 'w', encoding='utf-8').write('\n'.join(renglones).strip() + '\n')
print('palabras:', sum(len(r.split()) for r in renglones))
