// Cambiar el correo de git de quien usa el Studio sin perder su lugar en el equipo de ningún proyecto. El Studio reconoce a
// cada persona por su correo de git: compara el `git config user.email` de esta carpeta con el correo de cada integrante del
// proyecto.json de cada proyecto (estudio/servidor/sincronizar.ts › leerIdentidad). Si el correo cambia solo en git, o solo en
// el equipo, quien lo cambió deja de ser reconocido. Esta herramienta cambia los dos, en este orden: primero el equipo de cada
// proyecto (un commit en su memoria, solo de proyecto.json, con el correo nuevo como autor y confirmador) y, al final, el
// correo de git de esta carpeta, solo en este clon (nunca con --global). No sube nada a la nube. Si se corta a la mitad, dice
// qué orden falta; volver a correrla salta lo que ya cambió.
// Uso: node tools/cambiar-correo.ts <correo nuevo>
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Integrante } from '../src/director/director.ts';
import { ARCHIVO_LOCAL, cambiarCorreoDelEquipo, correoValido, enDisco, escribirDeUnaVez, leerLocal, mismoCorreo, rutasDe, ubicar } from '../src/director/proyectos.ts';

// El Studio donde está este archivo. Solo las pruebas lo cambian, con STL_RAIZ (como las herramientas del director,
// tools/director/comun.ts), para correr la herramienta de verdad sobre un Studio temporal; en el uso normal no existe.
const raiz = process.env.STL_RAIZ ? resolve(process.env.STL_RAIZ) : join(import.meta.dirname, '..');
const USO = 'Uso: node tools/cambiar-correo.ts <correo nuevo>';

const ok = (t: string) => console.log(`  ✓ ${t}`);
const sinTocar = (t: string) => console.log(`  ○ ${t}`);
const falla = (t: string) => console.log(`  ✗ ${t}`);

/** Algo que se niega antes de cambiar nada. */
class Rechazo extends Error {}

interface Salida { ok: boolean; out: string; err: string }

// Una orden de git en la carpeta que se diga: sin pedir nada en la consola y en inglés, para reconocer sus errores
function git(cwd: string, args: string[], env: NodeJS.ProcessEnv = process.env): Salida {
  const r = spawnSync('git', args, { cwd, env: { ...env, GIT_TERMINAL_PROMPT: '0', LANG: 'C', LC_ALL: 'C' }, encoding: 'utf8', timeout: 60_000, windowsHide: true });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() || String(r.error ?? '') };
}
const ultimas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean).slice(-2).join(' ') || 'sin detalle';
const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/** Lo que se cambia en un proyecto: su proyecto.json, en la carpeta de su memoria (donde se hace el commit). */
interface Trabajo {
  id: string;
  archivo: string;
  memoria: string;
  /** El texto que tenía el archivo, para dejarlo como estaba si el commit falla. */
  antes: string;
  datos: Record<string, unknown>;
  /** El equipo con el correo ya cambiado. */
  equipo: Integrante[];
  nombres: string[];
}
type Paso = Trabajo | { id: string; omitido: string };

const cambia = (nombres: string[]) => `${nombres.join(' y ')} ${nombres.length > 1 ? 'cambian' : 'cambia'}`;
const mensajeDe = (t: Trabajo) => `Estudio (${t.id}): ${cambia(t.nombres)} su correo de git`;

function leerEquipo(id: string, archivo: string): { datos: Record<string, unknown>; texto: string; equipo: Integrante[] } {
  let texto: string;
  let datos: unknown;
  try {
    texto = readFileSync(archivo, 'utf8');
    datos = JSON.parse(texto);
  } catch (e) {
    throw new Rechazo(`No pude leer el proyecto.json de «${id}» (${archivo}): ${(e as Error).message}`);
  }
  const equipo = (datos as { equipo?: unknown } | null)?.equipo ?? [];
  if (!datos || typeof datos !== 'object' || Array.isArray(datos) || !Array.isArray(equipo) || !equipo.every((i) => typeof i?.correo === 'string')) {
    throw new Rechazo(`El proyecto.json de «${id}» (${archivo}) no trae su equipo como el Studio lo guarda (cada integrante con su correo).`);
  }
  return { datos: datos as Record<string, unknown>, texto, equipo };
}

// ¿Lo último que se guardó en el proyecto.json de esa memoria fue el cambio de esta herramienta, ya con el correo nuevo?
// Es lo que deja una corrida que se cortó a la mitad (o la de otro computador de la misma persona), y la distingue de
// alguien que de verdad tiene ese correo.
function esCambioAnterior(memoria: string, id: string, nuevo: string): boolean {
  const l = git(memoria, ['log', '-1', '--format=%ae%x09%s', '--', 'proyecto.json']);
  const [autor, asunto = ''] = l.out.split('\t');
  return l.ok && mismoCorreo(autor, nuevo) && new RegExp(`^Estudio \\(${id}\\): .+ cambian? su correo de git$`).test(asunto);
}

