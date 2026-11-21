// Servir un audio por partes (nota nmwk9fcimtit): el navegador pide `Range: bytes=…` para saber la duración, mover la barra
// y saltar a un punto de la grabación. Sin respuesta 206, un audio de nota mostraba un tiempo y una barra que no
// correspondían a lo que sonaba. Puro, para probarlo sin servidor.

/** Una parte pedida, de `inicio` a `fin` (los dos incluidos); 'fuera' si no cabe en el archivo; null si se sirve entero. */
export type Rango = { inicio: number; fin: number } | 'fuera' | null;

/** Lee la cabecera Range de un archivo de `total` bytes. Solo una parte («bytes=a-b», «bytes=a-», «bytes=-n»); otra cosa, entero. */
export function rangoPedido(cabecera: string | undefined, total: number): Rango {
  if (!cabecera) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(cabecera.trim());
  if (!m || (!m[1] && !m[2])) return null;
  let inicio: number;
  let fin: number;
  if (!m[1]) {
    // Los últimos n bytes
    const n = Number(m[2]);
    if (!n) return 'fuera';
    inicio = Math.max(0, total - n);
    fin = total - 1;
  } else {
    inicio = Number(m[1]);
    fin = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
  }
  if (inicio >= total || inicio > fin) return 'fuera';
  return { inicio, fin };
}

/** Lo mínimo de una respuesta HTTP. */
export interface RespuestaConRango {
  statusCode: number;
  setHeader: (nombre: string, valor: string) => unknown;
  end: (datos?: Buffer) => unknown;
}

/**
 * Responde con el archivo entero (200) o con la parte pedida (206 y su Content-Range); fuera del archivo, 416. Siempre dice
 * que acepta partes (Accept-Ranges) y cuánto mide lo que va.
 */
export function responderConRango(res: RespuestaConRango, cabecera: string | undefined, datos: Buffer): void {
  res.setHeader('Accept-Ranges', 'bytes');
  const r = rangoPedido(cabecera, datos.length);
  if (r === 'fuera') {
    res.statusCode = 416;
    res.setHeader('Content-Range', `bytes */${datos.length}`);
    res.end();
    return;
  }
  if (!r) {
    res.statusCode = 200;
    res.setHeader('Content-Length', String(datos.length));
    res.end(datos);
    return;
  }
  res.statusCode = 206;
  res.setHeader('Content-Range', `bytes ${r.inicio}-${r.fin}/${datos.length}`);
  res.setHeader('Content-Length', String(r.fin - r.inicio + 1));
  res.end(datos.subarray(r.inicio, r.fin + 1));
}
