#!/usr/bin/env python3
"""Las voces de Kokoro, locales y sin internet: las únicas del Studio para la niebla de lectura.

  voz.py --lista [--dir <carpeta>]      imprime en JSON las voces instaladas: {"voces": [...], "avisos": [...]}
  voz.py --voz <id> [--pausas] [--dir <carpeta>]   lee el texto de la entrada estándar y escribe un WAV en la salida
                                        estándar; con --pausas, calla un momento en cada coma, punto y signo
  voz.py --servidor [--dir <carpeta>]   se queda abierto, con el modelo cargado: un pedido JSON por línea (ver servir)

Kokoro (kokoro-onnx, Apache-2.0) es el único motor, y sus voces las oficiales del Studio (decisión del titular, 26 de
octubre de 2026, nota de voz nmvpdu9zqtit: se descartaron todas las demás). Se instala aparte, con
tools/entorno/instalar_voces.sh, en el mismo ~/director/.venv que usa la transcripción; el Studio solo lo corre como un
proceso separado. Necesita kokoro-v1.0.onnx + voices-v1.0.bin en la carpeta de voces. Id de cada voz: kokoro:<voz>.

La carpeta de voces es ~/director/voces (--dir la cambia). Lo que falta (el paquete, el modelo) no es un error: la lista
sale vacía y dice por qué en «avisos». Nada sale del equipo.
"""
import argparse
import io
import json
import os
import sys
import wave

# En Windows, sin WSL, lo que se imprime a una tubería sale en la página de códigos del sistema, y el Studio lo lee en
# UTF-8. Solo la capa de texto: el WAV va por sys.stdout.buffer, tal cual
for _flujo in (sys.stdout, sys.stderr):
    if hasattr(_flujo, "reconfigure"):
        _flujo.reconfigure(encoding="utf-8")

KOKORO_MODELO = "kokoro-v1.0.onnx"
KOKORO_VOCES = "voices-v1.0.bin"
# Las voces de Kokoro que el Studio ofrece: id -> (nombre, idioma, lang de Kokoro). El español de Kokoro es de menor grado.
# Tres por idioma, una femenina, una masculina y una neutra, la de por defecto (src/director/voz.ts › VOCES_DEL_STUDIO).
KOKORO_OFRECIDAS = {
    "ef_dora": ("Dora", "es", "es"),
    "em_alex": ("Alex", "es", "es"),
    "em_santa": ("Santa", "es", "es"),
    "af_sarah": ("Sarah", "en", "en-us"),
    "am_adam": ("Adam", "en", "en-us"),
    "bm_george": ("George", "en", "en-gb"),
}


def carpeta_de_voces(args):
    return os.path.expanduser(args.dir or os.path.join("~", "director", "voces"))


def kokoro_disponible(carpeta):
    """El módulo de Kokoro y sus dos archivos de modelo: si falta algo, devuelve None y por qué."""
    modelo = os.path.join(carpeta, KOKORO_MODELO)
    voces = os.path.join(carpeta, KOKORO_VOCES)
    if not (os.path.isfile(modelo) and os.path.isfile(voces)):
        return None, "Kokoro: faltan los archivos del modelo en la carpeta de voces."
    try:
        import kokoro_onnx  # noqa: F401
    except Exception:
        return None, "Kokoro: el paquete kokoro-onnx no está instalado."
    return (modelo, voces), None


def listar(args):
    carpeta = carpeta_de_voces(args)
    voces, avisos = [], []
    archivos, motivo = kokoro_disponible(carpeta)
    if archivos:
        try:
            from kokoro_onnx import Kokoro

            hay = set(Kokoro(*archivos).get_voices())
        except Exception:
            hay, motivo = set(), "Kokoro: no se pudo abrir el modelo."
        for vid, (legible, idioma, _lang) in KOKORO_OFRECIDAS.items():
            if vid in hay:
                voces.append({"id": f"kokoro:{vid}", "nombre": f"{legible} (Kokoro)", "idioma": idioma})
    if motivo:
        avisos.append(motivo)
    print(json.dumps({"voces": voces, "avisos": avisos}, ensure_ascii=False))
    return 0


# El modelo ya abierto: en el modo de servicio (--servidor) se carga una sola vez, no en cada bloque
_KOKORO = {}


# Las pausas de la puntuación (nota de voz del titular nmw27xhb6tit, 4 de noviembre de 2026): Kokoro, en español, lee
# seguido lo que va entre comas («El modelo hace mil cosas a la vez, tú no» sonaba de corrido). Con --pausas, el texto se
# corta después de cada signo y cada trozo se dice aparte, con un silencio que depende del signo, como lo haría un
# narrador: corto en la coma, mayor en el punto y coma y los dos puntos, y el más largo al cerrar una frase
PAUSAS = {",": 0.22, ";": 0.32, ":": 0.32, ".": 0.48, "?": 0.48, "!": 0.48, "…": 0.48}


def se_dice(texto):
    """¿Hay algo que Kokoro pueda decir? Una letra o una cifra, de cualquier idioma (src/director/voz.ts › SE_DICE)."""
    return any(c.isalnum() for c in texto)


def trozos_con_pausa(texto):
    """[(trozo, segundos de silencio después)]: corta después de cada signo seguido de un espacio (así «3.400» o «a.m.»
    pegados no se cortan); las comillas o paréntesis que cierran van con su trozo. El último, sin silencio."""
    import re

    trozos = []
    for parte in re.split(r"(?<=[,;:.?!…])[»”\"')]*\s+", texto.strip()):
        parte = parte.strip()
        if parte:
            trozos.append([parte, PAUSAS.get(parte.rstrip("»”\"')")[-1:], 0.0)])
    if trozos:
        trozos[-1][1] = 0.0
    return [tuple(t) for t in trozos]


