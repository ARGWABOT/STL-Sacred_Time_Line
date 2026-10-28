// Quién eres en el Estudio y el director asistente en persona.
//
// El selector de la cabecera elige de quién es lo que se ve: una persona del equipo o todo el equipo. Es un filtro de
// la vista para no ver los pendientes de los demás: las misiones, las notas y los documentos de esa persona. Lo que se
// hace se firma siempre con la identidad de git de este computador.
//
// El director asistente es la cara flotante abajo a la derecha: dice frases de ánimo y de empuje
// (src/director/animo.ts) y, al tocarlo, lleva a la persona elegida a su siguiente pendiente sin completar.
import './equipo.css';
import { caraSVG } from './cara';
import { destinoDeMision, frasesDelDirector, siguientePendiente, type Emocion, type Frase } from '../../src/director/animo';
import { TITULAR, type Destino, type EstadoDirector, type EtapaArranque, type Mision, type Persona, type Plan, type Proyecto, type Senales } from '../../src/director/director';
import { esc, pasosAbiertos, pasosHechos } from './util';

export type VistaEquipo = Persona | 'equipo';

interface Identidad { nombre: string; correo: string; rol: Persona | null; problema?: string; nuevo?: boolean }
export interface DatosDirector { activo?: string; plan: Plan; estado: EstadoDirector; senales: Senales; identidad: Identidad; proyecto: Proyecto; arranque: EtapaArranque }

const CLAVE_VISTA = 'estudio.vista_equipo';
const CLAVE_ROL = 'estudio.mi_rol';
const CLAVE_PLEGADO = 'estudio.director_flotante.plegado';
const EVENTO = 'estudio:vista-equipo';

let identidad: Identidad | null = null;
let datos: DatosDirector | null = null;

// ───────────────────────────────────────────── la vista: de quién es lo que se ve

const miRol = (): Persona | null => identidad?.rol ?? localStorage.getItem(CLAVE_ROL);

/** Las personas del equipo (con el equipo aún sin registrar, solo el titular). */
export function personasEquipo(): Persona[] {
  return datos?.proyecto.equipo.length ? datos.proyecto.equipo.map((i) => i.id) : [TITULAR];
}

export function vistaEquipo(): VistaEquipo {
  const v = localStorage.getItem(CLAVE_VISTA);
  if (v === 'equipo' || (v && personasEquipo().includes(v))) return v;
  return miRol() ?? 'equipo';
}

/** La persona elegida, o null si se ve todo el equipo. */
export function personaVista(): Persona | null {
  const v = vistaEquipo();
  return v === 'equipo' ? null : v;
}

/** ¿Algo de esta persona se ve con el filtro de ahora? (sin persona conocida, se ve siempre) */
export function seVe(de: Persona | null | undefined): boolean {
  const p = personaVista();
  return !p || !de || de === p;
}

/** El nombre de una persona (el titular sin registrar es quien usa este computador). */
export function nombrePersona(p: Persona): string {
  const i = datos?.proyecto.equipo.find((x) => x.id === p);
  if (i) return i.nombre;
  if (p === TITULAR) return identidad?.rol === TITULAR && identidad.nombre ? identidad.nombre : 'El titular';
  return p;
}

export function nombreVista(v: VistaEquipo = vistaEquipo()): string {
  return v === 'equipo' ? 'todo el equipo' : nombrePersona(v);
}

export function ponerVista(v: VistaEquipo) {
  localStorage.setItem(CLAVE_VISTA, v);
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: v }));
}

/** Avisa cuando cambia la persona elegida (aquí o en otra pestaña del Estudio). */
export function alCambiarVista(fn: (v: VistaEquipo) => void) {
  window.addEventListener(EVENTO, () => fn(vistaEquipo()));
  window.addEventListener('storage', (e) => { if (e.key === CLAVE_VISTA) fn(vistaEquipo()); });
}

/** El Director le pasa aquí lo que ya cargó. */
export function darDatosDirector(x: DatosDirector) {
  // Otro proyecto: lo que decía el director era del anterior, se cambia ya
  const otroProyecto = !!datos && datos.activo !== x.activo;
  datos = x;
  ponerIdentidad(x.identidad);
  frases = [];
  pintarSelector();
  if (!frase || otroProyecto) {
    decirSiguiente();
    asomar();
  }
}

function ponerIdentidad(id: Identidad | null) {
  const antes = vistaEquipo();
  identidad = id;
  if (id?.rol) localStorage.setItem(CLAVE_ROL, id.rol);
  if (vistaEquipo() !== antes) window.dispatchEvent(new CustomEvent(EVENTO, { detail: vistaEquipo() }));
}

// ───────────────────────────────────────────── el selector de la cabecera

let selector: HTMLLabelElement | null = null;

