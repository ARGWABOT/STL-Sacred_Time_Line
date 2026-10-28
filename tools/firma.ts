// La firma pública del Studio: los commits que se suben a su repositorio (público) van firmados como ARGWABOT, autor y
// confirmador, aunque la carpeta siga con la identidad del titular (el Studio lo reconoce por ella en todos sus
// proyectos). Lo puro de tools/subir-studio.ts: qué commits faltan por firmar y la orden que los firma.
export const FIRMA = { nombre: 'ARGWABOT', correo: 'incocrea@outlook.com' };

// El formato de `git log` que lee porFirmar: hash, autor y confirmador, separados por un tabulador
export const FORMATO_LOG = '%H%x09%an%x09%ae%x09%cn%x09%ce';

export interface Commit { hash: string; autor: string; confirmador: string }

// Lo del producto de una revisión que no lleva la firma de publicación del proyecto (propuesta aceptada pr_subida_limpia;
// el 26 de octubre se colaron nueve commits con la identidad del titular, hechos con git commit en vez de firmar.ts), sin
// los que el director ya nombró en `alDia` (su código de siete letras): ya hechos no se rehacen, pero no pasan en silencio
export function sinFirmaPorAtender(salida: string, firma: Firma, nota: string): Commit[] {
  return porFirmar(salida, firma).filter((c) => !nota.includes(c.hash.slice(0, 7)));
}

// Los commits (de la salida de `git log --format=FORMATO_LOG`) cuyo autor o confirmador no es la firma pública
export function porFirmar(salida: string, firma = FIRMA): Commit[] {
  const propia = `${firma.nombre} <${firma.correo}>`;
  return salida.split('\n').filter((l) => l.trim()).map((l) => {
    const [hash, an, ae, cn, ce] = l.trim().split('\t');
    return { hash, autor: `${an} <${ae}>`, confirmador: `${cn} <${ce}>` };
  }).filter((c) => c.autor !== propia || c.confirmador !== propia);
}

// El filtro de `git filter-branch --env-filter` que pone la firma pública en autor y confirmador. Solo cambia los
// nombres y los correos: el código y las fechas quedan iguales, y un commit que ya estaba firmado no cambia de hash
export function filtroDeFirma(firma = FIRMA): string {
  return `export GIT_AUTHOR_NAME='${firma.nombre}' GIT_AUTHOR_EMAIL='${firma.correo}' GIT_COMMITTER_NAME='${firma.nombre}' GIT_COMMITTER_EMAIL='${firma.correo}'`;
}

export interface Firma { nombre: string; correo: string }

// Con qué firma el director los commits de un proyecto (tools/director/firmar.ts): la de su proyecto.json (`firma`, que
// escribe el titular) o, en el mismo Studio, la firma pública. Sin ninguna, null: se usa git commit con la identidad de
// la carpeta, como siempre
export function firmaDelProyecto(propia: Partial<Firma> | undefined, esElStudio: boolean): Firma | null {
  if (propia?.nombre?.trim() && propia.correo?.trim()) return { nombre: propia.nombre.trim(), correo: propia.correo.trim() };
  return esElStudio ? FIRMA : null;
}

// El entorno que pone la firma en autor y confirmador de un solo commit, sin tocar la configuración de git de la carpeta
// (la del titular, con la que el Studio firma sus decisiones)
export function entornoDeFirma(firma: Firma = FIRMA): Record<string, string> {
  return { GIT_AUTHOR_NAME: firma.nombre, GIT_AUTHOR_EMAIL: firma.correo, GIT_COMMITTER_NAME: firma.nombre, GIT_COMMITTER_EMAIL: firma.correo };
}

