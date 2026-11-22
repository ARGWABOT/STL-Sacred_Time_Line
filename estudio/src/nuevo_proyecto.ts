// Entregarle proyectos al director. Lo primero que se decide es cómo llegan, porque el director los maneja distinto:
// - existentes: ya tienen repositorio e historia. Basta con entregar su carpeta: el director lo diagnostica, detecta lo
//   que está en curso y las metas de su propia documentación, y propone él los objetivos. Uno a la vez (nmwcw9ayjtit):
//   escribir varias carpetas en líneas y entregar varios juntos ya no existen (pd_entrega_fluida).
// - nuevo: aún no existe (o apenas empieza). El director necesita que se le cuente qué es y a dónde se quiere llevar, en
//   un solo campo, «Cuéntame tu proyecto» (pd_campo_libre); con eso devuelve un planteamiento.
// - escanear el equipo: el Studio busca, con el permiso del usuario, los proyectos que desarrolla con IA en este
//   computador (en los historiales de Claude Code, Codex y Cursor, y en su carpeta personal y los lugares habituales de
//   código, nmwdupnbttit) y deja elegir uno para entregar; los que ya están en el Studio, en gris al final, y sin ninguno
//   para entregar, el campo de la carpeta ahí mismo (nmwds6073tit, nmwds6m7gtit).
// Devuelve lo que hay que enviar al servidor, o null si se cancela. Los textos, del archivo de cada idioma (pd_idiomas).
//
// Lo que se cuenta del proyecto también se dice hablando (nota de voz del titular nmw9v9sbdtit, 9 de noviembre de 2026:
// «quiero poder contárselos, hablando con lenguaje natural, la meta o el estado»): cada campo de texto lleva su
// «Grabar», con la grabadora de siempre, y lo dicho se transcribe en este computador y se suma al campo. La transcripción
// llega como `dictar` (app.ts › dictar), para no importar app.ts desde aquí.
import { contenidoDelBoton, corre, crearCargadores } from './cargador';
import { elegirCarpeta } from './explorador';
import { enDatos, Grabadora, sumarDictado } from './grabadora';
import { icono } from './iconos';
import { nombreLegible } from './nombreDeCarpeta';
import { idiomaActual, lenguaje, t } from './textos';

export { nombreLegible };
import { esc } from './util';

/**
 * Lo dicho en un audio, transcrito en este computador (app.ts › dictarConRazon): su texto, o la razón del servidor si no
 * se pudo (null o un texto suelto también valen, sin razón).
 */
export type Dictar = (audio: string) => Promise<string | { texto: string } | { error: string } | null>;

/**
 * El aviso del «Grabar» de un campo que no transcribió: con la razón del servidor si la hay, para que un fallo futuro diga
 * por qué (nmws1h8yhtit: en Ubuntu solo decía «No se pudo transcribir», sin causa). Pura.
 */
export function avisoSinTranscribir(razon?: string | null): string {
  const r = (razon ?? '').trim();
  if (!r) return t('nuevo.noTranscribio');
  return t('nuevo.noTranscribioPorque', { razon: /[.!?…)]$/.test(r) ? r : `${r}.` });
}

/** Lo que devolvió `Dictar`, en texto y razón. Pura. */
export function leerDictado(r: Awaited<ReturnType<Dictar>>): { texto: string | null; razon: string } {
  if (typeof r === 'string') return { texto: r || null, razon: '' };
  if (r && 'texto' in r) return { texto: r.texto || null, razon: '' };
  return { texto: null, razon: r && 'error' in r ? r.error : '' };
}

type SenalIA = { agente: string; sesiones?: number; ultima?: string; donde?: string };
/**
 * `metaDetectada`: la parte de la meta que la comprobación de lo contado encontró en el texto (pd_campo_libre,
 * nmwl4xd7utit); el servidor la guarda donde el diagnóstico guarda la que detecta, y «Tu meta» la muestra «Detectado».
 */
export type DatosProyectoNuevo = { tipo: 'existente' | 'nuevo'; nombre: string; ruta: string; contexto: string; metaInicial: string; terminado: string; historialIA?: SenalIA[]; metaDetectada?: string; contextoOriginal?: string; porTraducir?: boolean };
export type ProyectoEnLista = { nombre: string; ruta: string; historialIA?: SenalIA[] };
/**
 * `diagnosticar`: se entregó con «Entregar y pedir su diagnóstico» (pd_entregar_y_diagnosticar, nmwai6p98tit). Se entrega
 * un proyecto a la vez, por cualquier camino, y siempre así (pd_entrega_al_instante, nmwcw9ayjtit).
 */
export type Entrega = { modo: 'uno'; datos: DatosProyectoNuevo; diagnosticar?: boolean };

/** Lo que se entrega del proyecto elegido en el escaneo: pide su diagnóstico al instante y conserva lo que se encontró. */
export function entregaElegida(p: ProyectoEnLista): Entrega {
  return {
    modo: 'uno',
    datos: { tipo: 'existente', nombre: p.nombre, ruta: p.ruta, contexto: '', metaInicial: '', terminado: '', ...(p.historialIA?.length ? { historialIA: p.historialIA } : {}) },
    diagnosticar: true,
  };
}

/** El único botón de entregar, en todos los formularios: «Entregar y pedir su diagnóstico», que dice que usa el plan. */
export function botonEntregar(): string {
  return `<button type="submit" class="primario" data-diagnostico data-titulo="${esc(t('nuevo.entregarYDiagnosticarTitulo'))}" title="${esc(t('nuevo.entregarYDiagnosticarTitulo'))}">${t('nuevo.entregarYDiagnosticar')}</button>`;
}