/** Por qué no se puede hacer un commit en esa memoria ahora (null: se puede). */
function noEstaLista(memoria: string): string | null {
  if (!existsSync(join(memoria, '.git'))) return 'no es un repositorio de git';
  if (!git(memoria, ['symbolic-ref', '-q', 'HEAD']).ok) return 'no está en una rama (HEAD suelto)';
  if (git(memoria, ['status', '--porcelain', '--', 'proyecto.json']).out) return 'su proyecto.json tiene cambios sin guardar en git: guárdalos o descártalos';
  return null;
}

// Todo lo que se comprueba antes de cambiar nada, para que lo que falle falle antes de empezar
async function revisar(nuevo: string) {
  if (process.argv.length > 3) throw new Rechazo(`Sobran argumentos.\n    ${USO}`);
  if (!nuevo) throw new Rechazo(`Falta el correo nuevo.\n    ${USO}`);
  if (!correoValido(nuevo)) throw new Rechazo(`«${nuevo}» no es un correo válido: tiene que ser algo@algo.algo, sin espacios.\n    ${USO}`);
  if (!git(raiz, ['--version']).ok) throw new Rechazo('No encuentro git en este computador, y el Studio lo necesita (ver INSTALAR.md).');
  const viejo = git(raiz, ['config', 'user.email']).out;
  if (!viejo) throw new Rechazo('Esta carpeta no tiene correo de git (git config user.email), así que no hay nada que cambiar.\n    Configúralo primero: git config user.email "tu@correo.com"');
  if (mismoCorreo(nuevo, viejo)) throw new Rechazo(`Tu correo de git ya es ${viejo}: no hay nada que cambiar.`);
  // Solo se cambia el de este clon: sin un git propio, el correo sale de la configuración general, y esa no se toca
  if (!existsSync(join(raiz, '.git'))) {
    throw new Rechazo(`La carpeta del Studio (${raiz}) no es un repositorio de git, así que su correo sale de tu configuración general de git y esta herramienta solo cambia el de un clon.\n    Haz git init en esa carpeta y vuelve a correr esto.`);
  }
  // Un estudio.local.json que no se entiende se lee como vacío: sin esto se cambiaría el correo de git sin tocar el equipo de
  // ningún proyecto, y el Studio dejaría de reconocer a la persona en todos
  const archivoLocal = join(raiz, ARCHIVO_LOCAL);
  if (existsSync(archivoLocal)) {
    try {
      JSON.parse(readFileSync(archivoLocal, 'utf8'));
    } catch (e) {
      throw new Rechazo(`${ARCHIVO_LOCAL} no se entiende (${(e as Error).message}): sin la lista de proyectos no sé qué equipos cambiar. Corrígelo (es JSON) y vuelve a correr esto.`);
    }
  }
  const pasos: Paso[] = [];
  for (const id of Object.keys((await leerLocal(raiz)).repositorios).sort()) {
    const ruta = rutasDe(id).proyecto;
    const u = ubicar(raiz, ruta);
    const archivo = enDisco(raiz, ruta);
    if (!u.memoria || !existsSync(archivo)) {
      pasos.push({ id, omitido: 'su memoria no está en este computador, así que no hay equipo que cambiar aquí' });
      continue;
    }
    const { datos, texto, equipo } = leerEquipo(id, archivo);
    const yo = equipo.filter((i) => mismoCorreo(i.correo, viejo));
    const otros = equipo.filter((i) => mismoCorreo(i.correo, nuevo));
    if (otros.length && !(yo.length === 0 && esCambioAnterior(u.cwd, id, nuevo))) {
      throw new Rechazo(`«${nuevo}» ya es el correo de ${otros.map((i) => i.nombre || i.id).join(' y ')} en el equipo de «${id}»: con él, el Studio te confundiría con esa persona. Elige otro correo.`);
    }
    if (otros.length) pasos.push({ id, omitido: `tu correo ya es ${nuevo} en su equipo (de un cambio anterior que se cortó): no se toca` });
    else if (!yo.length) pasos.push({ id, omitido: `no estás en su equipo con ${viejo}: no se toca` });
    else {
      const motivo = noEstaLista(u.cwd);
      if (motivo) throw new Rechazo(`La memoria de «${id}» (${u.cwd}) no está lista para guardar un cambio: ${motivo}.`);
      pasos.push({ id, archivo, memoria: u.cwd, antes: texto, datos, equipo: cambiarCorreoDelEquipo(equipo, viejo, nuevo).equipo, nombres: yo.map((i) => i.nombre?.trim() || i.id) });
    }
  }
  return {
    viejo,
    pasos,
    // Para identificar el commit (la misma persona que usa el Studio) y para decir si el cambio de git es solo de este clon
    nombreGit: git(raiz, ['config', 'user.name']).out,
    eraLocal: git(raiz, ['config', '--local', 'user.email']).ok,
  };
}