function montarSelector() {
  // Al pie de la barra lateral, donde dice quién usa el Studio
  const caja = document.getElementById('identidad');
  if (!caja || selector) return;
  selector = document.createElement('label');
  selector.id = 'vista-equipo';
  selector.className = 'vista-equipo';
  const quien = caja.querySelector('#quien');
  if (quien) quien.before(selector);
  else caja.append(selector);
  caja.classList.add('con-vista');
  selector.addEventListener('change', (e) => ponerVista((e.target as HTMLSelectElement).value as VistaEquipo));
  pintarSelector();
}

function pintarSelector() {
  if (!selector) return;
  const v = vistaEquipo();
  const yo = miRol();
  const opcion = (id: VistaEquipo, texto: string) => `<option value="${esc(id)}"${id === v ? ' selected' : ''}>${esc(texto)}</option>`;
  const cargo = (p: Persona) => {
    const i = datos?.proyecto.equipo.find((x) => x.id === p);
    const c = i?.cargo ?? (p === TITULAR ? 'Director de proyecto' : '');
    return `${nombrePersona(p)}${c ? ` · ${c}` : ''}${p === yo ? ' (tú)' : ''}`;
  };
  // Con una sola persona no hay a quién más ver: solo su nombre (el selector aparece cuando llega alguien al equipo)
  const equipo = personasEquipo();
  selector.innerHTML = equipo.length > 1
    ? `<span class="ve-etiqueta">Ver como</span>
    <select aria-label="De quién es lo que se ve en el Estudio">
      ${equipo.map((p) => opcion(p, cargo(p))).join('')}${opcion('equipo', 'Todo el equipo')}
    </select>`
    : `<span class="ve-etiqueta">Tú</span><span class="ve-solo">${esc(equipo[0] ? cargo(equipo[0]).replace(' (tú)', '') : (identidad?.nombre ?? ''))}</span>`;
  const firma = identidad?.rol ? `Lo que hagas se firma siempre como ${identidad.nombre} (${identidad.rol}), la identidad de git de este computador.` : (identidad?.problema ?? 'Este computador aún no tiene identidad de git.');
  selector.title = `Filtra el Estudio: muestra solo las misiones, las notas y los documentos de quien elijas. ${firma}`;
  selector.classList.toggle('otro', v !== 'equipo' && !!yo && v !== yo);
}

// ───────────────────────────────────────────── el director flotante (su cara está en cara.ts)

let flotante: HTMLDivElement | null = null;
let frases: Frase[] = [];
let frase: Frase | null = null;
let indice = 0;

function montarFlotante() {
  if (flotante) return;
  flotante = document.createElement('div');
  flotante.id = 'director-flotante';
  flotante.className = 'director-flotante';
  flotante.innerHTML = `
    <div class="df-globo" role="status" aria-live="polite">
      <button type="button" class="df-plegar" title="Recoger (la cara sigue aquí)" aria-label="Recoger">–</button>
      <span class="df-quien">El director asistente</span>
      <p class="df-texto"></p>
      <button type="button" class="df-ir"></button>
    </div>
    <button type="button" class="df-cara" title="Tócame: te llevo a tu siguiente pendiente">${caraSVG('feliz')}</button>`;
  document.body.append(flotante);
  flotante.querySelector('.df-cara')!.addEventListener('click', () => {
    asomar(true);
    llevar();
  });
  flotante.querySelector('.df-ir')!.addEventListener('click', () => llevar());
  flotante.querySelector('.df-texto')!.addEventListener('click', () => llevar());
  flotante.querySelector('.df-plegar')!.addEventListener('click', () => plegar(true));
  // Mientras se lee lo que dice, no se recoge
  const globo = flotante.querySelector<HTMLElement>('.df-globo')!;
  globo.addEventListener('mouseenter', () => recogerEn(0));
  globo.addEventListener('mouseleave', () => recogerEn(ASOMA_MS));
  parpadear();
}

/**
 * Lo que dice el director se asoma unos segundos (al abrir el Studio, al cambiar de proyecto o al tocar su cara) y
 * se recoge solo, para no tapar lo que se lee. Si se recoge a mano, ya no se asoma solo hasta que se toque la cara.
 */
const ASOMA_MS = 9000;
let recoger: ReturnType<typeof setTimeout> | null = null;
function recogerEn(ms: number) {
  if (recoger) clearTimeout(recoger);
  recoger = ms ? setTimeout(() => flotante?.classList.remove('asomado'), ms) : null;
}
function asomar(manual = false) {
  if (!flotante || (!manual && localStorage.getItem(CLAVE_PLEGADO) === '1')) return;
  // en un teléfono taparía media pantalla: ahí solo habla cuando se le toca la cara
  if (!manual && matchMedia('(max-width: 759px)').matches) return;
  flotante.classList.add('asomado');
  recogerEn(ASOMA_MS);
}
function plegar(si: boolean) {
  flotante?.classList.toggle('asomado', !si);
  localStorage.setItem(CLAVE_PLEGADO, si ? '1' : '0');
  if (si) recogerEn(0);
}

