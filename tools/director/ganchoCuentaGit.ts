// El gancho PreToolUse del director lanzado (notas de voz del titular nmvztz14gtit y nmvztzur8tit, 2 de noviembre de 2026):
// antes de cada orden que va a GitHub, compara la cuenta aprobada para el proyecto, que le pone el lanzador en
// STL_CUENTA_GIT, con el login que dice la API de GitHub para la sesión con que iría esa orden. Si no es la aprobada, niega
// con su porqué. Nunca da un permiso: si la cuenta es la correcta, no dice nada y deciden las reglas de siempre. Lo registra
// el lanzador (estudio/servidor/revisor.ts › conGanchoDeCuenta) donde los ganchos de otros no corren con él.
import { pathToFileURL } from 'node:url';
import { loginDeGitHub, respuestaDelGancho } from '../../src/director/cuentaGit.ts';

async function principal(): Promise<void> {
  let entrada = '';
  for await (const trozo of process.stdin) entrada += trozo;
  process.stdout.write(respuestaDelGancho(entrada, process.env.STL_CUENTA_GIT, () => loginDeGitHub()));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void principal();
