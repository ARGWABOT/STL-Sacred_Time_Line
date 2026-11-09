// Los archivos clave de cada proyecto (pedido pd_archivos_clave): en la columna de «Documentos» del Studio, cada proyecto
// muestra los pocos archivos de su repositorio que hay que conocer para entenderlo, cada uno con lo que es al pasar el
// ratón. Los elige el director (`Plan.archivosClave`, hasta MAX_ARCHIVOS_CLAVE, cada uno con su línea de para qué sirve) y
// los pone al día si cambian; el código solo le propone los candidatos: el README, los manifiestos reconocibles y lo más
// cambiado. Aquí está lo puro, sin disco ni git; lo que lee git está en tools/director/bandeja.ts.

/** Un archivo clave: su ruta relativa al repositorio del proyecto (sin el prefijo `repo:`) y para qué sirve, en una línea. */
export interface ArchivoClave {
  ruta: string;
  para: string;
}

/** Cuántos archivos clave tiene un proyecto, a lo más. */
export const MAX_ARCHIVOS_CLAVE = 8;

/** Los manifiestos reconocibles, en el orden en que se proponen (siempre en la raíz del repositorio). */
export const MANIFIESTOS = ['package.json', 'composer.json', 'pyproject.toml', 'requirements.txt', 'go.mod', 'Cargo.toml', 'pom.xml', 'Gemfile', 'Dockerfile', 'CLAUDE.md', 'AGENTS.md', 'CONTRIBUTING.md', 'LICENSE'];

/** Lo que nunca se propone: dependencias, lo generado y la memoria del Studio. */
const EXCLUIDOS = /(^|\/)(node_modules|vendor|dist|build|\.stl)(\/|$)/;
/** Los archivos de versiones fijas: cambian mucho y no dicen nada del proyecto. */
const BLOQUEO = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|Cargo\.lock|Gemfile\.lock|poetry\.lock|go\.sum)$/;

/** De `git log --since=… --format= --name-only`: cuántos commits tocaron cada archivo. */
export function cambiosPorArchivo(salida: string): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const cruda of salida.split('\n')) {
    const ruta = cruda.replace(/\r$/, '').trim();
    if (ruta) cuenta.set(ruta, (cuenta.get(ruta) ?? 0) + 1);
  }
  return cuenta;
}

/** Si un archivo de la raíz es ese manifiesto (sin mirar mayúsculas): LICENSE.md y LICENSE.txt también son LICENSE. */
const esManifiesto = (archivo: string, nombre: string) => archivo.toLowerCase() === nombre.toLowerCase() || (nombre === 'LICENSE' && /^licen[sc]e\.(md|txt)$/i.test(archivo));

/**
 * Los archivos que se le proponen al director como clave, en orden y sin repetir: el README de la raíz, los manifiestos
 * reconocibles (MANIFIESTOS, en la raíz) y después los más cambiados (`cambios`: commits por archivo, de los últimos
 * 90 días), sin node_modules, vendor, dist, build ni .stl. Solo salen archivos que están en `archivos` (los del
 * repositorio, con «/»). Pura.
 */
export function candidatosClave(archivos: string[], cambios: Map<string, number>, max = 12): string[] {
  const hay = archivos.filter((a) => a && !EXCLUIDOS.test(a));
  const raiz = hay.filter((a) => !a.includes('/'));
  const salida: string[] = [];
  const poner = (ruta: string) => {
    if (!salida.includes(ruta)) salida.push(ruta);
  };
  for (const a of raiz.filter((a) => /^readme(\.[a-z0-9]+)?$/i.test(a)).sort()) poner(a);
  for (const nombre of MANIFIESTOS) for (const a of raiz.filter((a) => esManifiesto(a, nombre)).sort()) poner(a);
  const mas = hay
    .filter((a) => (cambios.get(a) ?? 0) > 0 && !BLOQUEO.test(a))
    .sort((a, b) => (cambios.get(b) ?? 0) - (cambios.get(a) ?? 0) || (a < b ? -1 : a > b ? 1 : 0));
  for (const a of mas) poner(a);
  return salida.slice(0, Math.max(0, max));
}

/**
 * Lo que imprime la bandeja de los archivos clave: los que el director ya eligió (o que aún no hay, y los que ya no están
 * en el repositorio, `archivos`), los candidatos que calculó el código y el recordatorio de que los elige él. Pura.
 */
