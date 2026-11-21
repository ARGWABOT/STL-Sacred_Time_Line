// La cuenta de GitHub que el Studio sugiere para un proyecto sin cuenta aprobada (pedido pd_diagnostico_llena; decisión del
// titular nmwawb3grtit, 10 de noviembre de 2026: si el dueño del repositorio y la sesión activa de gh difieren, se sugiere
// el dueño). Va en «Proyecto» › Dónde está, «Detectada, sin guardar»: nada se aprueba sin «Guardar la cuenta». Puro y sin
// node, para que lo use la página (cuentaGit.ts, que corre gh, lo reexporta).

/** Un login de GitHub: letras, números y guiones; las cuentas de empresa llevan además un guion bajo. */
export const esCuentaGitHub = (x: unknown): x is string => typeof x === 'string' && /^[a-z\d](?:[a-z\d_-]{0,38})$/i.test(x);

/**
 * El dueño de un repositorio de GitHub, de la dirección de su remoto (`https://github.com/DUENO/repo(.git)` o
 * `git@github.com:DUENO/repo.git`). Null si no es de GitHub o no se lee. Puro.
 */
export function duenoDelRemoto(remoto: string | null | undefined): string | null {
  const m = /github\.com[/:]([^/\s:]+)\/[^/\s]+/i.exec(remoto ?? '');
  return m && esCuentaGitHub(m[1]) ? m[1] : null;
}

/** La cuenta sugerida y de dónde salió: el dueño del repositorio o la sesión activa de gh. */
export interface CuentaDetectada { cuenta: string; de: 'dueno' | 'activa' }

/**
 * La cuenta que se sugiere: ninguna si ya hay una aprobada; si no, el dueño del repositorio, si su remoto es de GitHub; si
 * no, la sesión activa de gh. Puro.
 */
export function cuentaDetectada(aprobada: string | null | undefined, remoto: string | null | undefined, activa: string | null | undefined): CuentaDetectada | null {
  if (aprobada?.trim()) return null;
  const dueno = duenoDelRemoto(remoto);
  if (dueno) return { cuenta: dueno, de: 'dueno' };
  return esCuentaGitHub(activa) ? { cuenta: activa, de: 'activa' } : null;
}
