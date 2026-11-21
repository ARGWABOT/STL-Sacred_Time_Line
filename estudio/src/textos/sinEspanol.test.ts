import { describe, expect, it } from 'vitest';
import { en } from './en';

// Ningún texto en inglés lleva español: si se cuela una palabra, este test dice la clave y la palabra.

/** Palabras y etiquetas de la interfaz en español que no existen (o casi) en inglés. */
const PALABRAS_ES = [
  'para', 'por', 'porque', 'cuando', 'donde', 'dónde', 'como', 'cómo', 'qué', 'que', 'pero', 'también', 'ahora', 'aquí', 'todo', 'todos', 'todas', 'nada',
  'el', 'la', 'los', 'las', 'del', 'una', 'unos', 'unas', 'sus', 'muy', 'más', 'esta', 'este', 'estos', 'estas', 'está', 'están', 'sin', 'con',
  'hoy', 'buzón', 'buzon', 'ruta', 'propuesta', 'propuestas', 'pregunta', 'preguntas', 'documento', 'documentos', 'modelo', 'consumo', 'permiso', 'permisos',
  'entendido', 'listo', 'lista', 'confirmo', 'autorizo', 'apruebo', 'recomiendas', 'decido', 'otra', 'otro', 'cosa', 'entiendo', 'hice', 'hazlo', 'tú', 'tu', 'yo',
  'siguiente', 'pedir', 'revisión', 'revision', 'revisar', 'misión', 'mision', 'misiones', 'proyecto', 'proyectos', 'fase', 'fases', 'puerta', 'meta', 'objetivo',
  'niebla', 'lectura', 'modo', 'enfoque', 'quedamos', 'haciendo', 'sigue', 'volver', 'quedó', 'quedo', 'reemplazado', 'reemplazada', 'comentario', 'comentarios',
  'comentar', 'bitácora', 'bitacora', 'tarea', 'tareas', 'reunión', 'equipo', 'estudio', 'carpeta', 'guardar', 'cancelar', 'aceptar', 'descartar', 'borrar',
  'desde', 'hasta', 'antes', 'cada', 'después', 'luego', 'aún', 'han', 'hay', 'fue', 'pendiente', 'pendientes', 'abierto', 'cerrado', 'enviar', 'enviado',
  'leer', 'leído', 'escribir', 'abrir', 'cerrar', 'tiene', 'puede', 'debe', 'quiere', 'dice', 'texto', 'dueño', 'mensaje', 'respuesta', 'botón', 'pantalla',
  'nota', 'notas', 'y', 'en', 'de', 'se', 'lo', 'al', 'un', 'su', 'ya', 'ni', 'es', 'mi', 'le', 'sobre', 'entre', 'siempre', 'nunca', 'solo', 'sólo',
  'hecho', 'hecha', 'nuevo', 'nueva', 'ayuda', 'idioma', 'inglés', 'español', 'cuenta', 'sesión', 'sesion', 'frente', 'frentes', 'criterio', 'criterios',
];

/** Lo que se permite en español dentro de un texto en inglés (nombres propios y texto citado). */
const PERMITIDO = ['STL Studio', 'ENCARTO', 'revisa estudio', '--listo', 'Abrir STL Studio.cmd', '(cerrar)', '(si)'];

const LETRAS_SOLO_ES = /[ñ¿¡áéíóú]/i;

function sinLoPermitido(valor: string): string {
  let texto = valor;
  for (const p of [...PERMITIDO].sort((a, b) => b.length - a.length)) texto = texto.split(p).join(' ');
  return texto
    .replace(/`[^`]*`/g, ' ') // código o rutas entre comillas invertidas
    .replace(/<code>.*?<\/code>/g, ' ')
    .replace(/<[^>]*>/g, ' ') // etiquetas HTML y sus atributos
    .replace(/\{[^}]*\}/g, ' ') // {marcadores}
    .replace(/\S*[\\/]\S*/g, ' ') // rutas
    .replace(/\b[\w-]+\.(?:json|md|ts|js|html|css)\b/g, ' '); // archivos
}

function valores(): Array<[string, string]> {
  const salida: Array<[string, string]> = [];
  for (const [clave, texto] of Object.entries(en)) {
    if (typeof texto === 'string') salida.push([clave, texto]);
    else {
      salida.push([`${clave}.uno`, texto.uno]);
      salida.push([`${clave}.otros`, texto.otros]);
    }
  }
  return salida;
}

/** Devuelve la primera palabra o letra en español que halla, o null. */
function espanolEn(valor: string): string | null {
  const texto = sinLoPermitido(valor);
  const letra = texto.match(LETRAS_SOLO_ES);
  if (letra) return letra[0];
  for (const palabra of PALABRAS_ES) {
    if (new RegExp(`(?<![\\p{L}\\p{N}_])${palabra}(?![\\p{L}\\p{N}_])`, 'iu').test(texto)) return palabra;
  }
  return null;
}

describe('los textos en inglés no llevan español', () => {
  it('detecta una fuga en una frase de prueba', () => {
    expect(espanolEn('Press «Confirmo» to go on')).toBe('confirmo');
    expect(espanolEn('Open `plan.json` in STL Studio')).toBeNull();
    expect(espanolEn('See the diagnosis in {fase} for ENCARTO')).toBeNull();
  });

  it('ningún valor de en.ts tiene palabras ni letras del español', () => {
    const fallos: string[] = [];
    for (const [clave, valor] of valores()) {
      const hallada = espanolEn(valor);
      if (hallada) fallos.push(`${clave}: «${hallada}» en «${valor.slice(0, 80)}»`);
    }
    expect(fallos).toEqual([]);
  });
});
