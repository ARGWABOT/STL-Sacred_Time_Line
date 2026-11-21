// La marca «copia de desarrollo» de este computador (pd_medicion_solo_desarrollo; t_decide_marca_desarrollo): una sola, en la
// configuración local, fuera de git y del paquete, que enciende lo que solo vale en la copia de quien desarrolla el Studio.
// La corre su dueño, a mano: al director le está negado escribir esa configuración, que también guarda sus permisos.
//   node tools/director/marcaDesarrollo.ts [--quitar]
import { marcarCopiaDeDesarrollo } from '../../src/director/proyectos.ts';
import { raiz } from './comun.ts';

const quitar = process.argv.includes('--quitar');
await marcarCopiaDeDesarrollo(raiz, !quitar);
console.log(quitar
  ? 'Listo: este Studio ya no es una copia de desarrollo. La medición del núcleo deja de verse.'
  : 'Listo: este Studio es una copia de desarrollo. Recarga la página: «La medición del núcleo» vuelve a «Modelo y consumo».');
