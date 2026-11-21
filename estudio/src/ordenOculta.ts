// La orden de un paso, sin ventana de terminal (pd_sin_terminal; documento «sin-terminal» y sus decisiones nmwpsogkvtit,
// nmwpsoraqtit y nmwpsp0k1tit; elecciones nmwpv6oqftit, nmwpv8nfxtit, nmwpv9aa3tit, nmwpv9yv1tit, nmwpxonn0tit,
// nmwpxp0z0tit, nmwpxra8ntit, nmwpxrr3ctit, nmwpxsauntit, nmwpz12rqtit, nmwpz210xtit, nmwpz3b9ctit, nmwqkmuivtit,
// nmwqkn8m1tit y nmwqknqadtit). «Correr aquí» corre la orden en el servidor del Studio (terminalOculta.ts) y el paso
// muestra una línea con su resultado y la salida plegada. La primera vez de cada tipo de acción, el paso pregunta «Hazlo
// ahora», «Hazlo ahora, y siempre en este proyecto» o «No»; una acción crítica (subir, publicar, desplegar) dice antes qué
// manda y desde dónde. Arriba, una línea cuenta las órdenes que corren en todo el Studio, cada una con su proyecto, con
// «Detener», «Darle 10 minutos más» al llegar a los 10 minutos y el aviso de la orden callada (3 minutos sin escribir),
// que ofrece abrirla en una terminal. Si falla: «Intentar de nuevo» o la terminal, y su nota de error ya está en el Buzón
// (la deja el servidor). Si termina bien, el paso se marca solo, como con «Ya lo hice» (con su comprobación, si la tiene).
import { t as tx } from './textos';
import { esc } from './util';

export type FaseVista = 'corriendo' | 'hecha' | 'fallo' | 'detenida';
export interface CorridaVista {
  id: string;
  proyecto: string;
  mision: string;
  paso: number;
  orden: string;
  fase: FaseVista;
  codigo: number | null;
  salida: string;
  inicio: string;
  fin: string | null;
  pideTiempo: boolean;
  callada: boolean;
  quedanMs: number;
}
export interface EstadoCorridas { corridas: CorridaVista[]; enMarcha: number; nombres: Record<string, string> }
/** Lo que el servidor dice antes de correr la orden de un paso. */
export interface Consulta { orden: string; carpeta: string; ya: boolean; critica: boolean; seRecuerda: boolean; enVentana: boolean }

const API = '/__estudio/director/terminal';
/** Cuántas órdenes en marcha nombra la línea de arriba; las demás, «y N más». */
const EN_LA_LINEA = 3;

/** La última corrida de un paso en ese proyecto (el servidor las da de la más reciente a la más vieja), o null. Pura. */
export function corridaDelPaso(corridas: readonly CorridaVista[], proyecto: string, mision: string, paso: number): CorridaVista | null {
  return corridas.find((c) => c.proyecto === proyecto && c.mision === mision && c.paso === paso) ?? null;
}

/** El botón «Correr aquí» de un paso con orden. Pura. */
export const botonCorrer = (clave: string): string =>
  `<button type="button" class="primario correr-aqui" data-correr="${esc(clave)}" title="${esc(tx('oculta.correrTitulo'))}">${esc(tx('oculta.correr'))}</button>`;

/**
 * La pregunta de la primera vez de un tipo de acción, con lo que va a correr y dónde; la crítica dice qué manda y desde
 * qué carpeta de qué proyecto (nmwpxsauntit). Sin un tipo de acción que recordar (varias órdenes juntas), no ofrece
 * «siempre». Pura.
 */
