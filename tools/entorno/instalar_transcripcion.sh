#!/usr/bin/env bash
# Instala la transcripción local de las notas de voz del Director asistente (faster-whisper con el modelo
# large-v3-turbo, en la tarjeta gráfica si se puede). Nada sale del equipo: el audio se transcribe aquí. En Windows se
# corre dentro de WSL2 (Ubuntu), desde la carpeta del Estudio:
#   wsl -d Ubuntu -- bash tools/entorno/instalar_transcripcion.sh
# En Linux o macOS, directamente: bash tools/entorno/instalar_transcripcion.sh
# Deja ~/director/.venv (~2 GB con las librerías de CUDA) y el modelo en la caché de Hugging Face (~1,6 GB). Solo hace
# falta en el computador de quien corre la sesión del director. Si ya existe (de otro Estudio), se reutiliza. Para
# otra ruta, DIRECTOR_PYTHON=<python del venv> al correr tools/director/bandeja.ts.
set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
export PATH="$HOME/.local/bin:$PATH"

if ! command -v uv >/dev/null; then
  echo '== Instalando uv (gestor de Python de Astral)'
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

mkdir -p "$HOME/director"
cd "$HOME/director"
[ -d .venv ] || uv venv --python 3.12 .venv
echo '== faster-whisper y las librerías de CUDA 12 (cuBLAS y cuDNN 9)'
uv pip install --python .venv/bin/python -r "$AQUI/transcripcion_requisitos.txt"

echo '== Bajando el modelo large-v3-turbo (~1,6 GB) con una prueba en silencio'
.venv/bin/python "$AQUI/../director/transcribir.py" --probar

echo 'Listo: la transcripción del Director asistente está en ~/director.'