def wav_de_kokoro(carpeta, voz, texto, pausas=False):
    archivos, motivo = kokoro_disponible(carpeta)
    if not archivos:
        raise SystemExit(motivo)
    if voz not in KOKORO_OFRECIDAS:
        raise SystemExit(f"La voz de Kokoro «{voz}» no es una de las que ofrece el Studio.")
    modelo = _KOKORO.get(archivos)
    if modelo is None:
        from kokoro_onnx import Kokoro

        modelo = _KOKORO[archivos] = Kokoro(*archivos)
    import numpy as np

    lang = KOKORO_OFRECIDAS[voz][2]
    if pausas:
        partes, frecuencia, fallo = [], 24000, None
        for trozo, silencio in trozos_con_pausa(texto):
            # Un trozo sin letras ni cifras (un «» suelto, unas comillas, unos símbolos) no se le pide a Kokoro: falla con
            # «produced no phonemes» y apagaba la voz entera (nota de voz del titular nmw4f8wietit, 6 de noviembre de 2026);
            # se deja solo su silencio
            if se_dice(trozo):
                try:
                    m, frecuencia = modelo.create(trozo, voice=voz, speed=1.0, lang=lang)
                    partes.append(np.asarray(m, dtype=np.float32))
                except Exception as e:  # noqa: BLE001 — un trozo que falla se salta; la voz sigue con los demás
                    fallo = e
                    continue
            if silencio:
                partes.append(np.zeros(int(silencio * frecuencia), dtype=np.float32))
        if fallo is not None and not any(p.any() for p in partes):
            raise fallo
        muestras = np.concatenate(partes) if partes else np.zeros(int(0.1 * frecuencia), dtype=np.float32)
    elif se_dice(texto):
        muestras, frecuencia = modelo.create(texto, voice=voz, speed=1.0, lang=lang)
    else:
        muestras, frecuencia = np.zeros(2400, dtype=np.float32), 24000

    pcm = (np.clip(muestras, -1.0, 1.0) * 32767).astype("<i2")
    salida = io.BytesIO()
    with wave.open(salida, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(int(frecuencia))
        wav.writeframes(pcm.tobytes())
    return salida.getvalue()


def wav_de(carpeta, voz, texto, pausas=False):
    if not texto:
        raise SystemExit("No hay texto que leer.")
    motor, _, nombre = (voz or "").partition(":")
    if motor == "kokoro":
        return wav_de_kokoro(carpeta, nombre, texto, pausas)
    raise SystemExit("Falta --voz kokoro:<voz>.")


def sintetizar(args):
    texto = sys.stdin.buffer.read().decode("utf-8", errors="replace").strip()
    datos = wav_de(carpeta_de_voces(args), args.voz, texto, args.pausas)
    sys.stdout.buffer.write(datos)
    sys.stdout.buffer.flush()
    return 0


def servir(args):
    """El modo de servicio: se queda abierto, con los modelos cargados una sola vez (nota de voz del titular nmvot5hg8tit,
    26 de octubre de 2026: la pausa de cada bloque era sobre todo arrancar Python y cargar el modelo otra vez). Un pedido
    por línea en la entrada, {"voz", "texto"}; por cada uno, una línea JSON en la salida, {"ok": true, "bytes": N} seguida
    de los N bytes del WAV, o {"ok": false, "error": "…"}. Lo que los motores impriman va a la salida de errores, para
    no mezclarse con el audio. Con --pausas, cada pedido calla en la puntuación como el narrador (trozos_con_pausa):
    así lee el Studio en voz alta (lo eligió el titular en t_decide_pausas_studio, nmw2csik4tit); un pedido con
    "pausas": false lo lee de corrido."""
    carpeta = carpeta_de_voces(args)
    salida = os.fdopen(os.dup(1), "wb")
    os.dup2(2, 1)
    sys.stdout = sys.stderr
    for linea in sys.stdin.buffer:
        if not linea.strip():
            continue
        try:
            pedido = json.loads(linea.decode("utf-8", errors="replace"))
            pausas = bool(pedido.get("pausas", args.pausas))
            datos = wav_de(carpeta, str(pedido.get("voz") or ""), str(pedido.get("texto") or "").strip(), pausas)
            salida.write(json.dumps({"ok": True, "bytes": len(datos)}).encode("utf-8") + b"\n" + datos)
        except SystemExit as e:
            salida.write(json.dumps({"ok": False, "error": str(e.code if e.code is not None else e)}, ensure_ascii=False).encode("utf-8") + b"\n")
        except Exception as e:  # noqa: BLE001 — un bloque que falla no tumba la voz de los demás
            salida.write(json.dumps({"ok": False, "error": f"La voz de Kokoro falló: {e}"[:300]}, ensure_ascii=False).encode("utf-8") + b"\n")
        salida.flush()
    return 0


def main():
    p = argparse.ArgumentParser(description="Las voces de Kokoro, locales")
    p.add_argument("--lista", action="store_true", help="imprime las voces instaladas en JSON")
    p.add_argument("--voz", help="id de la voz: kokoro:<voz>")
    p.add_argument("--pausas", action="store_true", help="con --voz o --servidor: una pausa en cada coma, punto y signo, como un narrador")
    p.add_argument("--servidor", action="store_true", help="se queda abierto: un pedido JSON por línea, un WAV por respuesta")
    p.add_argument("--dir", help="carpeta de las voces (por defecto ~/director/voces)")
    args = p.parse_args()
    if args.lista:
        return listar(args)
    return servir(args) if args.servidor else sintetizar(args)


if __name__ == "__main__":
    sys.exit(main())