// El commit solo de proyecto.json, con el correo nuevo en autor y confirmador. Otra sesión puede tener tomado el índice de
// git un momento (el servidor del Studio guarda sus decisiones en las mismas memorias): se reintenta.
async function confirmar(t: Trabajo, nuevo: string, nombreGit: string): Promise<Salida> {
  const entorno = { ...process.env };
  for (const k of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL']) delete entorno[k]; // mandarían sobre -c
  const orden = ['-c', `user.email=${nuevo}`, ...(nombreGit ? ['-c', `user.name=${nombreGit}`] : []), 'commit', '-q', '-m', mensajeDe(t), '--', 'proyecto.json'];
  for (let intento = 0; ; intento++) {
    const s = git(t.memoria, orden, entorno);
    if (s.ok || !s.err.includes('index.lock') || intento >= 15) return s;
    await esperar(400);
  }
}

/** Cambia el equipo de un proyecto y guarda el cambio en su memoria. Devuelve por qué falló (sin dejarlo a medias), o null. */
async function aplicar(t: Trabajo, nuevo: string, nombreGit: string): Promise<string | null> {
  try {
    await escribirDeUnaVez(t.archivo, JSON.stringify({ ...t.datos, equipo: t.equipo }, null, 2) + '\n');
  } catch (e) {
    return `no se pudo escribir su proyecto.json (${(e as Error).message})`;
  }
  const c = await confirmar(t, nuevo, nombreGit);
  if (c.ok) return null;
  const motivo = `no se pudo guardar el cambio en su memoria (${ultimas(c.err)})`;
  try {
    await escribirDeUnaVez(t.archivo, t.antes);
    return `${motivo}; su proyecto.json quedó como estaba`;
  } catch {
    return `${motivo}, y no pude dejar su proyecto.json como estaba: en ${t.memoria}, corre git checkout -- proyecto.json`;
  }
}

async function principal(): Promise<number> {
  console.log('\nSTL Studio · cambiar tu correo de git\n');
  const nuevo = (process.argv[2] ?? '').trim();
  const previo = await revisar(nuevo).catch((e) => {
    if (!(e instanceof Rechazo)) throw e;
    console.error(`  ✗ ${e.message}\n\nNo cambié nada.\n`);
    return null;
  });
  if (!previo) return 1;
  const { viejo, pasos, nombreGit, eraLocal } = previo;
  console.log(`  Tu correo de git: ${viejo}  →  ${nuevo}\n`);

  // Primero el equipo de cada proyecto, uno por uno; el correo de git de esta carpeta, al final
  for (const p of pasos) {
    if ('omitido' in p) {
      sinTocar(`${p.id}: ${p.omitido}`);
      continue;
    }
    const fallo = await aplicar(p, nuevo, nombreGit);
    if (fallo) {
      falla(`${p.id}: ${fallo}`);
      console.error(`\nQuedó a medias: el correo de git de esta carpeta sigue siendo ${viejo}. Arregla lo que falló y corre otra vez la misma orden en la carpeta del Studio (salta lo que ya cambió):\n  node tools/cambiar-correo.ts ${nuevo}\n`);
      return 1;
    }
    ok(`${p.id}: ${cambia(p.nombres)} su correo en el equipo (un commit en su memoria, solo de proyecto.json)`);
  }
  const puesto = git(raiz, ['config', '--local', 'user.email', nuevo]);
  const ahora = git(raiz, ['config', 'user.email']).out;
  if (!puesto.ok || !mismoCorreo(ahora, nuevo)) {
    falla(`El correo de git de esta carpeta (${raiz}): ${puesto.ok ? `git sigue diciendo ${ahora || 'nada'}: otra configuración lo está cambiando (mira git config --show-origin user.email)` : ultimas(puesto.err)}`);
    console.error(`\nLos equipos ya tienen el correo nuevo y solo falta el de git. Corre esto:\n  cd "${raiz}"\n  git config user.email "${nuevo}"\n`);
    return 1;
  }
  ok(`El correo de git de esta carpeta (${raiz}): ${nuevo}`);
  if (!eraLocal) sinTocar('Tu configuración general de git no se tocó: el cambio vale solo en este clon.');
  console.log('\nListo. El Studio te reconoce con el correo nuevo en unos 15 segundos; no hace falta reiniciarlo.\n');
  return 0;
}

process.exitCode = await principal();
