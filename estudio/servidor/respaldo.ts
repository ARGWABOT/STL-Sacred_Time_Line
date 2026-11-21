// El respaldo de la memoria de un proyecto en GitHub (pedido pd_sin_modo_equipo): el Studio es de una sola persona, así
// que la copia de GitHub ya no se comparte ni se trae; solo se respalda (nmwds7825tit). Se sube sola al terminar cada
// revisión de ese proyecto, o con «Respaldar ahora» (nmwdur1ejtit, nmwf5n02utit), solo con el permiso de subir de ese
// proyecto, solo a un repositorio privado (nmwf5lg39tit), sin forzar nunca y sin traer nada: si GitHub tiene algo que
// este computador no, no se pisa, y el pie dice «El respaldo falló» con su motivo (nmwemu30ktit). Sin repositorio en
// GitHub o sin el permiso, «Sin respaldo», con cómo conectarlo (nmwdxv033tit). La memoria del mismo Studio nunca se
// respalda en su propio repositorio, que va a ser público: su historia tiene que quedar sin datos de proyectos. Va a una
// segunda dirección solo suya, un repositorio privado de la cuenta aprobada del proyecto (nmwfl2c3ltit; cuentaGit.ts). Un
// repositorio público recibe el respaldo solo si su titular lo encendió en «Proyecto» › «Dónde está» (nmwf5lg39tit).
import { rm, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { compararCuenta, duenoDelRemoto, repoPrivadoConGh } from '../../src/director/cuentaGit.ts';
import { RAMA } from '../../src/director/proyectos.ts';
import { correrGit } from './sincronizar.ts';

/**
 * Por qué no hay respaldo: sin repositorio, uno que no es de GitHub, sin el permiso de subir, público, el del Studio (sin su
 * segunda dirección, o con una que es su mismo repositorio) o una segunda dirección de otra cuenta que la aprobada.
 */
export type MotivoSinRespaldo = 'sin_repositorio' | 'no_github' | 'sin_permiso' | 'publico' | 'del_studio' | 'otra_cuenta';
/** Por qué falló el último: GitHub tiene algo que aquí no, pidió iniciar sesión, sin conexión, no se supo si es privado u otro. */
export type CausaFallo = 'rechazado' | 'sesion' | 'sin_red' | 'no_verifica' | 'otro';

export interface EstadoRespaldo {
  /** `nunca`: se puede respaldar y aún no se hizo; `al_dia`: el último salió bien. */
  fase: 'nunca' | 'al_dia' | 'sin_respaldo' | 'fallo' | 'subiendo';
  motivo?: MotivoSinRespaldo;
  causa?: CausaFallo;
  /** Lo último que dijo git, para quien quiera el detalle. */
  detalle?: string;
  /** Cuándo subió el último respaldo que salió bien (ISO). */
  cuando?: string;
  /** El repositorio de GitHub (dueño/nombre) y la rama de la memoria. */
  destino?: string;
  rama: string;
}

export interface Condiciones {
  /** El permiso de subir («Permisos» › git push) para este proyecto o para todos. */
  puedeSubir: boolean;
  /** La memoria vive en el repositorio del mismo Studio. */
  delStudio: boolean;
  /** Solo del Studio: su segunda dirección, el repositorio privado de su memoria (estudio.local.json › respaldoDelStudio). */
  segunda?: string | null;
  /** La cuenta de GitHub aprobada para el proyecto (cuentaGit.ts): la segunda dirección tiene que ser suya. */
  cuenta?: string | null;
  /** Su titular encendió el respaldo aunque el repositorio sea público (nunca vale para la memoria del Studio). */
  publicoPermitido?: boolean;
}

/** A dónde sube: `remoto` es lo que se le pasa a git push (origin o la segunda dirección). */
interface Destino { remoto: string; destino: string; publicoPermitido: boolean }

const mismoRepo = (a: string | null, b: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/**
 * A dónde va el respaldo, o por qué no va. `origen`: lo que dice `git remote get-url origin` de la memoria (null si no
 * tiene). Pura: la memoria del Studio va solo a su segunda dirección, de la cuenta aprobada, y nunca a su propio repositorio.
 */
function destinoDelRespaldo(origen: string | null, c: Condiciones): Destino | { motivo: MotivoSinRespaldo; destino?: string } {
  if (c.delStudio) {
    const propio = origen ? repoDeGithub(origen) : null;
    if (!c.segunda?.trim()) return { motivo: 'del_studio', ...(propio ? { destino: propio } : {}) };
    const destino = repoDeGithub(c.segunda);
    if (!destino) return { motivo: 'no_github' };
    if (mismoRepo(destino, propio)) return { motivo: 'del_studio', destino };
    const cuenta = compararCuenta(c.cuenta, duenoDelRemoto(c.segunda));
    if (!cuenta.ok) return { motivo: 'otra_cuenta', destino };
    if (!c.puedeSubir) return { motivo: 'sin_permiso', destino };
    return { remoto: c.segunda.trim(), destino, publicoPermitido: false };
  }
  if (!origen?.trim()) return { motivo: 'sin_repositorio' };
  const destino = repoDeGithub(origen);
  if (!destino) return { motivo: 'no_github' };
  if (!c.puedeSubir) return { motivo: 'sin_permiso', destino };
  return { remoto: 'origin', destino, publicoPermitido: !!c.publicoPermitido };
}

interface Guardado { cuando?: string; fase?: EstadoRespaldo['fase']; motivo?: MotivoSinRespaldo; causa?: CausaFallo; detalle?: string }

/** El dueño y el nombre de un repositorio de GitHub, de su dirección (https o ssh); null si no es de GitHub. Pura. */
export function repoDeGithub(url: string): string | null {
  const m = /github\.com[:/]+([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(url.trim());
  return m ? `${m[1]}/${m[2]}` : null;
}

/**
 * ¿Es privado en GitHub? Se pregunta sin credenciales: un repositorio privado no existe para quien no inició sesión (404);
 * uno público responde con `private: false`. null: no se pudo saber (sin red, o GitHub limitó las preguntas).
 */
export async function esPrivadoEnGithub(repo: string, pedir: typeof fetch = fetch): Promise<boolean | null> {
  try {
    const r = await pedir(`https://api.github.com/repos/${repo}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'stl-studio' }, signal: AbortSignal.timeout(15_000) });
    if (r.status === 404) return true;
    if (!r.ok) return null;
    const j = (await r.json()) as { private?: boolean };
    return typeof j.private === 'boolean' ? j.private : null;
  } catch {
    return null;
  }
}

/**
 * La comprobación de privacidad del respaldo: primero sin credenciales (rápida y sin tocar gh); si así no se supo (la API
 * anónima limitó o no hubo red), con la sesión aprobada de gh, que sí ve un repositorio privado. Así no se le niega a la
 * persona el repositorio privado que entregó solo porque la pregunta anónima no respondió (nmwfnnjb7tit). `cuenta`: la cuenta
 * aprobada del proyecto, para esa segunda pregunta.
 */
export function comprobarPrivado(
  cuenta: () => Promise<string | null | undefined>,
  anon: (repo: string) => Promise<boolean | null> = esPrivadoEnGithub,
  conGh: (repo: string, a: string | null | undefined) => Promise<boolean | null> = repoPrivadoConGh,
): (repo: string) => Promise<boolean | null> {
  return async (repo) => {
    const a = await anon(repo);
    return a !== null ? a : conGh(repo, await cuenta());
  };
}

/** Por qué falló una subida, de lo que dijo git. Pura. */
export function causaDeFallo(salida: string): CausaFallo {
  if (/\[rejected\]|non-fast-forward|fetch first|\[remote rejected\]/i.test(salida)) return 'rechazado';
  if (/authentication|could not read username|terminal prompts disabled|permission denied|403|401|denied to/i.test(salida)) return 'sesion';
  if (/could not resolve host|unable to access|timed out|tiempo agotado|connection|network/i.test(salida)) return 'sin_red';
  return 'otro';
}

const ultimaLinea = (texto: string) => texto.trim().split('\n').filter((l) => !/^To |^\s*$|^Done$/.test(l)).slice(-1)[0]?.slice(0, 200) ?? '';

/** Uno por memoria de proyecto (`memoria`: su carpeta `.stl`, rama `stl`). */
export class Respaldo {
  private enCurso: Promise<EstadoRespaldo> | null = null;
  private archivo: string | null = null;

  constructor(
    private readonly memoria: string,
    private readonly condiciones: () => Promise<Condiciones>,
    private readonly privado: (repo: string) => Promise<boolean | null> = esPrivadoEnGithub,
    private readonly rama = RAMA,
  ) {}

  private async rutaGuardado(): Promise<string> {
    if (this.archivo) return this.archivo;
    const r = (await correrGit(this.memoria, ['rev-parse', '--git-path', 'estudio-respaldo.json'])).out.trim();
    return (this.archivo = isAbsolute(r) ? r : join(this.memoria, r));
  }

  /** Fuera de git (en .git/): lo que pasó con el último respaldo sobrevive a un reinicio sin versionarse. */
  private async leer(): Promise<Guardado> {
    try {
      return JSON.parse(await readFile(await this.rutaGuardado(), 'utf-8'));
    } catch {
      return {};
    }
  }

  private async guardar(g: Guardado): Promise<void> {
    const ruta = await this.rutaGuardado();
    if (Object.keys(g).length) await writeFile(ruta, JSON.stringify(g, null, 2));
    else await rm(ruta, { force: true });
  }

  /** A dónde iría hoy, o lo que lo impide, sin preguntarle nada a GitHub. */
  private async aDonde(): Promise<Destino | { motivo: MotivoSinRespaldo; destino?: string }> {
    const url = await correrGit(this.memoria, ['remote', 'get-url', 'origin']);
    return destinoDelRespaldo(url.codigo === 0 && url.out.trim() ? url.out.trim() : null, await this.condiciones());
  }

  /** Lo que muestra el pie de la barra: sin red, con lo que se sabe del último intento. */
  async estado(): Promise<EstadoRespaldo> {
    const g = await this.leer();
    const base = { rama: this.rama, ...(g.cuando ? { cuando: g.cuando } : {}) };
    if (this.enCurso) return { ...base, fase: 'subiendo' };
    const a = await this.aDonde();
    if ('motivo' in a) return { ...base, fase: 'sin_respaldo', ...a };
    const destino = a.destino;
    if (g.fase === 'sin_respaldo' && g.motivo === 'publico' && !a.publicoPermitido) return { ...base, fase: 'sin_respaldo', motivo: 'publico', destino };
    if (g.fase === 'fallo') return { ...base, fase: 'fallo', destino, ...(g.causa ? { causa: g.causa } : {}), ...(g.detalle ? { detalle: g.detalle } : {}) };
    return { ...base, fase: g.cuando ? 'al_dia' : 'nunca', destino };
  }

  /** Sube la rama de la memoria a GitHub, sin forzar y sin traer nada. Nunca falla: lo que pasó queda en el estado. */
  respaldar(): Promise<EstadoRespaldo> {
    this.enCurso ??= this.subir().finally(() => (this.enCurso = null));
    return this.enCurso;
  }

  private async subir(): Promise<EstadoRespaldo> {
    const g = await this.leer();
    const cuando = g.cuando ? { cuando: g.cuando } : {};
    const a = await this.aDonde();
    if ('motivo' in a) {
      await this.guardar({ ...cuando, fase: 'sin_respaldo', motivo: a.motivo });
      return { rama: this.rama, ...cuando, fase: 'sin_respaldo', ...a };
    }
    const { destino, remoto } = a;
    const privado = await this.privado(destino);
    // Público: solo con el respaldo encendido por su titular, y nunca la memoria del Studio
    if (privado === false && !a.publicoPermitido) {
      await this.guardar({ ...cuando, fase: 'sin_respaldo', motivo: 'publico' });
      return { rama: this.rama, ...cuando, fase: 'sin_respaldo', motivo: 'publico', destino };
    }
    if (privado === null && !a.publicoPermitido) {
      await this.guardar({ ...cuando, fase: 'fallo', causa: 'no_verifica' });
      return { rama: this.rama, ...cuando, fase: 'fallo', causa: 'no_verifica', destino };
    }
    // Sin «+» ni --force: si GitHub tiene commits que aquí no, git lo rechaza y nada se pisa
    const s = await correrGit(this.memoria, ['push', '--porcelain', remoto, `refs/heads/${this.rama}:refs/heads/${this.rama}`], { ms: 90_000 });
    if (s.codigo !== 0) {
      const detalle = ultimaLinea(s.err || s.out);
      const causa = causaDeFallo(`${s.out}\n${s.err}`);
      await this.guardar({ ...cuando, fase: 'fallo', causa, detalle });
      return { rama: this.rama, ...cuando, fase: 'fallo', causa, detalle, destino };
    }
    const ahora = new Date().toISOString();
    await this.guardar({ cuando: ahora, fase: 'al_dia' });
    return { rama: this.rama, cuando: ahora, fase: 'al_dia', destino };
  }
}
