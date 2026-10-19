# Genera docs/difusion/grafico-comparativo.svg: Scrum + CI/CD, SDD y STL con IA, en carriles (quién hace qué y quién le
# entrega a quién). Uso: python docs/difusion/generar-grafico.py
import io
import os

W, H = 1600, 1384
partes = []
def o(s): partes.append(s)

COLOR = {'h': '#2f5fb3', 'ia': '#2c2c2a', 'm': '#11867a', 'st': '#b5862a', 'gris': '#a9a59b', 'rojo': '#c8453b', 'verde': '#3b7d2a', 'ambar': '#c77d0a'}
CARRIL = {'h': '#edf3fb', 'ia': '#efeee9', 'm': '#e6f3f1', 'st': '#fbf1d6'}

def t(x, y, s, size=14, weight=400, fill='#23221f', anchor='middle', extra=''):
    o(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{extra}>{s}</text>')

# El actor de cada tarjeta, en su esquina: h = humano, st = Studio, d = director, m = modelo o IA
ACTOR = {'h': 'h', 'st': 'st', 'ia': 'd', 'm': 'm', 'gris': 'm'}

def insignia(x, y, actor, r=12, opacidad=1):
    s = r / 12
    op = f' opacity="{opacidad}"' if opacidad < 1 else ''
    o(f'<g{op}>')
    if actor == 'h':
        o(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{COLOR["h"]}"/><circle cx="{x}" cy="{y - 3 * s}" r="{3.6 * s}" fill="#fff"/>'
          f'<path d="M{x - 6.5 * s} {y + 7.5 * s}q{6.5 * s} -{9.5 * s} {13 * s} 0z" fill="#fff"/>')
    elif actor == 'st':
        o(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{COLOR["st"]}"/>')
        sobre(x, y, 12 * s, 8.5 * s, '#fff')
    elif actor == 'd':
        o(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#2c2c2a" stroke="#f6e7b4" stroke-width="{1.6 * s}"/>')
        t(x, y + 4.3 * s, 'D', round(13 * s, 1), 800, '#f6e7b4')
    else:
        a = r * 0.82
        o(f'<path d="M{x - a / 2} {y - a - 3 * s}v{3 * s}M{x + a / 2} {y - a - 3 * s}v{3 * s}M{x - a / 2} {y + a}v{3 * s}M{x + a / 2} {y + a}v{3 * s}'
          f'M{x - a - 3 * s} {y - a / 2}h{3 * s}M{x - a - 3 * s} {y + a / 2}h{3 * s}M{x + a} {y - a / 2}h{3 * s}M{x + a} {y + a / 2}h{3 * s}" stroke="{COLOR["m"]}" stroke-width="{1.6 * s}" stroke-linecap="round"/>'
          f'<rect x="{x - a}" y="{y - a}" width="{2 * a}" height="{2 * a}" rx="{4 * s}" fill="{COLOR["m"]}"/>')
        t(x, y + 3.6 * s, 'IA', round(9.5 * s, 1), 800, '#fff')
    o('</g>')

def tarjeta(cx, cy, w, lineas, tipo, size=14, punteada=False, fondo='#fff', grosor=2, actor=None):
    lh = size + 4
    h = len(lineas) * lh + 16
    x, y = cx - w / 2, cy - h / 2
    dash = ' stroke-dasharray="6 5"' if punteada else ''
    o(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fondo}" stroke="{COLOR[tipo]}" stroke-width="{grosor}"{dash}/>')
    for i, l in enumerate(lineas):
        color, peso = ('#23221f', 700) if i == 0 else ('#4a4944', 400)
        if l == 'meta definida':
            color, peso = COLOR['verde'], 700
        if tipo == 'rojo':
            color = COLOR['rojo']
        if tipo == 'gris':
            color = '#73716a'
        t(cx, y + 8 + (i + 1) * lh - 4, l, size, peso, color)
    insignia(x + 1, y + 1, actor or ACTOR[tipo], 14, 0.55 if tipo == 'gris' else 1)

def rotulo(x, y, texto, color, anchor='start'):
    # el rótulo de una entrega, sobre fondo blanco para que no lo corte el borde de un carril
    w = len(texto) * 6.9 + 12
    x0 = {'start': x - 6, 'end': x - w + 6, 'middle': x - w / 2}[anchor]
    o(f'<rect x="{x0}" y="{y - 13}" width="{w}" height="18" rx="9" fill="#fff" fill-opacity="0.95"/>')
    t(x, y, texto, 12, 700, color, anchor)

def flecha(x1, y1, x2, y2, tipo='ia', punteada=False, ancho=2.5):
    dash = ' stroke-dasharray="6 5"' if punteada else ''
    o(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{COLOR[tipo]}" stroke-width="{ancho}" stroke-linecap="round"{dash} marker-end="url(#m-{tipo})"/>')

def camino(d, tipo='ia', punteada=False, ancho=2.5, punta=True):
    dash = ' stroke-dasharray="6 5"' if punteada else ''
    m = f' marker-end="url(#m-{tipo})"' if punta else ''
    o(f'<path d="{d}" fill="none" stroke="{COLOR[tipo]}" stroke-width="{ancho}" stroke-linecap="round" stroke-linejoin="round"{dash}{m}/>')

def persona(x, y, s=1.0, color=COLOR['h']):
    o(f'<circle cx="{x}" cy="{y - 4 * s}" r="{4.2 * s}" fill="{color}"/><path d="M{x - 7 * s} {y + 7 * s}q{7 * s} -{10 * s} {14 * s} 0z" fill="{color}"/>')

def chip(x, y, tam):
    o(f'<use href="#chip" x="{x - tam / 2}" y="{y - tam / 2}" width="{tam}" height="{tam}"/>')

def sobre(x, y, w=16, h=11, color=COLOR['st']):
    o(f'<rect x="{x - w / 2}" y="{y - h / 2}" width="{w}" height="{h}" rx="2" fill="none" stroke="{color}" stroke-width="1.8"/>'
      f'<path d="M{x - w / 2} {y - h / 2 + 1}l{w / 2} {h * 0.55} {w / 2} -{h * 0.55}" fill="none" stroke="{color}" stroke-width="1.8"/>')

def carril(y0, alto, tipo, rotulo, actor, nuevo=False):
    borde = ' stroke="#d6b65c" stroke-width="2"' if nuevo else ''
    o(f'<rect x="228" y="{y0}" width="1344" height="{alto}" rx="8" fill="{CARRIL[tipo]}"{borde}/>')
    yi = y0 + 14
    insignia(245, yi, actor, 10)
    t(262, yi + 4, rotulo, 12, 700, {'h': '#0c447c', 'ia': '#2c2c2a', 'm': '#0b5d55', 'st': '#6b4f00'}[tipo], 'start')
    if nuevo:
        ancho = len(rotulo) * 6.6
        x = 262 + ancho + 10
        o(f'<rect x="{x}" y="{yi - 9}" width="58" height="18" rx="9" fill="#b5862a"/>')
        t(x + 29, yi + 4, 'NUEVO', 11, 800, '#fff')

def etiqueta_metodo(y0, alto, color, nombre, subs, respuesta, tam=30):
    o(f'<rect x="20" y="{y0}" width="200" height="{alto}" rx="16" fill="{color}"/><rect x="190" y="{y0}" width="30" height="{alto}" fill="{color}"/>')
    t(38, y0 + 46, nombre, tam, 800, '#fff', 'start')
    for i, s in enumerate(subs):
        t(38, y0 + 72 + i * 21, s, 15, 400, '#fff', 'start', ' opacity="0.92"')
    yb = y0 + 72 + len(subs) * 21 + 6
    hb = 34 + len(respuesta) * 20
    o(f'<rect x="32" y="{yb}" width="176" height="{hb}" rx="10" fill="#fff" fill-opacity="0.17"/>')
    t(46, yb + 24, '¿Qué sigue?', 15, 700, '#fff', 'start')
    for i, r in enumerate(respuesta):
        t(46, yb + 46 + i * 20, r, 15, 400, '#fff', 'start')

def rayo(x, y, color='#c77d0a', tam=1.0):
    k = tam
    o(f'<path d="M{x + 2 * k} {y - 7 * k}L{x - 4 * k} {y + 1 * k}H{x}L{x - 2 * k} {y + 7 * k}L{x + 4 * k} {y - 1 * k}H{x}Z" fill="{color}"/>')

def algo_cambia(cx, cy):
    # la marca del momento en que algo cambia (una idea nueva, un fallo, algo que no se previó)
    o(f'<rect x="{cx - 46}" y="{cy - 9}" width="92" height="18" rx="9" fill="#fff4e0" stroke="{COLOR["ambar"]}" stroke-width="1.5"/>')
    rayo(cx - 33, cy, COLOR['ambar'], 0.95)
    t(cx - 24, cy + 4, 'algo cambia', 11, 800, '#8a5200', 'start')

def resultado(x0, y0, tipo, titulo, lineas, w=176):
    # cómo termina cada caso: verde si nada cambia, ámbar si algo cambia
    borde, fondo, texto = (COLOR['verde'], '#eef6e7', '#27500a') if tipo == 'ok' else (COLOR['ambar'], '#fff4e0', '#6b4206')
    h = 26 + len(lineas) * 15
    o(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="10" fill="{fondo}" stroke="{borde}" stroke-width="2"/>')
    if tipo == 'ok':
        o(f'<line x1="{x0 + 13}" y1="{y0 + 7}" x2="{x0 + 13}" y2="{y0 + 22}" stroke="#2c2c2a" stroke-width="1.6"/>'
          f'<path d="M{x0 + 13} {y0 + 7}h11l-3 3.5 3 3.5h-11z" fill="{COLOR["verde"]}"/>')
    else:
        rayo(x0 + 16, y0 + 14, COLOR['ambar'], 1.1)
    t(x0 + 30, y0 + 18, titulo, 12.5, 800, texto, 'start')
    for i, l in enumerate(lineas):
        t(x0 + 12, y0 + 34 + i * 15, l, 11.5, 500, '#3f3e3a', 'start')

def bandera(x, y, color, tam=1.0):
    o(f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y + 80 * tam}" stroke="#2c2c2a" stroke-width="3"/>'
      f'<path d="M{x} {y}h{46 * tam}l-{12 * tam} {14 * tam} {12 * tam} {14 * tam}h-{46 * tam}z" fill="{color}"/>')

# ---------------------------------------------------------------- lienzo
o(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="titulo desc">')
o('<title id="titulo">Con IA, todo proyecto se bifurca más rápido. ¿Quién decide qué sigue?</title>')
o('<desc id="desc">Scrum + CI/CD, SDD y STL trabajando con IA, en carriles: dónde trabaja el humano, dónde la IA y quién le entrega a quién. '
  'STL suma dos actores nuevos: el Studio, que recibe y detiene lo que dices hasta que lo das por bueno, y el director, que lo ordena, '
  'gestiona la conversación con el modelo, te devuelve los resultados en orden y propone el paso más estratégico. Nada llega directo al modelo.</desc>')
o('<defs>')
for k, c in COLOR.items():
    o(f'<marker id="m-{k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="{c}"/></marker>')
o('''<symbol id="chip" viewBox="0 0 44 44"><g stroke="#2c2c2a" stroke-width="2.5" stroke-linecap="round"><path d="M15 3v6M22 3v6M29 3v6M15 35v6M22 35v6M29 35v6M3 15h6M3 22h6M3 29h6M35 15h6M35 22h6M35 29h6"/></g><rect x="8" y="8" width="28" height="28" rx="6" fill="#2c2c2a"/><text x="22" y="27" text-anchor="middle" font-size="12" font-weight="700" fill="#f6e7b4">IA</text></symbol>''')
o('<style>text { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }</style>')
o('</defs>')
o(f'<rect width="{W}" height="{H}" fill="#f6f4ef"/>')

t(800, 56, 'Con IA, todo proyecto se bifurca más rápido. ¿Quién decide qué sigue?', 34, 800)
t(800, 89, 'No comparamos cómo se gestiona el proyecto, sino cómo trabaja cada desarrollador con el modelo, prompt a prompt.', 18, 400, '#5c5b55')

# leyenda
insignia(296, 122, 'h', 13); t(316, 127, 'Humano', 14, 700, '#0c447c', 'start')
insignia(400, 122, 'st', 13); t(420, 127, 'Studio', 14, 700, '#6b4f00', 'start')
insignia(492, 122, 'd', 13); t(512, 127, 'Director (IA)', 14, 700, '#2c2c2a', 'start')
insignia(628, 122, 'm', 13); t(648, 127, 'Modelo o IA', 14, 700, '#0b5d55', 'start')
flecha(758, 122, 794, 122, 'ia'); t(802, 127, 'quién le entrega a quién', 14, 400, '#4a4944', 'start')
camino('M974 122h36', 'rojo', punteada=True); t(1018, 127, 'retrabajo o bloqueo', 14, 400, '#4a4944', 'start')
o('<rect x="1166" y="113" width="58" height="18" rx="9" fill="#b5862a"/>'); t(1195, 126, 'NUEVO', 11, 800, '#fff'); t(1232, 127, 'actor que solo trae STL', 14, 400, '#4a4944', 'start')

# columnas
COL = [(240, 470), (470, 700), (700, 950), (950, 1390), (1390, 1580)]
CX = [(a + b) / 2 for a, b in COL]
o('<rect x="240" y="146" width="1340" height="34" rx="17" fill="#e9e5db"/>')
for cx, nombre in zip(CX, ['0. Integración', '1. Arranque', '2. Se bifurca', '3. ¿Qué sigue?', 'Resultado']):
    t(cx, 169, nombre, 16, 700)

# ---------------------------------------------------------------- SCRUM + CI/CD
Y = 192
o(f'<rect x="20" y="{Y}" width="1560" height="240" rx="16" fill="#fff" stroke="#cfe3e1" stroke-width="1.5"/>')
etiqueta_metodo(Y, 240, '#2d7c7a', 'Scrum', ['+ CI/CD, con IA'], ['Por sprint, lo que', 'ordena el PO.', 'Prompt a prompt,', 'el dev, solo.'])
carril(Y + 8, 110, 'h', 'El equipo (humano)', 'h')
carril(Y + 122, 110, 'm', 'La IA (chat o copiloto)', 'm')
ch, ci = Y + 68, Y + 182
tarjeta(CX[0], ch, 196, ['Adopta Scrum', 'roles, ceremonias, backlog'], 'h')
tarjeta(CX[1], ch, 196, ['Backlog ordenado (PO)', 'meta definida'], 'h')
tarjeta(CX[2], ch, 214, ['Cada desarrollador', 'pide a su IA, prompt a prompt'], 'h')
algo_cambia(CX[2] + 62, Y + 42)
tarjeta(CX[3], ch, 300, ['El PO y el equipo planean el sprint', 'y lo ajustan en la Daily, cada 24 h'], 'h')
tarjeta(CX[0], ci, 196, ['Cada quien usa su IA', 'Scrum no define cómo'], 'gris', punteada=True)
tarjeta(CX[1], ci, 196, ['No participa', 'no conoce la meta'], 'gris', punteada=True)
tarjeta(CX[2], ci, 214, ['Ejecuta cada prompt', 'al instante, sin cuestionar'], 'm')
tarjeta(CX[3], ci, 300, ['Sigue el último prompt', 'aunque se aleje del objetivo del sprint'], 'm')
flecha(455, ch, 485, ch, 'h'); flecha(685, ch, 716, ch, 'h'); flecha(934, ch, 1018, ch, 'h')
for x in (785, 825, 865):
    flecha(x, ch + 28, x, ci - 28, 'h')
t(880, Y + 129, 'prompts', 12, 700, COLOR['h'], 'start')
flecha(934, ci, 1018, ci, 'm')
o(f'<circle cx="1040" cy="{Y + 125}" r="14" fill="#fff" stroke="{COLOR["rojo"]}" stroke-width="2.5"/>'); t(1040, Y + 132, '?', 19, 800, COLOR['rojo'])
t(1062, Y + 122, 'Prompt a prompt, ¿quién decide?', 13, 700, COLOR['rojo'], 'start')
t(1062, Y + 138, 'el desarrollador, solo: el sprint no llega ahí', 12, 400, COLOR['rojo'], 'start')
for dy in (-30, -10, 10, 30):
    o(f'<path d="M1322 {ci}C1350 {ci} 1360 {ci + dy * 0.8} 1392 {ci + dy * 0.9}" fill="none" stroke="#d6b65c" stroke-width="2.5" stroke-dasharray="5 6"/>')
flecha(1322, ch, 1392, ch, 'verde', ancho=3)
resultado(1396, Y + 38, 'ok', 'Si nada cambia', ['Llega sprint a sprint,', 'con incrementos revisados'])
resultado(1396, Y + 152, 'cambio', 'Si algo cambia', ['Dev e IA ajustan solos;', 'se nota en Daily o Review'])

# ---------------------------------------------------------------- SDD
Y = 446
o(f'<rect x="20" y="{Y}" width="1560" height="272" rx="16" fill="#fff" stroke="#ddd3ee" stroke-width="1.5"/>')
etiqueta_metodo(Y, 272, '#6a4c9c', 'SDD', ['Spec-Driven Dev.,', 'con IA'], ['La siguiente tarea', 'de la spec. Lo nuevo', 'obliga a reabrirla.'])
carril(Y + 8, 110, 'h', 'Tú (humano)', 'h')
carril(Y + 122, 110, 'm', 'La IA (agente)', 'm')
ch, ci = Y + 68, Y + 182
tarjeta(CX[0], ch, 196, ['Instala el kit de specs', 'y escribe sus principios'], 'h')
tarjeta(CX[1], ch, 196, ['Describe y aprueba', 'meta definida'], 'h')
tarjeta(CX[2], ch, 214, ['Surge algo nuevo', 'que la spec no cubre'], 'rojo', actor='h')
algo_cambia(CX[2] + 62, Y + 42)
tarjeta(CX[3], ch, 300, ['Reabre la spec', 'y la vuelve a aprobar'], 'h')
tarjeta(CX[0], ci, 196, ['Toma los principios', 'como reglas'], 'm')
tarjeta(CX[1], ci, 196, ['Redacta la spec,', 'el plan y las tareas'], 'm')
tarjeta(CX[2], ci, 214, ['Implementa', 'tarea por tarea'], 'm')
tarjeta(CX[3], ci, 300, ['Regenera el plan y las tareas', 'y relee la spec completa'], 'm')
flecha(CX[0], ch + 28, CX[0], ci - 28, 'h'); t(CX[0] + 10, Y + 129, 'reglas', 12, 700, COLOR['h'], 'start')
flecha(560, ch + 28, 560, ci - 28, 'h'); t(550, Y + 129, 'describe', 12, 700, COLOR['h'], 'end')
flecha(610, ci - 28, 610, ch + 28, 'm'); t(620, Y + 129, 'borrador', 12, 700, '#0b5d55', 'start')
flecha(685, ci, 716, ci, 'm')
flecha(CX[2], ci - 28, CX[2], ch + 28, 'rojo'); t(CX[2] + 10, Y + 129, 'no cabe', 12, 700, COLOR['rojo'], 'start')
flecha(934, ch, 1018, ch, 'rojo')
flecha(CX[3], ch + 28, CX[3], ci - 28, 'h'); t(CX[3] + 10, Y + 129, 'spec nueva', 12, 700, COLOR['h'], 'start')
camino(f'M{CX[3]} {ci + 28}V{Y + 252}H{CX[1]}V{ci + 30}', 'rojo', punteada=True)
o(f'<rect x="800" y="{Y + 242}" width="150" height="20" rx="10" fill="#fff" stroke="{COLOR["rojo"]}" stroke-width="1.5"/>')
t(875, Y + 256, 'vuelve a especificar', 12, 700, COLOR['rojo'])
flecha(1322, ch, 1392, ch, 'ambar', ancho=3)
resultado(1396, Y + 38, 'cambio', 'Si algo cambia', ['Reabrir la spec y regenerar', 'el plan y las tareas'])
camino(f'M934 {ci + 14}H990V{Y + 222}H1360V{ci}H1392', 'verde', ancho=3)
rotulo(1080, Y + 226, 'si nada cambia', COLOR['verde'], 'middle')
resultado(1396, Y + 152, 'ok', 'Si nada cambia', ['Llega de una: la IA ejecuta', 'el plan. Es el más directo.'])

# ---------------------------------------------------------------- STL
Y = 732
o(f'<rect x="20" y="{Y}" width="1560" height="540" rx="16" fill="#fffdf5" stroke="#d6b65c" stroke-width="3"/>')
etiqueta_metodo(Y, 540, '#b5862a', 'STL', ['Studio + director,', 'con IA'],
                ['El paso más', 'estratégico, uno', 'solo. Lo propone', 'el director;', 'tú decides.'], 36)
t(38, Y + 300, 'Dos actores nuevos', 15, 800, '#fff', 'start')
for i, s in enumerate(['entre tú y tu agente:', 'el Studio detiene', 'y ordena; el director', 'orquesta al modelo', 'y te orquesta a ti.']):
    t(38, Y + 322 + i * 20, s, 14, 400, '#fff', 'start')
YT, YS, YD, YM = Y + 8, Y + 124, Y + 268, Y + 384     # Tú, Studio, director, modelo
carril(YT, 112, 'h', 'Tú (humano)', 'h')
carril(YS, 140, 'st', 'El Studio', 'st', nuevo=True)
carril(YD, 112, 'ia', 'El director (IA)', 'd', nuevo=True)
carril(YM, 112, 'm', 'El modelo: tu agente (Claude Code, Codex…)', 'm')
cT, cS, cD, cM = YT + 62, YS + 72, YD + 62, YM + 62

# 0. integración y 1. arranque
tarjeta(CX[0], cT, 196, ['Entregas tu proyecto', 'el repositorio o la idea'], 'h')
tarjeta(CX[0], cS, 196, ['Crea su espacio', 'buzón, ruta y documentos'], 'st')
tarjeta(CX[0], cD, 196, ['Lee el repositorio', 'código, historia y docs'], 'ia', actor='d')
tarjeta(CX[1], cD, 196, ['Diagnostica y propone', '2 o 3 objetivos'], 'ia', actor='d')
tarjeta(CX[1], cS, 196, ['El diagnóstico, en partes', 'que comentas una a una'], 'st')
tarjeta(CX[1], cT, 196, ['Comentas y fijas', 'meta definida'], 'h')
flecha(440, cT + 28, 440, cS - 28, 'h')
flecha(440, cS + 28, 440, cD - 28, 'st')
flecha(455, cD, 485, cD, 'ia')
flecha(CX[1], cD - 28, CX[1], cS + 28, 'ia')
flecha(CX[1], cS - 28, CX[1], cT + 28, 'st')
flecha(685, cT, 716, cT, 'h')
rotulo(448, (cT + cS) / 2 + 4, 'entregas', COLOR['h'])
rotulo(448, (cS + cD) / 2 + 4, 'lo pasa', '#6b4f00')
rotulo(CX[1] + 10, (cS + cD) / 2 + 4, 'diagnóstico', '#2c2c2a')
rotulo(CX[1] + 10, (cT + cS) / 2 + 4, 'te lo muestra', '#6b4f00')

# 2. se bifurca: todo entra al buzón, nada va directo al modelo
tarjeta(CX[2], cT, 214, ['Ideas, cambios, fallos,', 'comentarios y preguntas'], 'h')
algo_cambia(CX[2] + 62, cT - 26)
for x in (760, 800, 850, 890):
    o(f'<path d="M{x} {cT + 27}C{x} {cT + 60} {CX[2]} {cS - 70} {CX[2]} {cS - 38}" fill="none" stroke="#d6b65c" stroke-width="2.5"/>')
tarjeta(CX[2], cS, 222, ['Buzón: recibe y detiene', 'relees, corriges o borras;', 'todo se une en una entrega'], 'st', fondo='#fff4d6', grosor=3)
camino(f'M790 {cS + 36}V{cD}H958', 'st', ancho=3)
# «Revisa»: el buzón le entrega todo junto al director (con su ícono), nunca directo al modelo
o(f'<rect x="828" y="{cD - 14}" width="104" height="28" rx="14" fill="#fff" stroke="{COLOR["st"]}" stroke-width="2"/>')
insignia(845, cD, 'd', 11)
t(862, cD + 5, '«Revisa»', 14, 800, '#6b4f00', 'start')
t(800, cD - 22, 'todo junto, al director', 11.5, 700, '#2c2c2a', 'start')
t(714, cD + 35, 'no va directo al modelo', 12, 700, COLOR['rojo'], 'start')
tarjeta(CX[2], cM, 230, ['Nada llega directo al modelo', 'sin pasar por buzón y director'], 'rojo', punteada=True, actor='m')
camino(f'M716 {cT + 12}H700V{cM - 12}H707', 'rojo', punteada=True)
o(f'<circle cx="700" cy="{cD + 30}" r="11" fill="#fff" stroke="{COLOR["rojo"]}" stroke-width="2.2"/>'
  f'<path d="M695 {cD + 25}l10 10M705 {cD + 25}l-10 10" stroke="{COLOR["rojo"]}" stroke-width="2.2" stroke-linecap="round"/>')

# 3. qué sigue: el director orquesta al modelo y decide si se ajusta o se avanza
tarjeta(1060, cD, 200, ['① Recibe todo junto', 'y lo ordena contra la meta'], 'ia', 13, actor='d')
tarjeta(1170, cM, 210, ['② Ejecuta lo aprobado', 'solo lo que quedó en firme'], 'm', 13)
tarjeta(1285, cD, 196, ['③ Analiza y decide:', '¿ajustar o avanzar?'], 'ia', 13, actor='d', grosor=3)
tarjeta(1285, cS, 196, ['④ Te responde en orden', 'una respuesta por nota', 'y documentos por partes'], 'st', 13)
tarjeta(1285, cT, 196, ['⑤ Lees y comentas', 'lo que haya que ajustar'], 'h', 13)
flecha(1080, cD + 27, 1110, cM - 27, 'ia'); rotulo(1086, cD + 58, 'le dice qué ejecutar', '#2c2c2a', 'end')
flecha(1235, cM - 27, 1265, cD + 27, 'm'); rotulo(1262, cD + 58, 'devuelve', '#0b5d55')
flecha(1285, cD - 27, 1285, cS + 36, 'ia')
flecha(1285, cS - 36, 1285, cT + 27, 'st')
rotulo(1295, (cS + 36 + cD - 27) / 2 + 4, 'si falta ajustar', '#2c2c2a')
rotulo(1295, (cT + 27 + cS - 36) / 2 + 4, 'te lo muestra', '#6b4f00')
flecha(1185, cT, 936, cT, 'h'); rotulo(1060, cT - 12, '↻ bucle de revisión', COLOR['h'], 'middle')
o(f'<rect x="975" y="{cS - 20}" width="170" height="40" rx="12" fill="#eaf1fb" stroke="#b9d3ef" stroke-width="1.5"/>')
t(1060, cS - 3, 'Lo demás, en espera:', 12, 700, '#0c447c'); t(1060, cS + 13, 'vuelve en su fase', 12, 400, '#0c447c')
o(f'<path d="M1200 {cD - 26}L1130 {cS + 22}" stroke="#7ea6d8" stroke-width="2" stroke-dasharray="4 5"/>')

# avance: el director sale del bucle con una sola misión, y te orquesta a ti
tarjeta(1492, cD, 160, ['⑥ Una sola misión', 'el paso más estratégico'], 'ia', 13, actor='d', grosor=3)
flecha(1384, cD, 1410, cD, 'ia', ancho=3.5)
rotulo(1397, cD + 44, 'avanzar', '#2c2c2a', 'middle')
o(f'<line x1="1440" y1="{cD - 26}" x2="1440" y2="{cT + 30}" stroke="{COLOR["h"]}" stroke-width="5" stroke-linecap="round" marker-end="url(#m-h)"/>')
rotulo(1440, cS + 4, 'a ti: tu misión', COLOR['h'], 'middle')
# tu misión, resaltada
x0, y0 = 1404, cT - 25
o(f'<rect x="{x0 - 4}" y="{y0 - 4}" width="174" height="58" rx="13" fill="none" stroke="#9cc0f0" stroke-width="4" opacity="0.6"/>')
o(f'<rect x="{x0}" y="{y0}" width="166" height="50" rx="10" fill="{COLOR["h"]}" stroke="#1d4690" stroke-width="2"/>')
t(x0 + 83, y0 + 21, 'Cumples tu misión', 13, 800, '#fff')
t(x0 + 83, y0 + 38, 'y el proyecto avanza', 13, 400, '#fff')
insignia(x0 + 1, y0 + 1, 'h', 14)
o(f'<rect x="1420" y="{YT + 6}" width="150" height="20" rx="10" fill="{COLOR["verde"]}"/>')
t(1495, YT + 20, 'sale del bucle → avanza', 11, 800, '#fff')
# y el proyecto avanza hacia la meta
o(f'<line x1="1540" y1="{cT + 27}" x2="1540" y2="{cS - 24}" stroke="{COLOR["verde"]}" stroke-width="3.5" stroke-linecap="round" marker-end="url(#m-verde)"/>')
bandera(1505, cS - 18, COLOR['verde'], 1.15)
t(1514, cS + 64, 'la meta', 15, 800, COLOR['verde'], 'start')

resultado(1396, YM + 6, 'ok', 'Si nada cambia', ['misión a misión, revisando'])
resultado(1396, YM + 60, 'cambio', 'Si algo cambia', ['lo encauza sin perder rumbo'])

# lo que solo hace STL entre los métodos comparados: el guardrail también en la entrada, en lo que el desarrollador le pide al modelo
o(f'<rect x="232" y="{Y + 501}" width="1336" height="34" rx="17" fill="#b5862a"/>')
o(f'<path d="M262 {Y + 508}l3.2 6.6 7.2 1-5.2 5.1 1.2 7.2-6.4-3.4-6.4 3.4 1.2-7.2-5.2-5.1 7.2-1z" fill="#fff"/>')
t(282, Y + 523, 'Lo que solo hace STL: te orquesta también a ti. Lo que le pides al modelo pasa antes por el buzón y el director: un guardrail para ti, no solo para el modelo.', 14.5, 800, '#fff', 'start')

# separadores de columna
o('<g stroke="#cfcabd" stroke-width="1.2" stroke-dasharray="3 6">' + ''.join(f'<path d="M{a} 184V1228"/>' for a, _ in COL[1:]) + '</g>')

# cierre
o('<rect x="240" y="1288" width="1340" height="50" rx="14" fill="#f6e7b4" stroke="#ecdcae" stroke-width="1.5"/>')
t(910, 1320, 'Si nada cambia, SDD es el camino más directo. Cuando algo cambia, STL mantiene el rumbo.', 21, 800, '#6b4f00')
t(800, 1368, 'STL no reemplaza tu Scrum, tu SDD ni tu agente: les suma el Studio y el director. Comparación conceptual; los ahorros de STL se medirán con pruebas reales antes de prometer cifras.', 13, 400, '#73716a')
o('</svg>')

ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'grafico-comparativo.svg')
io.open(ruta, 'w', encoding='utf-8', newline='\n').write('\n'.join(partes) + '\n')
print('escrito', ruta)
