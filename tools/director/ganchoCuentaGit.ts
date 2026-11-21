// El gancho PreToolUse del director lanzado (notas de voz del titular nmvztz14gtit y nmvztzur8tit, 2 de noviembre de 2026):
// antes de cada orden que va a GitHub, compara la cuenta aprobada para el proyecto, que le pone el lanzador en
// STL_CUENTA_GIT, con el login que dice la API de GitHub para la sesión con que iría esa orden: la llave de la revisión
// (GH_TOKEN, que le pone el lanzador; pd_semaforo_gh) o, sin ella, la sesión activa. Si no es la aprobada, niega con su
// porqué. Nunca da un permiso: si la cuenta es la correcta, no dice nada y deciden las reglas de siempre. Lo registra el
// lanzador (estudio/servidor/revisor.ts › conGanchoDeCuenta) donde los ganchos de otros no corren con él.
//
// Sin llave, pero con la cuenta guardada en gh (STL_CUENTA_GIT_TURNOS=1), la revisión va por turnos: toma el turno de gh de
// este computador (un archivo en la carpeta temporal), deja activa su cuenta y sigue; si otra cuenta tiene el turno, espera
// hasta cinco minutos y, si sigue tomado, se salta solo ese paso (decisión nmwnofvsztit).
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ESPERA_TURNO_GH_MS, loginDeGitHub, ordenDeCambio, respuestaDelGancho, sesionesEnGh, tomarTurnoDeGh, type TurnoDeGh } from '../../src/director/cuentaGit.ts';

const ARCHIVO_TURNO = join(tmpdir(), 'stl-turno-gh.json');

function leerTurno(): TurnoDeGh | null {
  try {
    return JSON.parse(readFileSync(ARCHIVO_TURNO, 'utf8')) as TurnoDeGh;
  } catch {
    return null;
  }
}

/** Toma el turno de gh para `cuenta`, esperando hasta cinco minutos; con él, deja activa esa cuenta en gh. */
function turno(cuenta: string): 'tomado' | 'ocupado' {
  const hasta = Date.now() + ESPERA_TURNO_GH_MS;
  for (;;) {
    const r = tomarTurnoDeGh(leerTurno(), cuenta, Date.now());
    if (r.toma) {
      writeFileSync(ARCHIVO_TURNO, JSON.stringify(r.turno));
      const estado = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8', timeout: 20_000, windowsHide: true });
      const sesiones = sesionesEnGh(`${estado.stdout ?? ''}\n${estado.stderr ?? ''}`);
      const suya = sesiones.find((s) => s.nombre.toLowerCase() === cuenta.toLowerCase());
      const orden = suya && !suya.activa ? ordenDeCambio(suya.nombre, sesiones) : null;
      if (orden) spawnSync('gh', orden, { encoding: 'utf8', timeout: 20_000, windowsHide: true });
      return 'tomado';
    }
    if (Date.now() >= hasta) return 'ocupado';
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  }
}

async function principal(): Promise<void> {
  let entrada = '';
  for await (const trozo of process.stdin) entrada += trozo;
  const aprobada = process.env.STL_CUENTA_GIT;
  const llave = process.env.GH_TOKEN || undefined;
  const porTurnos = !llave && process.env.STL_CUENTA_GIT_TURNOS === '1' && aprobada ? () => turno(aprobada) : undefined;
  process.stdout.write(respuestaDelGancho(entrada, aprobada, () => loginDeGitHub(llave), porTurnos));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void principal();
