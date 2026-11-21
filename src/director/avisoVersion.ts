// La línea que avisa de una versión nueva (pedido pd_aviso_version; elecciones del titular del 1 y el 2 de noviembre de 2026:
// t_decide_aviso_lugar, t_decide_aviso_apagar, t_decide_aviso_prerelease, t_decide_aviso_cerrar y t_decide_aviso_enlace). Una vez
// al día se le pregunta a GitHub cuál es la última versión que no es «Pre-release»: no se envía nada de la persona ni de sus
// proyectos y, sin internet, no se dice nada. Su enlace lleva a las notas de esa versión en «Releases». Lo que se guarda vive en
// estudio.local.json, de este computador (proyectos.ts › Local).

/** El repositorio público del Studio. */
export const REPO_PUBLICO = 'ARGWABOT/STL-Sacred_Time_Line';
/** GitHub responde aquí la última versión publicada que no es borrador ni «Pre-release»; si no hay ninguna, un 404. */
export const URL_ULTIMA = `https://api.github.com/repos/${REPO_PUBLICO}/releases/latest`;
/** Cada cuánto se pregunta. */
export const CADA_CONSULTA_MS = 24 * 3_600_000;

export interface VersionPublicada { version: string; enlace: string }

/** Lo que se recuerda: cuándo se preguntó, lo que respondió, cuál se cerró con ✕ y si la casilla la apagó. */
export interface AvisoGuardado {
  consultada?: string;
  version?: string;
  enlace?: string;
  cerrada?: string;
  apagado?: true;
}

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** Lo que trae estudio.local.json, sin lo que no se entiende; sin nada, undefined. Pura. */
export function avisoNormal(x: unknown): AvisoGuardado | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const a = x as Record<string, unknown>;
  const fuera: AvisoGuardado = {
    ...(typeof a.consultada === 'string' ? { consultada: a.consultada } : {}),
    ...(typeof a.version === 'string' && SEMVER.test(a.version) && typeof a.enlace === 'string' ? { version: a.version, enlace: a.enlace } : {}),
    ...(typeof a.cerrada === 'string' ? { cerrada: a.cerrada } : {}),
    ...(a.apagado === true ? { apagado: true as const } : {}),
  };
  return Object.keys(fuera).length ? fuera : undefined;
}

/** La versión que dice GitHub: nunca un borrador ni una «Pre-release», y su enlace, siempre a sus notas en este repositorio. Pura. */
export function versionDeGitHub(x: unknown): VersionPublicada | null {
  const r = x as { tag_name?: unknown; prerelease?: unknown; draft?: unknown } | null;
  if (!r || typeof r.tag_name !== 'string' || r.prerelease === true || r.draft === true) return null;
  const m = SEMVER.exec(r.tag_name);
  if (!m) return null;
  return { version: `${m[1]}.${m[2]}.${m[3]}`, enlace: `https://github.com/${REPO_PUBLICO}/releases/tag/${encodeURIComponent(r.tag_name)}` };
}

/** ¿`a` es más nueva que `b`? Si alguna no se entiende, no: mejor callar que avisar de más. Pura. */
export function esMasNueva(a: string, b: string): boolean {
  const x = SEMVER.exec(a);
  const y = SEMVER.exec(b);
  if (!x || !y) return false;
  for (const i of [1, 2, 3]) {
    if (Number(x[i]) !== Number(y[i])) return Number(x[i]) > Number(y[i]);
  }
  return false;
}

/** ¿Toca preguntar? Una vez al día, y nunca con la casilla apagada. Pura. */
export function tocaConsultar(a: AvisoGuardado | undefined, ahora: number): boolean {
  if (a?.apagado) return false;
  const antes = a?.consultada ? Date.parse(a.consultada) : NaN;
  return !Number.isFinite(antes) || ahora - antes >= CADA_CONSULTA_MS;
}

/** La línea que se muestra, si hay: una versión más nueva que la instalada, que no se haya cerrado, con la casilla encendida. Pura. */
export function lineaDeVersion(a: AvisoGuardado | undefined, instalada: string): VersionPublicada | null {
  if (!a || a.apagado || !a.version || !a.enlace) return null;
  if (!esMasNueva(a.version, instalada)) return null;
  if (a.cerrada && !esMasNueva(a.version, a.cerrada)) return null;
  return { version: a.version, enlace: a.enlace };
}

/** Lo guardado tras una respuesta: con versión, esa; sin ninguna publicada, sin versión. Lo que se cerró y la casilla siguen. Pura. */
export function conConsulta(a: AvisoGuardado | undefined, publicada: VersionPublicada | null, cuando: string): AvisoGuardado {
  return { ...(a?.cerrada ? { cerrada: a.cerrada } : {}), ...(a?.apagado ? { apagado: true as const } : {}), consultada: cuando, ...(publicada ?? {}) };
}

/**
 * Le pregunta a GitHub. Solo la dirección y qué formato se espera: ni cookies, ni nombres, ni nada de los proyectos. `sin_red`
 * si no se pudo saber (sin internet, un límite de GitHub): se calla y se intenta después; `null` si aún no hay versión publicada.
 */
export async function consultarVersion(pedir: typeof fetch = fetch): Promise<VersionPublicada | null | 'sin_red'> {
  try {
    const r = await pedir(URL_ULTIMA, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15_000) });
    if (r.status === 404) return null;
    if (!r.ok) return 'sin_red';
    return versionDeGitHub(await r.json());
  } catch {
    return 'sin_red';
  }
}
