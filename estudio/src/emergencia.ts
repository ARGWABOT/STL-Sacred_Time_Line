// La pantalla de emergencia (pd_salud_a, «Autorreparación», capa uno; decisión nmw9gq7sftit, 9 de noviembre de 2026): si
// el Studio no carga, una pantalla pequeña dice qué falló, con sus tres botones: «Diagnosticar y reparar», «Volver a la
// versión que funcionaba» y «Ver el registro». No depende del resto de la interfaz: este módulo no importa nada (ni los
// textos de textos/, que pueden ser lo que se rompió), se carga antes que app.ts y trae sus propias frases y su estilo.
// Sale en el último idioma que usó la persona en este navegador y, si no hay ninguno, en inglés (nmw9lr17utit). El error y
// su traza quedan en este computador, junto a la última caída del servidor (servidor/ultimaCaida.ts › anotarFalla).
// «Volver a la versión que funcionaba» muestra primero a qué versión vuelve y, al confirmar, vuelve sin el modelo
// (servidor/volver.ts; nmw9oexiptit, nmw9oenmatit). «Diagnosticar y reparar» lanza al director para reparar el Studio, con
// una línea de lo que hace (servidor/reparar.ts; pd_salud_c).

export type IdiomaEmergencia = 'es' | 'en';

/** La clave del idioma de la última vez en este navegador (la misma de app.ts › CLAVE_IDIOMA_LOCAL). */
const CLAVE_IDIOMA = 'estudio.idioma';
/** Con ?probar-emergencia en la dirección, la pantalla sale con una falla de prueba: para verla sin romper nada. */
const PARAMETRO_PRUEBA = 'probar-emergencia';
/** Adónde se manda la falla para que quede en el registro de este computador (servidor/api.ts › /falla). */
const RUTA_FALLA = '/__estudio/director/falla';

/** Adónde se pregunta por la versión que funcionaba y se pide volver a ella (servidor/api.ts › /volver; volver.ts). */
const RUTA_VOLVER = '/__estudio/director/volver';
/** Adónde se pide «Diagnosticar y reparar» y se pregunta cómo va (servidor/api.ts › /reparar; reparar.ts). */
const RUTA_REPARAR = '/__estudio/director/reparar';

