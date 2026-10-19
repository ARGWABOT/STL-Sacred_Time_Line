# Transcribe en local las notas de voz del Director asistente (faster-whisper, modelo large-v3-turbo, en español) y
# deja cada texto junto a su audio, con el mismo nombre y extensión .txt. Lo llama tools/director/bandeja.ts (en
# Windows, dentro de WSL; ver tools/entorno/instalar_transcripcion.sh). Nada sale del equipo.
# Uso: python transcribir.py [--pista "Notas para el director del proyecto X."] audio1.webm audio2.webm …
#      python transcribir.py --probar
import os
import sys
import glob


def preparar_cuda():
    """Las librerías de CUDA que instala pip (nvidia-cublas, nvidia-cudnn) no están en la ruta de búsqueda: se suman."""
    import site
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
        segmentos, info = m.transcribe(audio, language='es', vad_filter=True, beam_size=5, initial_prompt=pista)
        texto = ' '.join(s.text.strip() for s in segmentos).strip()
        salida = os.path.splitext(audio)[0] + '.txt'
        with open(salida, 'w', encoding='utf-8') as f:
            f.write(texto + '\n')
        print(f'{audio}: {round(info.duration)} s → {len(texto)} caracteres ({donde})')


if __name__ == '__main__':
    main()
