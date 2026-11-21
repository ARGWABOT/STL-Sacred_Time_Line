// Dónde se guarda el registro de lo que recorriste con la niebla (src/director/registroLectura.ts): en este computador,
// fuera de git, uno por persona y por proyecto.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { juntarRegistros, registroValido, type RegistroLectura } from '../../src/director/registroLectura.ts';

/** Dónde vive el registro de una persona en un proyecto: en este computador, fuera de git. */
export function archivoDeLectura(raiz: string, proyecto: string, persona: string): string {
  const limpio = (s: string) => s.replace(/[^\w.-]+/g, '_').replace(/^\.+/, '_') || '_';
  return join(raiz, '.estudio', 'lectura', limpio(proyecto), `${limpio(persona)}.json`);
}

export async function leerRegistroLectura(raiz: string, proyecto: string, persona: string): Promise<RegistroLectura> {
  try {
    return registroValido(JSON.parse(await readFile(archivoDeLectura(raiz, proyecto, persona), 'utf-8')));
  } catch {
    return {};
  }
}

/** Una escritura a la vez por archivo: dos que se cruzan no se borran lo suyo. */
const enCola = new Map<string, Promise<unknown>>();

/** Suma lo que llega al registro guardado (por bloque, el más nuevo) y lo escribe de una vez. Devuelve el registro entero. */
export function anotarLectura(raiz: string, proyecto: string, persona: string, cambios: RegistroLectura): Promise<RegistroLectura> {
  const archivo = archivoDeLectura(raiz, proyecto, persona);
  const hecho = (enCola.get(archivo) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const reg = juntarRegistros(await leerRegistroLectura(raiz, proyecto, persona), registroValido(cambios));
    await mkdir(dirname(archivo), { recursive: true });
    await writeFile(`${archivo}.tmp`, JSON.stringify(reg));
    await rename(`${archivo}.tmp`, archivo);
    return reg;
  });
  enCola.set(archivo, hecho);
  return hecho;
}
