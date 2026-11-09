// El arranque de un proyecto, paso a paso, en «Hoy»: del repositorio (o de la idea) a la ruta. Salió de app.ts al
// partir los módulos grandes (propuesta aceptada pr_partir_modulos), como la ficha de cada persona (personCard.ts): recibe
// lo que pinta y no guarda nada; los botones a cada lugar los pinta la página, como en el resto del Studio. Su nombre de
// archivo va en inglés, como cada archivo que nace al partirlos (decisión del titular del 30 de octubre de 2026).
import type { Destino, EtapaArranque } from '../../src/director/director';
import { t } from './textos';

/** Lo que pinta el arranque. La página se lo da con sus datos. */
export interface DatosArranque {
  arranque: EtapaArranque;
  /** Si el proyecto es nuevo (se plantea) o existente (se diagnostica). */
  nuevo: boolean;
  /** Si su repositorio ya está conectado, si ya tiene diagnóstico, meta y ruta. */
  conectado: boolean;
  diagnosticado: boolean;
  conMeta: boolean;
  conRuta: boolean;
  /** El botón que lleva a un lugar del Studio, como lo pinta la página. */
  botonIr: (dest: Destino) => string;
}

/** El arranque, paso a paso: del repositorio a la ruta. Va en «Hoy» mientras el proyecto arranca; en marcha, nada. */
export function arranqueHTML(datos: DatosArranque) {
  const { arranque, nuevo, botonIr } = datos;
  if (arranque === 'en_marcha') return '';
  const orden: EtapaArranque[] = [nuevo ? 'contar' : 'conectar', 'diagnostico', 'objetivo', 'ruta'];
  const i = orden.indexOf(arranque);
  const hecho = datos.diagnosticado;
  const pasos = [
    nuevo
      ? { n: t('arranque.contar'), hecho: arranque !== 'contar', texto: t('arranque.contarTexto'), boton: botonIr({ vista: 'proyecto', ancla: 'p-contexto', etiqueta: t('arranque.irProyecto') }) }
      : { n: t('arranque.entregar'), hecho: datos.conectado, texto: t('arranque.entregarTexto'), boton: botonIr({ vista: 'proyecto', ancla: 'p-repositorio', etiqueta: t('arranque.irProyecto') }) },
    { n: t(nuevo ? 'arranque.planteamiento' : 'arranque.diagnostico'), hecho, texto: t(nuevo ? 'arranque.planteamientoTexto' : 'arranque.diagnosticoTexto'), boton: hecho ? botonIr({ vista: 'proyecto', ancla: 'p-diagnostico', etiqueta: t('arranque.leerlo') }) : '' },
    { n: t('arranque.meta'), hecho: datos.conMeta, texto: t('arranque.metaTexto'), boton: hecho ? botonIr({ vista: 'proyecto', ancla: 'p-objetivo', etiqueta: t('arranque.irMeta') }) : '' },
    { n: t('arranque.ruta'), hecho: datos.conRuta, texto: t('arranque.rutaTexto'), boton: '' },
  ];
  return `<section class="arranque" aria-label="${t('arranque.grupo')}"><h3>${t('arranque.titulo', { de: t(nuevo ? 'arranque.deIdea' : 'arranque.deRepo') })}</h3>
    <ol class="pasos-arranque">${pasos
      .map((p, k) => `<li class="${p.hecho ? 'hecho' : k === i ? 'actual' : ''}"${k === i ? ' aria-current="step"' : ''}><span class="num-a">${p.hecho ? '✓' : k + 1}</span><div><b>${p.n}</b><small>${p.texto}</small>${k === i ? p.boton : ''}</div></li>`)
      .join('')}</ol></section>`;
}
