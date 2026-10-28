#!/usr/bin/env bash
# Instala las voces de Kokoro, las únicas del Studio para la niebla de lectura, en el mismo ~/director/.venv que usa la
# transcripción, y baja su modelo a ~/director/voces. Al leer no sale nada del equipo: corren sin internet. Sin WSL
# (propuesta aceptada pr_voz_sin_wsl), desde la carpeta del Estudio, en cualquier sistema:
#   bash tools/entorno/instalar_voces.sh
# En Windows, en Git Bash. El Studio ya no usa WSL para nada (nota de voz del titular nmvs7si3qtit, 28 de octubre de 2026).
# Baja Kokoro (kokoro-onnx, MIT), con el modelo de todas sus voces (las de partida son Santa y Heart): unos 350 MB, una
# sola vez (decisión del titular, 26 de octubre de 2026, nota de voz nmvpdu9zqtit: Kokoro es el único motor del Studio).
# Lo que ya está no se vuelve a bajar, y se puede correr otra vez si algo se corta. Con sus archivos en ~/director/voces,
# el Studio lee con ellas sin WSL (src/director/transcripcion.ts › pythonDelDirector).
# El venv lo crea uv, y uv no le pone pip: los paquetes se instalan con `uv pip`, nunca con `python -m pip` (el 26 de
# octubre de 2026 la orden de una misión falló así, «No module named pip»). Las versiones de la transcripción quedan
# fijas (-c), para que las voces nunca la rompan. Para quitarlas, basta borrar ~/director/voces.
set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
export PATH="$HOME/.local/bin:$PATH"
KOKORO_URL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*) WINDOWS=1 ;;
  *) WINDOWS= ;;
esac

if ! command -v uv >/dev/null; then
  echo '== Instalando uv (gestor de Python de Astral)'
  if [ -n "$WINDOWS" ]; then
    powershell -NoProfile -ExecutionPolicy ByPass -Command "irm https://astral.sh/uv/install.ps1 | iex"
  else
    curl -LsSf https://astral.sh/uv/install.sh | sh
  fi
fi

mkdir -p "$HOME/director/voces"
cd "$HOME/director"
[ -d .venv ] || uv venv --python 3.12 .venv
if [ -n "$WINDOWS" ]; then PY=.venv/Scripts/python.exe; else PY=.venv/bin/python; fi
echo '== Kokoro (kokoro-onnx, MIT)'
uv pip install --python "$PY" -c "$AQUI/transcripcion_requisitos.txt" kokoro-onnx

cd voces
echo '== El modelo de Kokoro y sus voces (unos 340 MB)'
for archivo in kokoro-v1.0.onnx voices-v1.0.bin; do
  if [ ! -s "$archivo" ]; then
    curl -fL --retry 3 -o "$archivo.parcial" "$KOKORO_URL/$archivo"
    mv "$archivo.parcial" "$archivo"
  fi
done

echo '== Lo que quedó en ~/director/voces'
ls -la
echo '== Las voces que verá el Studio'
"../$PY" "$AQUI/../director/voz.py" --lista --dir .
echo 'Listo: recarga el Studio y elígelas en «Sonidos», en «Voz de la niebla».'
