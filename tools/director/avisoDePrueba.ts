// Hace aparecer ahora la línea de versión nueva, para verla antes de que exista una versión publicada (solo avisa desde la
// 1.0.0): deja guardada una versión 9.9.9 que el Studio cree recibida hoy, y su enlace lleva a «Releases». La siguiente
// consulta a GitHub, a las 24 horas, la reemplaza con lo que sea verdad. No toca nada más.
//   node tools/director/avisoDePrueba.ts            → aparece, también si la habías cerrado con su ✕
//   node tools/director/avisoDePrueba.ts --quitar   → se va de una vez
import { join } from 'node:path';
import { REPO_PUBLICO } from '../../src/director/avisoVersion.ts';
import { cambiarAvisoVersion } from '../../src/director/proyectos.ts';

const raiz = join(import.meta.dirname, '..', '..');
const quitar = process.argv.includes('--quitar');
await cambiarAvisoVersion(raiz, (a) => (quitar
  ? (({ version, enlace, cerrada, ...resto }) => resto)(a ?? {})
  : (({ cerrada, ...resto }) => ({ ...resto, consultada: new Date().toISOString(), version: '9.9.9', enlace: `https://github.com/${REPO_PUBLICO}/releases` }))(a ?? {})));
console.log(quitar ? 'Listo: la línea de versión nueva de prueba se fue.' : 'Listo: en unos segundos, la línea de versión nueva aparece al pie de la barra, junto a tu nombre.');
