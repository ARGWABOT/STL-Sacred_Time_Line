import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { negadosEnVivo } from '../../src/director/director';
import { autorizadasPara, negadosDe, nuncaDe, ofrecidoEnVivo, ordenDePruebas, ordenesDe, pendientesEnVivo, permisosNegados, pruebasOfrecidas, reglaDe, reglaProhibida, revisarPedido, sinAutorizar, type PermisoAutorizado } from './permisosNegados';
import { conAutorizadas, negado, permitido, registrosDeNegados, SIN_ESPERAS } from './revisor';

// Lo que se le negó al director, para autorizarlo con una casilla (nota de voz del titular nmvotdn3ftit, 26 de octubre de
// 2026: «No quiero volver a que el director falle por permisos»)
const CASA = String.raw`C:\Users\ana`;
const STUDIO = String.raw`C:\xampp\STL`;
const GOLF = String.raw`C:\repos\golf`;
const prohibidas = [...SIN_ESPERAS, ...negado(GOLF, STUDIO)];

const uso = (id: string, name: string, input: Record<string, unknown>) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
const enVivo = (id: string, tool_name: string) => JSON.stringify({ type: 'system', subtype: 'permission_denied', tool_use_id: id, tool_name });
const resultado = (permission_denials: unknown[]) => JSON.stringify({ type: 'result', permission_denials });

