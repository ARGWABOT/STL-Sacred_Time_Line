// La radiografía del repositorio del proyecto: los hechos que el director necesita antes de diagnosticar, sacados de
// git y de los archivos, sin opinar. Es el primer paso del diagnóstico (CLAUDE.md › El diagnóstico); después el
// director lee lo que importa (el README, la documentación, el código clave, las pruebas) y juzga. Solo lee el
// repositorio: fuera de su memoria (.stl), nunca escribe en él. Deja la radiografía en la memoria del proyecto
// (.stl/director/radiografia.md) y la imprime.
// Uso: node tools/director/diagnosticar.ts                 → el repositorio del proyecto activo
//      node tools/director/diagnosticar.ts --proyecto <id> → el de otro proyecto
//      node tools/director/diagnosticar.ts <ruta>          → otro repositorio (sin conectarlo)
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { enDisco, leerRutaRepositorio, rutasDe } from '../../src/director/proyectos.ts';
import { comprobarRepositorio, gitEn } from '../../src/director/repositorio.ts';
import { argumentos, proyectoElegido, raiz } from './comun.ts';

const MAX_ARCHIVOS_LEIDOS = 20_000;
const MAX_BYTES_LEIDOS = 1024 * 1024;

const { args, pedido } = argumentos();
const id = await proyectoElegido(pedido);
const rutas = rutasDe(id);
const pedida = args[0] ?? (await leerRutaRepositorio(raiz, id));
if (!pedida) {
  console.error('No hay repositorio conectado: el titular lo conecta en Estudio › Proyecto (o pasa la ruta como argumento).');
  process.exit(1);
}
const c = await comprobarRepositorio(pedida);
if (!c.ok) {
  console.error(c.error);
  process.exit(1);
}
const info = c.info;
const repo = info.ruta;
const g = async (...args: string[]) => (await gitEn(repo, args, 120_000)).out;
const lineas = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);
const salida: string[] = [];
const l = (s = '') => salida.push(s);
const miles = (n: number) => n.toLocaleString('es-CO');

l(`# Radiografía del repositorio · ${new Date().toLocaleString('es-CO')}`);
l();
l('Hechos sacados de git y de los archivos, sin opinión: la base del diagnóstico del director. No reemplaza leer el código.');

// ── Lo básico y la historia ──
const primero = lineas(await g('log', '--reverse', '--format=%cI%x1f%an%x1f%s')).at(0)?.split('\x1f');
// Por su nombre, sin su correo: la radiografía queda en la memoria y el correo no le sirve al diagnóstico (nota de voz
// del titular del 27 de octubre de 2026, pedido pd_cuenta_ajena: un correo de otro cliente quedó escrito ahí)
const autores = lineas(await g('shortlog', '-sn', 'HEAD')).slice(0, 12);
const meses = new Map<string, number>();
for (const m of lineas(await g('log', '--format=%ad', '--date=format:%Y-%m'))) meses.set(m, (meses.get(m) ?? 0) + 1);
const ultimos = (dias: number) => g('rev-list', '--count', `--since=${dias}.days`, 'HEAD').then((x) => Number(x.trim()) || 0);
const [d7, d30, d90] = await Promise.all([ultimos(7), ultimos(30), ultimos(90)]);
const ramas = lineas(await g('branch', '-a', '--format=%(refname:short)'));
const etiquetas = lineas(await g('tag', '--sort=-creatordate')).slice(0, 8);

l('\n## Lo básico');
l(`- Ruta: ${repo}`);
l(`- Remoto: ${info.remoto ?? 'ninguno (solo local)'}`);
l(`- Rama actual: ${info.rama}. Ramas: ${ramas.length} (${ramas.slice(0, 12).join(', ')}${ramas.length > 12 ? '…' : ''})`);
l(`- Etiquetas recientes: ${etiquetas.join(', ') || 'ninguna'}`);
l(`- Commits: ${miles(info.commits)}. Primero: ${primero ? `${primero[0].slice(0, 10)} (${primero[1]}: «${primero[2]}»)` : '—'}. Último: ${info.ultimo ? `${info.ultimo.fecha.slice(0, 10)} (${info.ultimo.autor}: «${info.ultimo.asunto}»)` : '—'}`);
l(`- Actividad: ${d7} commits en 7 días, ${d30} en 30, ${d90} en 90.`);
l(`- Cambios sin commit ahora: ${info.sinCommit} archivos.`);
l(`- Autores (commits): ${autores.map((a) => a.replace(/\s+/, ' ')).join(' · ') || '—'}`);
const ultimosMeses = [...meses.entries()].sort().slice(-12);
l(`- Commits por mes (últimos 12 con actividad): ${ultimosMeses.map(([m, n]) => `${m}: ${n}`).join(' · ')}`);