export function preguntaHtml(clave: string, c: Consulta, proyecto: string): string {
  const dice = c.critica ? tx('oculta.critica', { orden: c.orden, carpeta: c.carpeta, proyecto }) : tx('oculta.pregunta', { orden: c.orden, carpeta: c.carpeta });
  return `<div class="pregunta-orden" role="group"><p>${esc(dice)}</p><div class="acciones-orden"><button type="button" class="primario" data-correr-si="${esc(clave)}|ahora">${esc(tx('oculta.ahora'))}</button>${c.seRecuerda ? `<button type="button" data-correr-si="${esc(clave)}|siempre">${esc(tx('oculta.siempre'))}</button>` : ''}<button type="button" class="boton-suave" data-correr-si="${esc(clave)}|no">${esc(tx('oculta.no'))}</button></div></div>`;
}

/** La línea crítica que va antes de la corrida, aunque ya tenga «Siempre»: qué manda y desde dónde. Pura. */
export const lineaCritica = (orden: string, carpeta: string, proyecto: string): string =>
  `<p class="linea-critica">${esc(tx('oculta.critica', { orden, carpeta, proyecto }))}</p>`;

/**
 * La línea del paso con el resultado de su orden y la salida entera plegada (nmwpv9yv1tit). Si falló, «Intentar de nuevo»
 * o «Abrir la terminal con esta orden» (nmwpxonn0tit), y dice que su nota de error ya está en el Buzón (nmwpz210xtit). Pura.
 */
export function lineaDelPaso(c: CorridaVista | null, clave: string): string {
  if (!c) return '';
  const salida = c.salida ? `<details class="salida-orden"><summary>${esc(tx('oculta.verSalida'))}</summary><pre>${esc(c.salida)}</pre></details>` : '';
  if (c.fase === 'corriendo') return `<p class="corrida-estado corriendo" role="status">${esc(tx('oculta.corriendo'))}</p>${salida}`;
  if (c.fase === 'hecha') return `<p class="corrida-estado hecha" role="status">${esc(tx('oculta.hecha'))}</p>${salida}`;
  if (c.fase === 'detenida') return `<p class="corrida-estado detenida" role="status">${esc(tx('oculta.detenida'))}</p>${salida}`;
  return `<p class="corrida-estado fallo" role="alert">${esc(tx('oculta.fallo', { codigo: c.codigo ?? '—' }))}</p><div class="acciones-orden"><button type="button" data-correr="${esc(clave)}">${esc(tx('oculta.reintentar'))}</button><button type="button" class="abrir-terminal" data-terminal="${esc(clave)}">${esc(tx('paso.abrirTerminal'))}</button></div>${salida}`;
}

/**
 * La línea de arriba (nmwpxrr3ctit): cuántas órdenes corren en todo el Studio, cada una con su proyecto (nmwqknqadtit),
 * con «Detener» siempre; «Darle 10 minutos más» al llegar a los 10 minutos (nmwpz4vnbtit); y, si lleva 3 minutos sin
 * escribir (nmwqkmuivtit), el aviso de que puede esperar una respuesta, con «Me pide escribir: ábrela en una terminal»
 * (nmwqkn8m1tit). Vacía si nada corre. Pura.
 */
export function lineaDeArriba(e: EstadoCorridas): string {
  const vivas = e.corridas.filter((c) => c.fase === 'corriendo');
  if (!vivas.length) return '';
  const cabeza = vivas.length === 1 ? tx('oculta.lineaUna') : tx('oculta.lineaVarias', { n: vivas.length });
  const filas = vivas.slice(0, EN_LA_LINEA).map((c) => {
    const id = esc(c.id);
    const callada = c.callada ? `<span class="aviso-callada">${esc(tx('oculta.callada'))}</span><button type="button" data-a-ventana="${id}">${esc(tx('oculta.aVentana'))}</button>` : '';
    const tiempo = c.pideTiempo ? `<span class="aviso-tiempo">${esc(tx('oculta.pideTiempo'))}</span><button type="button" class="primario" data-mas-tiempo="${id}">${esc(tx('oculta.mas'))}</button>` : '';
    return `<li><code>${esc(c.orden)}</code><span class="proyecto-orden">${esc(e.nombres[c.proyecto] ?? c.proyecto)}</span>${callada}${tiempo}<button type="button" class="boton-suave" data-detener-orden="${id}">${esc(tx('oculta.detener'))}</button></li>`;
  });
  const mas = vivas.length > EN_LA_LINEA ? `<span class="y-mas">${esc(tx('oculta.yMas', { n: vivas.length - EN_LA_LINEA }))}</span>` : '';
  return `<strong>${esc(cabeza)}</strong><ul>${filas.join('')}</ul>${mas}`;
}

