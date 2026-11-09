// Las skills de un proyecto no le dan permisos al director (propuesta aceptada pr_skills_cierre, ajustada a la nota de voz
// del titular del 23 de octubre de 2026). Cuando el Studio lanza al director con la carpeta de un proyecto (--add-dir),
// Claude Code carga sus skills (.claude/skills) y sus comandos (.claude/commands), y una skill puede aprobar herramientas
// sin preguntar: una ajena ampliaría lo que el titular autorizó. Por eso el lanzador apaga (skillOverrides en «off») cada
// skill del proyecto que no esté autorizada en este computador, atada a la huella de sus archivos: si cambia un archivo,
// cambia la huella y se vuelve a pedir el permiso. El permiso vive en estudio.local.json › permisos.skills (Local), que el
// director no puede escribir. Los hooks del proyecto ya no corren (arranqueLimpio › disableAllHooks).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { SkillAutorizada } from '../../src/director/proyectos.ts';
import { leerCarpeta, nombreDeLaSkill } from './ajustesClaude.ts';

/** Una skill o un comando del repositorio de un proyecto: su nombre, dónde está (relativo al repositorio) y su huella. */
export interface SkillDelProyecto {
  nombre: string;
  ruta: string;
  huella: string;
}

/** Los archivos de una carpeta, con todo lo que tiene adentro, relativos a ella y en orden. Lo que no se puede leer no cuenta. */
function archivosDe(carpeta: string, dentro = ''): string[] {
  const salida: string[] = [];
  for (const x of leerCarpeta(join(carpeta, dentro)).sort()) {
    const rel = dentro ? `${dentro}/${x}` : x;
    try {
      if (statSync(join(carpeta, rel)).isDirectory()) salida.push(...archivosDe(carpeta, rel));
      else salida.push(rel);
    } catch {
      // sin leerlo, no entra en la huella
    }
  }
  return salida;
}

/**
 * La huella de unos archivos: el sha256 de cada ruta con su contenido, en orden, cortado a 16 caracteres. Cambia si cambia,
 * se agrega o se quita cualquier archivo; no cambia por la hora ni por el orden en que se leen.
 */
