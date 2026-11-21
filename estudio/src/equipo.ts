// Quién eres en el Estudio y el director asistente en persona.
//
// Lo que se hace se firma siempre con la identidad de git de este computador, que es la del titular (el Studio es de
// una sola persona, pd_sin_modo_equipo).
//
// El director asistente es la cara flotante abajo a la derecha: dice frases de ánimo y de empuje
// (src/director/animo.ts) y, al tocarlo, lleva a quien usa el Studio a su siguiente pendiente sin completar.
import './equipo.css';
import { caraSVG } from './cara';
import { t } from './textos';
import { frasesDelDirector, siguientePendiente, type Emocion, type Frase } from '../../src/director/animo';
import { TITULAR, type Destino, type EstadoDirector, type EtapaArranque, type Persona, type Plan, type Proyecto, type Senales } from '../../src/director/director';

interface Identidad { nombre: string; correo: string; rol: Persona | null; problema?: string; nuevo?: boolean }
export interface DatosDirector { activo?: string; plan: Plan; estado: EstadoDirector; senales: Senales; identidad: Identidad; proyecto: Proyecto; arranque: EtapaArranque }

const CLAVE_ROL = 'estudio.mi_rol';
const CLAVE_PLEGADO = 'estudio.director_flotante.plegado';

let identidad: Identidad | null = null;
let datos: DatosDirector | null = null;

// ───────────────────────────────────────────── quién usa el Studio

const miRol = (): Persona | null => identidad?.rol ?? localStorage.getItem(CLAVE_ROL);

/** Las personas del equipo (con el equipo aún sin registrar, solo el titular). */
export function personasEquipo(): Persona[] {
  return datos?.proyecto.equipo.length ? datos.proyecto.equipo.map((i) => i.id) : [TITULAR];
}

/** El nombre de una persona (el titular sin registrar es quien usa este computador). */
export function nombrePersona(p: Persona): string {
  const i = datos?.proyecto.equipo.find((x) => x.id === p);
  if (i) return i.nombre;
  if (p === TITULAR) return identidad?.rol === TITULAR && identidad.nombre ? identidad.nombre : t('equipo.elTitular');
  return p;
}

/** El Director le pasa aquí lo que ya cargó. */
export function darDatosDirector(x: DatosDirector) {
  // Otro proyecto: lo que decía el director era del anterior, se cambia ya
  const otroProyecto = !!datos && datos.activo !== x.activo;
  datos = x;
  identidad = x.identidad;
  frases = [];
  if (!frase || otroProyecto) {
    decirSiguiente();
    asomar();
  }
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
      <button type="button" class="df-plegar" title="${t('equipo.recogerTitulo')}" aria-label="${t('equipo.recoger')}">–</button>
      <span class="df-quien">${t('equipo.directorAsistente')}</span>
      <p class="df-texto"></p>
      <button type="button" class="df-ir"></button>
    </div>
    <button type="button" class="df-cara" title="${t('equipo.tocame')}">${caraSVG('feliz')}</button>`;
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

/** La persona a la que habla y lleva: quien usa este computador. */
const persona = (): Persona => miRol() ?? TITULAR;

const contexto = () => ({ plan: datos!.plan, estado: datos!.estado, senales: datos!.senales });


function decirSiguiente() {
  if (!flotante || !datos) return;
  if (!frases.length || indice >= frases.length) {
    frases = frasesDelDirector(contexto(), miRol(), datos.proyecto.equipo.length ? datos.proyecto.equipo : [{ id: TITULAR, nombre: nombrePersona(TITULAR), correo: '' }], datos.arranque);
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
  // Lleva a tu misión (llevar), y así lo dice: nunca promete un documento
  const que = sig.tipo === 'mision' ? t('equipo.seguirCon', { texto: sig.texto }) : sig.texto;
  flotante.querySelector('.df-ir')!.textContent = `${nombrePersona(persona())}: ${que} →`;
  ponerCara(frase.emocion);
}

/**
 * El director responde a lo que acabas de hacer (marcar un paso): lo dice unos segundos y señala lo que sigue. Si lo
 * recogiste, no se asoma solo; en el teléfono, solo cuando le tocas la cara.
 */
export function decir(texto: string, emocion: Emocion = 'feliz') {
  if (!flotante) return;
  frase = { texto, emocion };
  const parrafo = flotante.querySelector<HTMLElement>('.df-texto')!;
  parrafo.classList.remove('entra');
  void parrafo.offsetWidth;
  parrafo.classList.add('entra');
  parrafo.textContent = texto;
  ponerCara(emocion);
  asomar();
}

/** Lleva a quien usa el Studio a su siguiente pendiente sin completar: si es leer un documento, directo a él. */
function llevar() {
  if (!datos) return;
  const sig = siguientePendiente(contexto(), persona(), datos.arranque);
  const dest: Destino =
    // Siempre a la tarjeta de tu misión de ahora, nunca directo al documento que pide leer (nota de voz del titular
    // nmw9glnvdtit, 9 de noviembre de 2026: desde «Datos del proceso» la cara abría un documento); su paso lleva al resto
    sig.tipo === 'mision' ? { vista: 'misiones', ancla: `mision-${sig.mision!.id}`, etiqueta: sig.mision!.titulo }
    : sig.tipo === 'proyecto' ? { vista: 'proyecto', ancla: datos.arranque === 'objetivo' ? 'p-objetivo' : datos.arranque === 'contar' ? 'p-contexto' : 'p-repositorio', etiqueta: sig.texto }
    : sig.tipo === 'propuestas' ? { vista: 'propuestas', etiqueta: t('equipo.destPropuestas') }
    // Sin misión: a «Hoy», donde su paso siguiente dice que pida la revisión, con su botón
    : sig.tipo === 'revision' ? { vista: 'misiones', ancla: 'paso-siguiente', etiqueta: t('hoy.pedirLaRevision') }
    : { vista: 'buzon', ancla: 'escribir', etiqueta: t('equipo.destBuzon') };
  window.dispatchEvent(new CustomEvent('estudio:ir', { detail: dest }));
}

// ───────────────────────────────────────────── arranque

function arrancar() {
  montarFlotante();
  // Mientras lo que dice está a la vista, cambia de frase; recogido, no distrae
  setInterval(() => { if (!document.hidden && flotante?.classList.contains('asomado')) decirSiguiente(); }, 12_000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
else arrancar();
