// Cada archivo que nombra el director es un enlace que lo abre (pedido del titular pd_enlaces_archivos, nota de voz
// nmvmgooc3tit). Como lo decidió el 26 de octubre de 2026: un Markdown se lee en la columna de documentos, por ideas,
// como los del director; lo demás (el JSON, un registro, el código) se abre en una pestaña aparte, con su formato
// (estudio/servidor/verArchivo.ts). Se enlaza lo que va como código en el texto (`estudio/servidor/revisor.ts`) y
// parece la ruta de un archivo; nunca un .env.

/** Los archivos de la raíz que se nombran sin carpeta y se reconocen solos. */
const DE_LA_RAIZ = /^([A-Z][A-Z_-]*\.md|package(-lock)?\.json|tsconfig\.json|vite\.config\.ts|index\.html)$/;

/** Una ruta con carpeta: segmentos de letras, números, punto, guion o guion bajo, y una extensión. */
const CON_CARPETA = /^(\.?[\w-][\w.-]*\/)+[\w-][\w.-]*\.[a-z0-9]{1,8}$/i;

export type DestinoDeArchivo = { doc: string } | { ver: string };

/**
 * A dónde lleva el nombre de un archivo, o null si no parece uno: un Markdown, a la columna de documentos (los del
 * director, de su memoria; los demás, del repositorio del proyecto); lo demás, a la pestaña aparte. Una línea al final
 * («revisor.ts:1563») se quita. Pura.
 */
export function destinoDeArchivo(texto: string): DestinoDeArchivo | null {
  const ruta = texto.trim().replace(/:\d+(-\d+)?$/, '').replace(/^\.\//, '');
  if (!ruta || ruta.includes('..') || !(CON_CARPETA.test(ruta) || DE_LA_RAIZ.test(ruta))) return null;
  if (/(^|\/)\.env/i.test(ruta) || /(^|\/)\.git\//.test(ruta)) return null;
  if (/\.md$/i.test(ruta)) return { doc: ruta.startsWith('docs/director/') ? ruta : `repo:${ruta}` };
  return { ver: ruta };
}

/** La dirección de la pestaña aparte para un archivo. Pura. */
export const direccionVer = (ruta: string) => `/__estudio/director/ver?ruta=${encodeURIComponent(ruta)}`;

/** Enlaza los nombres de archivo de un HTML ya limpio: cada `code` suelto que lo sea, fuera de bloques, enlaces y dibujos. */
export function enlazarArchivos(raiz: ParentNode): void {
  for (const c of [...raiz.querySelectorAll('code')]) {
    if (c.closest('pre, a, button, svg')) continue;
    const destino = destinoDeArchivo(c.textContent ?? '');
    if (!destino) continue;
    const doc = c.ownerDocument;
    let enlace: HTMLElement;
    if ('doc' in destino) {
      enlace = doc.createElement('button');
      enlace.setAttribute('type', 'button');
      enlace.setAttribute('data-abrir-doc', destino.doc);
      enlace.setAttribute('title', 'Abrirlo en la columna de documentos');
    } else {
      enlace = doc.createElement('a');
      enlace.setAttribute('href', direccionVer(destino.ver));
      enlace.setAttribute('target', '_blank');
      enlace.setAttribute('rel', 'noopener');
      enlace.setAttribute('title', 'Abrirlo en una pestaña aparte, con su formato');
    }
    enlace.className = 'enlace-archivo';
    c.replaceWith(enlace);
    enlace.append(c);
  }
}
