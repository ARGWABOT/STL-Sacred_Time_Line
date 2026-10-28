#!/usr/bin/env bash
# Instala la transcripción local de las notas de voz del Director asistente (faster-whisper con el modelo
# large-v3-turbo, en la tarjeta gráfica NVIDIA si la hay; si no, en el procesador, con el mismo modelo). Nada sale del
# equipo: el audio se transcribe aquí. Sin WSL (propuesta aceptada «La voz sin WSL, también en Mac», pr_voz_sin_wsl),
# desde la carpeta del Estudio, en cualquier sistema:
#   bash tools/entorno/instalar_transcripcion.sh
# En Windows, en Git Bash (es la terminal que abre el Studio con «Abrir la terminal con esta orden»). La forma de antes,
# dentro de WSL, sigue sirviendo de respaldo: wsl -d Ubuntu -- bash tools/entorno/instalar_transcripcion.sh
# Si falta uv (el gestor de Python de Astral, gratuito, unos 40 MB), lo instala, y uv baja su propio Python si falta.
# Deja ~/director/.venv (unos 300 MB; con las librerías de CUDA, unos 2 GB) y el modelo en la caché de Hugging Face
# (unos 1,6 GB). Cuando su prueba transcribe, deja la marca `transcripcion-lista` en el venv: desde ahí el Studio
# transcribe con él, sin WSL (src/director/transcripcion.ts › pythonDelDirector). Solo hace falta en el computador de
# quien corre la sesión del director. Si ya existe, se reutiliza, y se puede correr otra vez si algo se corta. Para
# otra ruta, DIRECTOR_PYTHON=<python del venv> al correr tools/director/bandeja.ts.
set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
export PATH="$HOME/.local/bin:$PATH"
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

mkdir -p "$HOME/director"
cd "$HOME/director"
[ -d .venv ] || uv venv --python 3.12 .venv
if [ -n "$WINDOWS" ]; then PY=.venv/Scripts/python.exe; else PY=.venv/bin/python; fi
# Mientras se instala, el Studio sigue con lo de antes: la marca vuelve solo si la prueba transcribe
rm -f .venv/transcripcion-lista
echo '== faster-whisper'
uv pip install --python "$PY" -r "$AQUI/transcripcion_requisitos.txt"
if command -v nvidia-smi >/dev/null && nvidia-smi >/dev/null 2>&1; then
  echo '== Las librerías de CUDA 12 para la tarjeta gráfica NVIDIA (cuBLAS y cuDNN 9)'
  uv pip install --python "$PY" -r "$AQUI/transcripcion_gpu.txt"
else
  echo '== Sin tarjeta gráfica NVIDIA: transcribe en el procesador (una nota tarda más o menos lo que dura)'
fi

echo '== Bajando el modelo large-v3-turbo (unos 1,6 GB) con una prueba en silencio'
"$PY" "$AQUI/../director/transcribir.py" --probar
touch .venv/transcripcion-lista

echo 'Listo: la transcripción del Director asistente está en ~/director, y el Studio ya transcribe con ella.'
