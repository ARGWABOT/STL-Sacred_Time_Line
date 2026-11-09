// «Modelo y consumo»: con qué modelo y cuánto piensa el director que lanza el Studio, y lo que gastó cada vez, por día,
// por semana y por proyecto. No es de ningún proyecto: es la configuración de Claude Code en este computador (la de
// /model y /effort), la misma para todos, así que va aparte, en el pie de la barra, y no en Proyecto (pedido del titular,
// 21 de octubre). Solo datos verdaderos: lo que Claude Code dice al empezar y devuelve al terminar cada lanzamiento,
// también los límites del plan (los mismos de /usage). Salió de app.ts al partir los módulos grandes (propuesta aceptada
// pr_partir_modulos), como «Hoy» (todayView.ts) y la tarjeta de la misión (missionCard.ts): recibe lo que pinta y lo que
// depende de la página, y no guarda nada. Cada pestaña sigue en su módulo (modeloDelDirector.ts, vistaPermisos.ts,
// vistaAjustesPropios.ts, vistaGasto.ts, vistaMedicion.ts y bitacoraDelComputador.ts). Su nombre de archivo va en inglés,
// como cada archivo que nace al partirlos (decisión del titular del 30 de octubre de 2026).
import { panelBitacora, type DatosBitacora } from './bitacoraDelComputador';
import { seccionDirector, type DatosDirector } from './modeloDelDirector';
import { PESTANAS_MODELO, pestanaDeAncla, type PestanaModelo } from './pestanasModelo';
import { t } from './textos';
import { esc } from './util';
import { seccionAjustesPropios, type AjustesPropios } from './vistaAjustesPropios';
import { seccionGasto, type DatosGasto } from './vistaGasto';
import { seccionMedicion, type DatosMedicion } from './vistaMedicion';
import { seccionPermisos, type DatosPermisos } from './vistaPermisos';

/** Cuánto vale lo negado y las skills que ya se trajeron: pasado esto, abrir «Permisos» los pide otra vez. */
export const FRESCOS_PERMISOS_MS = 30_000;

/** Si hay que pedir al servidor lo de un panel: aún no está, o ya es viejo, y no se está pidiendo ya. Pura. */
export const hayQueLeer = (hay: boolean, leido: number, leyendo: boolean, ahora: number) => (!hay || ahora - leido > FRESCOS_PERMISOS_MS) && !leyendo;

/** Lo que usa «Permisos» de la página: lo que pinta, cuándo se trajo cada panel, si se está trayendo y cómo traerlo. */
export interface PermisosDeLaPagina {
  datos: DatosPermisos;
  permisosLeidos: number;
  leyendoPermisos: boolean;
  leerPermisos: () => void;
  skillsLeidas: number;
  leyendoSkills: boolean;
  leerSkills: () => void;
  ahora: number;
}

/** Lo que usa la bitácora de la página: si está abierta, cómo traer lo más nuevo, lo que pinta y su plegable. */
export interface BitacoraDeLaPagina {
  /** En su pestaña nace abierta, y si la cerraste el repintado lo recuerda. */
  abierta: boolean;
  cargar: () => void;
  /** Se lee después de pedir lo nuevo, como antes. */
  datos: () => DatosBitacora;
  plegable: string;
}

/** Lo que pinta «Modelo y consumo». La página se lo da con sus datos y con lo que depende de ella. */
export interface DatosModelo {
  /** La pestaña que se ve, y cómo se cambia (la página la recuerda en el navegador). */
  pestana: PestanaModelo;
  ponerPestana: (id: PestanaModelo) => void;
  /** El ancla a la que lleva el botón que se acaba de oprimir, si la hay. */
  ancla: string | null;
  director: DatosDirector;
  permisos: PermisosDeLaPagina;
  ajustes: AjustesPropios | undefined;
  gasto: DatosGasto;
  medicion: DatosMedicion;
  bitacora: BitacoraDeLaPagina;
}

/**
 * La pestaña «Permisos», con su carga: lo negado y las skills se piden al servidor si aún no están o ya tienen más de 30
 * segundos, y vistaPermisos.ts pinta lo que hay, con lo marcado que la página recuerda.
 */
export function seccionPermisosDeLaPagina(p: PermisosDeLaPagina) {
  if (hayQueLeer(!!p.datos.negados.panel, p.permisosLeidos, p.leyendoPermisos, p.ahora)) p.leerPermisos();
  if (hayQueLeer(!!p.datos.skills.panel, p.skillsLeidas, p.leyendoSkills, p.ahora)) p.leerSkills();
  return seccionPermisos(p.datos);
}

export function seccionBitacora(b: BitacoraDeLaPagina) {
  // Abierta, se trae lo más nuevo si lo que hay ya es viejo
  if (b.abierta) b.cargar();
  return panelBitacora(b.datos(), b.plegable);
}

export function vistaModelo(datos: DatosModelo) {
  // Un botón que lleva a una parte (un paso, la ruta) abre antes la pestaña que la tiene; después se la resalta como siempre
  const deAncla = pestanaDeAncla(datos.ancla);
  if (deAncla && deAncla !== datos.pestana) datos.ponerPestana(deAncla);
  const pestanaModelo = deAncla ?? datos.pestana;
  // Solo se pinta la pestaña elegida (la bitácora, por ejemplo, no se pide hasta que se la abre)
  const cuerpos: Record<PestanaModelo, () => string> = {
    // El modelo, el esfuerzo y ultracode, en su módulo (modeloDelDirector.ts)
    director: () => seccionDirector(datos.director),
    permisos: () => seccionPermisosDeLaPagina(datos.permisos),
    ajustes: () => seccionAjustesPropios(datos.ajustes),
    // Los límites y lo gastado, en su módulo (vistaGasto.ts), y debajo la medición del núcleo
    gasto: () => `${seccionGasto(datos.gasto)}
      ${seccionMedicion(datos.medicion)}`,
    bitacora: () => seccionBitacora(datos.bitacora),
  };
  const barra = `<div class="pestanas-stl pestanas-modelo" role="tablist" aria-label="${esc(t('modelo.nombre'))}">${PESTANAS_MODELO.map((p) => {
    const sel = p.id === pestanaModelo;
    return `<button type="button" role="tab" id="pestana-modelo-${p.id}" class="pestana-stl${sel ? ' sel' : ''}" data-pestana-modelo="${p.id}" aria-selected="${sel}"${sel ? ` aria-controls="panel-modelo-${p.id}"` : ''} tabindex="${sel ? 0 : -1}">${esc(p.titulo)}</button>`;
  }).join('')}</div>`;
  return `<p class="intro">${t('modelo.intro')}</p>
  ${barra}
  <div role="tabpanel" id="panel-modelo-${pestanaModelo}" aria-labelledby="pestana-modelo-${pestanaModelo}" class="panel-pestana-modelo p-${pestanaModelo}">${cuerpos[pestanaModelo]()}</div>`;
}
