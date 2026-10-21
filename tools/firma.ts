// La firma pública del Studio: los commits que se suben a su repositorio (público) van firmados como ARGWABOT, autor y
// confirmador, aunque la carpeta siga con la identidad del titular (el Studio lo reconoce por ella en todos sus
// proyectos). Lo puro de tools/subir-studio.ts: qué commits faltan por firmar y la orden que los firma.
export const FIRMA = { nombre: 'ARGWABOT', correo: 'incocrea@outlook.com' };

// El formato de `git log` que lee porFirmar: hash, autor y confirmador, separados por un tabulador
export const FORMATO_LOG = '%H%x09%an%x09%ae%x09%cn%x09%ce';

export interface Commit { hash: string; autor: string; confirmador: string }

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
