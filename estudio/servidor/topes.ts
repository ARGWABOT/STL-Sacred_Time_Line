// Los topes de lo que llega del navegador al servidor del Studio. Lo que una persona escribe o dice llega entero al
// director, o no llega: el servidor nunca lo corta en silencio (nota de voz del titular, 22 de octubre de 2026: una
// definición larga, dictada en un audio largo, no puede perder una parte sin que nadie lo sepa). Cada texto se guarda
// completo o se rechaza con un aviso que dice cuánto mide, cuál es el tope y qué hacer.
import { MAX_ADJUNTO, MAX_ADJUNTOS, MAX_TEXTO } from '../../src/director/director.ts';

/** Un pedido que no se cumple, con su razón para quien lo hizo: el servidor la devuelve con un 400 y el Studio la muestra. */
export class Rechazo extends Error {}

/** Lo que pesa como máximo el audio de una nota: holgado para lo que graba la grabadora del Studio (estudio/src/grabadora.ts). */
export const MAX_AUDIO = 15 * 1024 * 1024;

/** El cuerpo de una petición: los audios y los adjuntos llegan en base64 desde el navegador (un tercio más que su peso). */
export const MAX_CUERPO = 30 * 1024 * 1024 + Math.ceil((MAX_ADJUNTOS * MAX_ADJUNTO * 4) / 3);

/** El nombre de un adjunto: el máximo de los sistemas de archivos, para que ningún archivo se rechace por su nombre. */
export const MAX_NOMBRE_ARCHIVO = 255;

const SOBRA_TEXTO = 'Deja lo que sobra en otra nota del Buzón, o adjunta el texto como archivo en una nota.';
const SOBRA_CAMPO = 'Acorta el texto y vuelve a intentarlo.';
const cifra = (n: number) => n.toLocaleString('es');

/**
 * Lo que manda el navegador, sin los espacios de los extremos: entero si cabe en su tope y, si no, un Rechazo que dice
 * cuánto mide, cuál es el tope y qué hacer. Nunca lo corta. `tope`: MAX_TEXTO para un texto libre; el suyo, para un
 * campo corto (un nombre, un correo, una ruta). `que`: cómo lo llama quien lo escribió («La nota», «El nombre del
 * proyecto»). `hacer`: qué hacer si no cabe (por defecto, lo de un texto libre o lo de un campo corto).
 */
export function textoDe(valor: unknown, tope: number, que: string, hacer = tope >= MAX_TEXTO ? SOBRA_TEXTO : SOBRA_CAMPO): string {
  const texto = String(valor ?? '').trim();
  if (texto.length > tope) throw new Rechazo(`${que} mide ${cifra(texto.length)} caracteres y el tope es ${cifra(tope)}. No se guardó nada: el Studio no corta lo que escribes. ${hacer}`);
  return texto;
}
