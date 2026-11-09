// La vista «Preguntas»: lo que se le pregunta al director, con lo que esperan y las conversaciones con su respuesta. Salió de
// app.ts al partir los módulos grandes (propuesta aceptada pr_partir_modulos), como «Propuestas» (vistaPropuestas.ts):
// recibe lo que pinta y no guarda nada; quién mira, qué hilos tiene abiertos y todo lo que se pinta igual en el resto del
// Studio (el audio y sus adjuntos, el botón de escribir lo que se dijo, el «Quedó en», la respuesta en Markdown) los da la
// página.
import { hilosDePreguntas, type Lugar, type Nota, type Persona, type Respuesta } from '../../src/director/director';
import { momento } from './formato';
import { icono } from './iconos';
import { t } from './textos';
import { esc } from './util';
import { dichoDeNota } from './vistaBuzon';

/** Lo que pinta la vista. La página se lo da con sus datos y con lo que depende de ella, ya pintado. */
export interface DatosPreguntas {
  /** Las notas que quien mira ve (con el filtro «Ver como» puesto): de ahí salen las preguntas y sus hilos. */
  notas: Nota[];
  /** Lo que respondió el director, por la nota que responde. */
  respuestas: Record<string, Respuesta>;
  /** Lo que se entendió de cada audio, por su ruta. */
  transcripciones: Record<string, string>;
  /** Quién mira, y si es el titular (que puede quitar las preguntas de cualquiera). */
  yo: Persona | null;
  esTitular: boolean;
  /** Los hilos que tiene abiertos quien mira (por la pregunta con la que empezaron): un repintado no los cierra. */
  hilosAbiertos: ReadonlySet<string>;
  /** La línea que dice que se ve solo lo de una persona, si hay un filtro puesto. */
  filtroVisible: () => string;
  /** El audio de una nota con su transcripción, y lo que se le adjuntó. */
  audioYTexto: (audio: string | undefined) => string;
  adjuntosDeNota: (n: Nota) => string;
  /** El botón para escribir lo que se dijo en un audio que no se pudo transcribir (o nada). */
  botonEscribirLoDicho: (n: Nota) => string;
  /** Si una nota propia se puede corregir. */
  corregible: (n: Nota) => boolean;
  /** Dónde quedó lo que dijo una respuesta, con su botón (sin él, si es el mismo lugar donde se lee). */
  quedoEn: (r: Respuesta, aqui: Lugar) => string;
  /** El Markdown de una respuesta, ya sin lo que ejecuta algo. */
  respuestaHtml: (texto: string) => string;
}

/**
 * Preguntas: lo que se le pregunta al director va aparte de los comentarios y los pedidos del Buzón. Arriba, las que
 * esperan su primera respuesta (se corrigen o se quitan hasta que él las lea); debajo, las conversaciones: cada pregunta
 * con su respuesta y lo que se siguió preguntando sobre ella, plegadas para abrir solo la que quieres revisar.
 */
export function vistaPreguntas(datos: DatosPreguntas) {
  const { respuestas, transcripciones, yo, esTitular, hilosAbiertos, filtroVisible, audioYTexto, adjuntosDeNota, botonEscribirLoDicho, corregible, quedoEn, respuestaHtml } = datos;
  const hilos = hilosDePreguntas(datos.notas);
  const espera = (n: Nota) => !respuestas[n.id];
  const nuevas = hilos.filter((h) => espera(h.raiz)).map((h) => h.raiz);
  const conversaciones = hilos.filter((h) => !espera(h.raiz));
  const quien = (n: Nota) => (n.de && n.de !== yo ? `${esc(n.quien)} · ` : '');
  const acciones = (n: Nota) => {
    const mia = n.de === yo;
    return `${mia && corregible(n) ? `<button type="button" data-editar-nota="${esc(n.id)}">${t('buzon.corregir')}</button>` : ''}${mia ? botonEscribirLoDicho(n) : ''}${mia || esTitular ? `<button type="button" data-borrar-nota="${esc(n.id)}">${t('buzon.quitar')}</button>` : ''}`;
  };
  const resumir = (n: Nota) => {
    const dicho = n.texto?.trim() || (n.audio && transcripciones[n.audio]) || n.despues?.trim() || t('preguntas.grabada');
    return esc(dicho.length > 150 ? `${dicho.slice(0, 147)}…` : dicho);
  };
  return `<section class="cabeza-preguntas">
      <p class="intro">${t('preguntas.intro')}</p>
      <button type="button" class="primario" data-preguntas>${icono('pregunta')} ${t('preguntas.hacer')}</button>
    </section>
    ${filtroVisible()}<h3>${t('preguntas.esperando')} <small>· ${nuevas.length}</small></h3>
    ${nuevas.length ? `<ol class="preguntas-espera">${nuevas.map((n) => `<li>${dichoDeNota(n, audioYTexto, adjuntosDeNota)}
        <footer><span class="como">${quien(n)}${momento(n.cuando)}</span>${acciones(n)}</footer></li>`).join('')}</ol>` : `<p class="intro">${t('preguntas.ninguna')}</p>`}
    <h3>${t('preguntas.conversaciones')} <small>· ${conversaciones.length}</small></h3>
    ${conversaciones.length ? `<div class="hilos-preguntas">${conversaciones.map((h) => {
      const esperan = h.notas.filter(espera).length;
      return `<details class="hilo-preguntas" data-hilo="${esc(h.raiz.id)}" data-ancla="hilo-${esc(h.raiz.id)}"${hilosAbiertos.has(h.raiz.id) ? ' open' : ''}>
        <summary><span class="titulo-hilo">${resumir(h.raiz)}</span>
          <span class="como">${h.notas.length > 1 ? t('preguntas.cuantas', { n: h.notas.length }) : ''}${momento(h.ultima)}</span>${esperan ? `<span class="chip-espera">${t('preguntas.esperanRespuesta', { n: esperan })}</span>` : ''}</summary>
        <ol class="qa">${h.notas.map((n, i) => {
          const r = respuestas[n.id];
          return `<li${i ? ' class="sigue"' : ''}>
            <div class="pregunta-qa">${i ? `<span class="etiqueta-sigue">${t('preguntas.seguiste')}</span>` : ''}${dichoDeNota(n, audioYTexto, adjuntosDeNota)}<small class="como">${quien(n)}${momento(n.cuando)}</small></div>
            ${r ? `<div class="respuesta-qa">${respuestaHtml(r.texto)}${r.tratamiento === 'decision' ? `<p class="pide-decision">${t('preguntas.pideDecision')}</p>` : ''}${quedoEn(r, { vista: 'preguntas', ancla: `hilo-${h.raiz.id}` })}</div>`
              : `<div class="respuesta-qa esperando"><span class="como">${t('preguntas.esperandoDirector')}</span>${acciones(n)}</div>`}
          </li>`;
        }).join('')}</ol>
        <footer class="pie-hilo"><button type="button" data-seguir-hilo="${esc(h.notas.at(-1)!.id)}">${icono('pregunta')} ${t('preguntas.seguir')}</button><button type="button" class="enlace" data-copiar-hilo="${esc(h.raiz.id)}" title="${esc(t('preguntas.copiarTitulo'))}">${t('preguntas.copiar')}</button></footer>
      </details>`;
    }).join('')}</div>` : `<p class="intro">${t('preguntas.sinRespuestas')}</p>`}`;
}
