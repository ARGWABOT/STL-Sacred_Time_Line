// El texto de un paso de la misión, de corrido: lo que dice, el botón que lleva a donde pide, su detalle con la misma
// letra y, al final, el ✉ para comentarlo (nota de voz del titular nmvvvazd4tit, 30 de octubre de 2026: el detalle salía
// debajo del botón, en otro párrafo y más chico, y parecía otro texto). Su nombre de archivo va en inglés, como cada
// archivo que nace al partir los módulos grandes (pr_partir_modulos).
import { esc } from './util';

/** Lo que va en el renglón del paso, ya pintado: el botón «ir», «Desmarcar» y el ✉ llegan hechos, o vacíos. */
export interface PiezasDelPaso {
  texto: string;
  /** El botón que lleva a donde pide el paso, o ''. */
  ir: string;
  detalle?: string[];
  desmarcar: string;
  comentar: string;
}

/** Cada punto del detalle, como una frase que sigue a la anterior: con su punto final si no lo trae. */
const frase = (x: string) => (/[.!?…:;»)]$/.test(x.trim()) ? x.trim() : `${x.trim()}.`);

/** El renglón del paso: su texto, su botón, su detalle (en el mismo párrafo y con la misma letra) y el ✉ al final. */
export function textoDelPaso(p: PiezasDelPaso): string {
  const detalle = p.detalle?.length ? `<span class="detalle-paso">${p.detalle.map((x) => esc(frase(x))).join(' ')}</span>` : '';
  return `<span>${esc(p.texto)}</span>${p.ir}${detalle}${p.desmarcar}${p.comentar}`;
}