export const TEXTOS_EMERGENCIA: Record<IdiomaEmergencia, {
  titulo: string; texto: string; fallo: string; diagnosticar: string; volver: string; registro: string; ocultar: string;
  guardado: string; noGuardado: string; prueba: string; sinDetalle: string;
  volverMira: string; volverVersion: string; volverSinGuardar: string; volverSi: string; volverNo: string; volverHecha: string;
  volverRespaldo: string; recargar: string; volverSinVersion: string; volverYaEsta: string; volverNoSirve: string;
  volverFallo: string; volverSinServidor: string;
  repararEspera: string; repararTrabaja: string; repararUltimo: string; repararComprueba: string; repararGuardada: string;
  repararDeshecha: string; repararSinCambios: string; repararNoTermino: string; repararLimite: string; repararSinServidor: string;
}> = {
  es: {
    titulo: 'El Studio no pudo cargar',
    texto: 'Algo falló al abrir el Studio. Tus proyectos y su memoria no se tocaron.',
    fallo: 'Lo que falló',
    diagnosticar: 'Diagnosticar y reparar',
    volver: 'Volver a la versión que funcionaba',
    registro: 'Ver el registro',
    ocultar: 'Ocultar el registro',
    guardado: 'La falla quedó guardada en este computador.',
    noGuardado: 'No se pudo guardar la falla: el servidor del Studio no respondió.',
    prueba: 'Prueba: una falla forzada para ver esta pantalla. No se rompió nada.',
    sinDetalle: 'Sin más detalle',
    volverMira: 'Buscando la versión que funcionaba…',
    volverVersion: 'Vuelve a la versión del {fecha}, con un commit nuevo. Cambios que llegaron después y se deshacen: {n}. Tus proyectos y su memoria no se tocan.',
    volverSinGuardar: 'Los {n} archivos que aún no tienen commit se guardan antes en una rama de respaldo: no se pierde nada.',
    volverSi: 'Volver',
    volverNo: 'Cancelar',
    volverHecha: 'Listo: el código del Studio volvió a la versión del {fecha}. Recarga esta página para abrirlo.',
    volverRespaldo: 'Lo que no tenía commit quedó en la rama {rama}.',
    recargar: 'Recargar',
    volverSinVersion: 'Aún no hay en este computador una versión que funcionó: se anota cada vez que una revisión cierra con el Studio cargando.',
    volverYaEsta: 'El Studio ya está en la versión que funcionaba: volver no cambiaría nada.',
    volverNoSirve: 'No se puede volver:',
    volverFallo: 'No se pudo volver:',
    volverSinServidor: 'El servidor del Studio no respondió: desde aquí no se puede volver.',
    repararEspera: 'Espera a que cierre la revisión en marcha: entonces empieza sola.',
    repararTrabaja: 'Reparando desde hace {min} min{ultimo}.',
    repararUltimo: ' · lo último: {ultimo}',
    repararComprueba: 'El director terminó: el Studio corre los tipos y las pruebas de su arreglo.',
    repararGuardada: 'Reparado: el arreglo pasó sus pruebas, quedó en su propio commit y el Studio se reinició. Recarga esta página.',
    repararDeshecha: 'El arreglo no pasó sus pruebas y se deshizo: no cambió nada. Puedes intentarlo otra vez o volver a la versión que funcionaba.',
    repararSinCambios: 'El director no encontró nada que cambiar.',
    repararNoTermino: 'La reparación no terminó.',
    repararLimite: 'Tu límite de cinco horas va en {uso} %: una reparación puede cortarse antes de terminar. «Volver a la versión que funcionaba» no gasta de tu plan.',
    repararSinServidor: 'El servidor del Studio no respondió: desde aquí no se puede reparar.',
  },
  en: {
    titulo: 'The Studio could not load',
    texto: 'Something failed while opening the Studio. Your projects and their memory were not touched.',
    fallo: 'What failed',
    diagnosticar: 'Diagnose and repair',
    volver: 'Go back to the version that worked',
    registro: 'See the record',
    ocultar: 'Hide the record',
    guardado: 'The failure was saved on this computer.',
    noGuardado: 'The failure could not be saved: the Studio’s server did not answer.',
    prueba: 'Test: a forced failure to see this screen. Nothing broke.',
    sinDetalle: 'No more detail',
    volverMira: 'Looking for the version that worked…',
    volverVersion: 'It goes back to the version of {fecha}, with a new commit. Changes that came after it and are undone: {n}. Your projects and their memory are not touched.',
    volverSinGuardar: 'The {n} files not yet in a commit are first saved in a backup branch: nothing is lost.',
    volverSi: 'Go back',
    volverNo: 'Cancel',
    volverHecha: 'Done: the Studio’s code is back to the version of {fecha}. Reload this page to open it.',
    volverRespaldo: 'What had no commit is in the branch {rama}.',
    recargar: 'Reload',
    volverSinVersion: 'There is no version that worked recorded on this computer yet: it is recorded each time a review closes with the Studio loading.',
    volverYaEsta: 'The Studio is already on the version that worked: going back would change nothing.',
    volverNoSirve: 'It cannot go back:',
    volverFallo: 'It could not go back:',
    volverSinServidor: 'The Studio’s server did not answer: it cannot go back from here.',
    repararEspera: 'Waiting for the review that is running to close: then it starts by itself.',
    repararTrabaja: 'Repairing for {min} min{ultimo}.',
    repararUltimo: ' · last: {ultimo}',
    repararComprueba: 'The director finished: the Studio is running the types and the tests of its fix.',
    repararGuardada: 'Repaired: the fix passed its tests, was saved in its own commit and the Studio restarted. Reload this page.',
    repararDeshecha: 'The fix did not pass its tests and was undone: nothing changed. You can try again or go back to the version that worked.',
    repararSinCambios: 'The director found nothing to change.',
    repararNoTermino: 'The repair did not finish.',
    repararLimite: 'Your 5-hour limit is at {uso} %: a repair may be cut before it ends. «Go back to the version that worked» does not use your plan.',
    repararSinServidor: 'The Studio’s server did not answer: it cannot repair from here.',
  },
};

