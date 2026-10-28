// Lo ya hecho, a una consulta (propuesta aceptada pr_memoria_consultable, punto 2). Busca por palabras en todo lo del
// proyecto (el plan con su archivo, lo respondido a cada nota y los commits de su repositorio) y dice de cada hallazgo en
// qué estado está, en cuatro grupos: lo hecho o cerrado, lo de ahora, lo previsto y lo respondido, cada uno con su hilo.
// El director la usa antes de ejecutar algo y antes de pedir algo: lo que ya se hizo no se vuelve a pedir.
// Uso: node tools/director/buscar.ts "<palabras>" [--proyecto <id>]
import { execFileSync } from 'node:child_process';
import { buscar, GRUPOS, NOMBRE_GRUPO, piezasDelProyecto, type CommitDelRepositorio } from '../../src/director/buscar.ts';
import { ARGUMENTOS_DE_COMMITS } from '../firma.ts';
import { argumentos, leerTodo } from './comun.ts';

const { args, pedido } = argumentos();
const consulta = args.filter((a) => !a.startsWith('--')).join(' ').trim();
if (!consulta) {
  console.error('Uso: node tools/director/buscar.ts "<palabras>" [--proyecto <id>]');
  process.exit(1);
}
const { id, plan, estado, proyecto, repo } = await leerTodo(pedido, false);

// Los commits del repositorio del proyecto, del más nuevo al más viejo: lo hecho que no siempre dejó su línea en el plan.
// También los de su historia de antes, si su rama main se rehízo en un solo commit (tools/historia-limpia.ts)
let commits: CommitDelRepositorio[] = [];
if (repo) {
  try {
    const salida = execFileSync('git', ARGUMENTOS_DE_COMMITS, { cwd: repo.ruta, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 });
    commits = salida.split('\n').filter(Boolean).map((l) => {
      const [hash, cuando, ...asunto] = l.split('\t');
      return { hash, cuando, asunto: asunto.join('\t') };
    });
  } catch {
    // sin git o sin historia, se busca en lo demás
  }
}

const hallazgos = buscar(piezasDelProyecto(plan, estado, commits), consulta);
console.log(`# Buscar «${consulta}» en ${proyecto.nombre || id} (${id})`);
if (!hallazgos.length) console.log('Nada lo nombra: ni el plan, ni su archivo, ni lo respondido, ni los commits.');
for (const g of GRUPOS) {
  const suyos = hallazgos.filter((h) => h.grupo === g);
  if (!suyos.length) continue;
  console.log(`\n## ${NOMBRE_GRUPO[g]} (${suyos.length})`);
  // El pedazo donde aparece, si no es el comienzo que ya dice el título
  const repite = (h: (typeof suyos)[number]) => h.fragmento.replace(/^…/, '').startsWith(h.titulo.replace(/…$/, '').slice(0, 40));
  for (const h of suyos) console.log(`- [${h.id}] ${h.estado} · ${h.titulo}${h.fragmento && !repite(h) ? ` — ${h.fragmento}` : ''}${h.hilo.length ? ` · ${h.hilo.join(' · ')}` : ''}`);
}