export function lineasDeArchivosClave(elegidos: ArchivoClave[] | undefined, candidatos: string[], archivos?: Set<string>): string[] {
  const hay = (elegidos ?? []).filter((x) => x && typeof x.ruta === 'string');
  const una = (x: ArchivoClave) => `${x.ruta} (${x.para}${archivos && !archivos.has(x.ruta) ? '; NO LONGER in the repository' : ''})`;
  // Con todos en el repositorio no hay nada que elegir: solo cuántos son (decisión del titular nmvxwv1zytit)
  if (archivosClaveAlDia(elegidos, archivos)) return [`- The project's key files: ${hay.length} chosen, all still in the repository (\`plan.archivosClave\`). Change them only if a new one is key today.`];
  return [
    `- The project's key files (\`plan.archivosClave\`; they show in the «Documentos» column, each with what it is on hover): ${hay.length ? `${hay.length}: ${hay.map(una).join('; ')}` : 'none yet'}.`,
    `  Candidates the code computed (the README at the root, the recognizable manifests and what changed most in 90 days): ${candidatos.length ? candidatos.join(', ') : 'none'}.`,
    `  You choose them, up to ${MAX_ARCHIVOS_CLAVE}, each with its line saying what it is for (\`"archivosClave": [{ "ruta": "README.md", "para": "…" }]\`, the path relative to the repository, without \`repo:\`), and you keep them up to date if they change: a file that is no longer there or a new one that is key today.`,
  ];
}

/** Si ya hay archivos clave y todos siguen en el repositorio (sin saber qué archivos tiene, no se puede decir). Pura. */
export function archivosClaveAlDia(elegidos: ArchivoClave[] | undefined, archivos?: Set<string>): boolean {
  const hay = (elegidos ?? []).filter((x) => x && typeof x.ruta === 'string');
  return !!archivos && hay.length > 0 && hay.every((x) => archivos.has(x.ruta));
}

/** Lo más largo que se muestra de un archivo clave que no es .md: lo que pasa se corta, y el texto lo dice. */
export const MAX_CARACTERES_CLAVE = 100_000;

/** Si una ruta (relativa al repositorio) es uno de los archivos clave del plan: lo único que el servidor sirve que no es .md. Pura. */
export const esArchivoClave = (archivosClave: ArchivoClave[] | undefined, ruta: string) => !!ruta && (archivosClave ?? []).some((x) => x?.ruta === ruta);

/**
 * Un archivo clave que no es .md, como documento para el lector: su nombre y su texto dentro de un bloque de código (con
 * más comillas que la tira más larga que trae, para que no lo cierre), cortado en MAX_CARACTERES_CLAVE. Un archivo que
 * no es de texto no se muestra: lo dice. Pura.
 */
export function comoDocumento(ruta: string, texto: string): string {
  if (texto.includes('\u0000')) return `# ${ruta}\n\nEste archivo no es de texto: ábrelo con su programa.\n`;
  const corto = texto.length > MAX_CARACTERES_CLAVE;
  const cuerpo = (corto ? texto.slice(0, MAX_CARACTERES_CLAVE) : texto).replace(/\r\n/g, '\n').trimEnd();
  const cerca = '`'.repeat(Math.max(3, ...(cuerpo.match(/`+/g) ?? []).map((x) => x.length + 1)));
  return `# ${ruta}\n\n${cerca}\n${cuerpo}\n${cerca}\n${corto ? '\nSe muestra solo el comienzo del archivo.\n' : ''}`;
}

/** Lo que no cumplen los archivos clave que escribió el director (para `validarPlan`), un error por línea. */
export function erroresDeArchivosClave(xs: ArchivoClave[] | undefined): string[] {
  if (xs === undefined) return [];
  if (!Array.isArray(xs)) return ['«archivosClave» no es una lista.'];
  const errores: string[] = [];
  if (xs.length > MAX_ARCHIVOS_CLAVE) errores.push(`Los archivos clave son ${xs.length}: el máximo es ${MAX_ARCHIVOS_CLAVE}.`);
  const vistas = new Set<string>();
  xs.forEach((x, i) => {
    const donde = `El archivo clave ${i + 1}`;
    const ruta = typeof x?.ruta === 'string' ? x.ruta.trim() : '';
    if (!ruta) errores.push(`${donde} no dice su ruta.`);
    else if (ruta.startsWith('repo:') || ruta.startsWith('/')) errores.push(`${donde} («${ruta}») va con la ruta relativa al repositorio, sin «repo:» ni «/» al comienzo.`);
    else if (vistas.has(ruta)) errores.push(`El archivo clave «${ruta}» está repetido.`);
    vistas.add(ruta);
    if (typeof x?.para !== 'string' || !x.para.trim()) errores.push(`${donde}${ruta ? ` («${ruta}»)` : ''} no dice para qué sirve (su «para»).`);
  });
  return errores;
}
