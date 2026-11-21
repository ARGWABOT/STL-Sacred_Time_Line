// Saca un proyecto de este Studio, lo mismo que «Quitarlo de este Studio» en «Proyecto» › «Dónde está»
// (pd_quitar_en_pantalla):
//   node tools/quitar-proyecto.ts <id>              dice todo lo que se borraría, sin tocar nada
//   node tools/quitar-proyecto.ts <id> --confirmo   lo borra
// Borra toda su memoria, sin archivo: su carpeta .stl, su rama stl, la línea que la excluye de git, las líneas de STL en su
// CLAUDE.md o AGENTS.md (en un commit local) y, con el permiso de subir y la cuenta aprobada, la copia en GitHub; en este
// Studio, todo lo suyo. No toca su código ni sus otras ramas. STL Studio mismo no se puede quitar. Habla en el idioma de la
// interfaz de este computador.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerLocal, queSeBorra, quitarProyecto, type LoQueSeBorra } from '../src/director/proyectos.ts';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const local = await leerLocal(raiz);
const en = local.idioma === 'en';
const id = process.argv[2];
const confirmo = process.argv.includes('--confirmo');
if (!id || id.startsWith('--')) {
  console.error(en ? 'Usage: node tools/quitar-proyecto.ts <project id> [--confirmo]' : 'Uso: node tools/quitar-proyecto.ts <id del proyecto> [--confirmo]');
  process.exit(1);
}

/** La lista de lo que se borra, una cosa por línea. */
function lista(b: LoQueSeBorra): string[] {
  const l: string[] = [];
  if (b.repo) {
    if (b.memoria) l.push(en ? `its memory folder, ${join(b.repo, '.stl')}` : `su carpeta de memoria, ${join(b.repo, '.stl')}`);
    if (b.rama) l.push(en ? 'its local stl branch' : 'su rama stl local');
    if (b.exclusion) l.push(en ? 'the line that keeps .stl out of git on this computer' : 'la línea que deja .stl fuera de git en este computador');
    for (const x of b.lineas) l.push(en ? `in ${x.archivo}, in one local commit: ${x.lineas.join(' / ')}` : `en ${x.archivo}, en un commit local: ${x.lineas.join(' / ')}`);
    if (b.remota) l.push(b.remota.seBorra
      ? (en ? `its copy on GitHub (${b.remota.remoto}), after checking the approved account` : `su copia en GitHub (${b.remota.remoto}), después de comprobar la cuenta aprobada`)
      : (en ? `not its copy on ${b.remota.remoto}: it has no permission to push (${b.remota.orden})` : `no su copia en ${b.remota.remoto}: no tiene el permiso de subir (${b.remota.orden})`));
  }
  l.push(en ? `in this Studio: ${b.local.join(', ') || '—'}` : `en este Studio: ${b.local.join(', ') || '—'}`);
  for (const r of b.registros) l.push(r);
  if (b.lineasDelStudio) l.push(en ? `${b.lineasDelStudio} lines of this computer's history` : `${b.lineasDelStudio} líneas de la historia de este computador`);
  return l;
}

try {
  const b = await queSeBorra(raiz, id);
  if (!confirmo) {
    console.log(en ? `Taking «${id}» out deletes, with no archive:` : `Quitar «${id}» borra, sin archivo:`);
    for (const x of lista(b)) console.log(`- ${x}`);
    console.log(en ? 'It cannot be undone. To do it: node tools/quitar-proyecto.ts ' + id + ' --confirmo' : 'No se puede deshacer. Para hacerlo: node tools/quitar-proyecto.ts ' + id + ' --confirmo');
    process.exit(0);
  }
  const r = await quitarProyecto(raiz, id, { idioma: en ? 'en' : 'es' });
  console.log(en ? `Done: «${id}» left this Studio, with nothing archived.` : `Listo: «${id}» salió de este Studio, sin nada archivado.`);
  for (const q of r.quedo) console.log(`- ${q}`);
  console.log(en ? 'To hand it over again from scratch, use «Hand over projects» in the Studio.' : 'Para entregarlo otra vez desde cero, usa «Entregar proyectos» en el Studio.');
} catch (e) {
  console.error(`${en ? 'It could not finish' : 'No se pudo terminar'}: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