export interface Candidato { ruta: string; nombre: string; senales: { agente: string; sesiones?: number; ultima?: string; donde?: string }[]; ultima: string | null; yaEsta: boolean }
/** Lo que se puede escanear: los historiales de los agentes y los lugares de código (estudio/servidor/escaneo.ts). */
interface Fuentes { agentes: { id: string; nombre: string; donde: string; existe: boolean }[]; lugares: string[] }

const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(lenguaje(), { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const botones = (principal: string, volver = `<button type="button" data-volver>${t('nuevo.volver')}</button>`) =>
  `<div class="botones">${volver}<button type="button" data-cancelar>${t('cabeza.cancelar')}</button>${principal}</div>`;
/** El nombre que el servidor le da a los archivos de trabajo con IA, en una señal del escaneo (estudio/servidor › escanear). */
const SENAL_DE_ARCHIVOS = 'Archivos de IA';

/** El lugar de la grabadora de un campo de texto, justo debajo de él (sin voz, nada). */
const dictado = (campo: string, voz: boolean) => (voz ? `<div class="grabadora dictar-campo" data-dictar="${campo}" title="${esc(t('nuevo.grabarTitulo'))}"></div>` : '');

/**
 * El único campo de las dos puertas (pd_campo_libre, nmwf519gptit): «Cuéntame tu proyecto», con su pista (nmwdibjfptit) y
 * un ejemplo corto en gris que se va al escribir (nmwgj5vx3tit); se escribe o se graba, y lo grabado se transcribe en el
 * campo antes de entregar (nmwdicxr6tit). En un proyecto que ya existe puede quedar vacío: el diagnóstico lee la carpeta
 * (nmwfltg6rtit).
 */
const campoCuenta = (voz: boolean, puedeVacio: boolean) =>
  `<label class="campo"><span class="etiqueta-campo">${t('nuevo.cuentame')}${puedeVacio ? ` <small>${t('nuevo.opcional')}</small>` : ''}</span><small class="pista-campo">${t('nuevo.cuentamePista')}${puedeVacio ? ` ${t('nuevo.cuentameVacio')}` : ''}</small><textarea name="cuenta" rows="4"${puedeVacio ? '' : ' required'} placeholder="${esc(t('nuevo.cuentameEj'))}"></textarea></label>
        ${dictado('cuenta', voz)}`;

/**
 * Lo de siempre: primero la carpeta (nmwk5nkpltit) y después, si quiere, lo que cuenta del proyecto, escrito o hablando.
 * El nombre sale de la carpeta; el director hace el resto.
 */
export function htmlRapido(voz: boolean): string {
  return `<form method="dialog" data-form="rapido">
        <header class="cabeza-dialogo"><h2>${t('nuevo.titulo')}</h2>
        <p>${t('nuevo.intro')}</p></header>
        <label class="campo"><span class="etiqueta-campo">${t('nuevo.carpeta')}</span><span class="con-explorar"><input name="ruta" type="text" required placeholder="${esc(t('nuevo.exploraRuta'))}" /><button type="button" data-explorar>${t('nuevo.explorar')}</button></span></label>
        ${campoCuenta(voz, true)}
        <p class="error-explorador" role="alert"></p>
        <p class="otras-entregas">${t('nuevo.otras', {
          escanear: `<button type="button" class="enlace" data-tipo="escanear">${t('nuevo.escanear')}</button>`,
          nuevo: `<button type="button" class="enlace" data-tipo="nuevo">${t('nuevo.unoNuevo')}</button>`,
        })}</p>
        <div class="botones"><button type="button" data-cancelar>${t('cabeza.cancelar')}</button>${botonEntregar()}</div>
      </form>`;
}

/** El campo de la carpeta del formulario de siempre, con «Explorar…». */
const campoCarpeta = () =>
  `<label class="campo"><span class="etiqueta-campo">${t('nuevo.carpeta')}</span><span class="con-explorar"><input name="ruta" type="text" required placeholder="${esc(t('nuevo.exploraRuta'))}" /><button type="button" data-explorar>${t('nuevo.explorar')}</button></span></label>`;

/**
 * Un repositorio de la lista del escaneo; el que ya está en el Studio, en gris y sin poder elegirse (nmwds6073tit). Se
 * entrega uno a la vez (nmwcw9ayjtit): cada fila se elige con un clic, una sola (nmwdxt8uctit); `elegido`, la que ya va.
 */
function lineaDeCandidato(c: Candidato, i: number, elegido = false): string {
  return `<li class="${c.yaEsta ? 'ya' : elegido ? 'sel' : ''}"${c.yaEsta ? ` aria-disabled="true" title="${esc(t('nuevo.yaEsta'))}"` : ' data-fila-candidato'}>
            <input type="radio" name="elegido" value="${i}"${c.yaEsta ? ' disabled' : elegido ? ' checked' : ''} aria-label="${esc(t('nuevo.entregarNombre', { nombre: c.nombre }))}" />
            <div><input type="text" name="nombre-${i}" value="${esc(c.nombre)}"${c.yaEsta ? ' disabled' : ''} aria-label="${esc(t('nuevo.nombre'))}" />
              <small class="ruta-mono">${esc(c.ruta)}</small>
              <small class="senales-e">${c.yaEsta ? `<b>${t('nuevo.yaEsta')}</b> ` : ''}${c.senales.map((s) => `${esc(s.agente)}${s.sesiones ? ` (${t('nuevo.sesiones', { n: s.sesiones })})` : ''}${s.donde && s.agente === SENAL_DE_ARCHIVOS ? `: ${esc(s.donde)}` : ''}`).join(' · ')}${c.ultima ? ` · ${t('nuevo.ultimoTrabajo', { fecha: fecha(c.ultima) })}` : ''}</small></div>
          </li>`;
}

/**
 * Lo que encontró el escaneo (nmwds6073tit, nmwds6m7gtit): primero los que se pueden entregar, marcados; al final, en
 * gris, los que ya están en el Studio, con «Ya está en el Studio» y sin poder elegirse. Sin ninguno para entregar, la
 * misma ventana lo dice en una línea y abre ahí el campo de la carpeta (el formulario de siempre, que entrega pidiendo el
 * diagnóstico); quien la pinta pone el cursor en él. Cada casilla lleva el índice de `candidatos`, como lo lee la
 * entrega. Pura.
 */
export function htmlEscaneo(candidatos: Candidato[], r: { omitidas?: number; aviso?: string | null } = {}): string {
  const enOrden = [...candidatos.entries()].sort(([, a], [, b]) => Number(a.yaEsta) - Number(b.yaEsta));
  const nuevos = candidatos.filter((c) => !c.yaEsta).length;
  const aviso = r.aviso ? `<p class="aviso remoto">${esc(r.aviso)}</p>` : '';
  // Con uno solo para entregar, ya va elegido; con varios, se elige con un clic antes de entregar (nmwdxt8uctit)
  const lista = enOrden.length ? `<ul class="candidatos-e" role="radiogroup" aria-label="${esc(t('nuevo.conIA'))}">${enOrden.map(([i, c]) => lineaDeCandidato(c, i, nuevos === 1 && !c.yaEsta)).join('')}</ul>` : '';
  const volverPermiso = `<button type="button" data-volver-permiso>${t('nuevo.otraParte')}</button>`;
  if (!nuevos) {
    return `<form method="dialog" data-form="rapido">
        <header class="cabeza-dialogo"><h2>${t('nuevo.conIA')}</h2>
        <p class="ninguno-e">${t('nuevo.ningunoParaEntregar')}</p></header>
        ${aviso}
        ${campoCarpeta()}
        <p class="error-explorador" role="alert"></p>
        ${lista}
        ${botones(botonEntregar(), volverPermiso)}
      </form>`;
  }
  return `<form method="dialog" data-form="escaneo">
        <header class="cabeza-dialogo"><h2>${t('nuevo.conIA')}</h2>
        <p>${t('nuevo.encontre', { n: candidatos.length, omitidas: r.omitidas ? ` ${t('nuevo.omitidas', { n: r.omitidas })}` : '' })}</p></header>
        ${aviso}
        ${lista}
        <p class="error-explorador" role="alert"></p>
        ${botones(botonEntregar(), volverPermiso)}
      </form>`;
}

/**
 * Uno nuevo (pd_campo_libre): primero la carpeta donde vivirá (nmwk5nkpltit) y después un solo campo, «Cuéntame tu
 * proyecto», escrito o hablando; sin «Nombre del proyecto», «¿A dónde quieres llegar?» ni «¿Cuándo lo darás por
 * completo?» (nmwf519gptit, nmwb0yxt4tit). El nombre sale de la carpeta (nmwfltw1dtit).
 */
export function htmlNuevo(voz: boolean): string {
  return `<form method="dialog" data-form="nuevo">
        <header class="cabeza-dialogo"><h2>${t('nuevo.unoNuevo')}</h2>
        <p>${t('nuevo.nuevoIntro')}</p></header>
        <label class="campo"><span class="etiqueta-campo">${t('nuevo.dondeVivira')} <small>${t('nuevo.dondeViviraNota')}</small></span><span class="con-explorar"><input name="ruta" type="text" required placeholder="${esc(t('nuevo.exploraRuta'))}" /><button type="button" data-explorar>${t('nuevo.explorar')}</button></span></label>
        ${campoCuenta(voz, false)}
        <p class="error-explorador" role="alert"></p>
        ${botones(botonEntregar())}
      </form>`;
}

/**
 * Lo que se entrega de un proyecto existente con el formulario de siempre. Lo que contó va entero como su contexto, «Qué
 * es» (nmwdicgh1tit), y no como la meta: el director lo diagnostica y propone la ruta desde ahí; la meta la fija el
 * titular después, en el Studio (nmw9v9sbdtit). El nombre, el de la carpeta, legible (nmwfltw1dtit).
 */
export function datosDeRapido(v: Record<string, string>): DatosProyectoNuevo {
  const ruta = (v.ruta ?? '').trim();
  return { tipo: 'existente', nombre: nombreLegible(ruta), ruta, contexto: (v.cuenta ?? '').trim(), metaInicial: '', terminado: '' };
}

/** Lo que se entrega de uno nuevo: su carpeta, su nombre legible y todo lo que contó en «Qué es» (pd_campo_libre). Pura. */
export function datosDeNuevo(v: Record<string, string>): DatosProyectoNuevo {
  const ruta = (v.ruta ?? '').trim();
  return { tipo: 'nuevo', nombre: nombreLegible(ruta), ruta, contexto: (v.cuenta ?? '').trim(), metaInicial: '', terminado: '' };
}

// ── La comprobación de lo contado (pd_campo_libre; nmwkbl5d4tit, nmwl4xd7utit, nmwl4xn0mtit, nmwlfn2pbtit, nmwlfndp5tit)

/**
 * Qué falta en lo contado y la parte de la meta que se encontró (servidor › comprobarCuenta.ts), o null si no se pudo
 * comprobar. Contado en otro idioma: `traduccion`, o `sinTraducir` si el modelo no lo tradujo (nmwjl8tuutit).
 */
export type Comprobacion = { falta: ('que' | 'meta')[]; meta?: string; traduccion?: string; sinTraducir?: true };
/** Pregunta al servidor, que le pregunta al modelo del Studio, si lo contado dice qué es y a dónde se quiere llevar. */
export type Comprobar = (texto: string) => Promise<Comprobacion | null>;
/** La clave del cargador de «Entregar y pedir su diagnóstico» mientras se comprueba lo contado. */
const CLAVE_COMPROBAR_CUENTA = 'comprobar-cuenta';
/** Lo que se espera a la comprobación antes de decir que tarda y dejar entregar sin ella (nmwl4xn0mtit). */
export const LIMITE_COMPROBACION_MS = 30_000;

/**
 * Qué se hace con lo que dijo la comprobación: completo, o sin poder comprobar (null: sin Claude Code, sin sesión, un
 * error, una respuesta ilegible), se entrega al instante y callada (nmwlfn2pbtit, nmwlfndp5tit); si falta algo, se pregunta
 * una vez por todo. Pura.
 */
export function decidirComprobacion(c: Comprobacion | null): { accion: 'entregar'; meta?: string } | { accion: 'preguntar'; falta: ('que' | 'meta')[]; meta?: string } {
  const meta = c?.meta?.trim() || undefined;
  if (!c || !Array.isArray(c.falta) || !c.falta.length) return { accion: 'entregar', ...(meta ? { meta } : {}) };
  return { accion: 'preguntar', falta: c.falta, ...(meta ? { meta } : {}) };
}

/**
 * Comprueba con su límite: `alTardar` se llama una vez si pasan `limite` milisegundos sin respuesta (la comprobación sigue
 * esperándose); si la comprobación falla, devuelve null, sin lanzar. Cada espera usa sus propios temporizadores.
 */
export async function comprobarConLimite(texto: string, comprobar: Comprobar, alTardar: () => void, limite = LIMITE_COMPROBACION_MS): Promise<Comprobacion | null> {
  const reloj = setTimeout(alTardar, limite);
  try {
    return await comprobar(texto);
  } catch {
    return null;
  } finally {
    clearTimeout(reloj);
  }
}

/** La entrega con la parte de la meta que se encontró (si hay), para «Tu meta», marcada «Detectado». Pura. */
export function conMetaDetectada(e: Entrega, meta?: string): Entrega {
  return meta?.trim() ? { ...e, datos: { ...e.datos, metaDetectada: meta.trim() } } : e;
}

/**
 * La entrega con lo que se respondió en el campo chico sumado a lo contado, en un párrafo aparte; puede estar vacía. Con
 * lo contado ya traducido, se suma también a las palabras originales; si la respuesta parece de otro idioma, queda la
 * marca de que falta traducir (la primera revisión lo hace). Pura.
 */
export function conLaRespuesta(e: Entrega, respuesta: string, idioma: 'es' | 'en' = idiomaActual()): Entrega {
  const r = respuesta.trim();
  if (!r) return e;
  const sumar = (a: string | undefined) => [a, r].filter(Boolean).join('\n\n');
  const otra = pareceDeOtroIdioma(r, idioma);
  return { ...e, datos: { ...e.datos, contexto: sumar(e.datos.contexto), ...(e.datos.contextoOriginal ? { contextoOriginal: sumar(e.datos.contextoOriginal) } : {}), ...(otra && !e.datos.contextoOriginal ? { porTraducir: true } : {}) } };
}

/** Palabras muy frecuentes de cada idioma, para adivinar sin modelo en cuál está un texto. */
const PALABRAS: Record<'es' | 'en', ReadonlySet<string>> = {
  es: new Set(['el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'en', 'un', 'una', 'para', 'con', 'por', 'es', 'quiero', 'se', 'lo', 'mi', 'su', 'al', 'como', 'pero', 'sus', 'este', 'esta', 'donde', 'hacer']),
  en: new Set(['the', 'a', 'an', 'of', 'and', 'to', 'in', 'is', 'for', 'with', 'that', 'it', 'on', 'i', 'want', 'my', 'be', 'this', 'are', 'from', 'by', 'as', 'or', 'can', 'their', 'so', 'they', 'will', 'make']),
};

/**
 * Si un texto parece escrito en el otro idioma que el de la interfaz, por sus palabras más frecuentes, sin modelo: para
 * cuando no se pudo comprobar y hay que saber si «Qué es» lleva la línea «Se traducirá en la primera revisión». Con
 * muy pocas palabras, o empatado, no lo afirma. Pura.
 */
export function pareceDeOtroIdioma(texto: string, idioma: 'es' | 'en'): boolean {
  const palabras = texto.toLowerCase().match(/\p{L}+/gu) ?? [];
  const cuenta = (l: 'es' | 'en') => palabras.filter((p) => PALABRAS[l].has(p)).length;
  const suyo = cuenta(idioma);
  const otro = cuenta(idioma === 'es' ? 'en' : 'es');
  return otro >= 2 && otro > suyo;
}

/**
 * La entrega con lo contado en el idioma de la interfaz (nmwjl8tuutit): con la traducción de la comprobación, «Qué es»
 * la recibe y las palabras de la persona quedan aparte, en la memoria (nmwjm4r7atit); si el modelo no la tradujo, o no se
 * pudo comprobar y parece de otro idioma, se entrega igual, tal cual, con la marca para la primera revisión (nmwjm4dcjtit,
 * nmwjogccbtit). Pura.
 */
export function conLaTraduccion(e: Entrega, c: Comprobacion | null, idioma: 'es' | 'en' = idiomaActual()): Entrega {
  const texto = e.datos.contexto;
  if (!texto.trim()) return e;
  if (c?.traduccion?.trim()) return { ...e, datos: { ...e.datos, contexto: c.traduccion.trim(), contextoOriginal: texto } };
  if (c?.sinTraducir || (!c && pareceDeOtroIdioma(texto, idioma))) return { ...e, datos: { ...e.datos, porTraducir: true } };
  return e;
}

/**
 * Debajo del campo, lo que falta, en frases fijas (no las escribe el modelo): «¿Qué es?», «¿A dónde lo quieres llevar?» o
 * la frase única de las dos («¿Qué es y a dónde lo quieres llevar?»), una sola pregunta para todo, con un campo chico y «Con una o dos frases basta» (nmwl4xd7utit). Pura.
 */
export function htmlPregunta(falta: ('que' | 'meta')[]): string {
  const dos = falta.length > 1, que = !dos && falta[0] === 'que';
  const frases = esc(t(dos ? 'nuevo.faltaLasDos' : que ? 'nuevo.faltaQueEs' : 'nuevo.faltaMeta'));
  // Debajo, con suavidad, qué sumar y un ejemplo corto, en vez de solo decir que falta (nota del titular nmwmepe5atit)
  const sugerencia = esc(t(dos ? 'nuevo.sugerenciaLasDos' : que ? 'nuevo.sugerenciaQueEs' : 'nuevo.sugerenciaMeta'));
  return `<div class="pregunta-cuenta" role="status"><p class="frase-pregunta">${frases}</p><p class="sugerencia-cuenta">${sugerencia}</p><textarea name="respuesta" rows="2" aria-label="${esc(t('nuevo.faltaRespuesta'))}"></textarea><small class="pista-campo">${t('nuevo.faltaPista')}</small></div>`;
}

/** Si la comprobación tarda más de 30 segundos: el aviso y «Entregarlo sin comprobar», que entrega al instante (nmwl4xn0mtit). Pura. */
export function htmlLento(): string {
  return `<div class="lento-cuenta" role="status"><p>${t('nuevo.tardaMas')}</p><button type="button" data-sin-comprobar>${t('nuevo.entregarSinComprobar')}</button></div>`;
}

/** Lo dicho, sumado al final de lo que ya tenía el campo, en un párrafo aparte (grabadora.ts › sumarDictado). */
export function sumarAlCampo(campo: { value: string }, dicho: string) {
  campo.value = sumarDictado(campo.value, dicho);
}

/**
 * Mientras una nota de voz se transcribe, los botones de entregar esperan desactivados, con su círculo y la razón al pasar
 * el ratón (nota del titular nmw9wgco4tit, 9 de noviembre de 2026: no se entrega hasta que lo dicho esté en el campo).
 */
export function esperarTranscripcion(raiz: ParentNode | null, esperando: boolean) {
  raiz?.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((b) => {
    b.disabled = esperando;
    b.classList.toggle('esperando', esperando);
    if (esperando) {
      b.setAttribute('aria-busy', 'true');
      b.title = t('nuevo.esperaTranscripcion');
    } else {
      b.removeAttribute('aria-busy');
      // El de «Entregar y pedir su diagnóstico» (que usa el plan) vuelve a su título
      const titulo = b.getAttribute('data-titulo');
      if (titulo) b.title = titulo;
      else b.removeAttribute('title');
    }
  });
}

/**
 * Lo que entrega al servidor: `null` si lo aceptó, o por qué no. Con él, el formulario se cierra solo cuando el servidor
 * aceptó la entrega; si la rechaza (una carpeta que no es un repositorio, el servidor caído), sigue abierto con lo escrito
 * y lo dictado, y dice por qué (auditoría de la entrega, punto 1: cerrarlo antes perdía todo lo contado).
 */
export type EntregarAlServidor = (e: Entrega) => Promise<string | null | { subcarpeta: string }>;

/**
 * Una carpeta dentro de un repositorio (pd_auditoria_entrega, nmwdpftqatit): antes de entregarla, el Studio dice de qué
 * repositorio es parte y que entregará el repositorio entero, con «Entregar el repositorio entero» y «Elegir otra
 * carpeta». Nunca se registra la subcarpeta como el repositorio sin que la persona lo elija.
 */
export function htmlSubcarpeta(repo: string): string {
  return `<div class="aviso-subcarpeta" role="alert">
        <p>${t('nuevo.esSubcarpeta', { repo: `<b class="ruta-mono">${esc(repo)}</b>` })}</p>
        <div class="botones"><button type="button" data-otra-carpeta>${t('nuevo.otraCarpeta')}</button><button type="button" class="primario" data-repo-entero>${t('nuevo.repoEntero')}</button></div>
      </div>`;
}

/**
 * La misma entrega, con la raíz del repositorio en lugar de la subcarpeta. Un proyecto existente cuyo nombre salió de la
 * subcarpeta toma el de la raíz; un nombre escrito por la persona se queda. Pura.
 */
export function conRepositorioEntero(e: Entrega, repo: string): Entrega {
  const nombre = e.datos.tipo === 'existente' && e.datos.nombre === nombreLegible(e.datos.ruta) ? nombreLegible(repo) : e.datos.nombre;
  return { ...e, datos: { ...e.datos, ruta: repo, nombre } };
}

/** `comprobar`: la comprobación de lo contado antes de entregar (sin ella, entrega al instante); `limiteMs`, lo que espera antes de avisar que tarda. */
export function pedirProyectoNuevo(dictar?: Dictar, entregar?: EntregarAlServidor, comprobar?: Comprobar, limiteMs = LIMITE_COMPROBACION_MS): Promise<Entrega | null> {
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director nuevo-proyecto';
  document.body.append(dlg);
  let candidatos: Candidato[] = [];

  return new Promise((ok) => {
    // Se resuelve una sola vez y sin depender del evento «close» (no todos los navegadores lo disparan a tiempo)
    let listo = false;
    // Las grabadoras de los campos a la vista: al cambiar de formulario o al cerrar, se sueltan (el micrófono nunca queda encendido)
    const dictados = new Set<Grabadora>();
    // Las notas de voz que se están transcribiendo en el formulario a la vista
    let transcribiendo = 0;
    // La comprobación de lo contado: la que va en marcha (`pendiente`, su entrega, y `vuelta` para ignorarla si se entrega
    // sin comprobar) y, si faltaba algo, la pregunta ya hecha, con la meta que sí se encontró; la segunda pulsación entrega
    let comprobando = false;
    let vuelta = 0;
    let pendiente: Entrega | null = null;
    let preguntada: { meta?: string; comprobacion: Comprobacion | null } | null = null;
    const soltarDictados = () => {
      for (const g of dictados) void g.terminar();
      dictados.clear();
    };
    /** La grabadora de un campo: al detenerla, lo dicho se transcribe y se suma al campo, y queda lista para grabar otra vez. */
    const armarDictado = (caja: HTMLElement, aviso?: string) => {
      if (!dictar) return;
      const g = new Grabadora(caja, true, false);
      dictados.add(g);
      if (aviso) g.avisar(aviso);
      g.alDetener = (blob) => void (async () => {
        dictados.delete(g);
        await g.terminar();
        if (!caja.isConnected) return;
        caja.innerHTML = `<p class="transcripcion procesando" role="status">${t('nuevo.transcribiendo')}<span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span></p>`;
        // Mientras se transcribe, el botón de entregar espera, con su círculo (nota nmw9wgco4tit)
        transcribiendo++;
        esperarTranscripcion(dlg, true);
        const { texto, razon } = leerDictado(await enDatos(blob).then(dictar).catch((e: unknown) => ({ error: e instanceof Error ? e.message : '' })));
        transcribiendo = Math.max(0, transcribiendo - 1);
        esperarTranscripcion(dlg, transcribiendo > 0);
        if (!caja.isConnected || listo) return;
        const campo = dlg.querySelector<HTMLTextAreaElement>(`textarea[name="${caja.dataset.dictar}"]`);
        if (texto && campo) sumarAlCampo(campo, texto);
        // Sin texto, el aviso dice la razón del servidor (nmws1h8yhtit)
        armarDictado(caja, texto ? undefined : avisoSinTranscribir(razon));
        if (texto) campo?.focus();
      })();
    };
    /** Pinta un formulario: suelta las grabadoras del anterior y arma las de este. */
    const poner = (html: string) => {
      soltarDictados();
      transcribiendo = 0;
      comprobando = false;
      vuelta++;
      pendiente = null;
      preguntada = null;
      cargadores.dejarDeEsperar(CLAVE_COMPROBAR_CUENTA);
      dlg.innerHTML = html;
      dlg.querySelectorAll<HTMLElement>('[data-dictar]').forEach((c) => armarDictado(c));
    };
    const terminar = (r: Entrega | null) => {
      if (listo) return;
      listo = true;
      soltarDictados();
      if (dlg.open) dlg.close();
      dlg.remove();
      ok(r);
    };
    const error = (texto: string) => {
      const e = dlg.querySelector<HTMLElement>('.error-explorador');
      if (e) e.textContent = texto;
    };
    /** Entrega y cierra solo si el servidor la aceptó; si no, el formulario sigue como estaba y dice por qué. */
    let entregando = false;
    // La entrega que espera la respuesta al aviso de la subcarpeta (nmwdpftqatit), con la raíz de su repositorio
    let porSubcarpeta: { entrega: Entrega; repo: string } | null = null;
    const quitarAvisoSubcarpeta = () => {
      porSubcarpeta = null;
      dlg.querySelector('.aviso-subcarpeta')?.remove();
    };
    const entregarYCerrar = async (r: Entrega) => {
      if (!entregar) return terminar(r);
      if (entregando) return;
      entregando = true;
      quitarAvisoSubcarpeta();
      const enviar = [...dlg.querySelectorAll<HTMLButtonElement>('button[type="submit"]')];
      for (const b of enviar) { b.disabled = true; b.setAttribute('aria-busy', 'true'); }
      error('');
      const fallo = await entregar(r).catch((e: unknown) => (e instanceof Error ? e.message : String(e)) || t('nuevo.noSeEntrego'));
      entregando = false;
      if (listo) return;
      for (const b of enviar) { b.disabled = false; b.removeAttribute('aria-busy'); }
      if (fallo !== null && typeof fallo === 'object') {
        // Antes de entregar una subcarpeta: el aviso, con sus dos botones, en lugar del error
        porSubcarpeta = { entrega: r, repo: fallo.subcarpeta };
        dlg.querySelector('.error-explorador')?.insertAdjacentHTML('afterend', htmlSubcarpeta(fallo.subcarpeta));
        dlg.querySelector<HTMLButtonElement>('[data-repo-entero]')?.focus();
        return;
      }
      if (fallo !== null) return error(fallo);
      terminar(r);
    };

    // Mientras el modelo comprueba, el botón de entregar muestra el cargador de siempre (cargador.ts): apagado, con su círculo
    // desde los 500 ms (nmwlfn2pbtit). El aviso de los 30 segundos es la línea propia de aquí (htmlLento)
    const cargadores = crearCargadores(() => {
      const gira = corre(cargadores.estado(CLAVE_COMPROBAR_CUENTA));
      const estado = cargadores.estado(CLAVE_COMPROBAR_CUENTA);
      for (const b of dlg.querySelectorAll<HTMLButtonElement>('button[type="submit"][data-diagnostico]')) {
        b.disabled = gira;
        if (gira) b.setAttribute('aria-busy', 'true');
        else b.removeAttribute('aria-busy');
        b.innerHTML = contenidoDelBoton(t('nuevo.entregarYDiagnosticar'), estado);
      }
    });
    /** Suelta el cargador de la comprobación (se entregó sin comprobar, o el formulario se repintó): el botón vuelve a la normalidad. */
    const soltarCargador = () => cargadores.dejarDeEsperar(CLAVE_COMPROBAR_CUENTA);
    const quitarDeLaComprobacion = () => dlg.querySelectorAll('.lento-cuenta, .pregunta-cuenta').forEach((x) => x.remove());
    /**
     * Antes de entregar lo contado (pd_campo_libre): sin texto, sin comprobación o con la pregunta ya hecha, la entrega va al
     * instante (la segunda pulsación suma lo del campo chico, aunque esté vacío, sin comprobar otra vez). Si no, pregunta al
     * modelo: completo o sin poder comprobar, entrega callada; si falta algo, deja la pregunta y devuelve null (no se entrega
     * todavía). A los 30 segundos avisa y ofrece «Entregarlo sin comprobar».
     */
    const conLaComprobacion = async (e: Entrega, form: HTMLFormElement): Promise<Entrega | null> => {
      // Con lo contado traducido al idioma de la interfaz, en la misma comprobación (nmwjl8tuutit; conLaTraduccion)
      if (preguntada) return conMetaDetectada(conLaRespuesta(conLaTraduccion(e, preguntada.comprobacion), form.querySelector<HTMLTextAreaElement>('textarea[name="respuesta"]')?.value ?? ''), preguntada.meta);
      if (comprobando) return null;
      if (!comprobar || !e.datos.contexto) return conLaTraduccion(e, null);
      comprobando = true;
      pendiente = e;
      const esta = ++vuelta;
      const c = await cargadores.correr(CLAVE_COMPROBAR_CUENTA, {}, () => comprobarConLimite(e.datos.contexto, comprobar, () => {
        if (esta !== vuelta || !comprobando || dlg.querySelector('.lento-cuenta')) return;
        dlg.querySelector('.error-explorador')?.insertAdjacentHTML('beforebegin', htmlLento());
      }, limiteMs));
      // Entregado sin comprobar, cancelado o repintado mientras tanto: esta respuesta ya no cuenta
      if (esta !== vuelta || listo) return null;
      comprobando = false;
      pendiente = null;
      quitarDeLaComprobacion();
      const d = decidirComprobacion(c ?? null);
      if (d.accion === 'entregar') return conMetaDetectada(conLaTraduccion(e, c ?? null), d.meta);
      preguntada = { meta: d.meta, comprobacion: c ?? null };
      dlg.querySelector('.error-explorador')?.insertAdjacentHTML('beforebegin', htmlPregunta(d.falta));
      dlg.querySelector<HTMLTextAreaElement>('textarea[name="respuesta"]')?.focus();
      return null;
    };

    // ── Lo de siempre y uno nuevo (htmlRapido, htmlNuevo), con su «Grabar» en cada campo de texto si hay con qué transcribir
    function formularioRapido() {
      poner(htmlRapido(!!dictar));
    }
    function formularioNuevo() {
      poner(htmlNuevo(!!dictar));
      dlg.querySelector<HTMLInputElement>('input[name="ruta"]')?.focus();
    }

    // ── Escanear el equipo: primero el permiso, después la lista
    async function permisoEscaneo() {
      poner(`<form method="dialog"><header class="cabeza-dialogo"><h2>${t('nuevo.escanear')}</h2><p class="escaneando">${t('nuevo.revisandoEscaneo')}</p></header></form>`);
      const f: Fuentes = await fetch('/__estudio/director/escanear/fuentes').then((r) => r.json());
      poner(`<form method="dialog" data-form="permiso">
        <header class="cabeza-dialogo"><h2>${t('nuevo.escanear')}</h2>
        <p>${t('nuevo.dondeBuscar')}</p></header>
        <fieldset class="grupo-opciones">
          <legend>${t('nuevo.historiales')} <small>${t('nuevo.casiInmediato')}</small></legend>
          ${f.agentes.map((a) => `<label class="opcion${a.existe ? '' : ' apagado'}">
              <input type="checkbox" name="agente" value="${esc(a.id)}"${a.existe ? ' checked' : ' disabled'} />
              <span class="opcion-texto"><b>${esc(a.nombre)}</b><span class="ruta-mono">${a.existe ? esc(a.donde) : t('nuevo.noEsta')}</span></span>
              <span class="estado-opcion">${t(a.existe ? 'nuevo.encontrado' : 'nuevo.noInstalado')}</span>
            </label>`).join('')}
        </fieldset>
        <fieldset class="grupo-opciones">
          <legend>${t('nuevo.lugares')} <small>${t('nuevo.cuatroNiveles')}</small></legend>
          <div class="fichas-unidad">${f.lugares.map((u) => `<label class="ficha-unidad"><input type="checkbox" name="lugar" value="${esc(u)}" checked />${icono('carpeta')}<span>${esc(u)}</span></label>`).join('') || `<p class="como">${t('nuevo.sinLugares')}</p>`}</div>
        </fieldset>
        <div class="nota-privacidad">${icono('candado')}<p>${t('nuevo.privacidad')}</p></div>
        <p class="error-explorador" role="alert"></p>
        ${botones(`<button type="submit" class="primario">${t('nuevo.escanearBoton')}</button>`)}
      </form>`);
    }

    async function hacerEscaneo(form: HTMLFormElement) {
      const fd = new FormData(form);
      const agentes = fd.getAll('agente').map(String);
      const lugares = fd.getAll('lugar').map(String);
      if (!agentes.length && !lugares.length) return error(t('nuevo.eligeUno'));
      await escanear(agentes, lugares, lugares.length ? t('nuevo.buscandoEn') : t('nuevo.buscando'));
    }

    /**
     * «Escanear este computador» escanea al instante, con todo marcado (nmwdxssn3tit): los historiales que existen y los
     * lugares de código; la línea de espera dice qué lee y que nada sale de aquí, y «← Buscar en otra parte» lleva a los lugares.
     */
    async function escanearYa() {
      poner(`<form method="dialog"><header class="cabeza-dialogo"><h2>${t('nuevo.escanear')}</h2><p class="escaneando">${t('nuevo.revisandoEscaneo')}</p></header></form>`);
      const f: Fuentes = await fetch('/__estudio/director/escanear/fuentes').then((r) => r.json());
      await escanear(f.agentes.filter((a) => a.existe).map((a) => a.id), f.lugares, t('nuevo.escaneandoYa'));
    }

    async function escanear(agentes: string[], lugares: string[], espera: string) {
      poner(`<form method="dialog"><header class="cabeza-dialogo"><h2>${t('nuevo.escanear')}</h2><p class="escaneando">${espera}</p></header></form>`);
      const r = await fetch('/__estudio/director/escanear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentes, lugares }) });
      const j = await r.json();
      if (!r.ok) { await permisoEscaneo(); return error(j.error ?? t('nuevo.noEscaneo')); }
      candidatos = j.candidatos;
      poner(htmlEscaneo(candidatos, j));
      // Sin ninguno para entregar, el campo de la carpeta queda abierto ahí, con el cursor en él (nmwds6m7gtit)
      if (!candidatos.some((c) => !c.yaEsta)) dlg.querySelector<HTMLInputElement>('input[name="ruta"]')?.focus();
    }

    dlg.addEventListener('click', async (e) => {
      // Una fila del escaneo se elige con un clic en cualquier parte de ella, una sola a la vez (nmwdxt8uctit)
      const fila = (e.target as HTMLElement).closest<HTMLElement>('[data-fila-candidato]');
      if (fila) {
        const radio = fila.querySelector<HTMLInputElement>('input[name="elegido"]');
        if (radio && !radio.disabled) radio.checked = true;
        dlg.querySelectorAll('[data-fila-candidato]').forEach((x) => x.classList.toggle('sel', x === fila));
        error('');
      }
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.dataset.cancelar !== undefined) terminar(null);
      else if (b.dataset.sinComprobar !== undefined && pendiente) {
        // «Entregarlo sin comprobar» (nmwl4xn0mtit): entrega al instante lo que se estaba comprobando, que ya no cuenta
        // Sin comprobar tampoco se traduce: si parece de otro idioma, lo traduce la primera revisión (nmwjm4dcjtit)
        const e = conLaTraduccion(pendiente, null);
        vuelta++;
        comprobando = false;
        pendiente = null;
        soltarCargador();
        quitarDeLaComprobacion();
        return void (await entregarYCerrar(e));
      } else if (b.dataset.repoEntero !== undefined && porSubcarpeta) {
        const { entrega, repo } = porSubcarpeta;
        const enLaForma = dlg.querySelector<HTMLInputElement>('input[name="ruta"]');
        if (enLaForma) enLaForma.value = repo;
        return void (await entregarYCerrar(conRepositorioEntero(entrega, repo)));
      } else if (b.dataset.otraCarpeta !== undefined) {
        quitarAvisoSubcarpeta();
        const campo = dlg.querySelector<HTMLInputElement>('input[name="ruta"]');
        if (campo) {
          campo.focus();
          campo.select();
        } else {
          // Desde el escaneo no hay campo de carpeta: el formulario de siempre, con el cursor en él
          formularioRapido();
          dlg.querySelector<HTMLInputElement>('input[name="ruta"]')?.focus();
        }
        return;
      } else if (b.dataset.volver !== undefined) formularioRapido();
      else if (b.dataset.volverPermiso !== undefined) await permisoEscaneo();
      else if (b.dataset.tipo === 'nuevo') formularioNuevo();
      else if (b.dataset.tipo === 'escanear') await escanearYa();
      else if (b.dataset.explorar !== undefined) {
        const caja = b.closest('label') ?? dlg;
        const campo = caja.querySelector<HTMLInputElement>('input[name="ruta"]')!;
        const elegida = await elegirCarpeta(campo.value);
        if (!elegida) return;
        campo.value = elegida;
      }
    });
    dlg.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const cual = form.dataset.form;
      if (cual === 'permiso') return void (await hacerEscaneo(form));
      // Lo dicho tiene que estar escrito en su campo antes de entregar (nota nmw9wgco4tit)
      const grabando = [...dictados].some((g) => g.estado === 'grabando');
      if (transcribiendo > 0 || grabando) return error(t(grabando ? 'nuevo.detenGrabacion' : 'nuevo.esperaTranscripcion'));
      if (!form.reportValidity()) return;
      if (cual === 'rapido') {
        // Entregar un proyecto siempre pide su diagnóstico (nota nmwai6p98tit): es el primer paso obligatorio, no una opción.
        // El único botón es «Entregar y pedir su diagnóstico», y también Enter en un campo lo usa
        const e = await conLaComprobacion({ modo: 'uno', datos: datosDeRapido(Object.fromEntries(new FormData(form).entries()) as Record<string, string>), diagnosticar: true }, form);
        return void (e && (await entregarYCerrar(e)));
      }
      // Un proyecto a la vez, por cualquier camino, se entrega pidiendo su revisión en ese instante (nota nmwb73juxtit, pedido
      // pd_entrega_al_instante; nmwcw9ayjtit): su botón dice que la pide
      if (cual === 'nuevo') {
        const e = await conLaComprobacion({ modo: 'uno', datos: datosDeNuevo(Object.fromEntries(new FormData(form).entries()) as Record<string, string>), diagnosticar: true }, form);
        return void (e && (await entregarYCerrar(e)));
      }
      if (cual === 'escaneo') {
        const i = Number(new FormData(form).get('elegido'));
        if (!form.querySelector('input[name="elegido"]:checked') || !candidatos[i]) return error(t('nuevo.eligeProyecto'));
        return void (await entregarYCerrar(entregaElegida({
          nombre: form.querySelector<HTMLInputElement>(`input[name="nombre-${i}"]`)?.value.trim() || candidatos[i].nombre,
          ruta: candidatos[i].ruta,
          historialIA: candidatos[i].senales.filter((s) => s.agente !== SENAL_DE_ARCHIVOS),
        })));
      }
    });
    dlg.addEventListener('cancel', () => terminar(null));
    dlg.addEventListener('close', () => terminar(null));

    formularioRapido();
    dlg.showModal();
    dlg.querySelector<HTMLButtonElement>('[data-explorar]')?.focus();
  });
}
