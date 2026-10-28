# Transcribe en local las notas de voz del Director asistente (faster-whisper, modelo large-v3-turbo, en español) y
# deja cada texto junto a su audio, con el mismo nombre y extensión .txt. Lo llaman el Studio y tools/director/bandeja.ts
# (src/director/transcripcion.ts: sin WSL, o dentro de WSL de respaldo; ver tools/entorno/instalar_transcripcion.sh).
# Nada sale del equipo.
# Uso: python transcribir.py [--pista "Notas para el director del proyecto X."] audio1.webm audio2.webm …
#      python transcribir.py --probar
import os
import sys
import glob

# En Windows, sin WSL, lo que se imprime a una tubería sale en la página de códigos del sistema, y el Studio lo lee en UTF-8
for _flujo in (sys.stdout, sys.stderr):
    if hasattr(_flujo, 'reconfigure'):
        _flujo.reconfigure(encoding='utf-8')


def preparar_cuda():
    """Las librerías de CUDA que instala pip (nvidia-cublas, nvidia-cudnn) no están en la ruta de búsqueda: se suman.
    En Windows sus DLL están en nvidia/*/bin y se buscan en el PATH; en Linux, en nvidia/*/lib, y se precargan."""
    import site
    if os.name == 'nt':
        carpetas = []
        for base in site.getsitepackages():
            carpetas += glob.glob(os.path.join(base, 'nvidia', '*', 'bin'))
            carpetas += glob.glob(os.path.join(base, 'Lib', 'site-packages', 'nvidia', '*', 'bin'))
        for c in carpetas:
            try:
                os.add_dll_directory(c)
            except OSError:
                pass
        if carpetas:
            os.environ['PATH'] = os.pathsep.join(carpetas + [os.environ.get('PATH', '')])
        return
    rutas = []
    for base in site.getsitepackages():
        rutas += glob.glob(os.path.join(base, 'nvidia', '*', 'lib'))
    if rutas:
        os.environ['LD_LIBRARY_PATH'] = ':'.join(rutas + [os.environ.get('LD_LIBRARY_PATH', '')])
        # ctranslate2 carga las librerías al importar: precargarlas con su ruta completa
        import ctypes
        for patron in ('libcublas.so.*', 'libcublasLt.so.*', 'libcudnn*.so.*'):
            for r in rutas:
                for archivo in sorted(glob.glob(os.path.join(r, patron))):
                    try:
                        ctypes.CDLL(archivo, mode=ctypes.RTLD_GLOBAL)
                    except OSError:
                        pass


def modelo():
    preparar_cuda()
    from faster_whisper import WhisperModel
    try:
        m = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')
        return m, 'cuda'
    except Exception as e:  # sin tarjeta gráfica o sin CUDA: en el procesador, más lento
        print(f'(sin GPU: {e}; transcribo en el procesador)', file=sys.stderr)
        return WhisperModel('large-v3-turbo', device='cpu', compute_type='int8'), 'cpu'


def main():
    args = sys.argv[1:]
    pista = 'Notas para el director de un proyecto.'
    if '--pista' in args:
        i = args.index('--pista')
        pista = args[i + 1] if i + 1 < len(args) else pista
        args = args[:i] + args[i + 2:]
    m, donde = modelo()
    if args == ['--probar']:
        import numpy as np
        segmentos, _ = m.transcribe(np.zeros(16000, dtype=np.float32), language='es')
        list(segmentos)
        print(f'Modelo listo ({donde}).')
        return
    for audio in args:
        # Sin apoyarse en lo que acaba de escribir para seguir: es lo que arma el bucle de una frase repetida al final
        # («¡Gracias!» 29 veces, el 26 de octubre de 2026). Lo que aun así repita, lo quita transcripcion.ts
        segmentos, info = m.transcribe(audio, language='es', vad_filter=True, beam_size=5, initial_prompt=pista,
                                       condition_on_previous_text=False)
        texto = ' '.join(s.text.strip() for s in segmentos).strip()
        # Si el filtro de voz lo quitó todo, no se intenta sin él: en el silencio el modelo inventa («Gracias por ver el
        # video»), y un texto inventado borraría el audio como si ya estuviera transcrito (pasó el 25 de octubre de 2026)
        salida = os.path.splitext(audio)[0] + '.txt'
        with open(salida, 'w', encoding='utf-8') as f:
            f.write(texto + '\n')
        print(f'{audio}: {round(info.duration)} s → {len(texto)} caracteres ({donde})')


if __name__ == '__main__':
    main()