describe('lo que se le negó al director, para autorizarlo con una casilla', () => {
  it('saca cada negado de su registro con lo que intentó: en vivo y del resultado, sin repetir', () => {
    const registro = [
      uso('t1', 'Bash', { command: 'curl -s http://localhost:5180/__estudio/voz/lista' }),
      enVivo('t1', 'Bash'),
      uso('t2', 'Glob', { pattern: '*', path: String.raw`\\wsl.localhost\Ubuntu\home` }),
      enVivo('t2', 'Glob'),
      'no es json',
      resultado([{ tool_name: 'Bash', tool_use_id: 't1', tool_input: { command: 'curl -s http://localhost:5180/__estudio/voz/lista' } }]),
    ].join('\n');
    expect(negadosDe(registro)).toEqual([
      { herramienta: 'Bash', entrada: { command: 'curl -s http://localhost:5180/__estudio/voz/lista' } },
      { herramienta: 'Glob', entrada: { pattern: '*', path: String.raw`\\wsl.localhost\Ubuntu\home` } },
    ]);
  });

  // Nota de voz del titular nmvovewkqtit, 26 de octubre de 2026: el permiso general de ese tipo de acción, no la línea
  it('propone el permiso del tipo de acción, no el de la línea: el programa, la carpeta que leyó o buscó, la carpeta donde escribió', () => {
    const bash = (command: string) => reglaDe({ herramienta: 'Bash', entrada: { command } }, CASA);
    expect(bash('curl -s http://localhost:5180/__estudio/voz/lista').regla).toBe('Bash(curl:*)');
    expect(bash('git log --oneline -5').regla).toBe('Bash(git log:*)');
    expect(bash('npm run build').regla).toBe('Bash(npm run:*)');
    expect(bash('node tools/director/mirar.ts http://localhost:5180/').regla).toBe('Bash(node tools/director/mirar.ts:*)');
    expect(bash('npx tsc --noEmit').regla).toBe('Bash(npx tsc:*)');
    expect(bash('wc -l "C:\\a b\\x.ts"').regla).toBe('Bash(wc:*)');
    expect(bash('rm -r tmp').riesgo).toMatch(/borra/);
    expect(bash('curl -s http://localhost:5180/x').riesgo).toMatch(/Studio de tu computador/);
    expect(bash('curl x').que).toMatch(/opciones y los archivos/);
    expect(reglaDe({ herramienta: 'Read', entrada: { file_path: String.raw`D:\notas\idea.md` } }, CASA).regla).toBe('Read(//d/notas/**)');
    expect(reglaDe({ herramienta: 'Grep', entrada: { pattern: 'x', path: '/home/ana/voces' } }, CASA).regla).toBe('Read(//home/ana/voces/**)');
    expect(reglaDe({ herramienta: 'Glob', entrada: { pattern: String.raw`D:\fotos\**\*.png` } }, CASA).regla).toBe('Read(//d/fotos/**)');
    expect(reglaDe({ herramienta: 'Write', entrada: { file_path: String.raw`D:\web\index.html` } }, CASA).regla).toBe('Edit(//d/web/**)');
    expect(reglaDe({ herramienta: 'Write', entrada: { file_path: String.raw`C:\Users\ana\nota.md` } }, CASA).riesgo).toMatch(/casi cualquier/);
    expect(reglaDe({ herramienta: 'Monitor', entrada: {} }, CASA).regla).toBe('Monitor');
  });

  it('separa las órdenes encadenadas (sin cortar lo que va entre comillas) y no autoriza redirecciones, git -C ni una ruta que no se sabe', () => {
    expect(ordenesDe('cd "C:\\a;b" ; wc -l x && git log --format="%h|%s" | head')).toEqual(['cd "C:\\a;b"', 'wc -l x', 'git log --format="%h|%s"', 'head']);
    expect(ordenesDe('npm test 2>&1')).toBeNull();
    for (const command of ['cd x && git status', 'a ; b']) expect(reglaDe({ herramienta: 'Bash', entrada: { command } }, CASA).motivo).toMatch(/una por una/);
    for (const command of ['ls > lista.txt', 'echo $(whoami)']) expect(reglaDe({ herramienta: 'Bash', entrada: { command } }, CASA).motivo).toMatch(/redirección/);
    expect(reglaDe({ herramienta: 'Bash', entrada: { command: 'git -C x log' } }, CASA)).toMatchObject({ regla: null, motivo: expect.stringMatching(/cd a la carpeta/) });
    expect(reglaDe({ herramienta: 'Grep', entrada: { pattern: 'x' } }, CASA).regla).toBeNull();
    expect(reglaDe({ herramienta: 'Read', entrada: { file_path: 'relativo/a.md' } }, CASA).regla).toBeNull();
  });

  it('de una cadena ofrece solo el tipo de acción que le faltó, y dice por qué se negó lo que ya tenía', () => {
    const permitidas = () => permitido(GOLF, false, STUDIO, CASA);
    const de = (command: string) => permisosNegados([{ proyecto: 'golf', cuando: '2026-10-26T10:00:00.000Z', registro: 'golf-1.log', texto: resultado([{ tool_name: 'Bash', tool_input: { command } }]) }], () => prohibidas, CASA, permitidas);
    // cd y wc ya los tiene: de la cadena queda curl, con el intento entero
    const cadena = de('cd C:/repos/golf ; wc -l a.ts && curl -s http://x');
    expect(cadena.map((n) => n.regla)).toEqual(['Bash(curl:*)']);
    expect(cadena[0].intentos[0]).toContain('cd C:/repos/golf');
    // Todo lo de la cadena ya lo tiene: sin casilla, y por qué
    expect(de('cd C:/repos/golf ; wc -l a.ts')[0]).toMatchObject({ regla: null, motivo: expect.stringMatching(/encadenadas/) });
    // Una orden sola cuyo tipo ya tiene: sin casilla, y por qué
    expect(de('wc -l estudio/src/*.ts')[0]).toMatchObject({ regla: null, motivo: expect.stringMatching(/Ya tiene permitido/) });
    // Lo que nunca sigue siendo nunca, también dentro de una cadena
    expect(de('cd x && git push --force origin main').map((n) => [n.regla, !!n.nunca])).toEqual([['Bash(git push:*)', true]]);
    // Subir sin forzar es un permiso más del panel, con su casilla (decisión del titular del 26 de octubre de 2026)
    const subir = de('cd x && git push origin main');
    expect(subir.map((n) => [n.regla, !!n.nunca])).toEqual([['Bash(git push:*)', false]]);
    expect(subir[0].riesgo).toMatch(/subir es algo que pediste/);
  });

  it('lo negado en vivo trae lo que el panel ofrece para ese intento, para autorizarlo ahí mismo (nota de voz del titular nmvowqdnztit)', () => {
    const permitidas = () => permitido(GOLF, false, STUDIO, CASA);
    const cadena = 'cd C:/repos/golf ; wc -l a.ts && curl -s http://x';
    const encadenadas = 'cd C:/repos/golf ; wc -l a.ts';
    const registro = [uso('t1', 'Bash', { command: cadena }), enVivo('t1', 'Bash'), uso('t2', 'Bash', { command: encadenadas }), enVivo('t2', 'Bash')].join('\n');
    const pendientes = permisosNegados([{ proyecto: 'golf', cuando: '2026-10-26T10:00:00.000Z', registro: 'golf-1.log', texto: registro }], () => prohibidas, CASA, permitidas);
    const vivos = negadosEnVivo(registro);
    // De la cadena, solo lo que le faltó, con su regla para el «Autorizo»; de la que ya tenía todo, por qué, sin botón
    const [a, b] = ofrecidoEnVivo(vivos, pendientes, 'golf');
    expect(a.permisos.map((n) => n.regla)).toEqual(['Bash(curl:*)']);
    expect(b.permisos).toEqual([expect.objectContaining({ regla: null, motivo: expect.stringMatching(/encadenadas/) })]);
    // Autorizado, ya no se ofrece: queda dicho que está autorizado
    const autorizado: PermisoAutorizado = { regla: 'Bash(curl:*)', alcance: 'proyecto', proyecto: 'golf', cuando: '2026-10-26T10:05:00.000Z', quien: 'Ana' };
    expect(ofrecidoEnVivo(vivos, sinAutorizar(pendientes, [autorizado]), 'golf')[0].permisos).toEqual([]);
    // Lo de otro proyecto no se ofrece en esta revisión
    expect(ofrecidoEnVivo(vivos, pendientes, 'tesis').every((x) => !x.permisos.length)).toBe(true);
  });

  it('el área de permisos de lo que va haciendo el director muestra solo lo pendiente de autorizar (nota de voz del titular, 26 de octubre de 2026)', () => {
    const permitidas = () => permitido(GOLF, false, STUDIO, CASA);
    const cadena = 'cd C:/repos/golf ; wc -l a.ts && curl -s http://x';
    const encadenadas = 'cd C:/repos/golf ; wc -l a.ts';
    const push = 'cd x && git push --force origin main';
    const registro = [uso('t1', 'Bash', { command: cadena }), enVivo('t1', 'Bash'), uso('t2', 'Bash', { command: encadenadas }), enVivo('t2', 'Bash'), uso('t3', 'Bash', { command: push }), enVivo('t3', 'Bash')].join('\n');
    const pendientes = permisosNegados([{ proyecto: 'golf', cuando: '2026-10-26T10:00:00.000Z', registro: 'golf-1.log', texto: registro }], () => prohibidas, CASA, permitidas);
    const vivos = negadosEnVivo(registro);
    // Sin leer el panel todavía, se sigue buscando qué le faltó: todo queda
    expect(pendientesEnVivo(ofrecidoEnVivo(vivos, pendientes, 'golf'), false)).toHaveLength(3);
    // Leído, solo queda lo que se puede autorizar: la cadena y su orden que le faltó. Ni la cadena con todo permitido, ni lo que nunca hace
    const quedan = pendientesEnVivo(ofrecidoEnVivo(vivos, pendientes, 'golf'), true);
    expect(quedan.map((x) => x.intento)).toEqual([vivos[0]]);
    expect(quedan[0].permisos.map((n) => n.regla)).toEqual(['Bash(curl:*)']);
    // Autorizado, no queda nada y el área no se pinta
    const autorizado: PermisoAutorizado = { regla: 'Bash(curl:*)', alcance: 'proyecto', proyecto: 'golf', cuando: '2026-10-26T10:05:00.000Z', quien: 'Ana' };
    expect(pendientesEnVivo(ofrecidoEnVivo(vivos, sinAutorizar(pendientes, [autorizado]), 'golf'), true)).toEqual([]);
    // Un intento con una cosa por autorizar y otra que no, deja solo la primera
    const mezcla = [{ intento: 'x', permisos: [{ ...pendientes[0], regla: null, motivo: 'ya' }, pendientes[0]] }];
    expect(pendientesEnVivo(mezcla, true)[0].permisos).toEqual([pendientes[0]]);
  });

  it('avisa cuando la carpeta es toda una unidad o tu carpeta personal', () => {
    expect(reglaDe({ herramienta: 'Glob', entrada: { pattern: '*', path: 'C:\\' } }, CASA).riesgo).toMatch(/casi todo/);
    expect(reglaDe({ herramienta: 'Glob', entrada: { pattern: '*', path: CASA } }, CASA).riesgo).toMatch(/casi todo/);
    expect(reglaDe({ herramienta: 'Glob', entrada: { pattern: '*', path: String.raw`C:\Users\ana\voces` } }, CASA).riesgo).not.toMatch(/casi todo/);
  });

  it('lo que el Studio le niega siempre sale como «nunca», con lo que harías tú en su lugar', () => {
    const nunca = (herramienta: string, entrada: Record<string, unknown>) => nuncaDe({ herramienta, entrada }, prohibidas, CASA);
    expect(nunca('Bash', { command: 'git push --force origin main' })?.porque).toMatch(/historia ya subida/);
    expect(nunca('Bash', { command: 'cd x && git push -f' })).not.toBeNull();
    expect(nunca('Bash', { command: 'git push origin +main' })).not.toBeNull();
    expect(nunca('Bash', { command: 'git push origin --delete vieja' })).not.toBeNull();
    expect(nunca('Bash', { command: 'git push --force-with-lease' })).not.toBeNull();
    expect(nunca('Bash', { command: 'git reset --hard HEAD~1' })?.porque).toMatch(/historia/);
    expect(nunca('Bash', { command: 'git commit --amend -m x' })).not.toBeNull();
    expect(nunca('Bash', { command: 'git branch -D vieja' })).not.toBeNull();
    expect(nunca('Read', { file_path: String.raw`C:\repos\golf\.env` })?.porque).toMatch(/claves/);
    expect(nunca('Read', { file_path: String.raw`C:\Users\ana\.claude\settings.json` })).not.toBeNull();
    expect(nunca('Read', { file_path: String.raw`C:\Users\ana\.ssh\id_ed25519` })).not.toBeNull();
    expect(nunca('Edit', { file_path: String.raw`C:\xampp\STL\estudio.local.json` })).not.toBeNull();
    expect(nunca('Edit', { file_path: String.raw`D:\otro\.claude\settings.local.json` })).not.toBeNull();
    expect(nunca('Write', { file_path: String.raw`C:\repos\golf\.git\config` })).not.toBeNull();
    expect(nunca('ScheduleWakeup', {})).not.toBeNull();
    // Lo demás no es de lo que nunca: tampoco subir, bajar ni publicar sin forzar (pd_permisos_panel)
    expect(nunca('Bash', { command: 'curl -s http://localhost:5180/__estudio/voz/lista' })).toBeNull();
    for (const orden of ['git push origin main', 'cd x && git push', 'git push --dry-run', 'git pull', 'npm publish', 'gh release create v0.1.0', 'gh pr merge 3'])
      expect(nunca('Bash', { command: orden }), orden).toBeNull();
    expect(nunca('Glob', { pattern: '*', path: String.raw`\\wsl.localhost\Ubuntu\home` })).toBeNull();
    expect(nunca('Read', { file_path: String.raw`C:\repos\golf\README.md` })).toBeNull();
  });

  it('junta lo negado por tipo de acción y proyecto, con lo que intentó, la última revisión y en cuántas se negó', () => {
    const curl = [uso('a', 'Bash', { command: 'curl -s http://localhost:5180/x' }), enVivo('a', 'Bash')].join('\n');
    const otroCurl = resultado([{ tool_name: 'Bash', tool_input: { command: 'curl -s http://localhost:5180/y' } }]);
    const push = resultado([{ tool_name: 'Bash', tool_input: { command: 'git push --force' } }]);
    const negados = permisosNegados([
      { proyecto: 'golf', cuando: '2026-10-25T10:00:00.000Z', registro: 'golf-1.log', texto: curl },
      { proyecto: 'golf', cuando: '2026-10-26T10:00:00.000Z', registro: 'golf-2.log', texto: `${curl}\n${otroCurl}\n${push}` },
      { proyecto: 'tesis', cuando: '2026-10-24T10:00:00.000Z', registro: 'tesis-1.log', texto: curl },
    ], () => prohibidas, CASA);
    expect(negados.map((n) => [n.proyecto, n.regla, n.veces, n.registro, !!n.nunca])).toEqual([
      ['golf', 'Bash(curl:*)', 2, 'golf-2.log', false],
      ['golf', 'Bash(git push:*)', 1, 'golf-2.log', true],
      ['tesis', 'Bash(curl:*)', 1, 'tesis-1.log', false],
    ]);
    // Un solo permiso para las dos líneas de curl, con las dos a la vista
    expect(negados[0].intentos).toEqual(['Bash: curl -s http://localhost:5180/y', 'Bash: curl -s http://localhost:5180/x']);
  });

  const autorizado = (regla: string, alcance: PermisoAutorizado['alcance'], proyecto?: string): PermisoAutorizado => ({ regla, alcance, ...(proyecto ? { proyecto } : {}), cuando: '2026-10-26T06:00:00.000Z', quien: 'leonc' });

  it('el alcance: «Solo este proyecto» vale solo para el suyo; «Todos los proyectos», para cualquiera', () => {
    const lista = [autorizado('Bash(curl:*)', 'proyecto', 'golf'), autorizado('Read(//d/voces/**)', 'todos')];
    expect(autorizadasPara(lista, 'golf', prohibidas, CASA)).toEqual(['Bash(curl:*)', 'Read(//d/voces/**)']);
    expect(autorizadasPara(lista, 'tesis', prohibidas, CASA)).toEqual(['Read(//d/voces/**)']);
    // Lo autorizado ya no sale como pendiente en su proyecto, y sí en otro
    const negados = permisosNegados([
      { proyecto: 'golf', cuando: '2026-10-26T10:00:00.000Z', registro: 'golf-1.log', texto: [uso('a', 'Bash', { command: 'curl -s http://localhost:5180/x' }), enVivo('a', 'Bash')].join('\n') },
      { proyecto: 'tesis', cuando: '2026-10-26T10:00:00.000Z', registro: 'tesis-1.log', texto: [uso('a', 'Bash', { command: 'curl -s http://localhost:5180/x' }), enVivo('a', 'Bash')].join('\n') },
    ], () => prohibidas, CASA);
    expect(sinAutorizar(negados, lista).map((n) => n.proyecto)).toEqual(['tesis']);
  });

  it('el lanzador suma lo autorizado sin pisar lo que niega: una regla de lo que nunca no se le pasa', () => {
    const lista = [autorizado('Bash(curl -s http://localhost:5180/x)', 'todos'), autorizado('Bash(git push --force)', 'todos'), autorizado('Edit(//c/xampp/STL/estudio.local.json)', 'todos'), autorizado('ScheduleWakeup', 'todos')];
    const autorizadas = autorizadasPara(lista, 'golf', prohibidas, CASA);
    expect(autorizadas).toEqual(['Bash(curl -s http://localhost:5180/x)']);
    const base = permitido(GOLF, false, STUDIO, CASA);
    const todo = conAutorizadas(base, autorizadas);
    expect(todo).toEqual([...base, 'Bash(curl -s http://localhost:5180/x)']);
    expect(conAutorizadas(base, ['Bash(npm test)'])).toEqual(base);
    expect(reglaProhibida('Read(//c/Users/ana/.ssh/**)', prohibidas, CASA)).toBe(true);
    expect(reglaProhibida('Read(//d/voces/**)', prohibidas, CASA)).toBe(false);
  });

  it('solo se autoriza lo que salió de lo negado en ese proyecto, nunca una regla escrita a mano ni una de lo que nunca', () => {
    const negados = permisosNegados([
      { proyecto: 'golf', cuando: '2026-10-26T10:00:00.000Z', registro: 'golf-1.log', texto: resultado([{ tool_name: 'Bash', tool_input: { command: 'curl -s http://localhost:5180/x' } }, { tool_name: 'Bash', tool_input: { command: 'git push --force' } }]) },
    ], () => prohibidas, CASA);
    // Con un «git push» sin forzar al lado, lo autorizable gana y el forzado sigue aparte, como nunca
    const conSubir = permisosNegados([
      { proyecto: 'golf', cuando: '2026-10-26T10:00:00.000Z', registro: 'golf-1.log', texto: resultado([{ tool_name: 'Bash', tool_input: { command: 'git push --force' } }, { tool_name: 'Bash', tool_input: { command: 'git push origin main' } }]) },
    ], () => prohibidas, CASA);
    expect(conSubir.map((n) => [n.regla, !!n.nunca])).toEqual(expect.arrayContaining([['Bash(git push:*)', true], ['Bash(git push:*)', false]]));
    expect(revisarPedido({ regla: 'Bash(git push:*)', proyecto: 'golf', alcance: 'proyecto' }, conSubir).ok).toBe(true);
    expect(revisarPedido({ regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' }, negados)).toEqual({ ok: true, regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' });
    expect(revisarPedido({ regla: 'Bash(curl:*)', proyecto: 'tesis', alcance: 'todos' }, negados).ok).toBe(false);
    expect(revisarPedido({ regla: 'Bash(rm -rf /)', proyecto: 'golf', alcance: 'proyecto' }, negados).ok).toBe(false);
    expect(revisarPedido({ regla: 'Bash(git push:*)', proyecto: 'golf', alcance: 'todos' }, negados)).toMatchObject({ ok: false, error: expect.stringMatching(/no se autoriza/) });
    expect(revisarPedido({ regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'siempre' }, negados).ok).toBe(false);
  });

  it('el panel: cada negado con su casilla y su alcance, un solo «Autorizo los marcados», y lo negado en vivo lleva a él', () => {
    const pagina = readFileSync(join(__dirname, '..', 'src', 'director.ts'), 'utf-8');
    const panel = pagina.match(/function seccionNegados\(\)[\s\S]*?\n\}/)?.[0] ?? '';
    expect(panel).toContain('data-permiso-negado');
    expect(panel).toContain('Solo este proyecto');
    expect(panel).toContain('Todos los proyectos de este computador');
    expect(panel).toContain('Nunca, por la regla del Studio');
    expect(panel).toContain('Autorizo los marcados');
    expect(panel).toContain('data-quitar-permiso');
    // La clave de cada casilla va en un atributo del HTML: un carácter de control se cambia al leerlo, y lo marcado
    // nunca coincidía (26 de octubre de 2026: «Autoricé los que recomiendas» no guardó nada)
    const clave = pagina.match(/const clavePermiso = .*/)?.[0] ?? '';
    expect(clave).not.toBe('');
    expect(clave).not.toMatch(/\\u00[01]/);
    // Lo negado en vivo se autoriza ahí mismo, con un clic que guarda (nota de voz del titular nmvowqdnztit, 26 de octubre
    // de 2026: «Autorizar con una casilla» llevaba a un panel sin esa casilla, y luego había que marcarla y guardar)
    const vivo = pagina.match(/function negadosEnVivoHtml\([\s\S]*?\n\}/)?.[0] ?? '';
    expect(vivo).toContain('ofrecidoEnVivo(');
    expect(vivo).toContain('data-autorizar-vivo');
    expect(vivo).toContain('data-ir-permisos');
    expect(pagina).not.toContain('Autorizar con una casilla');
    const clic = pagina.match(/closest<HTMLButtonElement>\('\[data-autorizar-vivo\]'\)[\s\S]*?\n\}\);/)?.[0] ?? '';
    expect(clic).toContain("cambiarPermisos({ autorizar: [{ regla: n.regla!, proyecto: n.proyecto, alcance: 'proyecto' }] })");
    expect(pagina).toContain("void ir({ vista: 'modelo', ancla: 'm-permisos', etiqueta: '' });");
    // El servidor solo autoriza lo que salió de lo negado (revisarPedido), nunca una regla escrita a mano
    const servidor = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
    const ruta = servidor.match(/if \(ruta === '\/permisos' && req\.method === 'POST'\)[\s\S]*?\n {10}\}/)?.[0] ?? '';
    expect(ruta).toContain('revisarPedido(');
    expect(ruta).toContain('await negadosDelDirector(raiz)');
  });

  it('ofrece las pruebas de cada proyecto, leídas de él, antes de que se le nieguen (decisión del titular del 26 de octubre de 2026: «Que la lea y me la ofrezca»)', () => {
    const nada = (_: string) => false;
    const hay = (...xs: string[]) => (n: string) => xs.includes(n);
    expect(ordenDePruebas({ packageJson: JSON.stringify({ scripts: { test: 'vitest run' } }), existe: nada })).toEqual({ orden: 'npm test', prefijo: 'npm test' });
    // El «test» que trae npm init de partida no prueba nada
    expect(ordenDePruebas({ packageJson: JSON.stringify({ scripts: { test: 'echo \"Error: no test specified\" && exit 1' } }), existe: nada })).toBeNull();
    expect(ordenDePruebas({ packageJson: '{ roto', existe: nada })).toBeNull();
    expect(ordenDePruebas({ pyproject: '[tool.pytest.ini_options]', existe: nada })?.orden).toBe('pytest');
    expect(ordenDePruebas({ existe: hay('pytest.ini') })?.orden).toBe('pytest');
    expect(ordenDePruebas({ existe: hay('phpunit.xml.dist') })?.orden).toBe('vendor/bin/phpunit');
    expect(ordenDePruebas({ composerJson: JSON.stringify({ scripts: { test: 'phpunit' } }), existe: nada })?.orden).toBe('composer test');
    expect(ordenDePruebas({ existe: hay('Cargo.toml') })?.orden).toBe('cargo test');
    expect(ordenDePruebas({ existe: hay('go.mod') })).toEqual({ orden: 'go test ./...', prefijo: 'go test' });
    expect(ordenDePruebas({ makefile: 'build:\n\tcc x\ntest: build\n\t./x', existe: nada })?.orden).toBe('make test');
    // Sin pruebas que se reconozcan, nada
    expect(ordenDePruebas({ existe: hay('README.md') })).toBeNull();
    const pytest = { orden: 'pytest', prefijo: 'pytest' };
    const ofrecida = pruebasOfrecidas('tesis', pytest, [], []);
    expect(ofrecida).toMatchObject({ regla: 'Bash(pytest:*)', proyecto: 'tesis', ofrecido: 'pruebas', intentos: [] });
    // Se autoriza como lo negado: el servidor la acepta solo de ese proyecto
    expect(revisarPedido({ regla: 'Bash(pytest:*)', proyecto: 'tesis', alcance: 'proyecto' }, [ofrecida!]).ok).toBe(true);
    expect(revisarPedido({ regla: 'Bash(pytest:*)', proyecto: 'golf', alcance: 'proyecto' }, [ofrecida!]).ok).toBe(false);
    // Lo que ya tiene (npm test lo tiene siempre) o ya está entre lo negado no se ofrece otra vez
    expect(pruebasOfrecidas('golf', { orden: 'npm test', prefijo: 'npm test' }, ['Bash(npm test:*)'], [])).toBeNull();
    expect(pruebasOfrecidas('tesis', pytest, [], [ofrecida!])).toBeNull();
    expect(pruebasOfrecidas('tesis', null, [], [])).toBeNull();
    // Y lo que ya autorizaste deja de estar pendiente
    expect(sinAutorizar([ofrecida!], [{ regla: 'Bash(pytest:*)', alcance: 'proyecto', proyecto: 'tesis', cuando: '', quien: 'leonc' }])).toEqual([]);
  });

  it('«Autorizo y pido la revisión» autoriza lo marcado y pide la revisión con el mismo clic, solo si se guardó (decisión del titular del 23 de octubre de 2026)', () => {
    const pagina = readFileSync(join(__dirname, '..', 'src', 'director.ts'), 'utf-8');
    expect(pagina).toContain('data-autorizar-permisos="revision"');
    expect(pagina).toContain('>Autorizo y pido la revisión</button>');
    expect(pagina).toContain("if (guardado && ds.autorizarPermisos === 'revision') await pedirLaRevision(true, 'permisos');");
    expect(pagina).toMatch(/async function cambiarPermisos\([^)]*\): Promise<boolean>/);
  });

  it('«¿Dónde quedamos?» cuenta lo negado en la última revisión del proyecto en una sola línea, con su botón al panel (decisión del titular del 26 de octubre de 2026)', () => {
    const pagina = readFileSync(join(__dirname, '..', 'src', 'director.ts'), 'utf-8');
    const informe = pagina.match(/function informeNegadosDq\(\)[\s\S]*?\n\}/)?.[0] ?? '';
    // Solo la última revisión de este proyecto, y nada si no se le negó nada
    expect(informe).toContain("x.proyecto === d.activo && x.tipo === 'revision'");
    expect(informe).toContain("if (!n) return '';");
    // Una sola línea, no una por permiso
    expect(informe).not.toContain('.map(');
    expect(informe).toContain('data-a-permisos');
    expect(pagina).toContain('${informeNegadosDq()}');
    expect(pagina).toContain("else if (b.dataset.aPermisos !== undefined) void terminar({ vista: 'modelo', ancla: 'm-permisos', etiqueta: '' });");
  });

  it('lee los registros más nuevos de cada proyecto en .revisiones, también los de una urgencia o una aclaración', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'negados-'));
    try {
      mkdirSync(join(raiz, '.revisiones'));
      const linea = [uso('a', 'Bash', { command: 'curl x' }), enVivo('a', 'Bash'), JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'hola' }] } })].join('\n');
      writeFileSync(join(raiz, '.revisiones', 'golf-2026-10-25T10-00-00-000Z.log'), linea);
      writeFileSync(join(raiz, '.revisiones', 'golf-urgencia-2026-10-26T10-00-00-000Z.log'), linea);
      writeFileSync(join(raiz, '.revisiones', 'golf-club-2026-10-26T11-00-00-000Z.log'), linea);
      writeFileSync(join(raiz, '.revisiones', 'golf-2026-10-26T10-00-00-000Z.bandeja.txt'), 'no es un registro');
      const leidos = registrosDeNegados(raiz, ['golf', 'golf-club'], 1);
      expect(leidos.map((r) => [r.proyecto, r.registro, r.cuando]).sort()).toEqual([
        ['golf', 'golf-urgencia-2026-10-26T10-00-00-000Z.log', '2026-10-26T10:00:00.000Z'],
        ['golf-club', 'golf-club-2026-10-26T11-00-00-000Z.log', '2026-10-26T11:00:00.000Z'],
      ]);
      // Solo las líneas que pueden traer un negado
      expect(leidos[0].texto).not.toContain('hola');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});