/** Las corridas que acaban de terminar bien en ese proyecto y aún no marcaron su paso. Pura. */
export function recienHechas(corridas: readonly CorridaVista[], proyecto: string, vistas: ReadonlySet<string>): CorridaVista[] {
  return corridas.filter((c) => c.proyecto === proyecto && c.fase === 'hecha' && !vistas.has(c.id));
}

// Lo que sigue usa el navegador: el estado que dio el servidor, la línea de arriba y los pasos a la vista
let estado: EstadoCorridas = { corridas: [], enMarcha: 0, nombres: {} };
let caja: HTMLElement | null = null;
let reloj: ReturnType<typeof setTimeout> | null = null;
/** Las corridas ya atendidas (su paso se marcó o ya estaban al abrir la página): no se marcan otra vez. */
const vistas = new Set<string>();
let primera = true;
/** La línea crítica de cada paso que corre algo crítico (por clave), para que vaya antes de su resultado. */
const criticas = new Map<string, string>();
let proyectoAbierto: () => string = () => '';
let nombreAbierto: () => string = () => '';
let avisar: (texto: string, bien?: boolean) => void = () => undefined;

/** Lo que muestra el paso: su línea crítica, si la tiene, y el resultado de su última corrida. */
export function htmlDelPaso(mision: string, paso: number): string {
  const clave = `${mision}|${paso}`;
  return (criticas.get(clave) ?? '') + lineaDelPaso(corridaDelPaso(estado.corridas, proyectoAbierto(), mision, paso), clave);
}

const contenedor = (clave: string) => document.querySelector<HTMLElement>(`[data-corrida-de="${CSS.escape(clave)}"]`);

function pintar() {
  if (caja) {
    const html = lineaDeArriba(estado);
    caja.innerHTML = html;
    caja.hidden = !html;
  }
  document.querySelectorAll<HTMLElement>('[data-corrida-de]').forEach((el) => {
    const [mision, paso] = (el.dataset.corridaDe ?? '').split('|');
    // La pregunta de la primera vez queda hasta que se conteste
    if (el.querySelector('.pregunta-orden')) return;
    const html = htmlDelPaso(mision, Number(paso));
    if (el.innerHTML !== html) {
      // Lo que la persona desplegó queda desplegado al repintar
      const abierta = !!el.querySelector('details[open]');
      el.innerHTML = html;
      if (abierta) el.querySelector('details')?.setAttribute('open', '');
    }
  });
}

/** El paso que terminó bien se marca solo, como con «Ya lo hice» (que lo comprueba si tiene comprobación). */
function marcarLasHechas() {
  for (const c of recienHechas(estado.corridas, proyectoAbierto(), vistas)) {
    vistas.add(c.id);
    if (!primera) document.querySelector<HTMLButtonElement>(`[data-ya-hice="${CSS.escape(`${c.mision}|${c.paso}`)}"]`)?.click();
  }
  // Las que ya habían terminado al abrir la página no marcan nada: su paso ya se marcó o se marca a mano
  for (const c of estado.corridas) if (primera && c.fase !== 'corriendo') vistas.add(c.id);
  primera = false;
}

