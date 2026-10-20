# Genera la voz del video explicativo con la API de voz de Gemini: lee un guion de texto y escribe un .wav (24 kHz, mono).
# La clave, el modelo y la voz salen del .env de la carpeta del Studio (GEMINI_API_KEY, GEMINI_TTS_MODELO, GEMINI_TTS_VOZ),
# que git ignora. Cada audio gasta la API: sin --confirmo solo dice qué mandaría, sin llamarla.
# Uso: python docs/difusion/generar-voz.py <guion.txt> <salida.wav> [--confirmo]
import base64
import json
import os
import sys
import urllib.error
import urllib.request
import wave

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def leer_env(ruta):
    # las líneas CLAVE=valor del .env, sin los comentarios
    valores = {}
    if not os.path.exists(ruta):
        return valores
    with open(ruta, encoding='utf-8') as f:
        for linea in f:
            linea = linea.strip()
            if linea and not linea.startswith('#') and '=' in linea:
                clave, valor = linea.split('=', 1)
                valores[clave.strip()] = valor.strip().strip('"').strip("'")
    return valores

args = [a for a in sys.argv[1:] if not a.startswith('--')]
if len(args) != 2:
    sys.exit('Uso: python docs/difusion/generar-voz.py <guion.txt> <salida.wav> [--confirmo]')
guion, salida = args
env = {**leer_env(os.path.join(RAIZ, '.env')), **os.environ}
clave = env.get('GEMINI_API_KEY', '')
modelo = env.get('GEMINI_TTS_MODELO', 'gemini-2.5-flash-preview-tts')
voz = env.get('GEMINI_TTS_VOZ', 'Kore')
if not clave:
    sys.exit('Falta GEMINI_API_KEY en el .env de la carpeta del Studio.')
with open(guion, encoding='utf-8') as f:
    texto = f.read().strip()
if not texto:
    sys.exit(f'El guion {guion} está vacío.')

print(f'Modelo: {modelo} · voz: {voz} · {len(texto)} caracteres → {salida}')
if '--confirmo' not in sys.argv:
    print('No llamé a la API (cada audio la gasta). Para generarlo, repite la orden con --confirmo.')
    sys.exit(0)

cuerpo = {
    'contents': [{'parts': [{'text': texto}]}],
    'generationConfig': {
        'responseModalities': ['AUDIO'],
        'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voz}}},
    },
}
pedido = urllib.request.Request(
    f'https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent',
    data=json.dumps(cuerpo).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'x-goog-api-key': clave},
)
try:
    with urllib.request.urlopen(pedido, timeout=300) as r:
        respuesta = json.load(r)
except urllib.error.HTTPError as e:
    sys.exit(f'La API respondió {e.code}: {e.read().decode("utf-8", "replace")[:600]}')

try:
    pcm = base64.b64decode(respuesta['candidates'][0]['content']['parts'][0]['inlineData']['data'])
except (KeyError, IndexError):
    sys.exit(f'La API no devolvió audio: {json.dumps(respuesta)[:600]}')
with wave.open(salida, 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(24000)
    w.writeframes(pcm)
print(f'Listo: {salida} ({len(pcm) / 48000:.1f} s).')
