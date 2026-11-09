# Transcribe en local las notas de voz del Director asistente (faster-whisper, modelo large-v3-turbo, en el idioma en que
# se dictó: lo detecta solo, sin forzar el español, nota nmw6p6l8qtit del 7 de noviembre de 2026) y
# deja cada texto junto a su audio, con el mismo nombre y extensión .txt. Lo llaman el Studio y tools/director/bandeja.ts
# (src/director/transcripcion.ts: con el Python de ~/director/.venv, sin WSL; ver tools/entorno/instalar_transcripcion.sh).
# Nada sale del equipo.
# Uso: python transcribir.py [--pista "Notas para el director del proyecto X."] audio1.webm audio2.webm …
#      python transcribir.py --probar
import os
import sys

# En Windows, sin WSL, lo que se imprime a una tubería sale en la página de códigos del sistema, y el Studio lo lee en UTF-8
for _flujo in (sys.stdout, sys.stderr):
    if hasattr(_flujo, 'reconfigure'):
        _flujo.reconfigure(encoding='utf-8')


def modelo():
    """Siempre en el procesador, en cualquier computador (regla una_instalacion): así el Studio no depende del hardware."""
    from faster_whisper import WhisperModel
    return WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')


# La pista que manda el Studio está en español: solo se usa si el audio también lo está; en otro idioma empujaría al
# modelo a escribir en español lo que se dijo en inglés
IDIOMA_DE_LA_PISTA = 'es'


def idioma_del_audio(m, sonido):
    """El idioma que el modelo detecta en el audio ya decodificado (los primeros 30 s), o None si no lo sabe."""
    try:
        idioma, _, _ = m.detect_language(sonido)
        return idioma
    except Exception:
        return None


def main():
    args = sys.argv[1:]
    pista = 'Notas para el director de un proyecto.'
    if '--pista' in args:
        i = args.index('--pista')
        pista = args[i + 1] if i + 1 < len(args) else pista
        args = args[:i] + args[i + 2:]
    m = modelo()
    if args == ['--probar']:
        import numpy as np
        segmentos, _ = m.transcribe(np.zeros(16000, dtype=np.float32), language=None)
        list(segmentos)
        print('Modelo listo (cpu).')
        return
    fallaron = 0
    for audio in args:
        # Sin apoyarse en lo que acaba de escribir para seguir: es lo que arma el bucle de una frase repetida al final
        # («¡Gracias!» 29 veces, el 26 de octubre de 2026). Lo que aun así repita, lo quita transcripcion.ts
        # Un audio que falla no tumba a los demás del lote: se dice cuál y por qué, y el Studio lo vuelve a intentar
        # (nota de voz del titular nmw159ihdtit, 3 de noviembre de 2026)
        try:
            from faster_whisper import decode_audio
            sonido = decode_audio(audio, sampling_rate=16000)
            idioma = idioma_del_audio(m, sonido)
            segmentos, info = m.transcribe(sonido, language=idioma, vad_filter=True, beam_size=5,
                                           initial_prompt=pista if idioma == IDIOMA_DE_LA_PISTA else None,
                                           condition_on_previous_text=False)
            texto = ' '.join(s.text.strip() for s in segmentos).strip()
        except Exception as e:  # un audio dañado o a medio escribir
            fallaron += 1
            print(f'{audio}: no se pudo transcribir ({type(e).__name__}: {e})', file=sys.stderr)
            continue
        # Si el filtro de voz lo quitó todo, no se intenta sin él: en el silencio el modelo inventa («Gracias por ver el
        # video»), y un texto inventado borraría el audio como si ya estuviera transcrito (pasó el 25 de octubre de 2026)
        salida = os.path.splitext(audio)[0] + '.txt'
        with open(salida, 'w', encoding='utf-8') as f:
            f.write(texto + '\n')
        print(f'{audio}: {round(info.duration)} s → {len(texto)} caracteres (cpu)')
    if fallaron:
        sys.exit(1)


if __name__ == '__main__':
    main()