export interface FallaDeCarga {
  cuando: string;
  mensaje: string;
  traza: string;
  /** Dónde se vio: un error sin atrapar, una promesa rechazada o un archivo que no cargó. */
  donde: 'error' | 'promesa' | 'archivo' | 'prueba';
  prueba?: boolean;
}

/** El idioma de la pantalla: el último usado en este navegador o, si no hay, inglés. Pura. */
export function idiomaDeEmergencia(guardado: string | null | undefined): IdiomaEmergencia {
  return guardado === 'es' || guardado === 'en' ? guardado : 'en';
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** El HTML de la pantalla, con su estilo dentro (no cuenta con estilos.css). Pura. */
export function htmlEmergencia(idioma: IdiomaEmergencia, falla: FallaDeCarga): string {
  const t = TEXTOS_EMERGENCIA[idioma];
  return `<div class="emergencia" id="emergencia" role="alert" lang="${idioma}">
<style>
.emergencia{position:fixed;inset:0;z-index:2147483002;display:grid;place-items:center;padding:24px;background:#f7f3ea;color:#3b3a36;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
html.oscuro .emergencia{background:#16161a;color:#e9e4d6}
.emergencia-caja{max-width:40em;display:grid;gap:14px}
.emergencia h1{margin:0;font-size:22px}
.emergencia p{margin:0;line-height:1.5}
.emergencia-fallo{padding:10px 14px;border-radius:10px;background:rgba(200,80,60,.12);font-family:ui-monospace,Consolas,monospace;font-size:13px;white-space:pre-wrap;word-break:break-word}
.emergencia-botones{display:flex;flex-wrap:wrap;gap:10px}
.emergencia-boton{font:inherit;font-size:14px;font-weight:600;padding:8px 16px;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;display:grid;justify-items:center}
.emergencia-boton[disabled]{opacity:.55;cursor:not-allowed}
.emergencia-boton small{font-weight:400;font-size:11px}
.emergencia-traza{max-height:40vh;overflow-y:auto;margin:0;padding:10px 14px;border-radius:10px;background:rgba(0,0,0,.06);font-size:12px;white-space:pre-wrap}
.emergencia-traza[hidden]{display:none}
.emergencia-nota{font-size:13px;opacity:.8}
.emergencia-volver{display:grid;gap:10px;padding:12px 14px;border-radius:10px;border:1px solid currentColor}
.emergencia-volver[hidden]{display:none}
.emergencia-volver code{font-family:ui-monospace,Consolas,monospace;font-size:13px}
</style>
<div class="emergencia-caja">
<h1>${escapar(t.titulo)}</h1>
<p>${escapar(falla.prueba ? t.prueba : t.texto)}</p>
<p><b>${escapar(t.fallo)}:</b></p>
<div class="emergencia-fallo">${escapar(falla.mensaje || t.sinDetalle)}</div>
<div class="emergencia-botones">
<button type="button" class="emergencia-boton" data-emergencia="diagnosticar" id="emergencia-boton-reparar" aria-controls="emergencia-reparar">${escapar(t.diagnosticar)}</button>
<button type="button" class="emergencia-boton" data-emergencia="volver" id="emergencia-boton-volver" aria-controls="emergencia-volver">${escapar(t.volver)}</button>
<button type="button" class="emergencia-boton" data-emergencia="registro" aria-expanded="false" aria-controls="emergencia-traza">${escapar(t.registro)}</button>
</div>
<p class="emergencia-nota" id="emergencia-limite" hidden></p>
<p id="emergencia-reparar" aria-live="polite" hidden></p>
<div class="emergencia-volver" id="emergencia-volver" aria-live="polite" hidden></div>
<pre class="emergencia-traza" id="emergencia-traza" hidden>${escapar(`${falla.cuando}\n${falla.mensaje}\n\n${falla.traza || t.sinDetalle}`)}</pre>
<p class="emergencia-nota" id="emergencia-nota"></p>
</div>
</div>`;
}

/** Lo que el servidor dice antes y después de volver (servidor/volver.ts › InfoVuelta y ResultadoVuelta, sin importarlos). */
export interface RespuestaDeVuelta {
  estado: string;
  commit?: string;
  fecha?: string;
  despues?: number;
  sinGuardar?: number;
  respaldo?: string | null;
  detalle?: string;
}

function fechaLegible(iso: string | undefined, idioma: IdiomaEmergencia): string {
  const d = new Date(iso ?? '');
  return Number.isNaN(d.getTime()) ? String(iso ?? '') : d.toLocaleString(idioma, { dateStyle: 'long', timeStyle: 'short' });
}

/**
 * Lo que sale bajo los botones con «Volver a la versión que funcionaba»: primero qué versión es, con «Volver» y «Cancelar»
 * (nmw9oexiptit), y después lo que pasó. Con null, el servidor no respondió. Pura.
 */
export function htmlDeVuelta(idioma: IdiomaEmergencia, r: RespuestaDeVuelta | null): string {
  const t = TEXTOS_EMERGENCIA[idioma];
  const p = (s: string) => `<p>${s}</p>`;
  const con = (s: string, campos: Record<string, string | number>) => escapar(s).replace(/\{(\w+)\}/g, (_, k: string) => (k in campos ? `<b>${escapar(String(campos[k]))}</b>` : `{${k}}`));
  if (!r) return p(escapar(t.volverSinServidor));
  switch (r.estado) {
    case 'lista':
      return [
        p(con(t.volverVersion, { fecha: fechaLegible(r.fecha, idioma), n: r.despues ?? 0 })),
        r.sinGuardar ? p(con(t.volverSinGuardar, { n: r.sinGuardar })) : '',
        `<div class="emergencia-botones"><button type="button" class="emergencia-boton" id="emergencia-volver-si">${escapar(t.volverSi)}</button><button type="button" class="emergencia-boton" id="emergencia-volver-no">${escapar(t.volverNo)}</button></div>`,
      ].join('');
    case 'hecha':
      return [
        p(con(t.volverHecha, { fecha: fechaLegible(r.fecha, idioma) })),
        r.respaldo ? p(escapar(t.volverRespaldo).replace('{rama}', `<code>${escapar(r.respaldo)}</code>`)) : '',
        `<div class="emergencia-botones"><button type="button" class="emergencia-boton" id="emergencia-recargar">${escapar(t.recargar)}</button></div>`,
      ].join('');
    case 'sin_version':
      return p(escapar(t.volverSinVersion));
    case 'ya_esta':
      return p(escapar(t.volverYaEsta));
    default:
      // Una línea en tu idioma y el mensaje de la herramienta tal como llegó (nmw9ogeditit)
      return p(`${escapar(r.estado === 'fallo' ? t.volverFallo : t.volverNoSirve)} <code>${escapar(r.detalle || t.sinDetalle)}</code>`);
  }
}

/** Lo que dice el servidor de «Diagnosticar y reparar» (servidor/reparar.ts › EstadoReparacion, sin importarlo). */
export interface RespuestaDeReparacion {
  estado: string;
  minutos?: number;
  ultimo?: string;
  informe?: string;
  uso?: number | null;
}

/** Si la reparación sigue (pedida, trabajando o comprobando): la pantalla la vuelve a mirar cada 5 segundos. Pura. */
export const reparacionSigue = (r: RespuestaDeReparacion | null) => !!r && ['espera', 'trabaja', 'comprueba'].includes(r.estado);

/** La línea de lo que hace la reparación (nmw9rdaystit); con null, el servidor no respondió. Vacía si nunca hubo. Pura. */
export function lineaDeReparacion(idioma: IdiomaEmergencia, r: RespuestaDeReparacion | null): string {
  const t = TEXTOS_EMERGENCIA[idioma];
  if (!r) return t.repararSinServidor;
  switch (r.estado) {
    case 'espera': return t.repararEspera;
    case 'trabaja': return t.repararTrabaja.replace('{min}', String(r.minutos ?? 0)).replace('{ultimo}', r.ultimo ? t.repararUltimo.replace('{ultimo}', r.ultimo) : '');
    case 'comprueba': return t.repararComprueba;
    case 'guardada': return t.repararGuardada;
    case 'deshecha': return t.repararDeshecha;
    case 'sin_cambios': return t.repararSinCambios;
    case 'no_termino': return t.repararNoTermino;
    default: return '';
  }
}

/** La línea bajo el botón cuando el límite de cinco horas pasa del 90 % (nmw9p8ihbtit); vacía si no. Pura. */
export function lineaDeLimite(idioma: IdiomaEmergencia, r: RespuestaDeReparacion | null): string {
  return typeof r?.uso === 'number' && r.uso >= 90 ? TEXTOS_EMERGENCIA[idioma].repararLimite.replace('{uso}', String(r.uso)) : '';
}

/** Lo que el módulo necesita del navegador: así se prueba sin un navegador. */
export interface EntornoEmergencia {
  ventana: { addEventListener(tipo: string, fn: (e: unknown) => void, captura?: boolean): void };
  documento: Document;
  idiomaGuardado: () => string | null;
  enviar: (falla: FallaDeCarga) => Promise<boolean>;
  /** Qué versión se recuperaría (GET /volver); null si el servidor no responde. */
  consultarVuelta?: () => Promise<RespuestaDeVuelta | null>;
  /** Vuelve a ella (POST /volver), con el commit que la persona vio. */
  pedirVuelta?: (commit: string) => Promise<RespuestaDeVuelta | null>;
  /** Cómo va «Diagnosticar y reparar» (GET /reparar); null si el servidor no responde. */
  consultarReparacion?: () => Promise<RespuestaDeReparacion | null>;
  /** La pide, con la falla que se ve (POST /reparar). */
  pedirReparacion?: (falla: FallaDeCarga) => Promise<RespuestaDeReparacion | null>;
  recargar?: () => void;
  ahora?: () => string;
  esperar?: (ms: number, fn: () => void) => void;
}

/** Cuánto se espera, después de un error o de una promesa rechazada, a que el Studio termine de cargar antes de taparlo. */
export const ESPERA_MS = { error: 3000, promesa: 15000 } as const;

/** Saca de un evento de error lo que se guarda; null si no es una falla de la carga del Studio. Pura. */
export function fallaDeEvento(e: unknown, cuando: string): FallaDeCarga | null {
  const ev = e as { type?: string; reason?: unknown; error?: unknown; message?: string; target?: { tagName?: string; src?: string } };
  if (ev?.type === 'unhandledrejection') {
    const r = ev.reason as { message?: string; stack?: string } | undefined;
    return { cuando, mensaje: String(r?.message ?? r ?? ''), traza: String(r?.stack ?? ''), donde: 'promesa' };
  }
  const etiqueta = ev?.target?.tagName;
  if (etiqueta === 'SCRIPT') {
    const archivo = ev.target?.src || '';
    return { cuando, mensaje: `No se pudo cargar ${archivo}`, traza: '', donde: 'archivo' };
  }
  const err = ev?.error as { message?: string; stack?: string } | undefined;
  const mensaje = err?.message ?? ev?.message;
  if (!mensaje) return null;
  return { cuando, mensaje: String(mensaje), traza: String(err?.stack ?? ''), donde: 'error' };
}

/**
 * Escucha las fallas mientras el Studio carga y, con la primera, muestra la pantalla y la manda al registro. Devuelve
 * `listo`, que app.ts llama cuando el Studio ya está pintado: desde ahí, una falla ya no es de la carga y no la tapa.
 */
export function instalarEmergencia(entorno: EntornoEmergencia): { listo: () => void; mostrar: (f: FallaDeCarga) => void } {
  let cargado = false;
  let mostrada = false;
  const ahora = entorno.ahora ?? (() => new Date().toISOString());
  const doc = entorno.documento;
  const mostrar = (falla: FallaDeCarga) => {
    if (cargado || mostrada) return;
    mostrada = true;
    const idioma = idiomaDeEmergencia(entorno.idiomaGuardado());
    doc.documentElement.dataset.estudio = 'fallo';
    doc.getElementById('cubierta-carga')?.setAttribute('hidden', '');
    doc.body.insertAdjacentHTML('beforeend', htmlEmergencia(idioma, falla));
    const t = TEXTOS_EMERGENCIA[idioma];
    const botonRegistro = doc.querySelector<HTMLButtonElement>('[data-emergencia="registro"]');
    const traza = doc.getElementById('emergencia-traza');
    if (botonRegistro && traza) {
      botonRegistro.onclick = () => {
        const abrir = traza.hasAttribute('hidden');
        if (abrir) traza.removeAttribute('hidden'); else traza.setAttribute('hidden', '');
        botonRegistro.textContent = abrir ? t.ocultar : t.registro;
        botonRegistro.setAttribute('aria-expanded', String(abrir));
      };
    }
    // «Volver a la versión que funcionaba»: primero qué versión es; con «Volver», vuelve (servidor/volver.ts)
    const botonVolver = doc.getElementById('emergencia-boton-volver') as HTMLButtonElement | null;
    const caja = doc.getElementById('emergencia-volver');
    if (botonVolver && caja) {
      const pintar = (r: RespuestaDeVuelta | null) => { caja.innerHTML = htmlDeVuelta(idioma, r); caja.removeAttribute('hidden'); };
      const pedir = (fn: (() => Promise<RespuestaDeVuelta | null>) | undefined) => (fn ? fn() : Promise.resolve(null)).then((x) => x, () => null);
      botonVolver.onclick = () => {
        botonVolver.disabled = true;
        caja.textContent = t.volverMira;
        caja.removeAttribute('hidden');
        void pedir(entorno.consultarVuelta).then((info) => {
          pintar(info);
          if (info?.estado !== 'lista' || !info.commit) { botonVolver.disabled = false; return; }
          const commit = info.commit;
          const si = doc.getElementById('emergencia-volver-si') as HTMLButtonElement | null;
          const no = doc.getElementById('emergencia-volver-no') as HTMLButtonElement | null;
          if (no) no.onclick = () => { caja.setAttribute('hidden', ''); caja.innerHTML = ''; botonVolver.disabled = false; };
          if (si) si.onclick = () => {
            si.disabled = true;
            if (no) no.disabled = true;
            void pedir(entorno.pedirVuelta && (() => entorno.pedirVuelta!(commit))).then((r) => {
              pintar(r);
              const recargar = doc.getElementById('emergencia-recargar') as HTMLButtonElement | null;
              if (recargar) recargar.onclick = () => entorno.recargar?.();
              if (r?.estado !== 'hecha') botonVolver.disabled = false;
            });
          };
        });
      };
    }
    // «Diagnosticar y reparar» (pd_salud_c): un clic, un intento, con la falla que se ve; mientras sigue, la línea de lo que
    // hace se refresca cada 5 segundos. Al abrir, si el límite de cinco horas pasa del 90 %, la línea de aviso
    const botonReparar = doc.getElementById('emergencia-boton-reparar') as HTMLButtonElement | null;
    const lineaReparar = doc.getElementById('emergencia-reparar');
    const lineaLimite = doc.getElementById('emergencia-limite');
    const esperarRep = entorno.esperar ?? ((ms: number, fn: () => void) => { setTimeout(fn, ms); });
    const pintarReparacion = (r: RespuestaDeReparacion | null) => {
      const limite = lineaDeLimite(idioma, r);
      if (lineaLimite) { lineaLimite.textContent = limite; if (limite) lineaLimite.removeAttribute('hidden'); else lineaLimite.setAttribute('hidden', ''); }
      const linea = lineaDeReparacion(idioma, r);
      if (lineaReparar) { lineaReparar.textContent = linea; if (linea) lineaReparar.removeAttribute('hidden'); else lineaReparar.setAttribute('hidden', ''); }
      if (botonReparar) botonReparar.disabled = reparacionSigue(r);
      if (reparacionSigue(r)) esperarRep(5000, () => void pedirRep(entorno.consultarReparacion).then(pintarReparacion));
    };
    const pedirRep = (fn: (() => Promise<RespuestaDeReparacion | null>) | undefined) => (fn ? fn() : Promise.resolve(null)).then((x) => x, () => null);
    if (entorno.consultarReparacion) void pedirRep(entorno.consultarReparacion).then((r) => { if (r && r.estado !== 'ninguna') pintarReparacion(r); else if (r) pintarReparacion({ ...r, estado: 'ninguna' }); });
    if (botonReparar) botonReparar.onclick = () => {
      botonReparar.disabled = true;
      void pedirRep(entorno.pedirReparacion && (() => entorno.pedirReparacion!(falla))).then(pintarReparacion);
    };
    void entorno.enviar(falla).then((ok) => ok, () => false).then((ok) => {
      const nota = doc.getElementById('emergencia-nota');
      if (nota) nota.textContent = ok ? t.guardado : t.noGuardado;
    });
  };
  // Un archivo que no cargó para la carga del todo: sale ya. Un error o una promesa rechazada pueden ser de algo que la
  // carga tolera (una voz, un aviso): sale solo si el Studio no terminó de cargar en su espera
  const esperar = entorno.esperar ?? ((ms: number, fn: () => void) => { setTimeout(fn, ms); });
  const alFallar = (e: unknown) => {
    if (cargado || mostrada) return;
    const f = fallaDeEvento(e, ahora());
    if (!f) return;
    if (f.donde === 'archivo') return mostrar(f);
    esperar(ESPERA_MS[f.donde === 'promesa' ? 'promesa' : 'error'], () => mostrar(f));
  };
  entorno.ventana.addEventListener('error', alFallar, true);
  entorno.ventana.addEventListener('unhandledrejection', alFallar);
  return {
    listo: () => {
      if (mostrada) return;
      cargado = true;
      doc.documentElement.dataset.estudio = 'cargado';
    },
    mostrar,
  };
}

// En el navegador: se instala sola al cargar este módulo, antes que app.ts
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const emergencia = instalarEmergencia({
    ventana: window,
    documento: document,
    idiomaGuardado: () => { try { return localStorage.getItem(CLAVE_IDIOMA); } catch { return null; } },
    enviar: (falla) => fetch(RUTA_FALLA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(falla) }).then((r) => r.ok, () => false),
    consultarVuelta: () => fetch(RUTA_VOLVER).then((r) => (r.ok ? r.json() : null), () => null),
    pedirVuelta: (commit) => fetch(RUTA_VOLVER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commit }) }).then((r) => (r.ok ? r.json() : null), () => null),
    consultarReparacion: () => fetch(RUTA_REPARAR).then((r) => (r.ok ? r.json() : null), () => null),
    pedirReparacion: (falla) => fetch(RUTA_REPARAR, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ falla: falla.prueba ? null : { mensaje: falla.mensaje, traza: falla.traza } }) }).then((r) => (r.ok ? r.json() : null), () => null),
    recargar: () => location.reload(),
  });
  (window as unknown as { __stlListo?: () => void }).__stlListo = emergencia.listo;
  if (new URLSearchParams(location.search).has(PARAMETRO_PRUEBA)) {
    emergencia.mostrar({ cuando: new Date().toISOString(), mensaje: 'Error: falla forzada para probar la pantalla de emergencia', traza: new Error('prueba').stack ?? '', donde: 'prueba', prueba: true });
  }
}
