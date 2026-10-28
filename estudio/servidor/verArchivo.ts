// Ver un archivo que nombra el director, con formato según su tipo (pedido del titular pd_enlaces_archivos, nota de voz
// nmvmgooc3tit, y su decisión del 26 de octubre de 2026: el Markdown se lee en la columna de documentos; lo demás, en una
// pestaña aparte). El JSON, ordenado y plegable; un registro de revisión, una línea por evento; el código y el texto, con
// sus números de línea. Solo lo que el servidor del Studio puede leer: el repositorio del proyecto activo, su memoria y
// los registros de este computador, nunca un .env ni una llave. La página va aislada (CSP sandbox): no corre nada ni
// puede hablarle al servidor del Studio, aunque el archivo traiga HTML. Aquí, lo puro.
import { marked } from 'marked';

/** El tope de lo que se muestra: un archivo más grande se corta, y la página lo dice. */
export const MAX_BYTES = 2 * 1024 * 1024;

/** Lo que nunca se abre: secretos, llaves y lo interno de git. */
const SECRETO = /^(\.env.*|.*\.(pem|key|p12|pfx)|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|\.npmrc|\.netrc|\.git-credentials|credentials(\.json)?)$/i;

/** Si una ruta se puede pedir: relativa, con «/», sin salir de su carpeta, sin .git y sin secretos. Pura. */
export function rutaPermitida(ruta: string): boolean {
  if (!ruta || ruta.length > 300 || ruta.includes('\\') || ruta.startsWith('/') || /^[a-z]:/i.test(ruta)) return false;
  if (/[\u0000-\u001f<>|"?*]/.test(ruta)) return false;
  const partes = ruta.split('/');
  if (partes.some((p) => !p || p === '.' || p === '..' || p.toLowerCase() === '.git')) return false;
  return !SECRETO.test(partes[partes.length - 1]);
}

/** Si es un registro de este computador (de .revisiones o la bitácora), que se lee del Studio y no del proyecto. Pura. */
export const esRegistro = (ruta: string) => /^\.revisiones\/[\w.-]+\.(log|jsonl)$/.test(ruta) || ruta === '.estudio/bitacora.jsonl';

export type Formato = 'json' | 'eventos' | 'markdown' | 'texto';

/** El formato con que se muestra, por su nombre. Pura. */
export function formatoDe(ruta: string): Formato {
  const ext = ruta.split('.').pop()!.toLowerCase();
  if (ext === 'json') return 'json';
  if (ext === 'jsonl' || (ext === 'log' && ruta.startsWith('.revisiones/'))) return 'eventos';
  if (ext === 'md') return 'markdown';
  return 'texto';
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Un valor JSON como árbol plegable: los dos primeros niveles, abiertos. */
function arbol(v: unknown, nivel = 0): string {
  if (v === null || typeof v !== 'object') return `<span class="v ${v === null ? 'nulo' : typeof v}">${esc(JSON.stringify(v))}</span>`;
  const lista = Array.isArray(v);
  const pares: [string, unknown][] = lista ? v.map((x, i) => [String(i), x]) : Object.entries(v as Record<string, unknown>);
  if (!pares.length) return `<span class="v">${lista ? '[]' : '{}'}</span>`;
  const filas = pares.map(([k, x]) => `<li><span class="k">${esc(lista ? k : JSON.stringify(k))}</span>: ${arbol(x, nivel + 1)}</li>`).join('');
  const resumen = lista ? `[ ${pares.length} ]` : `{ ${pares.length} }`;
  return `<details${nivel < 2 ? ' open' : ''}><summary>${resumen}</summary><ul>${filas}</ul></details>`;
}

/** De qué es un evento de un registro, para su línea: su tipo y, si lo tiene, su subtipo o su herramienta. */
function deQueEs(e: unknown): string {
  if (!e || typeof e !== 'object') return '';
  const o = e as Record<string, unknown>;
  const partes = [o.type, o.subtype].filter((x) => typeof x === 'string') as string[];
  const contenido = (o.message as { content?: unknown } | undefined)?.content;
  if (Array.isArray(contenido))
    for (const c of contenido) {
      const x = c as Record<string, unknown>;
      if (x?.type === 'tool_use' && typeof x.name === 'string') partes.push(x.name);
      else if (x?.type === 'text' && typeof x.text === 'string') partes.push(x.text.slice(0, 80));
    }
  return partes.join(' · ');
}

/** El cuerpo de la página, según su formato. Pura. */
export function cuerpoDe(ruta: string, texto: string): string {
  const f = formatoDe(ruta);
  if (f === 'json') {
    try {
      return `<div class="json">${arbol(JSON.parse(texto))}</div>`;
    } catch {
      // un JSON que no se lee se muestra como texto
    }
  }
  if (f === 'eventos') {
    const lineas = texto.split('\n').filter((l) => l.trim());
    return `<ol class="eventos">${lineas
      .map((l) => {
        try {
          const e = JSON.parse(l);
          return `<li><details><summary>${esc(deQueEs(e) || 'evento')}</summary><div class="json">${arbol(e, 2)}</div></details></li>`;
        } catch {
          return `<li><code>${esc(l)}</code></li>`;
        }
      })
      .join('')}</ol>`;
  }
  if (f === 'markdown') return `<article class="md">${marked.parse(texto, { async: false }) as string}</article>`;
  const filas = texto.replace(/\r\n/g, '\n').split('\n');
  const lenguaje = lenguajeDe(ruta);
  return `<table class="codigo"><tbody>${filas.map((l, i) => `<tr><td class="n">${i + 1}</td><td><pre>${(lenguaje ? resaltar(l, lenguaje) : esc(l)) || ' '}</pre></td></tr>`).join('')}</tbody></table>`;
}

/** Las palabras reservadas de cada lenguaje que se colorea. */
const RESERVADAS: Record<string, Set<string>> = {
  js: new Set('const let var function return if else for while do switch case break continue import export from default async await new class extends type interface implements of in instanceof typeof as true false null undefined try catch finally throw this void enum readonly public private static'.split(' ')),
  py: new Set('def return if elif else for while import from as class with try except finally raise lambda yield pass break continue and or not in is True False None async await global nonlocal'.split(' ')),
  sh: new Set('if then else elif fi for while do done case esac function return in export local set echo'.split(' ')),
};

/** El lenguaje con que se colorea un archivo, por su extensión; null, sin colores. Pura. */
export function lenguajeDe(ruta: string): 'js' | 'py' | 'sh' | null {
  const ext = ruta.split('.').pop()!.toLowerCase();
  if (['ts', 'tsx', 'js', 'mjs', 'cjs', 'jsx'].includes(ext)) return 'js';
  if (ext === 'py') return 'py';
  if (['sh', 'bash', 'toml', 'yml', 'yaml'].includes(ext)) return 'sh';
  return null;
}

/**
 * Una línea de código con sus colores: los comentarios, el texto entre comillas, los números y las palabras reservadas.
 * Básico y por línea (un comentario o un texto de varias líneas solo se colorea en la suya), y todo escapado. Pura.
 */
export function resaltar(linea: string, lenguaje: 'js' | 'py' | 'sh'): string {
  const comentario = lenguaje === 'js' ? String.raw`\/\/.*$|\/\*.*?(?:\*\/|$)` : String.raw`#.*$`;
  const patron = new RegExp(String.raw`(${comentario})|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|\x60(?:[^\x60\\]|\\.)*\x60?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)`, 'g');
  let fuera = '';
  let desde = 0;
  for (const m of linea.matchAll(patron)) {
    fuera += esc(linea.slice(desde, m.index));
    const [todo, com, cad, num, pal] = m;
    if (com) fuera += `<span class="c">${esc(com)}</span>`;
    else if (cad) fuera += `<span class="s">${esc(cad)}</span>`;
    else if (num) fuera += `<span class="nu">${num}</span>`;
    else if (pal && RESERVADAS[lenguaje].has(pal)) fuera += `<span class="r">${pal}</span>`;
    else fuera += esc(todo);
    desde = m.index! + todo.length;
  }
  return fuera + esc(linea.slice(desde));
}

const ESTILO = `body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#faf8f3;color:#2b2a27}
header{position:sticky;top:0;background:#2b2a27;color:#faf8f3;padding:.6rem 1rem;font-size:.95rem}
header small{opacity:.75;margin-left:.6rem}main{padding:1rem}
.aviso{background:#fff3cd;border:1px solid #e0c36a;padding:.5rem .8rem;border-radius:6px;margin-bottom:1rem}
.json ul{list-style:none;margin:0;padding-left:1.2rem;border-left:1px dotted #c9c3b5}
.json summary{cursor:pointer;color:#6d675c}.k{color:#7a3e9d}.v.string{color:#2f6b2f}.v.number{color:#1d5fa0}.v.boolean,.v.nulo{color:#a0521d}
.json,.codigo pre,code{font:13px/1.45 ui-monospace,Consolas,monospace}
.eventos{padding-left:2.6rem}.eventos li{margin:.15rem 0}.eventos summary{cursor:pointer}
.codigo{border-collapse:collapse}.codigo td{vertical-align:top;padding:0 .6rem}.codigo pre{margin:0;white-space:pre-wrap}
.codigo .n{color:#a39d90;text-align:right;user-select:none;border-right:1px solid #e3ddd0}
.codigo .c{color:#8a8578;font-style:italic}.codigo .s{color:#2f6b2f}.codigo .nu{color:#1d5fa0}.codigo .r{color:#7a3e9d;font-weight:600}
.md{max-width:52rem}.md pre{background:#f0ece2;padding:.6rem;overflow:auto}`;

/** La página entera, con su encabezado. `cortado`: si el archivo pasaba del tope. Pura. */
export function paginaDeArchivo(ruta: string, texto: string, cortado = false): string {
  const nombre = ruta.split('/').pop()!;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(nombre)}</title><style>${ESTILO}</style></head>
<body><header><b>${esc(nombre)}</b><small>${esc(ruta)}</small></header><main>${cortado ? `<p class="aviso">Es más grande que ${MAX_BYTES / 1024 / 1024} MB: se muestra solo el comienzo.</p>` : ''}${cuerpoDe(ruta, texto)}</main></body></html>`;
}

/** La página de un archivo que no se puede mostrar, con el porqué. Pura. */
export const paginaDeError = (ruta: string, porque: string) =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>No se puede abrir</title><style>${ESTILO}</style></head><body><header><b>No se puede abrir</b><small>${esc(ruta)}</small></header><main><p>${esc(porque)}</p></main></body></html>`;

/** La política de la página: aislada, sin scripts ni formularios, y sin poder cargar nada de afuera. */
export const POLITICA = "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'; frame-ancestors 'none'";
