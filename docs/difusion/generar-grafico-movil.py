# Genera docs/difusion/grafico-comparativo-movil.svg: la versión para el teléfono del comparativo (generar-grafico.py).
# El mismo mensaje, de arriba abajo: cada método en su tarjeta, con sus pasos en orden, quién hace cada uno, el momento en
# que algo cambia y cómo termina en cada caso. Angosto (400) para que en un teléfono se lea sin acercar.
# Uso: python docs/difusion/generar-grafico-movil.py
import io
import os

W = 400
partes = []
def o(s): partes.append(s)

COLOR = {'h': '#2f5fb3', 'd': '#2c2c2a', 'm': '#11867a', 'st': '#b5862a', 'rojo': '#c8453b', 'verde': '#3b7d2a', 'ambar': '#c77d0a'}
TEXTO = {'h': '#0c447c', 'd': '#2c2c2a', 'm': '#0b5d55', 'st': '#6b4f00', 'rojo': '#9b2c24'}

def t(x, y, s, size=14, weight=400, fill='#23221f', anchor='middle'):
    o(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{s}</text>')

def partir(texto, ancho):
    lineas, actual = [], ''
    for p in texto.split():
        if actual and len(actual) + 1 + len(p) > ancho:
            lineas.append(actual)
            actual = p
        else:
            actual = f'{actual} {p}'.strip()
    return lineas + [actual] if actual else lineas

def insignia(x, y, actor, r=12):
    s = r / 12
    if actor == 'h':
        o(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{COLOR["h"]}"/><circle cx="{x}" cy="{y - 3 * s}" r="{3.6 * s}" fill="#fff"/>'
          f'<path d="M{x - 6.5 * s} {y + 7.5 * s}q{6.5 * s} -{9.5 * s} {13 * s} 0z" fill="#fff"/>')
    elif actor == 'st':
        o(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{COLOR["st"]}"/>'
          f'<rect x="{x - 6 * s}" y="{y - 4.2 * s}" width="{12 * s}" height="{8.5 * s}" rx="1.5" fill="none" stroke="#fff" stroke-width="1.6"/>'
          f'<path d="M{x - 6 * s} {y - 3.4 * s}l{6 * s} {4.6 * s} {6 * s} -{4.6 * s}" fill="none" stroke="#fff" stroke-width="1.6"/>')
    elif actor == 'd':
        o(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#2c2c2a" stroke="#f6e7b4" stroke-width="{1.6 * s}"/>')
        t(x, y + 4.3 * s, 'D', round(13 * s, 1), 800, '#f6e7b4')
    elif actor == 'rojo':
        o(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{COLOR["rojo"]}"/>')
        t(x, y + 5 * s, '!', round(15 * s, 1), 800, '#fff')
    else:
        a = r * 0.82
        o(f'<rect x="{x - a}" y="{y - a}" width="{2 * a}" height="{2 * a}" rx="{4 * s}" fill="{COLOR["m"]}"/>')
        t(x, y + 3.6 * s, 'IA', round(9.5 * s, 1), 800, '#fff')

# ---------------------------------------------------------------- lo que dice cada método
# Cada paso: (quién lo hace, texto). «cambia» marca el momento en que algo cambia; «no» y «bucle», las notas de STL.
METODOS = [
    {
        'nombre': 'Scrum', 'sub': '+ CI/CD, con IA', 'color': '#2d7c7a', 'fondo': '#fff', 'borde': '#cfe3e1',
        'sigue': 'Por sprint, lo que ordena el PO. Prompt a prompt, el desarrollador, solo.',
        'pasos': [('h', 'El PO ordena el backlog: meta definida'), ('h', 'Cada desarrollador le pide a su IA, prompt a prompt'),
                  'cambia', ('m', 'La IA ejecuta cada prompt al instante, sin cuestionar'),
                  ('rojo', 'Prompt a prompt, ¿quién decide? El desarrollador, solo: el sprint no llega ahí'),
                  ('h', 'El PO y el equipo ajustan en la Daily, cada 24 horas')],
        'nada': 'Llega sprint a sprint, con incrementos revisados.',
        'algo': 'Desarrollador e IA ajustan solos; se nota en la Daily o la Review.',
    },
    {
        'nombre': 'SDD', 'sub': 'Spec-Driven Dev., con IA', 'color': '#6a4c9c', 'fondo': '#fff', 'borde': '#ddd3ee',
        'sigue': 'La siguiente tarea de la spec. Lo nuevo obliga a reabrirla.',
        'pasos': [('h', 'Describes y apruebas la spec: meta definida'), ('m', 'La IA redacta el plan y las tareas'),
                  ('m', 'La IA implementa, tarea por tarea'), 'cambia',
                  ('rojo', 'Surge algo que la spec no cubre'), ('h', 'Reabres la spec y la vuelves a aprobar'),
                  ('m', 'La IA regenera el plan y las tareas')],
        'nada': 'Llega de una: la IA ejecuta el plan. Es el camino más directo.',
        'algo': 'Hay que reabrir la spec y regenerar el plan y las tareas.',
    },
    {
        'nombre': 'STL', 'sub': 'Studio + director, con IA', 'color': '#b5862a', 'fondo': '#fffdf5', 'borde': '#d6b65c',
        'sigue': 'El paso más estratégico, uno solo. Lo propone el director; tú decides.',
        'pasos': [('h', 'Entregas tu proyecto'), ('d', 'El director lo diagnostica y propone metas'), ('h', 'Comentas y fijas la meta'),
                  'cambia', ('h', 'Ideas, cambios, fallos, comentarios y preguntas'),
                  ('st', 'El buzón los recibe y los detiene: relees, corriges o borras'), 'no',
                  ('st', '«Revisa»: todo junto, al director'), ('d', 'El director lo ordena contra la meta y le dice al modelo qué ejecutar'),
                  ('m', 'El modelo ejecuta solo lo que quedó en firme'), ('d', 'El director analiza: ¿ajustar o avanzar?'),
                  ('st', 'Te responde en orden: una respuesta por nota'), 'bucle',
                  ('d', 'Una sola misión: el paso más estratégico'), ('h', 'Cumples tu misión y el proyecto avanza')],
        'nada': 'Misión a misión, revisando.',
        'algo': 'Lo encauza sin perder el rumbo.',
    },
]
NOTAS = {'no': ('✕ nada llega directo al modelo', COLOR['rojo']),
         'bucle': ('↻ si falta ajustar, comentas y vuelve al buzón', COLOR['h'])}

X0, ANCHO = 12, W - 24          # la tarjeta de cada método
PASO = 36                       # caracteres por renglón de un paso, a 15 px
RENGLON = 19

def alto_paso(texto):
    return 16 + len(partir(texto, PASO)) * RENGLON

def alto_final(texto):
    return 34 + len(partir(texto, 42)) * 18

def alto_metodo(m):
    h = 70 + len(partir(m['sigue'], 40)) * 20 + 14
    for p in m['pasos']:
        if p == 'cambia':
            h += 36
        elif p in NOTAS:
            h += 8 + len(partir(NOTAS[p][0], 38)) * 18
        else:
            h += alto_paso(p[1]) + 14
    return h + alto_final(m['nada']) + alto_final(m['algo']) + 16 + 14

CIERRE = 'Lo que solo hace STL: te orquesta también a ti. Lo que le pides al modelo pasa antes por el buzón y el director: un guardrail para ti, no solo para el modelo.'
Y0 = 210
H = Y0 + sum(alto_metodo(m) + 20 for m in METODOS) + len(partir(CIERRE, 44)) * 20 + 104

o(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="titulo desc">')
o('<title id="titulo">Con IA, todo proyecto se bifurca más rápido. ¿Quién decide qué sigue?</title>')
o('<desc id="desc">Scrum, SDD y STL trabajando con IA, de arriba abajo: los pasos de cada método, quién hace cada uno y cómo termina si '
  'nada cambia o si algo cambia. Si nada cambia, SDD es el más directo; cuando algo cambia, en STL nada llega directo al modelo: el '
  'buzón lo detiene, el director lo encauza y te da una sola misión.</desc>')
o('<defs><marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#a9a59b"/></marker></defs>')
o('<style>text { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }</style>')
o(f'<rect width="{W}" height="{H}" fill="#f6f4ef"/>')

for k, linea in enumerate(('Con IA, todo proyecto se', 'bifurca más rápido.', '¿Quién decide qué sigue?')):
    t(W // 2, 36 + k * 29, linea, 24, 800)
for k, linea in enumerate(partir('No comparamos cómo se gestiona el proyecto, sino cómo trabaja cada desarrollador con el modelo, prompt a prompt.', 46)):
    t(W // 2, 118 + k * 19, linea, 14, 400, '#5c5b55')
# leyenda: quién hace cada paso
for k, (actor, nombre) in enumerate((('h', 'Humano'), ('st', 'Studio'), ('d', 'Director'), ('m', 'Modelo'))):
    x = (24, 118, 210, 314)[k]
    insignia(x + 10, 184, actor, 10)
    t(x + 25, 189, nombre, 14, 700, TEXTO[actor], 'start')

y = Y0
for m in METODOS:
    alto = alto_metodo(m)
    o(f'<rect x="{X0}" y="{y}" width="{ANCHO}" height="{alto}" rx="16" fill="{m["fondo"]}" stroke="{m["borde"]}" stroke-width="{3 if m["nombre"] == "STL" else 1.5}"/>')
    o(f'<path d="M{X0} {y + 16}a16 16 0 0 1 16 -16h{ANCHO - 32}a16 16 0 0 1 16 16v36h-{ANCHO}z" fill="{m["color"]}"/>')
    t(X0 + 16, y + 35, m['nombre'], 24, 800, '#fff', 'start')
    t(X0 + ANCHO - 16, y + 33, m['sub'], 13.5, 600, '#fff', 'end')
    # ¿qué sigue?, según el método
    yy = y + 72
    t(X0 + 16, yy, '¿QUÉ SIGUE?', 12, 800, '#73716a', 'start')
    for k, linea in enumerate(partir(m['sigue'], 40)):
        t(X0 + 16, yy + 21 + k * 20, linea, 15, 600, '#23221f', 'start')
    yy += len(partir(m['sigue'], 40)) * 20 + 12
    # los pasos, uno debajo del otro, con quién los hace
    anterior = None
    for p in m['pasos']:
        if p == 'cambia':
            o(f'<rect x="{X0 + 44}" y="{yy + 7}" width="116" height="24" rx="12" fill="#fff4e0" stroke="{COLOR["ambar"]}" stroke-width="1.5"/>')
            o(f'<path d="M{X0 + 61} {yy + 11}l-5 8h4l-2 7 6 -9h-4l2 -6z" fill="{COLOR["ambar"]}"/>')
            t(X0 + 108, yy + 24, 'algo cambia', 13.5, 800, '#8a5200')
            yy += 36
            continue
        if p in NOTAS:
            texto, color = NOTAS[p]
            for k, linea in enumerate(partir(texto, 38)):
                t(X0 + 44, yy + 19 + k * 18, linea, 13.5, 800, color, 'start')
            yy += 8 + len(partir(texto, 38)) * 18
            continue
        actor, texto = p
        lineas = partir(texto, PASO)
        h = 16 + len(lineas) * RENGLON
        if anterior is not None:
            o(f'<line x1="{X0 + 28}" y1="{anterior}" x2="{X0 + 28}" y2="{yy + 2}" stroke="#a9a59b" stroke-width="2" marker-end="url(#punta)"/>')
        fondo = '#fff' if actor != 'rojo' else '#fdeceb'
        o(f'<rect x="{X0 + 10}" y="{yy + 4}" width="{ANCHO - 20}" height="{h}" rx="10" fill="{fondo}" stroke="{COLOR[actor]}" stroke-width="1.8"/>')
        insignia(X0 + 28, yy + 4 + h / 2, actor, 11)
        for k, linea in enumerate(lineas):
            t(X0 + 47, yy + 4 + 22 + k * RENGLON, linea, 15, 650, TEXTO['rojo'] if actor == 'rojo' else '#23221f', 'start')
        anterior = yy + 4 + h
        yy += h + 14
    # cómo termina, en cada caso
    for tipo, titulo, texto in (('ok', 'Si nada cambia', m['nada']), ('cambio', 'Si algo cambia', m['algo'])):
        borde, fondo, color = (COLOR['verde'], '#eef6e7', '#27500a') if tipo == 'ok' else (COLOR['ambar'], '#fff4e0', '#6b4206')
        h = alto_final(texto)
        o(f'<rect x="{X0 + 10}" y="{yy + 4}" width="{ANCHO - 20}" height="{h - 8}" rx="10" fill="{fondo}" stroke="{borde}" stroke-width="2"/>')
        t(X0 + 22, yy + 23, titulo, 13.5, 800, color, 'start')
        for k, linea in enumerate(partir(texto, 42)):
            t(X0 + 22, yy + 42 + k * 18, linea, 14, 500, '#3f3e3a', 'start')
        yy += h
    y += alto + 20

# lo que solo hace STL y el cierre
lineas = partir(CIERRE, 44)
for k, linea in enumerate(lineas):
    t(W // 2, y + 14 + k * 20, linea, 14.5, 800, '#6b4f00')
y += len(lineas) * 20 + 14
o(f'<rect x="{X0}" y="{y}" width="{ANCHO}" height="70" rx="14" fill="#f6e7b4" stroke="#ecdcae" stroke-width="1.5"/>')
t(W // 2, y + 29, 'Si nada cambia, SDD es el más directo.', 16, 800, '#6b4f00')
t(W // 2, y + 53, 'Cuando algo cambia, STL mantiene el rumbo.', 16, 800, '#6b4f00')
o('</svg>')

ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'grafico-comparativo-movil.svg')
io.open(ruta, 'w', encoding='utf-8', newline='\n').write('\n'.join(partes) + '\n')
print('escrito', ruta)