async function consultarServidor() {
  try {
    const r = await fetch(`${API}/corridas`, { signal: AbortSignal.timeout(10_000) }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (r && Array.isArray(r.corridas)) {
      estado = { corridas: r.corridas, enMarcha: Number(r.enMarcha) || 0, nombres: r.nombres ?? {} };
      marcarLasHechas();
      pintar();
    }
  } finally {
    // Un tropiezo al pintar no deja de mirar las órdenes
    programar();
  }
}

/** Mientras algo corre, cada 2 segundos; si no, cada 20 (otra pestaña o la revisión pueden lanzar una). */
function programar(ms?: number) {
  if (reloj) clearTimeout(reloj);
  reloj = setTimeout(() => void consultarServidor(), ms ?? (estado.enMarcha ? 2_000 : 20_000));
}

async function enviar(ruta: string, cuerpo: unknown): Promise<{ ok: boolean; datos: any }> {
  const r = await fetch(`${API}${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!r) return { ok: false, datos: { error: tx('servidor.noHabla') } };
  return { ok: r.ok, datos: await r.json().catch(() => ({})) };
}

async function lanzar(clave: string, siempre: 'proyecto' | null) {
  const [mision, paso] = clave.split('|');
  const r = await enviar('/correr', { mision, paso: Number(paso), ...(siempre ? { siempre } : {}) });
  if (!r.ok) return avisar(r.datos.error ?? tx('oculta.noSalio'));
  if (r.datos.enVentana) return avisar(tx('oculta.enVentana'), true);
  if (r.datos.corrida) estado = { ...estado, corridas: [r.datos.corrida, ...estado.corridas], enMarcha: estado.enMarcha + 1 };
  pintar();
  programar(1_000);
}

async function correr(clave: string) {
  const [mision, paso] = clave.split('|');
  const r = await fetch(`${API}/consultar?${new URLSearchParams({ mision, paso })}`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  const datos = r ? await r.json().catch(() => ({})) : { error: tx('servidor.noHabla') };
  if (!r?.ok) return avisar(datos.error ?? tx('oculta.noSalio'));
  const c = datos as Consulta;
  // Un tipo de orden que ya pidió escribir va directo a una ventana
  if (c.enVentana) return lanzar(clave, null);
  if (c.critica) criticas.set(clave, lineaCritica(c.orden, c.carpeta, nombreAbierto()));
  else criticas.delete(clave);
  if (c.ya) return lanzar(clave, null);
  const el = contenedor(clave);
  if (el) el.innerHTML = preguntaHtml(clave, c, nombreAbierto());
}

/** Enciende las órdenes sin ventana: la línea de arriba, los clics de sus botones y la consulta al servidor. */
export function iniciarOrdenesOcultas(o: { proyecto: () => string; nombre: () => string; avisar: (texto: string, bien?: boolean) => void }) {
  proyectoAbierto = o.proyecto;
  nombreAbierto = o.nombre;
  avisar = o.avisar;
  caja = document.createElement('div');
  caja.className = 'ordenes-en-marcha';
  caja.setAttribute('role', 'status');
  caja.setAttribute('aria-live', 'polite');
  caja.hidden = true;
  document.body.append(caja);
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    const ds = b?.dataset;
    if (!b || !ds) return;
    if (ds.correr) void correr(ds.correr);
    else if (ds.correrSi) {
      const partes = ds.correrSi.split('|');
      const que = partes.pop();
      const clave = partes.join('|');
      const el = contenedor(clave);
      if (el) el.innerHTML = '';
      if (que === 'no') {
        criticas.delete(clave);
        return pintar();
      }
      void lanzar(clave, que === 'siempre' ? 'proyecto' : null);
    } else if (ds.masTiempo) void enviar('/mas-tiempo', { id: ds.masTiempo }).then(() => consultarServidor());
    else if (ds.detenerOrden) void enviar('/detener', { id: ds.detenerOrden }).then(() => consultarServidor());
    else if (ds.aVentana) {
      void enviar('/a-ventana', { id: ds.aVentana }).then((r) => {
        if (!r.ok) avisar(r.datos.error ?? tx('terminal.noSePudo'));
        else avisar(tx('oculta.enVentana'), true);
        return consultarServidor();
      });
    }
  });
  void consultarServidor();
}
