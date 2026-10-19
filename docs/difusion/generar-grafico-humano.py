# Genera docs/difusion/grafico-humano.svg: el humano en el ciclo. Qué decide el ingeniero, cuándo interviene y qué gana o
# arriesga en Scrum, SDD y STL cuando trabaja con IA. Imparcial: cada método le da algo y le cobra algo, STL incluido; las
# tres tarjetas tienen el mismo peso. Sin cifras: son efectos de diseño. Uso: python docs/difusion/generar-grafico-humano.py
# Con --movil escribe grafico-humano-movil.svg: las tres tarjetas una debajo de la otra, para leerlo en el teléfono.
import io
import os
import sys

MOVIL = '--movil' in sys.argv
W = 560 if MOVIL else 1600
partes = []
def o(s): partes.append(s)

AZUL, NEGRO, VERDE_IA, DORADO = '#2f5fb3', '#2c2c2a', '#11867a', '#b5862a'
OK, OK_FONDO, RIESGO, RIESGO_FONDO = '#3b7d2a', '#eef6e7', '#c77d0a', '#fff4e0'

def t(x, y, s, size=14, weight=400, fill='#23221f', anchor='middle'):
    o(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{s}</text>')

def partir(texto, ancho):
    # corta el texto en renglones de a lo sumo «ancho» caracteres, sin partir palabras
    lineas, actual = [], ''
    for p in texto.split():
        if actual and len(actual) + 1 + len(p) > ancho:
            lineas.append(actual)
            actual = p
        else:
            actual = f'{actual} {p}'.strip()
    return lineas + [actual] if actual else lineas

def humano(x, y, r=10):
    s = r / 12
    o(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{AZUL}"/><circle cx="{x}" cy="{y - 3 * s}" r="{3.6 * s}" fill="#fff"/>'
      f'<path d="M{x - 6.5 * s} {y + 7.5 * s}q{6.5 * s} -{9.5 * s} {13 * s} 0z" fill="#fff"/>')

def director(x, y, r=10):
    s = r / 12
    o(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{NEGRO}" stroke="#f6e7b4" stroke-width="{1.6 * s}"/>')
    t(x, y + 4.3 * s, 'D', round(13 * s, 1), 800, '#f6e7b4')

def ia(x, y, r=9):
    s, a = r / 12, r * 0.82
    o(f'<rect x="{x - a}" y="{y - a}" width="{2 * a}" height="{2 * a}" rx="{4 * s}" fill="{VERDE_IA}"/>')
    t(x, y + 3.6 * s, 'IA', round(9.5 * s, 1), 800, '#fff')

def buzon(x, y):
    o(f'<rect x="{x - 9}" y="{y - 6.5}" width="18" height="13" rx="2" fill="#fff" stroke="{DORADO}" stroke-width="1.8"/>'
      f'<path d="M{x - 9} {y - 5.5}l9 7 9-7" fill="none" stroke="{DORADO}" stroke-width="1.8"/>')

def visto(x, y, color):
    o(f'<path d="M{x - 5} {y}l3.5 3.5 6.5-7.5" fill="none" stroke="{color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>')

def alerta(x, y, color):
    o(f'<path d="M{x} {y - 7}l7.5 13h-15z" fill="{color}"/>')
    t(x, y + 4.5, '!', 10, 800, '#fff')

# ---------------------------------------------------------------- lo que dice cada método
METODOS = [
    {
        'nombre': 'Scrum', 'sub': '+ IA (chat o copiloto)', 'color': '#2d7c7a',
        'papel': 'Decide cada prompt, con el sprint como marco. Nadie le propone el paso siguiente entre una Daily y la otra.',
        'gana': ['Autonomía total e inmediata: pide y obtiene al instante.',
                 'Contacto directo con el código y con el modelo.',
                 'El equipo se organiza solo; la Daily y la Review son puntos de control humanos.'],
        'arriesga': ['Decide solo, prompt a prompt: el foco depende de su disciplina.',
                     'Supervisar mucha IA a la vez cansa y dispersa.',
                     'El desvío se nota tarde, en la Daily o en la Review.'],
        'sirve': 'Equipos disciplinados, exploración y depurar en vivo.',
    },
    {
        'nombre': 'SDD', 'sub': 'Spec-Driven, con IA (agente)', 'color': '#6a4c9c',
        'papel': 'Decide la intención al inicio (la spec) y revisa lo que entrega la IA. En el medio, la IA sigue las tareas.',
        'gana': ['Sus decisiones quedan escritas y se pueden verificar.',
                 'Decide en alto nivel: qué y por qué, no cada línea.',
                 'Con la spec estable, la IA ejecuta y él ahorra tiempo.'],
        'arriesga': ['Revisar specs y planes largos que redacta la IA: riesgo de aprobar sin leer a fondo.',
                     'Se aleja de la implementación: entiende menos el código que se genera.',
                     'Cada cambio de idea cuesta reabrir la spec.'],
        'sirve': 'Requisitos claros y estables.',
    },
    {
        'nombre': 'STL', 'sub': 'Studio + director, con IA', 'color': '#b5862a',
        'papel': 'Decide en cada revisión: fija la meta, responde y cruza las puertas. El director propone el paso siguiente; él decide.',
        'gana': ['Piensa antes de enviar: el buzón frena el impulso y deja corregir.',
                 'Lee en orden y comenta por partes: cada observación tiene respuesta.',
                 'Una sola misión a la vez, con su porqué: menos carga mental.'],
        'arriesga': ['La revisión tarda minutos: depurar en vivo, con el agente.',
                     'Puede delegar de más en el director y aceptar sus propuestas sin cuestionarlas.',
                     'Si el director ejecuta, el ingeniero toca menos el código. Y sin revisiones, nada avanza.'],
        'sirve': 'Proyectos largos con IA, donde el camino cambia.',
    },
]

# ---------------------------------------------------------------- medidas
ANCHO, Y0 = (520, 254) if MOVIL else (506, 152)
PAPEL, LINEA = 62, 60   # caracteres por renglón del papel y de cada punto

def alto_bloque(items):
    return 40 + sum(len(partir(x, LINEA)) * 19 + 8 for x in items)

def alto_tarjeta(m):
    # de arriba abajo: encabezado y línea de trabajo, el papel, lo que gana, lo que arriesga y «le sirve más»
    return 218 + 22 + len(partir(m['papel'], PAPEL)) * 20 + 14 + alto_bloque(m['gana']) + 14 + alto_bloque(m['arriesga']) + 14 + 32 + 16

ALTO = max(alto_tarjeta(m) for m in METODOS)   # las tres del mismo alto
CIERRE = 'STL no le da al ingeniero más autonomía inmediata: le cambia cuándo y con qué decide. Menos veces, con todo junto y con la última palabra.'
PIE = 'En los tres, el criterio sigue siendo del ingeniero: ningún método reemplaza leer lo que se aprueba. STL medirá carga mental y fatiga con un cuestionario antes y después de usarlo.'
CIERRE_L, PIE_L = (partir(CIERRE, 54), partir(PIE, 74)) if MOVIL else ([CIERRE], [PIE])
ALTO_CIERRE = 22 + len(CIERRE_L) * 24 if MOVIL else 50
ALTO_CARTAS = 3 * ALTO + 2 * 21 if MOVIL else ALTO
H = Y0 + ALTO_CARTAS + 18 + ALTO_CIERRE + (36 if MOVIL else 20) + len(PIE_L) * 18 + 12

# ---------------------------------------------------------------- lienzo
o(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="titulo desc">')
o('<title id="titulo">El humano en el ciclo: qué decide el ingeniero en cada método cuando trabaja con IA</title>')
o('<desc id="desc">Comparación imparcial de Scrum, SDD y STL trabajando con IA: dónde decide el humano, qué gana y qué arriesga en '
  'cada uno, y cuándo le sirve más. Scrum da autonomía inmediata pero deja al ingeniero decidiendo solo prompt a prompt; SDD '
  'concentra las decisiones en la spec y lo aleja de la implementación; STL lo hace decidir en cada revisión, con un director que '
  'propone, a cambio de esperar unos minutos cada revisión y del riesgo de delegar de más.</desc>')
o('<style>text { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }</style>')
o(f'<rect width="{W}" height="{H}" fill="#f6f4ef"/>')

if MOVIL:
    t(W / 2, 44, 'El humano en el ciclo', 30, 800)
    t(W / 2, 74, 'qué decide el ingeniero en cada método', 19, 700)
    for k, linea in enumerate(partir('Comparación imparcial: cada método le da algo al ingeniero y le cobra algo. Sin cifras: son efectos de diseño.', 56)):
        t(W / 2, 104 + k * 21, linea, 15, 400, '#5c5b55')
    # la leyenda, en dos filas
    humano(70, 176, 10); t(86, 181, 'el humano decide', 14, 600, '#0c447c', 'start')
    director(240, 176, 10); t(256, 181, 'el director propone', 14, 600, NEGRO, 'start')
    ia(70, 212, 10); t(86, 217, 'la IA ejecuta', 14, 600, '#0b5d55', 'start')
    visto(240, 212, OK); t(252, 217, 'lo que gana', 14, 600, '#27500a', 'start')
    alerta(370, 213, RIESGO); t(384, 217, 'lo que arriesga', 14, 600, '#6b4206', 'start')
else:
    t(800, 56, 'El humano en el ciclo: qué decide el ingeniero en cada método', 34, 800)
    t(800, 89, 'Comparación imparcial: cada método le da algo al ingeniero y le cobra algo. Sin cifras: son efectos de diseño.', 18, 400, '#5c5b55')

    # leyenda
    humano(470, 124, 10); t(486, 129, 'el humano decide', 14, 600, '#0c447c', 'start')
    director(640, 124, 10); t(656, 129, 'el director propone', 14, 600, NEGRO, 'start')
    ia(818, 124, 10); t(834, 129, 'la IA ejecuta', 14, 600, '#0b5d55', 'start')
    visto(962, 124, OK); t(974, 129, 'lo que gana', 14, 600, '#27500a', 'start')
    alerta(1078, 125, RIESGO); t(1092, 129, 'lo que arriesga', 14, 600, '#6b4206', 'start')

for i, m in enumerate(METODOS):
    x0 = 20 if MOVIL else 20 + i * (ANCHO + 21)
    yc = Y0 + i * (ALTO + 21) if MOVIL else Y0
    cx = x0 + ANCHO / 2
    # misma tarjeta para los tres: nadie va resaltado
    o(f'<rect x="{x0}" y="{yc}" width="{ANCHO}" height="{ALTO}" rx="16" fill="#fff" stroke="#dcd7cc" stroke-width="1.5"/>')
    o(f'<path d="M{x0} {yc + 16}a16 16 0 0 1 16 -16h{ANCHO - 32}a16 16 0 0 1 16 16v48h-{ANCHO}z" fill="{m["color"]}"/>')
    t(x0 + 22, yc + 40, m['nombre'], 26, 800, '#fff', 'start')
    t(x0 + ANCHO - 22, yc + 40, m['sub'], 14, 600, '#fff', 'end')

    # dónde decide el humano, en una línea de trabajo
    y = yc + 96
    t(x0 + 22, y, 'DÓNDE DECIDE EL HUMANO', 12, 800, '#73716a', 'start')
    yl = y + 52
    o(f'<line x1="{x0 + 26}" y1="{yl}" x2="{x0 + ANCHO - 26}" y2="{yl}" stroke="#d9d5ca" stroke-width="3" stroke-linecap="round"/>')
    if m['nombre'] == 'Scrum':
        for k, etiqueta in enumerate(['Planning', 'Daily', 'Daily', 'Review']):
            xm = x0 + 46 + k * 138
            o(f'<line x1="{xm}" y1="{yl - 30}" x2="{xm}" y2="{yl - 14}" stroke="#2d7c7a" stroke-width="2"/>')
            t(xm, yl - 34, etiqueta, 11.5, 700, '#2d7c7a')
        for k in range(15):
            xk = x0 + 40 + k * 30
            (humano if k % 2 == 0 else ia)(xk, yl, 8 if k % 2 == 0 else 7.5)
        t(cx, yl + 36, 'pide y la IA responde, una y otra vez, al instante', 12.5, 600, '#4a4944')
    elif m['nombre'] == 'SDD':
        humano(x0 + 48, yl, 13)
        t(x0 + 48, yl + 30, 'la spec', 12, 700, '#0c447c')
        o(f'<line x1="{x0 + 72}" y1="{yl}" x2="{x0 + ANCHO - 72}" y2="{yl}" stroke="{VERDE_IA}" stroke-width="6" stroke-linecap="round" opacity="0.35"/>')
        for k in range(5):
            ia(x0 + 120 + k * 66, yl, 8)
        t(cx, yl + 30, 'la IA sigue las tareas', 12, 700, '#0b5d55')
        humano(x0 + ANCHO - 48, yl, 13)
        t(x0 + ANCHO - 48, yl + 30, 'revisa', 12, 700, '#0c447c')
        t(cx, yl - 22, 'si algo cambia, vuelve a la spec', 11.5, 600, RIESGO)
    else:
        for c in range(3):
            xb = x0 + 44 + c * 150
            humano(xb, yl, 11)
            buzon(xb + 30, yl)
            director(xb + 62, yl, 10)
            ia(xb + 94, yl, 8)
        # los rótulos del primer ciclo, alternados arriba y abajo para que no se monten
        for xk, et, dy in ((x0 + 44, 'tú', 28), (x0 + 74, 'buzón', -18), (x0 + 106, 'director', 28), (x0 + 138, 'IA', -18)):
            t(xk, yl + dy, et, 11, 700, '#4a4944')
        humano(x0 + ANCHO - 30, yl, 13)
        t(cx + 60, yl + 28, 'decides en cada revisión', 12, 700, '#0c447c')

    # su papel
    yp = yl + 70
    t(x0 + 22, yp, 'SU PAPEL', 12, 800, '#73716a', 'start')
    papel = partir(m['papel'], PAPEL)
    for k, linea in enumerate(papel):
        t(x0 + 22, yp + 22 + k * 20, linea, 14.5, 600 if k == 0 else 500, '#23221f', 'start')

    # lo que gana y lo que arriesga, uno debajo del otro
    yb = yp + 22 + len(papel) * 20 + 14
    for titulo, items, color, fondo, marca in (
            ('LO QUE GANA', m['gana'], OK, OK_FONDO, visto),
            ('LO QUE ARRIESGA', m['arriesga'], RIESGO, RIESGO_FONDO, alerta)):
        renglones = [partir(x, LINEA) for x in items]
        alto = alto_bloque(items)
        o(f'<rect x="{x0 + 14}" y="{yb}" width="{ANCHO - 28}" height="{alto}" rx="12" fill="{fondo}"/>')
        t(x0 + 30, yb + 26, titulo, 12.5, 800, color, 'start')
        yi = yb + 50
        for r in renglones:
            marca(x0 + 36, yi - 4, color)
            for k, linea in enumerate(r):
                t(x0 + 52, yi + k * 19, linea, 13.5, 500, '#23221f', 'start')
            yi += len(r) * 19 + 8
        yb += alto + 14

    # cuándo le sirve más
    ys = yc + ALTO - 46
    o(f'<rect x="{x0 + 14}" y="{ys}" width="{ANCHO - 28}" height="32" rx="16" fill="#f1efe8"/>')
    t(x0 + 30, ys + 21, 'Le sirve más:', 13, 800, '#4a4944', 'start')
    t(x0 + 122, ys + 21, m['sirve'], 13, 500, '#23221f', 'start')

# el cierre, sin vender
yz = Y0 + ALTO_CARTAS + 18
o(f'<rect x="20" y="{yz}" width="{W - 40}" height="{ALTO_CIERRE}" rx="14" fill="#f6e7b4" stroke="#ecdcae" stroke-width="1.5"/>')
for k, linea in enumerate(CIERRE_L):
    t(W // 2, yz + (32 if MOVIL else 32) + k * 24, linea, 16 if MOVIL else 17, 800, '#6b4f00')
for k, linea in enumerate(PIE_L):
    t(W // 2, yz + ALTO_CIERRE + (26 if MOVIL else 28) + k * 18, linea, 12.5 if MOVIL else 13, 400, '#73716a')
o('</svg>')

ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'grafico-humano-movil.svg' if MOVIL else 'grafico-humano.svg')
io.open(ruta, 'w', encoding='utf-8', newline='\n').write('\n'.join(partes) + '\n')
print('escrito', ruta)
