#!/usr/bin/env bash
# Captura vistas de una página con Edge sin pantalla y WebGL por software. El ejecutable de Edge regresa al instante y
# el trabajo sigue aparte: se espera a que aparezca la imagen y luego se cierra ese Edge (por su perfil).
# Uso: capturar.sh <url_base> <carpeta> <ancho> <alto> <sufijo1> [<sufijo2> ...]   (sufijo: lo que va tras la url, p. ej. ?ver=2)
URL="$1"; DIR="$2"; W="$3"; H="$4"; shift 4
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
mkdir -p "$DIR"
for suf in "$@"; do
  nombre=$(echo "$suf" | tr -c 'a-zA-Z0-9' '_')
  salida="$DIR/${nombre}_${W}.png"
  rm -f "$salida"
  perfil="$(cygpath -w "$DIR")\\perfil_$nombre"
  "$EDGE" --headless=new --enable-unsafe-swiftshader --use-angle=swiftshader --no-first-run --user-data-dir="$perfil" \
    --hide-scrollbars --window-size="$W,$H" --virtual-time-budget=5000 --screenshot="$(cygpath -w "$salida")" "$URL$suf" >/dev/null 2>&1
  for i in $(seq 1 60); do [ -s "$salida" ] && break; sleep 1; done
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { \$_.CommandLine -like '*perfil_$nombre*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
  [ -s "$salida" ] && echo "ok  $salida" || echo "sin $salida"
done
