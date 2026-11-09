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

export type DestinoDeEnlace = DestinoDeArchivo | { fuera: string } | { ancla: string } | null;

/**
 * A dónde lleva un enlace de un documento que se muestra en el Studio (notas del titular nmw7ur9h9tit y nmw7uri9jtit:
 * ningún enlace reemplaza la pestaña del Studio, y lo que se lee se lee en su lector). Un Markdown relativo, como «Leer
 * en español» del README, se resuelve contra la carpeta del documento que lo trae y va a la columna de documentos; otro
 * archivo relativo, a la pestaña aparte con su formato; una dirección de afuera (http, https, mailto), a una pestaña
 * nueva; «#algo», a una parte del mismo documento. `rutaDoc` es la del documento en el Studio («repo:README.md» o
 * «docs/director/x.md», de la memoria); sin ella, el texto viene del director y se lee desde la raíz. null: no se puede
 * abrir (sale del repositorio, un .env, un esquema raro) y el enlace queda como texto. Pura.
 */
export function destinoDeEnlace(href: string, rutaDoc?: string): DestinoDeEnlace {
  const h = href.trim();
  if (!h) return null;
  if (h.startsWith('#')) return { ancla: h.slice(1) };
  if (/^(https?:|mailto:)/i.test(h)) return { fuera: h };
  if (/^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith('//')) return null;
  const sinAncla = h.replace(/[?#].*$/, '');
  let camino: string;
  try {
    camino = decodeURIComponent(sinAncla);
  } catch {
    return null;
  }
  const delRepo = !rutaDoc || rutaDoc.startsWith('repo:');
  const base = rutaDoc ? rutaDoc.replace(/^repo:/, '') : '';
  const partes = camino.startsWith('/') ? [] : base.split('/').slice(0, -1);
  for (const p of camino.split('/')) {
    if (p === '' || p === '.') continue;
    if (p === '..') {
      if (!partes.length) return null;
      partes.pop();
    } else partes.push(p);
  }
  const ruta = partes.join('/');
  if (!ruta || /(^|\/)\.env/i.test(ruta) || /(^|\/)\.git(\/|$)/.test(ruta) || ruta.includes('\\')) return null;
  if (/\.md$/i.test(ruta)) return { doc: !rutaDoc ? (ruta.startsWith('docs/director/') ? ruta : `repo:${ruta}`) : delRepo ? `repo:${ruta}` : ruta };
  return { ver: ruta };
}

/**
 * Ningún enlace de un documento reemplaza la pestaña del Studio (nmw7ur9h9tit): un Markdown se abre en el lector, otro
 * archivo en la pestaña aparte, lo de afuera en una pestaña nueva; lo que no se puede abrir pierde su dirección. Los de
 * un dibujo ya no llevan dirección (limpiar.ts).
 */
export function enlazarEnlaces(raiz: ParentNode, rutaDoc?: string): void {
  for (const a of [...raiz.querySelectorAll('a[href]')]) {
    if (a.closest('svg') || a.classList.contains('enlace-archivo')) continue;
    const destino = destinoDeEnlace(a.getAttribute('href') ?? '', rutaDoc);
    a.removeAttribute('target');
    if (!destino) {
      a.removeAttribute('href');
      continue;
    }
    if ('ancla' in destino) continue;
    if ('doc' in destino) {
      a.setAttribute('href', '#');
      a.setAttribute('data-abrir-doc', destino.doc);
      a.setAttribute('title', 'Abrirlo en la columna de documentos');
      continue;
    }
    a.setAttribute('href', 'fuera' in destino ? destino.fuera : direccionVer(destino.ver));
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
  }
}

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