export function huellaDe(base: string, archivos: readonly string[]): string {
  const h = createHash('sha256');
  for (const a of [...archivos].sort()) {
    h.update(`${a}\0`);
    try {
      h.update(readFileSync(join(base, a)));
    } catch {
      h.update('\0sin leer');
    }
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

/**
 * Las skills y los comandos que Claude Code cargaría de un repositorio: cada `.claude/skills/<carpeta>/SKILL.md` (con todo
 * lo que trae su carpeta en la huella: un script también es parte de la skill) y cada `.claude/commands/<nombre>.md`. En
 * orden de nombre.
 */
export function skillsDelProyecto(repositorio: string): SkillDelProyecto[] {
  const salida: SkillDelProyecto[] = [];
  const skills = join(repositorio, '.claude', 'skills');
  if (existsSync(skills)) {
    for (const d of leerCarpeta(skills)) {
      const carpeta = join(skills, d);
      const archivo = join(carpeta, 'SKILL.md');
      if (!existsSync(archivo)) continue;
      salida.push({ nombre: nombreDeLaSkill(archivo, d), ruta: relative(repositorio, carpeta).replace(/\\/g, '/'), huella: huellaDe(carpeta, archivosDe(carpeta)) });
    }
  }
  const comandos = join(repositorio, '.claude', 'commands');
  if (existsSync(comandos)) {
    for (const f of leerCarpeta(comandos)) {
      if (!f.endsWith('.md')) continue;
      salida.push({ nombre: f.slice(0, -3), ruta: `.claude/commands/${f}`, huella: huellaDe(comandos, [f]) });
    }
  }
  return salida.sort((a, b) => a.nombre.localeCompare(b.nombre, 'en') || a.ruta.localeCompare(b.ruta, 'en'));
}

/** Si una skill del proyecto está autorizada en este computador: la misma, en el mismo proyecto y con la misma huella. Pura. */
const estaAutorizada = (s: SkillDelProyecto, proyecto: string, autorizadas: readonly SkillAutorizada[] | undefined) =>
  !!autorizadas?.some((a) => a.proyecto === proyecto && a.nombre === s.nombre && a.ruta === s.ruta && a.huella === s.huella);

/**
 * Los nombres de las skills del proyecto que el director no carga: las que no están autorizadas con su huella de hoy. Si
 * dos comparten nombre y una no está autorizada, se apaga el nombre (apagar es lo cuidadoso). El repositorio del mismo
 * Studio no tiene skills de un proyecto: las suyas son parte del Studio, como su código. Pura, salvo leer las carpetas.
 */
export function skillsApagadas(repositorio: string, estudio: string, proyecto: string, autorizadas: readonly SkillAutorizada[] | undefined): string[] {
  if (resolve(repositorio).toLowerCase() === resolve(estudio).toLowerCase()) return [];
  return [...new Set(skillsDelProyecto(repositorio).filter((s) => !estaAutorizada(s, proyecto, autorizadas)).map((s) => s.nombre))].sort();
}

/**
 * Lo que el código ve en una skill antes de autorizarla (pr_skills_cierre, punto 3): lo que aprueba herramientas o corre
 * solo, lo que trae para correr, lo que sale a internet y lo que se esconde a la vista. No juzga: lo dice, y decide quien
 * la autoriza. Una línea por hallazgo; ninguna, si no vio nada de eso. Pura, salvo leer sus archivos.
 */
export function revisarSkill(repositorio: string, s: Pick<SkillDelProyecto, 'ruta'>): string[] {
  const base = join(repositorio, s.ruta);
  let archivos: string[];
  try {
    archivos = statSync(base).isDirectory() ? archivosDe(base) : [''];
  } catch {
    return ['No se pudo leer: no se autoriza a ciegas.'];
  }
  const leer = (a: string) => {
    try {
      return readFileSync(a ? join(base, a) : base, 'utf8');
    } catch {
      return '';
    }
  };
  const textos = archivos.map((a) => ({ a: a || s.ruta.split('/').at(-1)!, t: leer(a) }));
  const todo = textos.map((x) => x.t).join('\n');
  const cabecera = /^---\r?\n([\s\S]*?)\r?\n---/.exec(textos.find((x) => /(^|\/)SKILL\.md$|\.md$/.test(x.a))?.t ?? '')?.[1] ?? '';
  const hallazgos: string[] = [];
  const herramientas = /^allowed-tools:\s*(.+)$/im.exec(cabecera)?.[1]?.trim();
  if (herramientas) hallazgos.push(`Aprueba herramientas sin preguntar mientras se usa: ${herramientas.slice(0, 160)}`);
  if (/^hooks:/im.test(cabecera) || /"hooks"\s*:/.test(todo)) hallazgos.push('Registra hooks: órdenes que corren solas, fuera de los permisos.');
  const scripts = textos.filter((x) => /\.(sh|bash|ps1|psm1|py|js|mjs|cjs|ts|bat|cmd|exe|rb|pl)$/i.test(x.a)).map((x) => x.a);
  if (scripts.length) hallazgos.push(`Trae ${scripts.length === 1 ? 'un archivo que se puede correr' : `${scripts.length} archivos que se pueden correr`}: ${scripts.slice(0, 6).join(', ')}`);
  if (/\b(curl|wget|Invoke-WebRequest|iwr|Invoke-Expression|iex)\b|\|\s*(ba)?sh\b/i.test(todo)) hallazgos.push('Descarga algo de internet o corre lo que descarga.');
  const sitios = [...new Set([...todo.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase()))];
  if (sitios.length) hallazgos.push(`Nombra páginas de afuera: ${sitios.slice(0, 6).join(', ')}${sitios.length > 6 ? '…' : ''}`);
  if (/<!--[\s\S]*?-->/.test(todo)) hallazgos.push('Tiene texto escondido en comentarios HTML, que no se ve al leerla formateada.');
  if (/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/.test(todo)) hallazgos.push('Tiene caracteres invisibles, que pueden esconder una orden.');
  if (/[A-Za-z0-9+/]{160,}={0,2}/.test(todo)) hallazgos.push('Trae un bloque codificado largo, que no se puede leer a simple vista.');
  if (/ignor(e|a|ar)\s+(all\s+|todas?\s+)?(the\s+|las?\s+)?(previous|prior|above|anteriores|instrucciones|instructions)/i.test(todo)) hallazgos.push('Pide ignorar otras instrucciones.');
  if (/\bgit\s+push\b|--force\b|\brm\s+-rf\b|\bnpm\s+publish\b/i.test(todo)) hallazgos.push('Nombra órdenes que suben, publican o borran.');
  return hallazgos;
}

/** Una skill de un proyecto en el panel de permisos: si ya carga, si es nueva o si cambió desde que se autorizó, y lo que se vio en ella. */
export interface SkillEnElPanel extends SkillDelProyecto {
  proyecto: string;
  estado: 'autorizada' | 'nueva' | 'cambio';
  hallazgos: string[];
  cuando?: string;
  quien?: string;
}

/**
 * Las skills de cada proyecto de este computador, para «Modelo y consumo» › «Permisos»: las de su repositorio de hoy, con
 * su estado y lo que el código vio en ellas. El repositorio del mismo Studio no cuenta (skillsApagadas).
 */
export function skillsParaElPanel(repositorios: Record<string, string>, estudio: string, autorizadas: readonly SkillAutorizada[] | undefined): SkillEnElPanel[] {
  const salida: SkillEnElPanel[] = [];
  for (const [proyecto, repo] of Object.entries(repositorios)) {
    if (resolve(repo).toLowerCase() === resolve(estudio).toLowerCase()) continue;
    for (const s of skillsDelProyecto(repo)) {
      const ya = autorizadas?.find((a) => a.proyecto === proyecto && a.nombre === s.nombre && a.ruta === s.ruta);
      const estado = ya?.huella === s.huella ? 'autorizada' : ya ? 'cambio' : 'nueva';
      salida.push({ ...s, proyecto, estado, hallazgos: revisarSkill(repo, s), ...(ya ? { cuando: ya.cuando, quien: ya.quien } : {}) });
    }
  }
  return salida;
}

/** Los ajustes del director (su JSON) con esas skills apagadas, sobre lo que ya traían: nada las vuelve a encender. Pura. */
export function conSkillsApagadas(ajustes: string, apagadas: readonly string[]): string {
  if (!apagadas.length) return ajustes;
  const a = JSON.parse(ajustes) as Record<string, unknown>;
  const antes = a.skillOverrides && typeof a.skillOverrides === 'object' ? (a.skillOverrides as Record<string, unknown>) : {};
  return JSON.stringify({ ...a, skillOverrides: { ...antes, ...Object.fromEntries(apagadas.map((s) => [s, 'off'])) } });
}