function ponerCara(e: Emocion | 'parpadeo') {
  const b = flotante?.querySelector('.df-cara');
  if (b) b.innerHTML = caraSVG(e);
}

function parpadear() {
  setTimeout(() => {
    if (frase && !document.hidden) {
      ponerCara('parpadeo');
      setTimeout(() => ponerCara(frase?.emocion ?? 'feliz'), 160);
    }
    parpadear();
  }, 3500 + Math.random() * 3000);
}

/** La persona a la que habla y lleva: la elegida o, con todo el equipo, quien usa este computador. */
const persona = (): Persona => personaVista() ?? miRol() ?? TITULAR;

const contexto = () => ({ plan: datos!.plan, estado: datos!.estado, senales: datos!.senales });

/** Adónde lleva la misión, con lo marcado y lo ya abierto en este navegador: un paso ya visto vuelve a la tarjeta. */
const destinoDeMisionAqui = (m: Mision) =>
  destinoDeMision(m, pasosHechos(datos?.activo ?? '', m.id), pasosAbiertos(datos?.activo ?? '', m.id, m.pasos.length));

function decirSiguiente() {
  if (!flotante || !datos) return;
  if (!frases.length || indice >= frases.length) {
    frases = frasesDelDirector(contexto(), personaVista(), datos.proyecto.equipo.length ? datos.proyecto.equipo : [{ id: TITULAR, nombre: nombrePersona(TITULAR), correo: '' }], datos.arranque);
    indice = 0;
  }
  frase = frases[indice++] ?? null;
  if (!frase) return;
  const texto = flotante.querySelector<HTMLElement>('.df-texto')!;
  texto.classList.remove('entra');
  void texto.offsetWidth;
  texto.classList.add('entra');
  texto.textContent = frase.texto;
  const sig = siguientePendiente(contexto(), persona(), datos.arranque);
  const lectura = sig.mision ? destinoDeMisionAqui(sig.mision) : null;
  const que = lectura?.doc ? lectura.etiqueta.charAt(0).toLowerCase() + lectura.etiqueta.slice(1) : sig.tipo === 'mision' ? `seguir con «${sig.texto}»` : sig.texto;
  flotante.querySelector('.df-ir')!.textContent = `${nombreVista(persona())}: ${que} →`;
  ponerCara(frase.emocion);
}

/**
 * El director responde a lo que acabas de hacer (marcar un paso): lo dice unos segundos y señala lo que sigue. Si lo
 * recogiste, no se asoma solo; en el teléfono, solo cuando le tocas la cara.
 */
export function decir(texto: string, emocion: Emocion = 'feliz') {
  if (!flotante) return;
  frase = { texto, emocion };
  const t = flotante.querySelector<HTMLElement>('.df-texto')!;
  t.classList.remove('entra');
  void t.offsetWidth;
  t.classList.add('entra');
  t.textContent = texto;
  ponerCara(emocion);
  asomar();
}

/** Lleva a la persona elegida a su siguiente pendiente sin completar: si es leer un documento, directo a él. */
function llevar() {
  if (!datos) return;
  const sig = siguientePendiente(contexto(), persona(), datos.arranque);
  const dest: Destino =
    sig.tipo === 'mision' ? destinoDeMisionAqui(sig.mision!)
    : sig.tipo === 'proyecto' ? { vista: 'proyecto', ancla: datos.arranque === 'objetivo' ? 'p-objetivo' : datos.arranque === 'contar' ? 'p-contexto' : 'p-repositorio', etiqueta: sig.texto }
    : sig.tipo === 'propuestas' ? { vista: 'propuestas', etiqueta: 'Las propuestas' }
    // Sin misión: a «Hoy», donde su paso siguiente dice que pida la revisión, con su botón
    : sig.tipo === 'revision' ? { vista: 'misiones', ancla: 'paso-siguiente', etiqueta: 'Pedir la revisión' }
    : { vista: 'buzon', ancla: 'escribir', etiqueta: 'El Buzón del director' };
  // Si la persona elegida no se ve, se cambia a ella: el pendiente es suyo
  if (personaVista() && personaVista() !== persona()) ponerVista(persona());
  window.dispatchEvent(new CustomEvent('estudio:ir', { detail: dest }));
}

// ───────────────────────────────────────────── arranque

function arrancar() {
  montarSelector();
  montarFlotante();
  alCambiarVista(() => {
    pintarSelector();
    frases = [];
    decirSiguiente();
  });
  // Mientras lo que dice está a la vista, cambia de frase; recogido, no distrae
  setInterval(() => { if (!document.hidden && flotante?.classList.contains('asomado')) decirSiguiente(); }, 12_000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
else arrancar();