// Los argumentos de firmar.ts, como los de git commit: uno o más -m <mensaje> y, después de --, las rutas (siempre
// con rutas: cada commit lleva solo lo suyo). Nada más: ni --amend ni otras opciones que cambien la historia
export function argumentosDeFirmar(args: string[]): { mensajes: string[]; rutas: string[] } | { error: string } {
  const corte = args.indexOf('--');
  const antes = corte < 0 ? args : args.slice(0, corte);
  const rutas = corte < 0 ? [] : args.slice(corte + 1).filter((r) => r.trim());
  const mensajes: string[] = [];
  for (let i = 0; i < antes.length; i++) {
    if (antes[i] !== '-m' || antes[i + 1] === undefined) return { error: `No entiendo «${antes[i]}». Uso: node tools/director/firmar.ts [--proyecto <id>] -m "<mensaje>" [-m "<más>"] -- <rutas…>` };
    mensajes.push(antes[++i]);
  }
  if (!mensajes.some((m) => m.trim())) return { error: 'Falta el mensaje del commit (-m "<mensaje>").' };
  if (!rutas.length) return { error: 'Faltan las rutas del commit, después de --: cada commit lleva solo lo suyo.' };
  return { mensajes, rutas };
}

// GitHub rechaza subir .github/workflows/ con una sesión de gh sin el permiso «workflow». De la cabecera X-OAuth-Scopes
// de `gh api -i user`: true si falta (sin la cabecera, como con un token de grano fino, no se puede saber: false)
export function faltaWorkflow(respuesta: string): boolean {
  const linea = respuesta.split(/\r?\n/).find((l) => /^x-oauth-scopes:/i.test(l));
  if (!linea) return false;
  return !linea.slice(linea.indexOf(':') + 1).split(',').map((s) => s.trim()).includes('workflow');
}

// Lo que se reescribe: solo lo que aún no está en la nube (desde lo último subido); si la rama aún no existe allá, toda
export function rangoPorSubir(rama: string, subido: string | null): string {
  return subido ? `${subido}..${rama}` : rama;
}

// La historia limpia (tools/historia-limpia.ts): cuando lo publicado guarda algo que no debe estar a la vista, la rama
// main se rehace en un solo commit, y la historia de antes queda en una rama de respaldo, solo en este computador, con
// este comienzo en su nombre. La búsqueda del director (tools/director/buscar.ts) la sigue leyendo: lo hecho no se pierde
export const RESPALDO_DE_HISTORIA = 'respaldo/historia-';

// La orden de git con que esa búsqueda lee los commits de un proyecto: los de la rama de ahora y, si la hay, su historia
// de antes. HEAD va escrito: si ninguna rama se llama así, git log lee solo HEAD (sin él, no leería nada)
export const ARGUMENTOS_DE_COMMITS = ['log', '-n', '3000', '--format=%h%x09%cI%x09%s', 'HEAD', `--branches=${RESPALDO_DE_HISTORIA}*`];

// El nombre de esa rama: el comienzo y la fecha y la hora (UTC) en que se rehízo, como las de subir-studio.ts
export function respaldoDeHistoria(ahora: Date): string {
  return `${RESPALDO_DE_HISTORIA}${ahora.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// El mensaje del commit único: de qué día es el Studio que trae (la fecha de su último commit, en su propia zona horaria)
export function mensajeDeHistoriaNueva(fechaIso: string): string {
  const [a, m, d] = fechaIso.slice(0, 10).split('-').map(Number);
  return `STL Studio: el Studio del ${d} de ${MESES[m - 1]} de ${a}, en un solo commit, sin datos de ningún proyecto`;
}

// Lo que se le pide a GitHub Support después de rehacerla: la documentación de GitHub dice que los commits viejos se
// pueden seguir viendo por su hash en las vistas que guarda en caché, y que solo su soporte las borra, si no hay forks
// con esos commits (docs.github.com › «Removing sensitive data from a repository»). En inglés, que es como lo atiende
export function textoParaSoporte(repositorio: string, viejos: { cuantos: number; primero: string; ultimo: string }, cuando: string): string {
  return [
    `Hello. In the public repository ${repositorio} I replaced the whole history of the branch main with a single new commit (force-push on ${cuando.slice(0, 10)}) to remove personal data that was in its old commits.`,
    'The repository has no forks and no pull requests.',
    'Please remove the cached views of the old commits and run garbage collection, so they are no longer accessible by their SHA.',
    `Old history: ${viejos.cuantos} commits, from ${viejos.primero} (first) to ${viejos.ultimo} (last).`,
  ].join(' ');
}