// ── La estructura y los lenguajes ──
const archivos = (await g('ls-files', '-z')).split('\0').filter(Boolean);
const porCarpeta = new Map<string, { archivos: number; lineas: number }>();
const porExt = new Map<string, { archivos: number; lineas: number; bytes: number }>();
const grandes: { ruta: string; bytes: number }[] = [];
let leidos = 0;
for (const a of archivos) {
  const carpeta = a.includes('/') ? `${a.split('/')[0]}/` : '(raíz)';
  const ext = extname(a).toLowerCase() || '(sin extensión)';
  let bytes = 0, n = 0;
  const abs = join(repo, ...a.split('/'));
  try {
    bytes = statSync(abs).size;
    if (bytes <= MAX_BYTES_LEIDOS && leidos < MAX_ARCHIVOS_LEIDOS) {
      const b = readFileSync(abs);
      if (!b.subarray(0, 8000).includes(0)) {
        n = b.length ? b.toString('latin1').split('\n').length : 0;
        leidos++;
      }
    }
  } catch {
    // borrado en la carpeta pero aún en git
  }
  grandes.push({ ruta: a, bytes });
  const pc = porCarpeta.get(carpeta) ?? { archivos: 0, lineas: 0 };
  pc.archivos++; pc.lineas += n;
  porCarpeta.set(carpeta, pc);
  const pe = porExt.get(ext) ?? { archivos: 0, lineas: 0, bytes: 0 };
  pe.archivos++; pe.lineas += n; pe.bytes += bytes;
  porExt.set(ext, pe);
}
l('\n## La estructura (carpetas de primer nivel)');
l('| Carpeta | Archivos | Líneas de texto |');
l('| --- | ---: | ---: |');
for (const [k, v] of [...porCarpeta.entries()].sort((a, b) => b[1].archivos - a[1].archivos).slice(0, 30)) l(`| ${k} | ${miles(v.archivos)} | ${miles(v.lineas)} |`);
// Un nivel más dentro de las carpetas de código habituales: ahí suelen estar los frentes
for (const base of ['src', 'app', 'lib', 'packages', 'apps', 'services', 'modules']) {
  const sub = new Map<string, number>();
  for (const a of archivos) if (a.startsWith(`${base}/`) && a.split('/').length > 2) sub.set(`${a.split('/').slice(0, 2).join('/')}/`, (sub.get(`${a.split('/').slice(0, 2).join('/')}/`) ?? 0) + 1);
  if (sub.size) l(`- Dentro de ${base}/: ${[...sub.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${k} (${n})`).join(', ')}`);
}

l('\n## Los lenguajes y formatos (por extensión)');
l('| Extensión | Archivos | Líneas | Peso |');
l('| --- | ---: | ---: | ---: |');
for (const [k, v] of [...porExt.entries()].sort((a, b) => b[1].lineas - a[1].lineas || b[1].archivos - a[1].archivos).slice(0, 20)) l(`| ${k} | ${miles(v.archivos)} | ${miles(v.lineas)} | ${(v.bytes / 1024 / 1024).toFixed(1)} MB |`);
if (leidos >= MAX_ARCHIVOS_LEIDOS) l(`(Se contaron las líneas de los primeros ${miles(MAX_ARCHIVOS_LEIDOS)} archivos de texto.)`);

// ── Lo que se reconoce: manifiestos, pruebas, CI, documentación ──
const hay = (patron: RegExp) => archivos.filter((a) => patron.test(a));
l('\n## Herramientas y señales que se reconocen');
const leerJson = (rel: string) => {
  try { return JSON.parse(readFileSync(join(repo, ...rel.split('/')), 'utf-8')); } catch { return null; }
};
for (const pj of hay(/(^|\/)package\.json$/).filter((a) => !a.includes('node_modules/')).slice(0, 6)) {
  const p = leerJson(pj);
  if (!p) continue;
  const deps = Object.keys({ ...(p.dependencies ?? {}) });
  const dev = Object.keys({ ...(p.devDependencies ?? {}) });
  l(`- ${pj}: «${p.name ?? '(sin nombre)'}» ${p.version ?? ''}. Scripts: ${Object.keys(p.scripts ?? {}).join(', ') || 'ninguno'}. Dependencias (${deps.length}): ${deps.slice(0, 25).join(', ')}${deps.length > 25 ? '…' : ''}. De desarrollo (${dev.length}): ${dev.slice(0, 15).join(', ')}${dev.length > 15 ? '…' : ''}.`);
}
const MANIFIESTOS: [RegExp, string][] = [
  [/(^|\/)composer\.json$/, 'PHP (Composer)'], [/(^|\/)(requirements[^/]*\.txt|pyproject\.toml|setup\.py|Pipfile)$/, 'Python'],
  [/(^|\/)go\.mod$/, 'Go'], [/(^|\/)Cargo\.toml$/, 'Rust'], [/(^|\/)(pom\.xml|build\.gradle(\.kts)?)$/, 'Java/Kotlin'],
  [/(^|\/)Gemfile$/, 'Ruby'], [/\.(csproj|sln|fsproj)$/, '.NET'], [/(^|\/)pubspec\.yaml$/, 'Dart/Flutter'],
  [/(^|\/)Package\.swift$/, 'Swift'], [/(^|\/)(Dockerfile|docker-compose[^/]*\.ya?ml|compose\.ya?ml)$/, 'Docker'],
  [/(^|\/)Makefile$/, 'Make'], [/^\.github\/workflows\/.+\.ya?ml$/, 'CI de GitHub Actions'], [/(^|\/)\.gitlab-ci\.yml$/, 'CI de GitLab'],
  [/(^|\/)(Jenkinsfile|azure-pipelines\.yml|bitbucket-pipelines\.yml)$/, 'Otro CI'], [/(^|\/)\.env\.example$/, 'Ejemplo de variables de entorno'],
  [/(^|\/)(\.eslintrc[^/]*|eslint\.config\.[cm]?[jt]s|\.prettierrc[^/]*|ruff\.toml|\.flake8|phpcs\.xml[^/]*|\.editorconfig)$/, 'Estilo y linters'],
  [/(^|\/)(tsconfig[^/]*\.json)$/, 'TypeScript'], [/(^|\/)(vite|webpack|rollup|next|nuxt|astro|svelte)\.config\.[cm]?[jt]s$/, 'Empaquetador o framework web'],
  [/(^|\/)(supabase|prisma|migrations?)\//, 'Base de datos y migraciones'], [/(^|\/)(terraform|\.tf$|k8s|helm)/, 'Infraestructura como código'],
];
for (const [patron, nombre] of MANIFIESTOS) {
  const x = hay(patron);
  if (x.length) l(`- ${nombre}: ${x.slice(0, 6).join(', ')}${x.length > 6 ? ` (y ${x.length - 6} más)` : ''}`);
}
const pruebas = hay(/(^|\/)(tests?|__tests__|spec|specs)\/|\.(test|spec)\.[a-z]+$|_test\.(go|py)$|(^|\/)test_[^/]+\.py$/);
l(`- Pruebas: ${pruebas.length ? `${pruebas.length} archivos (${[...new Set(pruebas.map((a) => a.split('/').slice(0, 2).join('/')))].slice(0, 8).join(', ')})` : 'no se ven archivos de pruebas'}`);
const licencia = hay(/^(LICENSE|LICENCE|COPYING)(\.[a-z]+)?$/i);
l(`- Licencia: ${licencia.join(', ') || 'no hay archivo de licencia'}`);

// ── La documentación ──
const readme = hay(/^readme(\.[a-z]+)?$/i)[0];
const mds = hay(/\.md$/i).filter((a) => !/(^|\/)(node_modules|vendor)\//.test(a));
l('\n## La documentación');
l(`- Archivos .md: ${mds.length}${mds.length ? ` (${mds.slice(0, 25).join(', ')}${mds.length > 25 ? '…' : ''})` : ''}`);
l(`- En el Estudio se leen y se comentan como repo:<ruta> (por ejemplo, repo:${readme ?? 'README.md'}).`);
if (readme && existsSync(join(repo, readme))) {
  const texto = readFileSync(join(repo, readme), 'utf-8').split('\n');
  l(`\n### ${readme} (primeras ${Math.min(60, texto.length)} de ${texto.length} líneas)`);
  l('```');
  l(texto.slice(0, 60).join('\n').replace(/```/g, "'''"));
  l('```');
} else {
  l('- No hay README en la raíz.');
}

// ── Dónde se trabaja: puntos calientes ──
const recientes = lineas(await g('log', '--since=90.days', '--name-only', '--format='));
const calientes = new Map<string, number>();
const carpetasCalientes = new Map<string, number>();
for (const a of recientes) {
  calientes.set(a, (calientes.get(a) ?? 0) + 1);
  const k = a.split('/').slice(0, Math.min(2, a.split('/').length - 1)).join('/') || '(raíz)';
  carpetasCalientes.set(k, (carpetasCalientes.get(k) ?? 0) + 1);
}
l('\n## Dónde se trabajó en los últimos 90 días');
l(`- Carpetas: ${[...carpetasCalientes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} (${n})`).join(', ') || 'sin cambios'}`);
l(`- Archivos más cambiados: ${[...calientes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${k} (${n})`).join(', ') || '—'}`);
const asuntos = lineas(await g('log', '-25', '--format=%ad · %an · %s', '--date=short'));
l('\n### Los últimos 25 commits');
for (const a of asuntos) l(`- ${a}`);

// ── La deuda visible ──
const marcas = lineas((await gitEn(repo, ['grep', '-I', '-c', '-E', '\\b(TODO|FIXME|HACK|XXX)\\b'], 120_000)).out);
const porCarpetaMarcas = new Map<string, number>();
let totalMarcas = 0;
for (const m of marcas) {
  const [ruta, n] = [m.slice(0, m.lastIndexOf(':')), Number(m.slice(m.lastIndexOf(':') + 1))];
  totalMarcas += n;
  const k = ruta.includes('/') ? `${ruta.split('/')[0]}/` : '(raíz)';
  porCarpetaMarcas.set(k, (porCarpetaMarcas.get(k) ?? 0) + n);
}
l('\n## La deuda que se ve');
l(`- Marcas TODO, FIXME, HACK o XXX: ${totalMarcas} en ${marcas.length} archivos${totalMarcas ? ` (${[...porCarpetaMarcas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} ${n}`).join(', ')})` : ''}.`);
l(`- Los archivos más pesados en git: ${grandes.sort((a, b) => b.bytes - a.bytes).slice(0, 8).map((x) => `${x.ruta} (${(x.bytes / 1024 / 1024).toFixed(1)} MB)`).join(', ')}`);

// ── Para el director ──
l('\n## Para el director: candidatos a frentes');
l('Las carpetas con más archivos y más trabajo reciente. Un frente es un área de trabajo con sentido para el objetivo (no una carpeta por carpeta): agrupa las rutas y nombra el frente como lo diría el equipo.');
for (const [k, v] of [...porCarpeta.entries()].filter(([k]) => k !== '(raíz)').sort((a, b) => b[1].archivos - a[1].archivos).slice(0, 12)) {
  l(`- ${k}: ${v.archivos} archivos, ${carpetasCalientes.get(k.replace(/\/$/, '')) ?? [...carpetasCalientes.entries()].filter(([c]) => c.startsWith(k)).reduce((s, [, n]) => s + n, 0)} cambios en 90 días`);
}

const texto = salida.join('\n') + '\n';
mkdirSync(join(enDisco(raiz, rutas.radiografia), '..'), { recursive: true });
writeFileSync(enDisco(raiz, rutas.radiografia), texto, 'utf-8');
console.log(texto);
console.error(`Radiografía de «${id}» guardada en ${rutas.radiografia}.`);
console.error('Ahora, a leer el repositorio y diagnosticar (CLAUDE.md › El diagnóstico).');
