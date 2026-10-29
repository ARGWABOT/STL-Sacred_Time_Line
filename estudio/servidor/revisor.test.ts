import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { POLITICA_DE_MODELOS, actividadDeProyecto, agruparPasos, carpetaDeSesiones, cerroSegunPlan, colaDeLaRevision, COMO_ORDENES, compararVersion, conElHistorial, historialDelActivo, detenerTrasCierre, entornoDelDirector, esElStudio, GRACIA_CIERRE_MIN, negado, SUBIR_PAGINA, SUBIR_CON_PERMISO, revisadoDelPlan, consumoDe, consumoDeRevisiones, diagnosticarFalla, estadoDelLanzado, fallaDeProyecto, finDelRegistro, finEscrito, inicioDeRegistro, lineaDeFin, encargo, encargoAclaracion, encargoUrgencia, MAX_MIN, MAX_MIN_ACLARAR, MAX_MIN_URGENCIA, SIN_ESPERAS, SIN_PERMISO, QUIEN_MANDA, modeloDeLosAyudantes, fallaDelEsfuerzo, fallaDelModelo, historialAbrible, lanzamientosDelDirector, lineaPedido, modelosDe, permitido, planDeProyecto, POR_DENTRO, progresoDe, progresoDeProyecto, DIAS_REGISTROS, registrosParaPodar, soltarTurno, tokensDe, tokensDeProyecto, negadosDeProyecto, tomarTurno, trabajoConElPedido, usoDe, herramientaEnCurso, paqueteListoDe } from './revisor';

describe('la poda de los registros (punto 6 de «Limpieza antes de publicar», confirmada con 15 días)', () => {
  it('borra lo de más de quince días con su paquete, y conserva el último de cada proyecto y de cada tipo', () => {
    expect(DIAS_REGISTROS).toBe(15);
    const ahora = new Date('2026-11-10T12:00:00.000Z');
    const nombres = [
      // Viejos de stl-studio: el primero sale con su encargo y su bandeja; el segundo también (hay uno más nuevo)
      'stl-studio-2026-10-17T23-21-27-801Z.log',
      'stl-studio-2026-10-17T23-21-27-801Z.encargo.txt',
      'stl-studio-2026-10-17T23-21-27-801Z.bandeja.txt',
      'stl-studio-2026-10-20T01-00-00-000Z.log',
      // …con su primer tiempo y su lista de encargos (pd_dos_tiempos)
      'stl-studio-2026-10-20T01-00-00-000Z.primer.jsonl',
      'stl-studio-2026-10-20T01-00-00-000Z.encargos.json',
      // Dentro de los quince días: se queda
      'stl-studio-2026-10-30T10-00-00-000Z.log',
      // Golf: viejo, pero es su último registro, el que lee «¿Por qué?» si no cerró
      'golf-2026-10-18T10-00-00-000Z.log',
      // La urgencia vieja de stl-studio es la última de su tipo: se queda
      'stl-studio-urgencia-2026-10-21T17-27-36-295Z.log',
      // Lo que no es un registro no se toca
      'lanzando.json',
      'ajustes-del-director.json',
    ];
    expect(registrosParaPodar(nombres, ahora).sort()).toEqual([
      'stl-studio-2026-10-17T23-21-27-801Z.bandeja.txt',
      'stl-studio-2026-10-17T23-21-27-801Z.encargo.txt',
      'stl-studio-2026-10-17T23-21-27-801Z.log',
      'stl-studio-2026-10-20T01-00-00-000Z.encargos.json',
      'stl-studio-2026-10-20T01-00-00-000Z.log',
      'stl-studio-2026-10-20T01-00-00-000Z.primer.jsonl',
    ]);
    // Hoy, 26 de octubre, todavía no borra nada: los más viejos son del 17
    expect(registrosParaPodar(nombres, new Date('2026-10-26T12:00:00.000Z'))).toEqual([]);
  });
});

describe('el director que lanza el Studio', () => {
  it('escribe solo dentro del repositorio del proyecto, corre sus pruebas y hace commits locales', () => {
    const p = permitido(String.raw`C:\repos\golf`);
    expect(p).toContain('Edit(//c/repos/golf/**)');
    expect(p).toContain('Bash(node tools/director/bandeja.ts:*)');
    expect(p).toContain('Bash(git commit:*)');
    expect(permitido('/home/ana/golf/')).toContain('Edit(//home/ana/golf/**)');
    // investiga en internet: buscar y leer páginas
    expect(p).toEqual(expect.arrayContaining(['WebSearch', 'WebFetch']));
    // reparte la lectura entre ayudantes, que heredan esta misma lista
    expect(p).toEqual(expect.arrayContaining(['Agent', 'Task']));
    // mira la interfaz en un navegador sin pantalla, solo con su herramienta
    expect(p).toContain('Bash(node tools/director/mirar.ts:*)');
    // sus commits nacen firmados con la firma del proyecto, sin tocar la identidad de la carpeta (22 de octubre de 2026)
    expect(p).toContain('Bash(node tools/director/firmar.ts:*)');
    // nada que suba o despliegue, ni escribir fuera del repositorio; borrar, solo con git rm (lo que git guarda)
    expect(p.some((x) => /push|deploy|reset|clean/.test(x))).toBe(false);
    expect(p.filter((x) => /\brm\b/.test(x))).toEqual(['Bash(git rm:*)']);
    expect(p.filter((x) => /^(Edit|Write)/.test(x)).every((x) => x.includes('//c/repos/golf/'))).toBe(true);
    // los flujos de varios agentes, solo con el permiso del titular (ultracode)
    expect(p).not.toContain('Workflow');
    expect(permitido(String.raw`C:\repos\golf`, true)).toEqual([...p.slice(0, p.indexOf('Task') + 1), 'Workflow', ...p.slice(p.indexOf('Task') + 1)]);
  });

  it('trae los seis grupos de permisos que autorizó el titular el 22 de octubre de 2026, y nada más', () => {
    const p = permitido(String.raw`C:\repos\golf`, false, String.raw`C:\xampp\STL`, String.raw`C:\Users\ana`);
    // (1) leer y comprobar sin cambiar nada; git -C no, porque no se puede acotar a lecturas
    expect(p).toEqual(expect.arrayContaining(['Bash(ls:*)', 'Bash(wc:*)', 'Bash(git show:*)', 'Bash(git ls-files:*)', 'Bash(git rev-parse:*)', 'Bash(git rev-list:*)', 'Bash(git config --get:*)', 'Bash(git branch --show-current)', 'Bash(git stash list:*)', 'Bash(git remote -v)', 'Bash(git worktree list:*)', 'Bash(git ls-remote:*)', 'Bash(gh auth status:*)']));
    expect(p.some((x) => x.includes('git -C'))).toBe(false);
    // (2) una parte de las pruebas
    expect(p).toEqual(expect.arrayContaining(['Bash(npm test)', 'Bash(npm test:*)', 'Bash(npx vitest run:*)', 'Bash(npm run typecheck)', 'Bash(npm run typecheck:*)']));
    // (3) leer solo donde trabaja: el Studio, el repositorio y sus sesiones anteriores, sin la regla suelta que deja leer todo
    expect(p).not.toContain('Read');
    expect(p).not.toContain('Grep');
    expect(p).not.toContain('Glob');
    expect(p.filter((x) => x.startsWith('Read('))).toEqual(['Read(//c/xampp/STL/**)', 'Read(//c/repos/golf/**)', 'Read(//c/Users/ana/.claude/projects/C--xampp-STL/**)']);
    // (4) mover y ramas de respaldo; (5) git rm; (6) npm install sin nombres de paquetes
    expect(p).toEqual(expect.arrayContaining(['Bash(git mv:*)', 'Bash(git branch respaldo/:*)', 'Bash(git rm:*)', 'Bash(npm install)']));
    expect(p.some((x) => /npm install[: ]/.test(x))).toBe(false);
    // lo que nunca: ningún .env, ni los ajustes de Claude, ni editar sus permisos, estudio.local.json, los registros o .git
    const n = negado(String.raw`C:\repos\golf`, String.raw`C:\xampp\STL`);
    expect(n).toEqual(expect.arrayContaining(['Read(//**/.env)', 'Read(//**/.env.*)', 'Read(~/.claude/settings.json)', 'Edit(//c/xampp/STL/.claude/settings*.json)', 'Edit(//c/repos/golf/.claude/settings*.json)', 'Edit(//c/xampp/STL/estudio.local.json)', 'Edit(//c/xampp/STL/.revisiones/**)', 'Edit(//**/.git/**)']));
    // ni renombrar o borrar ramas, ni forzar al mover o al borrar, la opción vaya donde vaya
    expect(n).toEqual(expect.arrayContaining(['Bash(git branch -D*)', 'Bash(git branch * -D*)', 'Bash(git mv * -f*)', 'Bash(git rm -rf*)', 'Bash(git rm * --force*)']));
    // las sesiones de una carpeta, como las nombra Claude Code
    expect(carpetaDeSesiones(String.raw`C:\xampp2024\htdocs\www\STL`, String.raw`C:\Users\leonc`)).toBe(join(String.raw`C:\Users\leonc`, '.claude', 'projects', 'C--xampp2024-htdocs-www-STL'));
  });

  it('lo que nunca va como regla explícita: reescribir la historia, también la ya subida (propuesta aceptada «Los permisos, al momento», punto 3)', () => {
    const n = negado(String.raw`C:\repos\golf`, String.raw`C:\xampp\STL`);
    expect(n).toEqual(expect.arrayContaining(['Bash(git push --force*)', 'Bash(git push * --force*)', 'Bash(git push -f*)', 'Bash(git push * +*)', 'Bash(git push * --delete*)', 'Bash(git rebase:*)', 'Bash(git reset:*)', 'Bash(git filter-branch:*)', 'Bash(git filter-repo:*)', 'Bash(git commit --amend*)', 'Bash(git commit * --amend*)']));
    // Subir, bajar y publicar sin forzar ya no son de lo que nunca: se dan en el panel (pd_permisos_panel)
    expect(n.filter((x) => /^Bash\((git push|npm publish|gh release|gh pr merge|git pull):\*\)$/.test(x))).toEqual([]);
    // Y nada de eso viene permitido de fábrica, ni con los flujos ni cuando revisa el mismo Studio (que sube su página con su herramienta)
    for (const p of [permitido(String.raw`C:\repos\golf`, true, String.raw`C:\xampp\STL`, String.raw`C:\Users\ana`), permitido(String.raw`C:\xampp\STL`, true, String.raw`C:\xampp\STL`, String.raw`C:\Users\ana`)])
      expect(p.filter((x) => /git push|npm publish|gh release|gh pr merge|git rebase|git reset|--amend|filter-/.test(x))).toEqual([]);
  });

  it('«Modelo y consumo» dice el modo de hoy y lo que nunca, lo mismo que niega el lanzador (propuesta aceptada «Los permisos, al momento»)', () => {
    const vista = readFileSync(join(__dirname, '..', 'src', 'director.ts'), 'utf-8');
    const seccion = vista.slice(vista.indexOf('function seccionPermisos()'), vista.indexOf('\n}\n', vista.indexOf('function seccionPermisos()')));
    expect(seccion).toContain('data-ancla="m-permisos"');
    // Los dos modos, con el de hoy marcado (pr_permisos_al_momento, pieza 4)
    expect(vista).toContain("nombre: 'Solo lo autorizado',");
    expect(vista).toContain("nombre: 'Me pregunta en el Studio',");
    expect(seccion).toContain('data-modo-permisos="${m}" aria-pressed="${m === modo}"');
    // Lo que nunca, dicho como lo niega negado()
    const n = negado(String.raw`C:\repos\golf`, String.raw`C:\xampp\STL`);
    const dice: [string, string][] = [
      ['Bash(git push --force*)', 'forzar una subida'], ['Bash(git push * --delete*)', 'borrar una rama del remoto'], ['Bash(git rebase:*)', 'reescribir la historia de git'],
      ['Read(//**/.env)', 'archivo .env'], ['Read(~/.claude/.credentials.json)', 'las credenciales de Claude Code'], ['Edit(//**/.git/**)', 'la carpeta .git'],
    ];
    for (const [regla, texto] of dice) {
      expect(n).toContain(regla);
      expect(seccion).toContain(texto);
    }
    // Y está en la vista, en su propia pestaña, «Permisos» (notas de voz del titular nmvoqwicctit, 25 de octubre de 2026,
    // y nmvow70jqtit, 26 de octubre: los ajustes de Claude Code van en otra)
    expect(vista).toContain('permisos: seccionPermisos,');
  });

  it('abre la cola de diagnósticos solo en esa revisión: lee el repositorio de cada proyecto, escribe solo su memoria y lee su historial, nada más (propuesta aceptada «La cola de diagnósticos, con los permisos de hoy»)', () => {
    const cola = [
      { id: 'tesis', repositorio: String.raw`C:\repos\tesis`, historial: [String.raw`C:\Users\ana\.claude\projects\C--repos-tesis`] },
      { id: 'sitio', repositorio: String.raw`D:\web\sitio`, historial: [] },
    ];
    const golf = [String.raw`C:\repos\golf`, false, String.raw`C:\xampp\STL`, String.raw`C:\Users\ana`] as const;
    const sin = permitido(...golf);
    // Sin cola, lo mismo de siempre
    expect(permitido(...golf, [])).toEqual(sin);
    const con = permitido(...golf, cola);
    expect(con.filter((x) => !sin.includes(x))).toEqual([
      'Read(//c/repos/tesis/**)', 'Edit(//c/repos/tesis/.stl/**)', 'Read(//c/Users/ana/.claude/projects/C--repos-tesis/**)',
      'Read(//d/web/sitio/**)', 'Edit(//d/web/sitio/.stl/**)',
    ]);
    // Escribir, solo en el repositorio del proyecto que revisa y en la memoria (.stl) de los de la cola, no en su código
    expect(con.filter((x) => /^(Edit|Write)/.test(x))).toEqual(['Edit(//c/repos/golf/**)', 'Edit(//c/repos/tesis/.stl/**)', 'Edit(//d/web/sitio/.stl/**)']);
    expect(con).not.toContain('Read');
    // Lo que nunca sigue negado también en esos proyectos
    expect(negado(String.raw`C:\repos\golf`, String.raw`C:\xampp\STL`, cola)).toEqual(expect.arrayContaining(['Edit(//c/repos/tesis/.claude/settings*.json)', 'Edit(//d/web/sitio/.claude/settings*.json)', 'Edit(//**/.git/**)', 'Read(//**/.env)']));
    // El encargo de la revisión dice cuáles y para qué; sin cola, no dice nada
    expect(encargo('golf', false, cola)).toContain('«tesis», «sitio»');
    expect(encargo('golf', false, cola)).toContain('si alguno no se puede, sigue en la cola');
    expect(encargo('golf')).not.toContain('La cola de diagnósticos');
    // Los permisos de una cola no caben en lo que el encargo de una urgencia o una aclaración da: esas no la llevan
    expect(encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' })).not.toContain('La cola de diagnósticos');
  });

  it('la cola de la revisión: los primeros tres sin diagnóstico y con repositorio conectado, del más reciente al más viejo, con el historial de IA cuyo lugar se sabe', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-cola-'));
    try {
      const repos: Record<string, string> = {};
      const crear = (id: string, proyecto: object, plan: object) => {
        const repo = join(raiz, 'repos', id);
        mkdirSync(join(repo, '.stl', 'director'), { recursive: true });
        writeFileSync(join(repo, '.stl', 'proyecto.json'), JSON.stringify(proyecto));
        writeFileSync(join(repo, '.stl', 'director', 'plan.json'), JSON.stringify(plan));
        repos[id] = repo;
      };
      const historia = join(raiz, 'historias', 'uno');
      const ajena = join(raiz, 'ajena');
      mkdirSync(historia, { recursive: true });
      mkdirSync(ajena);
      const raices = [join(raiz, 'historias')];
      crear('activo', { nombre: 'Activo' }, {});
      crear('viejo', { nombre: 'Viejo', historialIA: [{ agente: 'Claude Code', ultima: '2026-01-01T00:00:00Z' }] }, {});
      crear('reciente', { nombre: 'Reciente', historialIA: [{ agente: 'Claude Code', sesiones: 3, ultima: '2026-10-01T00:00:00Z', donde: historia }, { agente: 'Archivos de IA', donde: 'CLAUDE.md, AGENTS.md' }, { agente: 'Codex', donde: join(raiz, 'no-existe') }, { agente: 'Cursor', donde: ajena }] }, {});
      crear('medio', { nombre: 'Medio', historialIA: [{ agente: 'Cursor', ultima: '2026-05-01T00:00:00Z' }] }, {});
      crear('hecho', { nombre: 'Hecho' }, { diagnostico: { fecha: '2026-10-01' } });
      crear('nuevo', { nombre: 'Nuevo', tipo: 'nuevo' }, {});
      crear('extra', { nombre: 'Extra', historialIA: [{ agente: 'Claude Code', ultima: '2025-01-01T00:00:00Z' }] }, {});
      writeFileSync(join(raiz, 'estudio.local.json'), JSON.stringify({ activo: 'activo', repositorios: repos }));
      const cola = await colaDeLaRevision(raiz, 'activo', raices);
      // El activo, el ya diagnosticado y el nuevo no entran; el cuarto (el más viejo) espera su turno
      expect(cola.map((c) => c.id)).toEqual(['reciente', 'medio', 'viejo']);
      // Del historial, solo lo que dice dónde está, existe y está dentro de donde los agentes guardan sus sesiones: ni los
      // archivos de IA del repositorio, ni una carpeta que no está, ni una que existe pero es de afuera
      expect(cola[0]).toEqual({ id: 'reciente', repositorio: repos.reciente, historial: [realpathSync(historia)] });
      expect(cola[1].historial).toEqual([]);
      // Un proyecto que no se pudo diagnosticar sigue en la cola la vez siguiente: lo único que lo saca es su diagnóstico
      writeFileSync(join(repos.reciente, '.stl', 'director', 'plan.json'), JSON.stringify({ diagnostico: { fecha: '2026-10-22' } }));
      expect((await colaDeLaRevision(raiz, 'activo', raices)).map((c) => c.id)).toEqual(['medio', 'viejo', 'extra']);
      // Con otro proyecto activo, el que era activo entra a la cola (sin historial de IA, va al final)
      expect((await colaDeLaRevision(raiz, 'medio', raices)).map((c) => c.id)).toEqual(['viejo', 'extra', 'activo']);
      // Un plan que existe y no se entiende deja al proyecto fuera: no se abre escritura sobre lo que no se sabe leer
      writeFileSync(join(repos.viejo, '.stl', 'director', 'plan.json'), '{"diagnostico": {"fec');
      expect((await colaDeLaRevision(raiz, 'medio', raices)).map((c) => c.id)).toEqual(['extra', 'activo']);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
    // Lee varios repositorios con git: con las pruebas que copian el Studio corriendo al lado, puede pasar de 5 segundos
  }, 30_000);

  it('el historial de IA del proyecto que se revisa, recién entregado: se lee en su revisión mientras no tenga diagnóstico, con la misma regla, y solo se lee (pedido del titular pd_historial_activo)', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-activo-'));
    try {
      const repo = join(raiz, 'repos', 'nuevo');
      mkdirSync(join(repo, '.stl', 'director'), { recursive: true });
      const historia = join(raiz, 'historias', 'nuevo');
      const ajena = join(raiz, 'ajena');
      mkdirSync(historia, { recursive: true });
      mkdirSync(ajena);
      const plan = join(repo, '.stl', 'director', 'plan.json');
      writeFileSync(join(repo, '.stl', 'proyecto.json'), JSON.stringify({ nombre: 'Nuevo', historialIA: [{ agente: 'Claude Code', donde: historia }, { agente: 'Cursor', donde: ajena }, { agente: 'Archivos de IA', donde: 'CLAUDE.md' }] }));
      writeFileSync(plan, JSON.stringify({}));
      writeFileSync(join(raiz, 'estudio.local.json'), JSON.stringify({ activo: 'nuevo', repositorios: { nuevo: repo } }));
      const raices = [join(raiz, 'historias')];
      // Sin diagnóstico: solo lo que está dentro de donde los agentes guardan sus sesiones, nunca una carpeta ajena
      expect(await historialDelActivo(raiz, 'nuevo', raices)).toEqual([realpathSync(historia)]);
      // Ya diagnosticado, nada: se lee una vez, en el diagnóstico
      writeFileSync(plan, JSON.stringify({ diagnostico: { fecha: '2026-10-24' } }));
      expect(await historialDelActivo(raiz, 'nuevo', raices)).toEqual([]);
      // Un plan que no se entiende, tampoco
      writeFileSync(plan, '{"diagnostico": {"fec');
      expect(await historialDelActivo(raiz, 'nuevo', raices)).toEqual([]);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
    // Con él, solo una regla más, la de leerlo; sin él, lo mismo de siempre
    const golf = [String.raw`C:\repos\golf`, false, String.raw`C:\xampp\STL`, String.raw`C:\Users\ana`] as const;
    const sin = permitido(...golf);
    expect(permitido(...golf, [], [])).toEqual(sin);
    expect(permitido(...golf, [], [String.raw`C:\Users\ana\.claude\projects\C--repos-golf`]).filter((x) => !sin.includes(x))).toEqual(['Read(//c/Users/ana/.claude/projects/C--repos-golf/**)']);
    // El encargo de la revisión lo dice; sin historial, no
    expect(encargo('golf', false, [], false, ['/h/uno'])).toContain('El historial de IA de este proyecto, que aún no tiene su diagnóstico');
    expect(encargo('golf')).not.toContain('El historial de IA de este proyecto');
    expect(conElHistorial([])).toBe('');
  });

  it('el historial de IA solo se abre dentro de donde los agentes guardan sus sesiones, nunca otra carpeta (hallazgo del revisor de código)', () => {
    const casa = mkdtempSync(join(tmpdir(), 'stl-historial-'));
    try {
      const sesiones = join(casa, '.claude', 'projects');
      const hijo = join(sesiones, 'C--repos-tesis');
      const ssh = join(casa, '.ssh');
      mkdirSync(hijo, { recursive: true });
      mkdirSync(ssh);
      expect(historialAbrible([hijo, hijo], [sesiones])).toEqual([realpathSync(hijo)]);
      // Ni la raíz misma, ni una carpeta ajena, ni una ruta relativa, ni una que no existe, ni el truco de «..»
      expect(historialAbrible([sesiones, ssh, casa, 'relativa', join(casa, 'no-existe'), join(hijo, '..', '..', '..', '.ssh')], [sesiones])).toEqual([]);
      // Sin raíces que existan, nada se abre
      expect(historialAbrible([hijo], [join(casa, 'no-hay')])).toEqual([]);
      // Un enlace dentro de las sesiones que lleva afuera tampoco abre lo de afuera (si el sistema deja crearlo)
      let enlace = false;
      try {
        symlinkSync(ssh, join(sesiones, 'enlace'), 'junction');
        enlace = true;
      } catch {
        // sin permiso para crear enlaces en este computador: ese caso no se prueba aquí
      }
      if (enlace) expect(historialAbrible([join(sesiones, 'enlace')], [sesiones])).toEqual([]);
    } finally {
      rmSync(casa, { recursive: true, force: true });
    }
  });

  it('el encargo dice cómo usar esos permisos: cd en vez de git -C, y borrar solo con git rm y los dos pasos del titular', () => {
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const texto of [encargo('golf'), encargo('golf', true), urgencia]) {
      expect(texto).toContain(COMO_ORDENES);
      expect(texto).toContain('git -C no está permitido');
      expect(texto).toContain('sin ; ni tuberías ni redirecciones');
      expect(texto).toContain('en su commit apenas pasen sus pruebas y sus tipos');
      expect(texto).toContain('«Confirmo»');
      expect(texto).not.toContain('ni borres nada');
      // La primera revisión con «Me pregunta en el Studio» (26 de octubre de 2026): un ayudante leía con órdenes
      // encadenadas de la terminal, y cada una le abría al titular un diálogo que tenía que responder a mano
      expect(texto).toContain('usa Read, Grep y Glob, no la terminal');
      expect(texto).toContain('Un ayudante que lances no recibe estas reglas: dáselas en su encargo');
    }
  });

  it('lanza un director a la vez, aunque haya dos servidores del Studio encendidos', () => {
    const dir = mkdtempSync(join(tmpdir(), 'stl-turno-'));
    try {
      const turno = join(dir, 'lanzando.json');
      expect(tomarTurno(turno)).toBe(true);
      // el otro servidor llega 109 ms después: no lo toma
      expect(tomarTurno(turno)).toBe(false);
      soltarTurno(turno);
      expect(tomarTurno(turno)).toBe(true);
      soltarTurno(turno);
      // uno abandonado (su proceso ya no existe, o pasó el límite de una revisión) se toma
      writeFileSync(turno, JSON.stringify({ pid: 2 ** 30, cuando: new Date().toISOString() }));
      expect(tomarTurno(turno)).toBe(true);
      writeFileSync(turno, JSON.stringify({ pid: process.pid, cuando: '2026-01-01T00:00:00.000Z' }));
      expect(tomarTurno(turno)).toBe(true);
      // soltar el de otro proceso no lo suelta
      writeFileSync(turno, JSON.stringify({ pid: 2 ** 30, cuando: new Date().toISOString() }));
      soltarTurno(turno);
      expect(existsSync(turno)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('no lanza otro director mientras el de un servidor que se reinició sigue trabajando', () => {
    const dir = mkdtempSync(join(tmpdir(), 'stl-turno-'));
    try {
      const turno = join(dir, 'lanzando.json');
      const ahora = Date.now();
      // el servidor 111 se reinició (ya no existe), pero su director 222 sigue trabajando: el turno sigue tomado
      writeFileSync(turno, JSON.stringify({ pid: 111, hijo: 222, cuando: new Date(ahora).toISOString() }));
      expect(tomarTurno(turno, ahora, (p) => p === 222)).toBe(false);
      expect(tomarTurno(turno, ahora, (p) => p === 111)).toBe(false);
      // cuando terminó también el director, se toma
      expect(tomarTurno(turno, ahora, () => false)).toBe(true);
      // pasado el límite de una revisión se toma aunque el número siga vivo (puede ser ya de otro programa)
      writeFileSync(turno, JSON.stringify({ pid: 111, hijo: 222, cuando: '2026-01-01T00:00:00.000Z' }));
      expect(tomarTurno(turno, ahora, () => true)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('le encarga la revisión de un proyecto, con su id en las herramientas', () => {
    expect(encargo('golf')).toContain('--proyecto golf --listo');
    expect(encargo('golf')).not.toContain('Es un reintento');
    // Pedida de nuevo después de una que no se cerró: retoma lo que dejó, sin rehacerlo
    expect(encargo('golf', true)).toContain('Es un reintento: la revisión anterior no se cerró; retoma lo que dejó, sin rehacerlo (la bandeja lo lista).');
  });

  it('una revisión que cerró con --listo nunca se marca fallida: manda plan.revisado', () => {
    // el 21 de octubre de 2026 una revisión cerró a las 21:20:50 y el Studio la mostró como «no terminó»
    const r = { pedida: '2026-10-21T21:11:52.000Z', lanzada: '2026-10-21T21:11:53.437Z' };
    expect(cerroSegunPlan('2026-10-21T21:20:50.854Z', r)).toBe(true);
    expect(cerroSegunPlan('2026-10-21T21:11:53.437Z', r)).toBe(true);
    // el revisado de una revisión anterior no la cierra
    expect(cerroSegunPlan('2026-10-21T20:00:00.000Z', r)).toBe(false);
    expect(cerroSegunPlan(null, r)).toBe(false);
    expect(cerroSegunPlan('no es fecha', r)).toBe(false);
    // sin lanzar (la tomó la sesión del director), cuenta desde que se pidió
    expect(cerroSegunPlan('2026-10-21T21:12:00.000Z', { pedida: r.pedida })).toBe(true);
    // y se lee del plan del proyecto (sin plan, null)
    const dir = mkdtempSync(join(tmpdir(), 'stl-revisado-'));
    try {
      expect(revisadoDelPlan(dir, 'golf')).toBeNull();
      mkdirSync(join(dir, 'proyectos', 'golf', 'director'), { recursive: true });
      writeFileSync(join(dir, 'proyectos', 'golf', 'director', 'plan.json'), JSON.stringify({ revisado: '2026-10-21T21:20:50.854Z' }));
      expect(revisadoDelPlan(dir, 'golf')).toBe('2026-10-21T21:20:50.854Z');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('espera lo que lanza en segundo plano sin esperas programadas, y con el límite de cada encargo', () => {
    // el 21 de octubre de 2026 una revisión se programó dos esperas de 20 minutos mientras su flujo ya estaba muerto
    expect(SIN_ESPERAS).toEqual(expect.arrayContaining(['ScheduleWakeup', 'CronCreate']));
    const aclaracion = encargoAclaracion({ proyecto: 'golf', mision: 't_x', paso: 0, nota: 'n1', quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const [texto, minutos] of [[encargo('golf'), MAX_MIN], [aclaracion, MAX_MIN_ACLARAR], [urgencia, MAX_MIN_URGENCIA]] as const) {
      expect(texto).toContain('el aviso de que terminó te despierta solo');
      expect(texto).toContain(`Tienes ${minutos} minutos en total.`);
    }
  });

  it('el cierre es lo último: cada encargo lo dice, y pasada la gracia el Studio detiene al que sigue vivo (nota de voz del titular, 22 de octubre de 2026)', () => {
    const aclaracion = encargoAclaracion({ proyecto: 'golf', mision: 't_x', paso: 0, nota: 'n1', quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const texto of [encargo('golf'), aclaracion, urgencia]) {
      expect(texto).toContain('espera a todo ayudante o flujo que lanzaste');
      expect(texto).toContain(`${GRACIA_CIERRE_MIN} minutos después de tu cierre, el Studio te detiene`);
    }
    const cierre = Date.parse('2026-10-22T21:00:00Z');
    expect(detenerTrasCierre(null, cierre + 60 * 60_000)).toBe(false); // sin cierre, nunca
    expect(detenerTrasCierre(cierre, cierre + (GRACIA_CIERRE_MIN * 60_000 - 1))).toBe(false); // el commit de la memoria
    expect(detenerTrasCierre(cierre, cierre + GRACIA_CIERRE_MIN * 60_000)).toBe(true);
    expect(detenerTrasCierre(cierre, cierre + 17 * 60_000)).toBe(true); // lo del 22 de octubre
  });

  it('sube la página pública solo cuando revisa el mismo Studio, con esa orden exacta (nota de voz del titular, 22 de octubre de 2026)', () => {
    const studio = join(tmpdir(), 'stl');
    const otro = join(tmpdir(), 'golf');
    expect(permitido(studio, false, studio)).toContain(`Bash(${SUBIR_PAGINA})`);
    expect(permitido(otro, false, studio)).not.toContain(`Bash(${SUBIR_PAGINA})`);
    expect(permitido(otro, false, studio).some((p) => /push|publicar/.test(p))).toBe(false);
    expect(esElStudio(`${studio}/`, studio)).toBe(true);
    expect(encargo('stl', false, [], true)).toContain(SUBIR_PAGINA);
    expect(encargo('golf')).not.toContain(SUBIR_PAGINA);
    // Subir es un permiso del panel: con él, lo pidió el titular; sin él, se deja listo; forzar, nunca (pd_permisos_panel)
    expect(encargo('golf')).toContain(SUBIR_CON_PERMISO);
    expect(encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' })).toContain(SUBIR_CON_PERMISO);
    expect(SUBIR_CON_PERMISO).toMatch(/«Permisos»/);
    expect(SUBIR_CON_PERMISO).toMatch(/Nunca fuerces una subida/);
    expect(encargo('golf')).not.toContain('Nunca subas ni despliegues nada');
  });

  it('pide en la misión del titular el permiso que le falta, en cada encargo que ejecuta trabajo (nota del titular, 21 de octubre de 2026)', () => {
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const texto of [encargo('golf'), encargo('golf', true), urgencia]) {
      expect(texto).toContain(SIN_PERMISO);
      expect(texto).toContain('«Autorizo»');
      expect(texto).toContain('Nunca te des un permiso tú mismo');
      // Desde el panel de permisos (nota de voz del titular nmvotdn3ftit), lo negado se autoriza con una casilla: no
      // se pide en un paso de la misión, salvo lo que el panel no ofrece o se da fuera del Studio
      expect(texto).toContain('«Modelo y consumo» › «Permisos», donde el titular lo autoriza con una casilla');
      expect(texto).toContain('no se lo pidas en un paso de su misión');
    }
  });

  it('dice quién manda en cada proyecto, igual para todos: el Studio en cómo trabaja, el proyecto en su repositorio (notas de voz del titular, 24 de octubre de 2026)', () => {
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const texto of [encargo('golf'), encargo('golf', true), encargo('stl-studio', false, [], true), urgencia]) expect(texto).toContain(QUIEN_MANDA);
    // Lo del Studio no lo cambia el proyecto, sus normas mandan en su repositorio, la más cuidadosa gana y el choque va al titular
    expect(QUIEN_MANDA).toMatch(/ninguna regla, skill ni configuración del proyecto lo cambia ni te da un permiso/);
    expect(QUIEN_MANDA).toMatch(/su CLAUDE\.md o su AGENTS\.md: léelas antes de tocar su código/);
    expect(QUIEN_MANDA).toContain('vale la más cuidadosa');
    expect(QUIEN_MANDA).toContain('plantéasela al titular como decisión');
    // No nombra ningún proyecto: es del Studio, para todos
    expect(QUIEN_MANDA).not.toMatch(/golf|stl-studio|AdWi/i);
  });

  it('ni los encargos ni la bandeja le dan órdenes encadenadas con && (propuesta «El cierre no deja nada sin atender»)', () => {
    // los permisos del director lanzado no aceptan &&, y hasta el 21 de octubre de 2026 la bandeja le daba así el commit de cierre
    const encadenada = /&&\s*(git|cd|node|npm)\b/;
    expect(readFileSync(new URL('../../tools/director/bandeja.ts', import.meta.url), 'utf8')).not.toMatch(encadenada);
    const aclaracion = encargoAclaracion({ proyecto: 'golf', mision: 't_x', paso: 0, nota: 'n1', quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    const urgencia = encargoUrgencia({ proyecto: 'golf', notas: ['n1'], quien: 'ana', pedida: '2026-10-21T00:00:00Z' });
    for (const texto of [encargo('golf'), encargo('golf', true), aclaracion, urgencia]) expect(texto).not.toMatch(encadenada);
  });

  it('resume en vivo lo que va haciendo, a partir de su registro en stream-json', () => {
    const registro = [
      JSON.stringify({ type: 'system', subtype: 'init' }),
      'un aviso que no es JSON',
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Corro la bandeja.' }, { type: 'tool_use', name: 'Bash', input: { command: 'node tools/director/bandeja.ts', description: 'Ejecutar la bandeja' } }] } }),
      JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'mucho texto' }] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: String.raw`C:\repo\estudio\src\director.ts` } }] } }),
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read"', // la línea que aún se está escribiendo
    ].join('\n');
    expect(progresoDe(registro)).toEqual([
      { tipo: 'hace', texto: 'Empieza la revisión' },
      { tipo: 'dice', texto: 'Corro la bandeja.' },
      { tipo: 'hace', texto: 'Ejecutar la bandeja' },
      { tipo: 'hace', texto: 'Edita director.ts' },
    ]);
    expect(progresoDe(registro, 2)).toHaveLength(2);
  });

  it('lo que tiene corriendo: la última herramienta sin su resultado, o lo que espera en segundo plano; mientras corre, no está parado (pr_procesos_vista, punto 2)', () => {
    const pide = (id: string, name: string, input: Record<string, unknown>) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
    const responde = (id: string) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'listo' }] } });
    const base = [JSON.stringify({ type: 'system', subtype: 'init' }), pide('a', 'Read', { file_path: 'C:/x/plan.json' }), responde('a')];
    expect(herramientaEnCurso(base.join('\n'))).toBeNull();
    // Las pruebas corren: su registro no crece hasta que terminan
    expect(herramientaEnCurso([...base, pide('b', 'Bash', { command: 'npm test', description: 'Correr todas las pruebas' })].join('\n'))).toBe('Correr todas las pruebas');
    expect(herramientaEnCurso([...base, pide('b', 'Bash', { command: 'npm test' }), responde('b')].join('\n'))).toBeNull();
    // Un ayudante, y lo que espera en segundo plano al terminar su turno
    expect(herramientaEnCurso([...base, pide('c', 'Agent', { description: 'Leer el diagnóstico' })].join('\n'))).toBe('Le pide a un ayudante: Leer el diagnóstico');
    const fondo = JSON.stringify({ type: 'system', subtype: 'background_tasks_changed', tasks: [{ task_id: 't1', description: 'La auditoría de los cortes' }, { task_id: 't2', description: 'Otra' }] });
    expect(herramientaEnCurso([...base, fondo].join('\n'))).toBe('Espera en segundo plano: «La auditoría de los cortes» y 1 más');
    expect(herramientaEnCurso([...base, fondo, JSON.stringify({ type: 'system', subtype: 'background_tasks_changed', tasks: [] })].join('\n'))).toBeNull();
    // Lo que se pidió en un turno que ya dio su resultado no sigue corriendo
    expect(herramientaEnCurso([...base, pide('d', 'Bash', { command: 'sleep 1' }), JSON.stringify({ type: 'result', result: 'fin' })].join('\n'))).toBeNull();
    // Cortada en su límite con algo corriendo: no estaba parada, y «Qué pasó» lo dice
    const inicio = Date.parse('2026-10-28T10:00:00Z');
    const corriendo = [...base, pide('e', 'Bash', { command: 'npm test', description: 'Correr todas las pruebas' })].join('\n');
    expect(diagnosticarFalla(corriendo, { limite: 60, inicio, fin: inicio + 60 * 60_000, ultimaActividad: inicio + 40 * 60_000 }).porque).toBe('Llevaba 20 minutos esperando a que terminara lo que corría (Correr todas las pruebas) cuando llegó el límite de 60 minutos.');
    // La página: con algo corriendo, la cabecera dice que corre algo largo, no que está parado
    const pagina = readFileSync(join(process.cwd(), 'estudio', 'src', 'director.ts'), 'utf8');
    expect(pagina).toContain("if (e.estado === 'en_curso' && parada && d.enCurso) return");
    expect(pagina).toContain('const parada = d.enCurso ? 0 : minutosSinActividad();');
  });

  it('junta las líneas iguales seguidas en una, con su cuenta, sin cambiar el orden', () => {
    const hace = (texto: string) => ({ tipo: 'hace' as const, texto });
    expect(agruparPasos([hace('Edita plan.json'), hace('Edita plan.json'), hace('Edita plan.json'), hace('Lee CLAUDE.md'), hace('Edita plan.json'), { tipo: 'dice', texto: 'Edita plan.json' }])).toEqual([
      { tipo: 'hace', texto: 'Edita plan.json', veces: 3 },
      { tipo: 'hace', texto: 'Lee CLAUDE.md' },
      { tipo: 'hace', texto: 'Edita plan.json' },
      { tipo: 'dice', texto: 'Edita plan.json' },
    ]);
  });

  it('conserva todo lo que hizo en la revisión, de principio a fin, aunque el registro crezca', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-revisor-'));
    try {
      mkdirSync(join(raiz, '.revisiones'));
      const log = join(raiz, '.revisiones', 'golf-2026-10-18T13-00-00-000Z.log');
      const dice = (t: string) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: t }] } });
      writeFileSync(log, `${JSON.stringify({ type: 'system', subtype: 'init' })}\n${dice('Primero')}\n{"type":"assis`);
      expect(progresoDeProyecto(raiz, 'golf').map((p) => p.texto)).toEqual(['Empieza la revisión', 'Primero']);
      // Lo que se estaba escribiendo termina, y llega mucho más (lo que lee el director pesa)
      appendFileSync(log, `tant","message":{"content":[{"type":"text","text":"Segundo"}]}}\n${'x'.repeat(600 * 1024)}\n${dice('Tercero')}\n`);
      expect(progresoDeProyecto(raiz, 'golf').map((p) => p.texto)).toEqual(['Empieza la revisión', 'Primero', 'Segundo', 'Tercero']);
      // Una revisión nueva empieza de cero
      writeFileSync(join(raiz, '.revisiones', 'golf-2026-10-18T14-00-00-000Z.log'), `${dice('Otra')}\n`);
      expect(progresoDeProyecto(raiz, 'golf').map((p) => p.texto)).toEqual(['Otra']);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('el plan de la revisión en dos tiempos, en vivo: mientras planea y su lista, con lo hecho (pd_dos_tiempos)', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-revisor-'));
    try {
      mkdirSync(join(raiz, '.revisiones'));
      const base = join(raiz, '.revisiones', 'golf-2026-10-18T13-00-00-000Z');
      writeFileSync(`${base}.log`, `${lineaPedido('opus', 'high')}`);
      // Sin primer tiempo (una sola nota), nada
      expect(planDeProyecto(raiz, 'golf')).toBeNull();
      // Mientras planea, lo dice
      writeFileSync(`${base}.primer.jsonl`, `${JSON.stringify({ type: 'system', subtype: 'init' })}\n`);
      expect(planDeProyecto(raiz, 'golf')).toEqual({ planeando: true, encargos: null });
      // Terminó sin lista válida: ya no planea, y no hay plan
      appendFileSync(`${base}.primer.jsonl`, `${JSON.stringify({ type: 'result', result: 'nada' })}\n`);
      expect(planDeProyecto(raiz, 'golf')).toBeNull();
      // Con su lista, cada encargo con lo hecho
      writeFileSync(`${base}.encargos.json`, JSON.stringify([{ id: 'e1', que: 'Uno', hecho: '2026-10-18T13-10-00-000Z', origen: ['x'] }, { id: 'e2', que: 'Dos', origen: ['y'] }]));
      expect(planDeProyecto(raiz, 'golf')).toEqual({ planeando: false, encargos: [{ id: 'e1', que: 'Uno', hecho: '2026-10-18T13-10-00-000Z' }, { id: 'e2', que: 'Dos' }] });
      // La página lo pinta plegado, arriba de los pasos, y no pierde si lo abriste
      const vista = readFileSync(new URL('../src/director.ts', import.meta.url), 'utf8');
      expect(vista).toContain("const plan = planVivoHtml(d.planVivo, caja.querySelector<HTMLDetailsElement>('.plan-vivo')?.open ?? false);");
      expect(vista.indexOf('${plan}')).toBeGreaterThan(vista.indexOf('${permisos}\n'));
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('cuenta los tokens en vivo: una vez por respuesta, aunque venga repetida en sus partes, y al terminar el total exacto', () => {
    const resp = (id: string, salida: number) => JSON.stringify({ type: 'assistant', message: { id, content: [], usage: { input_tokens: 2, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: salida } } });
    // La misma respuesta en dos partes, con lo escrito atrasado en la primera: cuenta lo más que dijo
    const uso = usoDe(`${resp('m1', 1)}\n${resp('m1', 40)}\n${resp('m2', 10)}\nno es json\n`);
    expect(tokensDe(uso)).toBe(1142 + 1112);
    // De a pedazos: suma a lo ya contado
    usoDe(`${resp('m3', 0)}\n`, uso);
    expect(tokensDe(uso)).toBe(1142 + 1112 + 1102);
    // Al terminar, el del evento result (el mismo de «Lo que gastó»)
    usoDe(`${JSON.stringify({ type: 'result', usage: { input_tokens: 5, cache_creation_input_tokens: 300, cache_read_input_tokens: 3000, output_tokens: 60 } })}\n`, uso);
    expect(tokensDe(uso)).toBe(3365);
    expect(tokensDe(usoDe(''))).toBe(0);
  });

  it('lleva los tokens de la revisión del proyecto mientras su registro crece', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-tokens-'));
    try {
      mkdirSync(join(raiz, '.revisiones'));
      const log = join(raiz, '.revisiones', 'golf-2026-10-21T13-00-00-000Z.log');
      const resp = (id: string) => JSON.stringify({ type: 'assistant', message: { id, content: [], usage: { input_tokens: 1, output_tokens: 9 } } });
      expect(tokensDeProyecto(raiz, 'golf')).toBe(0);
      writeFileSync(log, `${resp('a')}\n`);
      expect(tokensDeProyecto(raiz, 'golf')).toBe(10);
      appendFileSync(log, `${resp('b')}\n${resp('b')}\n`);
      expect(tokensDeProyecto(raiz, 'golf')).toBe(20);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('lleva lo que se le niega a la revisión del proyecto mientras su registro crece, y el Studio lo muestra al momento', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-negados-'));
    try {
      mkdirSync(join(raiz, '.revisiones'));
      const log = join(raiz, '.revisiones', 'golf-2026-10-25T13-00-00-000Z.log');
      const usa = (id: string, command: string) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } });
      const nego = (id: string) => JSON.stringify({ type: 'system', subtype: 'permission_denied', tool_name: 'Bash', tool_use_id: id });
      expect(negadosDeProyecto(raiz, 'golf')).toEqual([]);
      writeFileSync(log, `${usa('a', 'git push')}\n`);
      expect(negadosDeProyecto(raiz, 'golf')).toEqual([]);
      // El aviso llega en la parte siguiente: el uso ya leído le da su nombre
      appendFileSync(log, `${nego('a')}\n${usa('b', 'npm test')}\n`);
      expect(negadosDeProyecto(raiz, 'golf')).toEqual(['Bash: git push']);
      // Una revisión nueva empieza de cero
      writeFileSync(join(raiz, '.revisiones', 'golf-2026-10-25T14-00-00-000Z.log'), `${usa('c', 'x')}\n`);
      expect(negadosDeProyecto(raiz, 'golf')).toEqual([]);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
    // El servidor lo manda solo mientras la revisión del proyecto está lanzada y sin cerrar, y la página lo muestra
    const servidor = readFileSync(join(__dirname, 'director.ts'), 'utf-8');
    expect(servidor).toContain('return r?.proyecto === id && r.lanzada && !r.hecha ? negadosDeProyecto(raiz, id) : null;');
    const pagina = readFileSync(join(__dirname, '..', 'src', 'director.ts'), 'utf-8');
    expect(pagina).toContain("r.estado === 'en_curso' && d.negadosVivos?.length");
    expect(pagina).toContain('<div class="negados-vivo">');
  });

  it('guarda lo que gastó cada lanzamiento, tal como lo devuelve Claude Code al terminar', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-consumo-'));
    try {
      mkdirSync(join(raiz, '.revisiones'));
      const resultado = (costo: number) => JSON.stringify({ duration_ms: 429_896, total_cost_usd: costo, usage: { input_tokens: 94, cache_creation_input_tokens: 1000, cache_read_input_tokens: 50_000, output_tokens: 2000 }, type: 'result', subtype: 'success' });
      const init = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5' });
      writeFileSync(join(raiz, '.revisiones', 'stl-studio-2026-10-21T06-03-39-556Z.log'), `${init}\n${resultado(2.8)}\n`);
      writeFileSync(join(raiz, '.revisiones', 'stl-studio-aclaracion-2026-10-21T07-00-00-000Z.log'), `${init}\n${resultado(0.3)}\n`);
      // una que no terminó (o sigue en marcha) no cuenta, ni una de hace dos meses
      writeFileSync(join(raiz, '.revisiones', 'golf-2026-10-21T08-00-00-000Z.log'), `${init}\n`);
      writeFileSync(join(raiz, '.revisiones', 'golf-2026-08-01T08-00-00-000Z.log'), `${init}\n${resultado(9)}\n`);
      const lista = consumoDeRevisiones(raiz, 35, Date.parse('2026-10-21T12:00:00Z'));
      expect(lista).toEqual([
        { cuando: '2026-10-21T07:00:00.000Z', proyecto: 'stl-studio', tipo: 'aclaracion', modelo: 'claude-opus-5-5', costo: 0.3, entrada: 1094, cache: 50_000, salida: 2000, minutos: 7.2, limites: null },
        { cuando: '2026-10-21T06:03:39.556Z', proyecto: 'stl-studio', tipo: 'revision', modelo: 'claude-opus-5-5', costo: 2.8, entrada: 1094, cache: 50_000, salida: 2000, minutos: 7.2, limites: null },
      ]);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  describe('el paquete de cada lanzamiento (pedido del titular del 23 de octubre de 2026)', () => {
    const uso = (entrada: number, escrita: number, leida: number, salida = 5) => ({ input_tokens: entrada, cache_creation_input_tokens: escrita, cache_read_input_tokens: leida, output_tokens: salida });
    const responde = (u: object, padre: string | null = null) => JSON.stringify({ type: 'assistant', message: { id: `m${Math.random()}`, model: 'claude-opus-5-5', content: [], usage: u }, parent_tool_use_id: padre });
    const init = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5' });
    const resultado = JSON.stringify({ type: 'result', total_cost_usd: 1, duration_ms: 60_000, usage: {} });

    it('el arranque: los tokens exactos de la primera llamada del director, sin los de un ayudante', () => {
      // Un ayudante que respondió antes en el registro no cuenta; la segunda llamada del director tampoco
      const registro = [lineaPedido(null, null).trim(), init, responde(uso(9, 9, 9), 'toolu_1'), responde(uso(3, 20_000, 1_500)), responde(uso(1, 100, 21_500)), resultado].join('\n');
      expect(consumoDe(registro)!.arranque).toBe(21_503);
      // Sin `usage` en la primera, la primera que lo tenga
      const sinUso = JSON.stringify({ type: 'assistant', message: { content: [] }, parent_tool_use_id: null });
      expect(consumoDe([init, sinUso, responde(uso(2, 0, 10)), resultado].join('\n'))!.arranque).toBe(12);
      // Sin ninguna llamada suya, no viene
      expect(consumoDe([init, resultado].join('\n'))).not.toHaveProperty('arranque');
    });

    it('cada lanzamiento trae lo que pesan su encargo y lo que le dio la bandeja, con su arranque; los de antes, sin paquete', () => {
      const raiz = mkdtempSync(join(tmpdir(), 'stl-paquete-'));
      try {
        const carpeta = join(raiz, '.revisiones');
        mkdirSync(carpeta);
        const registro = [lineaPedido(null, null).trim(), init, responde(uso(3, 20_000, 1_500)), resultado].join('\n');
        // Uno de ahora, con su paquete entero; uno con solo el encargo (la bandeja no se corrió); uno de antes, sin nada
        writeFileSync(join(carpeta, 'golf-2026-10-23T10-00-00-000Z.log'), `${registro}\n`);
        writeFileSync(join(carpeta, 'golf-2026-10-23T10-00-00-000Z.encargo.txt'), 'Revisa estudio del proyecto golf.');
        writeFileSync(join(carpeta, 'golf-2026-10-23T10-00-00-000Z.bandeja.txt'), '# Bandeja · Golf\ncanción\n');
        writeFileSync(join(carpeta, 'golf-urgencia-2026-10-23T11-00-00-000Z.log'), `${registro}\n`);
        writeFileSync(join(carpeta, 'golf-urgencia-2026-10-23T11-00-00-000Z.encargo.txt'), 'Lo urgente.');
        writeFileSync(join(carpeta, 'golf-2026-10-22T10-00-00-000Z.log'), `${registro}\n`);
        const ahora = Date.parse('2026-10-23T12:00:00Z');
        const [urgencia, revision, antes] = consumoDeRevisiones(raiz, 35, ahora);
        // bytes, el tamaño del archivo; tokens, sus caracteres entre 4 (la bandeja: 25 caracteres, que con «·» y «ó» pesan 27 bytes)
        expect(revision.paquete).toEqual({ registro: 'golf-2026-10-23T10-00-00-000Z.log', encargo: { bytes: 33, tokens: 9 }, bandeja: { bytes: 27, tokens: 7 }, arranque: 21_503 });
        expect(urgencia.paquete).toEqual({ registro: 'golf-urgencia-2026-10-23T11-00-00-000Z.log', encargo: { bytes: 11, tokens: 3 }, arranque: 21_503 });
        expect(antes).not.toHaveProperty('paquete');
        // El arranque va en el paquete, no suelto
        expect(revision).not.toHaveProperty('arranque');
        // Si la bandeja corre otra vez en la misma revisión, su peso se lee de nuevo
        appendFileSync(join(carpeta, 'golf-2026-10-23T10-00-00-000Z.bandeja.txt'), 'otra vez\n');
        expect(consumoDeRevisiones(raiz, 35, ahora)[1].paquete!.bandeja).toEqual({ bytes: 36, tokens: 9 });
      } finally {
        rmSync(raiz, { recursive: true, force: true });
      }
    });

    it('el que no terminó con su resultado (cortado, muerto o en curso) no cuenta en lo gastado, pero su paquete se abre igual', () => {
      const raiz = mkdtempSync(join(tmpdir(), 'stl-sin-terminar-'));
      try {
        const carpeta = join(raiz, '.revisiones');
        mkdirSync(carpeta);
        // Uno que el Studio cortó (sin `result`), con su paquete y su primera llamada; uno en curso; uno de antes, sin paquete
        const empezo = [lineaPedido(null, null).trim(), init, responde(uso(3, 20_000, 1_500))].join('\n');
        writeFileSync(join(carpeta, 'golf-2026-10-23T10-00-00-000Z.log'), `${empezo}\n${JSON.stringify({ type: 'studio', detenido: 'seguía vivo' })}\n`);
        writeFileSync(join(carpeta, 'golf-2026-10-23T10-00-00-000Z.encargo.txt'), 'Revisa estudio del proyecto golf.');
        writeFileSync(join(carpeta, 'golf-2026-10-23T10-00-00-000Z.bandeja.txt'), '# Bandeja · Golf\ncanción\n');
        writeFileSync(join(carpeta, 'golf-urgencia-2026-10-23T11-00-00-000Z.log'), `${lineaPedido(null, null).trim()}\n`);
        writeFileSync(join(carpeta, 'golf-urgencia-2026-10-23T11-00-00-000Z.encargo.txt'), 'Lo urgente.');
        writeFileSync(join(carpeta, 'golf-2026-10-22T10-00-00-000Z.log'), `${empezo}\n`);
        // El turno dice quién trabaja ahora (anotarHijo); en Windows, la ruta va con barras invertidas
        writeFileSync(join(carpeta, 'lanzando.json'), JSON.stringify({ pid: 1, hijo: 4242, proyecto: 'golf', registro: '.revisiones\\golf-urgencia-2026-10-23T11-00-00-000Z.log' }));
        const ahora = Date.parse('2026-10-23T12:00:00Z');
        const { consumo, sinTerminar } = lanzamientosDelDirector(raiz, 35, ahora, (pid) => pid === 4242);
        expect(consumo).toEqual([]);
        expect(sinTerminar).toEqual([
          { cuando: '2026-10-23T11:00:00.000Z', proyecto: 'golf', tipo: 'urgencia', modelo: null, enCurso: true, paquete: { registro: 'golf-urgencia-2026-10-23T11-00-00-000Z.log', encargo: { bytes: 11, tokens: 3 } } },
          { cuando: '2026-10-23T10:00:00.000Z', proyecto: 'golf', tipo: 'revision', modelo: 'claude-opus-5-5', enCurso: false, paquete: { registro: 'golf-2026-10-23T10-00-00-000Z.log', encargo: { bytes: 33, tokens: 9 }, bandeja: { bytes: 27, tokens: 7 }, arranque: 21_503 } },
        ]);
        // Con el director del turno ya muerto, ninguno sigue en curso
        expect(lanzamientosDelDirector(raiz, 35, ahora, () => false).sinTerminar.map((x) => x.enCurso)).toEqual([false, false]);
        // Y lo gastado sigue siendo solo lo que Claude Code devolvió al terminar
        expect(consumoDeRevisiones(raiz, 35, ahora)).toEqual([]);
        // Al terminar con su resultado, sale de los que no terminaron y pasa a lo gastado, con el mismo paquete
        appendFileSync(join(carpeta, 'golf-2026-10-23T10-00-00-000Z.log'), `${resultado}\n`);
        const despues = lanzamientosDelDirector(raiz, 35, ahora, () => false);
        expect(despues.sinTerminar.map((x) => x.tipo)).toEqual(['urgencia']);
        expect(despues.consumo[0].paquete).toEqual({ registro: 'golf-2026-10-23T10-00-00-000Z.log', encargo: { bytes: 33, tokens: 9 }, bandeja: { bytes: 27, tokens: 7 }, arranque: 21_503 });
      } finally {
        rmSync(raiz, { recursive: true, force: true });
      }
    });

    it('el final, escrito: quién terminó cada lanzamiento, por qué y cuánto duró, también el que se cortó sin resultado (pr_procesos_vista, punto 1)', () => {
      const empezo = [lineaPedido(null, null).trim(), init, responde(uso(3, 20_000, 1_500))].join('\n');
      const inicio = Date.parse('2026-10-23T10:00:00Z');
      const f = { inicio, fin: inicio + 30 * 60_000 };
      expect(finEscrito(`${empezo}\n${resultado}`, { ...f, cerro: true })).toMatchObject({ quien: 'cierre', minutos: 30 });
      expect(finEscrito(`${empezo}\n${resultado}`, { ...f, cerro: true, trasCierre: true })).toMatchObject({ quien: 'tras_cierre', causa: expect.stringContaining(`${GRACIA_CIERRE_MIN} minutos`) });
      expect(finEscrito(empezo, { ...f, cerro: false, limite: 60 })).toMatchObject({ quien: 'limite', causa: expect.stringContaining('60 minutos') });
      expect(finEscrito(`${empezo}\n${resultado}`, { ...f, cerro: false }).quien).toBe('claude');
      expect(finEscrito(empezo, { ...f, cerro: false, codigo: null }).quien).toBe('afuera');
      expect(finEscrito('', { ...f, cerro: false, problema: 'El Studio no pudo lanzar Claude Code (ENOENT).' }).quien).toBe('no_arranco');
      const rechazo = JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1_761_300_000 } });
      expect(finEscrito(`${empezo}\n${rechazo}`, { ...f, cerro: false }).quien).toBe('cuenta');
      // Escrito en su registro, se lee: en lo gastado y en los que no terminaron, aunque no tengan paquete
      const raiz = mkdtempSync(join(tmpdir(), 'stl-fin-'));
      try {
        const carpeta = join(raiz, '.revisiones');
        mkdirSync(carpeta);
        const cortada = join(carpeta, 'golf-2026-10-23T10-00-00-000Z.log');
        writeFileSync(cortada, `${empezo}\n${lineaDeFin(finEscrito(empezo, { ...f, cerro: false, limite: 60 }))}`);
        writeFileSync(join(carpeta, 'golf-2026-10-23T09-00-00-000Z.log'), `${empezo}\n${resultado}\n${lineaDeFin({ quien: 'cierre', causa: 'Cerró con su cierre y terminó solo.', minutos: 12 })}`);
        const { consumo, sinTerminar } = lanzamientosDelDirector(raiz, 35, Date.parse('2026-10-23T12:00:00Z'), () => false);
        expect(consumo[0].fin).toMatchObject({ quien: 'cierre', minutos: 12 });
        expect(sinTerminar).toEqual([expect.objectContaining({ tipo: 'revision', fin: expect.objectContaining({ quien: 'limite', minutos: 30 }) })]);
        expect(sinTerminar[0]).not.toHaveProperty('paquete');
        expect(finDelRegistro(readFileSync(cortada, 'utf8'))).toMatchObject({ quien: 'limite' });
        expect(finDelRegistro(empezo)).toBeNull();
      } finally {
        rmSync(raiz, { recursive: true, force: true });
      }
    });

    it('el director lanzado sabe cuál es su registro, y nadie lo hereda', () => {
      const base = { PATH: '/bin', CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'cli', STL_REGISTRO: '/otro/registro.log' };
      const env = entornoDelDirector(base, join('carpeta', '.revisiones', 'golf-2026-10-23T10-00-00-000Z.log'));
      expect(env.STL_REGISTRO).toBe(resolve('carpeta', '.revisiones', 'golf-2026-10-23T10-00-00-000Z.log'));
      expect(env).toMatchObject({ PATH: '/bin', CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: '0', ENABLE_CLAUDEAI_MCP_SERVERS: 'false' });
      // El arranque limpio, también por sus variables: sin la foto de git ni la memoria automática (pd_arranque_limpio)
      expect(env).toMatchObject({ CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: '1', CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' });
      // Los ayudantes, acotados por el código: todos con un modelo más barato, forzado, y ninguno abre otros (pd_topes_ayudantes)
      expect(env).toMatchObject({ CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet', CLAUDE_CODE_SUBAGENT_MODEL_FORCE: '1', CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: '1' });
      expect(entornoDelDirector(base, undefined, 'claude-opus-5-5[1m]').CLAUDE_CODE_SUBAGENT_MODEL).toBe('sonnet');
      expect(entornoDelDirector(base, undefined, 'haiku').CLAUDE_CODE_SUBAGENT_MODEL).toBe('haiku');
      expect(modeloDeLosAyudantes('claude-haiku-5-5')).toBe('haiku');
      expect(modeloDeLosAyudantes(null)).toBe('sonnet');
      // La política de modelos va en el encargo de la revisión y de la urgencia, no en el de una aclaración (pr_modelos_por_tarea, puntos 2 y 3)
      expect(encargo('golf')).toContain(POLITICA_DE_MODELOS);
      expect(encargoUrgencia({ proyecto: 'golf', quien: 'Laura', notas: ['n1'], pedida: '2026-10-28T10:00:00.000Z' })).toContain(POLITICA_DE_MODELOS);
      expect(encargoAclaracion({ proyecto: 'golf', mision: 'm1', paso: 0, nota: 'n1', quien: 'Laura', pedida: '2026-10-28T10:00:00.000Z' })).not.toContain(POLITICA_DE_MODELOS);
      // «Todo con el modelo que elegí»: el mismo del director, si se sabe cuál es (pr_modelos_por_tarea, punto 4)
      expect(modeloDeLosAyudantes('claude-opus-5-5[1m]', true)).toBe('claude-opus-5-5[1m]');
      expect(modeloDeLosAyudantes(null, true)).toBe('sonnet');
      expect(entornoDelDirector(base, undefined, 'claude-opus-5-5', true).CLAUDE_CODE_SUBAGENT_MODEL).toBe('claude-opus-5-5');
      // …y el lanzador le pasa el modelo del director
      const revisor = readFileSync(new URL('./revisor.ts', import.meta.url), 'utf8');
      expect(revisor).toContain("lanzarClaude(programa, args, { cwd: this.raiz, stdio: ['pipe', registro, registro] }, archivo, modelo, entornoDelPermiso, elegido.todoConElModelo === true)");
      expect(env).not.toHaveProperty('CLAUDECODE');
      expect(env).not.toHaveProperty('CLAUDE_CODE_ENTRYPOINT');
      // Sin registro (preguntar si hay sesión), sin la variable, aunque el servidor la tuviera
      expect(entornoDelDirector(base)).not.toHaveProperty('STL_REGISTRO');
      // Y no toca las del servidor
      expect(base.STL_REGISTRO).toBe('/otro/registro.log');
    });

    it('el lanzador guarda el encargo junto al registro antes de enviarlo, y le pasa la ruta del registro', () => {
      const revisor = readFileSync(new URL('./revisor.ts', import.meta.url), 'utf8');
      const lanzar = revisor.slice(revisor.indexOf('private async lanzar('), revisor.indexOf('function anotarHijo('));
      expect(lanzar).toContain("{ cwd: this.raiz, stdio: ['pipe', registro, registro] }, archivo, modelo, entornoDelPermiso, elegido.todoConElModelo === true)");
      const guarda = lanzar.indexOf('writeFileSync(paqueteDeRegistro(archivo).encargo, elEncargo');
      expect(guarda).toBeGreaterThan(0);
      // Por la entrada en stream-json, que sigue abierta para el aviso del Studio (avisoAlDirector.ts)
      expect(lanzar.indexOf('p.stdin?.write(mensajeDeEntrada(elEncargo))')).toBeGreaterThan(guarda);
    });

    it('la revisión en dos tiempos: antes del director, su primer tiempo, que solo lee y planea (pd_dos_tiempos)', () => {
      const revisor = readFileSync(new URL('./revisor.ts', import.meta.url), 'utf8');
      const lanzar = revisor.slice(revisor.indexOf('private async lanzar('), revisor.indexOf('function anotarHijo('));
      // Solo en una revisión (no en una aclaración ni en lo urgente), y no si trae un solo trabajo pequeño
      expect(lanzar).toContain('const trabajo = aparte ? null : await trabajoDeLaRevision(');
      expect(lanzar).toContain('if (trabajo && !saltaPrimerTiempo(trabajo))');
      // Antes de lanzar al director, y su plan validado va al final del encargo
      const primero = lanzar.indexOf('await this.primerTiempo(');
      expect(primero).toBeGreaterThan(0);
      expect(primero).toBeLessThan(lanzar.indexOf('p = lanzarClaude('));
      expect(lanzar).toContain('conElPlanDeLaRevision(proyecto, planDeLaRevision)');
      // El modelo de cada encargo se aplica al lanzar el segundo tiempo: el de sus ayudantes, salvo «Todo con el modelo que
      // elegí», y el encargo lo dice (pr_modelos_por_tarea)
      expect(lanzar).toContain('const ayudantes = planDeLaRevision && elegido.todoConElModelo !== true ? ayudantesDelPlan(planDeLaRevision, modeloDeLosAyudantes(modelo)) : null;');
      expect(lanzar).toContain('...(ayudantes ? { CLAUDE_CODE_SUBAGENT_MODEL: ayudantes } : {})');
      expect(lanzar).toContain('(ayudantes ? conLosAyudantesDelPlan(ayudantes) : \'\')');
      expect(lanzar.indexOf('const ayudantes = ')).toBeLessThan(lanzar.indexOf('p = lanzarClaude('));
      // Lo que va en `extra` gana sobre lo que pone entornoDelDirector
      expect(revisor).toContain('const env = { ...entornoDelDirector(process.env, registro, modelo, todoConElModelo), ...extra };');
      // Con su mismo modelo y esfuerzo bajo, siempre en «Solo lo autorizado», y solo leer y correr la bandeja
      expect(lanzar).toContain("permisosDelModo('autorizado', { ...entradaDePermisos, archivo: ajustesPrimero })");
      expect(lanzar).toContain("...(modelo ? ['--model', modelo] : []), '--effort', 'low'");
      expect(lanzar).toContain("const soloLeer = [...permitidas.filter((r) => r.startsWith('Read(')), `Bash(node tools/director/bandeja.ts --proyecto ${proyecto})`]");
      expect(lanzar).toContain("'--allowedTools', ...soloLeer]");
      // Detenida mientras planea, el director no se lanza; lo que tomó planear no se le quita al director
      expect(lanzar).toContain("if ('detenida' in primero) return void (await this.detenidaAlPlanear(");
      expect(lanzar).toContain('await prorrogarRevision(this.raiz, proyecto, minutos + planeo)');
      // Y su tope, para no quedarse planeando
      const metodo = revisor.slice(revisor.indexOf('private primerTiempo('), revisor.indexOf('private async detenidaAlPlanear('));
      expect(metodo).toContain('MAX_MIN_PRIMER_TIEMPO * 60_000');
      expect(metodo).toContain('q.stdin?.end(encargoDelPrimerTiempo(proyecto, minutos, bandeja))');
    });

    it('el paquete listo: los procedimientos y las partes de la pieza siguiente se leen solo de adentro, nunca un .env ni .git (pd_paquete_listo)', () => {
      const raiz = mkdtempSync(join(tmpdir(), 'estudio-paquete-listo-'));
      const repo = join(raiz, 'repo');
      mkdirSync(join(raiz, 'docs', 'metodo', 'director'), { recursive: true });
      mkdirSync(join(repo, 'src'), { recursive: true });
      writeFileSync(join(raiz, 'docs', 'metodo', 'director', 'review-cycle.md'), '# El ciclo\nLo que dice el ciclo.\n');
      writeFileSync(join(repo, 'src', 'a.ts'), "const x = 1;\n\n/** La que sigue. */\nexport function siguiente() {\n  return 2;\n}\n\nexport const otra = 3;\n");
      writeFileSync(join(repo, '.env'), 'SECRETO=1\n');
      try {
        const pieza = { cuando: '2026-10-29T00:00:00Z', id: 'pd_x', comprueba: 'npm test', archivos: [{ ruta: 'src/a.ts', parte: 'siguiente' }, { ruta: '.env' }, { ruta: '../fuera.txt' }] };
        const paquete = paqueteListoDe(raiz, repo, 'Lee docs/metodo/director/review-cycle.md antes de todo.', pieza);
        expect(paquete).toContain('Lo que dice el ciclo.');
        expect(paquete).toContain('export function siguiente()');
        expect(paquete).not.toContain('export const otra');
        expect(paquete).not.toContain('SECRETO');
        expect(paquete).toContain('Read apart, they did not fit: .env, ../fuera.txt.');
      } finally {
        rmSync(raiz, { recursive: true, force: true });
      }
    });

    it('el paquete listo: la bandeja la corre el Studio antes que nada, sin modelo, y va dentro del encargo (pd_paquete_listo)', () => {
      const revisor = readFileSync(new URL('./revisor.ts', import.meta.url), 'utf8');
      const lanzar = revisor.slice(revisor.indexOf('private async lanzar('), revisor.indexOf('function anotarHijo('));
      // Solo en una revisión, antes del primer tiempo y del director
      const corre = lanzar.indexOf('const bandejaLista = aparte ? null : bandejaParaElEncargo(await correrLaBandeja(this.raiz, proyecto, archivo, modelo))');
      expect(corre).toBeGreaterThan(0);
      expect(corre).toBeLessThan(lanzar.indexOf('await this.primerTiempo('));
      expect(lanzar).toContain('elegido.todoConElModelo === true, bandejaLista)');
      // Con los procedimientos que nombra y la pieza siguiente que dejó escrita el director, leídos sin modelo
      expect(lanzar).toContain("(bandejaLista ? conLaBandejaLista(proyecto, bandejaLista) + paqueteListoDe(this.raiz, repositorio, bandejaLista, piezaDelPlan(this.raiz, proyecto)) : '')");
      // Con la ruta del registro (el candado del lanzador y el paquete de la revisión), con su tope, y sin modelo
      const metodo = revisor.slice(revisor.indexOf('export function correrLaBandeja('), revisor.indexOf('function sinSesion('));
      expect(metodo).toContain("spawn(process.execPath, ['tools/director/bandeja.ts', '--proyecto', proyecto]");
      expect(metodo).toContain('entornoDelDirector(process.env, registro, modelo)');
      expect(metodo).toContain('MAX_MIN_BANDEJA_LISTA * 60_000');
      expect(metodo).toContain('termina(codigo === 0 ? salida : null)');
    });

    it('el director puede marcar hecho cada encargo de su plan, y nada más con esa herramienta', () => {
      expect(permitido('/r')).toContain('Bash(node tools/director/encargos.ts:*)');
    });
  });

  it('lee lo pedido, el modelo con que trabajó y los límites del plan que da Claude Code', () => {
    const limite = (cinco: number, semana: number) => JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', unifiedWindows: { five_hour: { utilization: cinco, resetsAt: 1792339800 }, seven_day: { utilization: semana, resetsAt: 1792702800 } } } });
    const registro = [
      lineaPedido('claude-opus-5-5[1m]', 'high').trim(),
      JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5[1m]' }),
      limite(0.1, 0.12),
      limite(0.11, 0.125),
      JSON.stringify({ type: 'result', total_cost_usd: 1, duration_ms: 60_000, usage: {} }),
    ].join('\n');
    const c = consumoDe(registro)!;
    expect(c.pedido).toEqual({ modelo: 'claude-opus-5-5[1m]', esfuerzo: 'high', cumplido: true });
    expect(consumoDe(registro.replace('"modelo":"claude-opus-5-5[1m]"', '"modelo":"sonnet"'))!.pedido!.cumplido).toBe(false);
    expect(consumoDe(registro.replace('"modelo":"claude-opus-5-5[1m]"', '"modelo":null'))!.pedido!.cumplido).toBeNull();
    expect(c.modelo).toBe('claude-opus-5-5[1m]');
    // el último aviso manda, en porcentaje
    expect(c.limites).toEqual({ cincoHoras: { uso: 11, renueva: new Date(1792339800_000).toISOString() }, semana: { uso: 12.5, renueva: new Date(1792702800_000).toISOString() } });
    // lo pedido no se confunde con un modelo que la cuenta rechazó, ni con un esfuerzo rechazado
    expect(fallaDelModelo(lineaPedido('haiku', null))).toBe(false);
    expect(fallaDelEsfuerzo(lineaPedido(null, 'max'))).toBe(false);
    // un registro de antes, sin lo pedido, sigue contando
    expect(consumoDe(registro.split('\n').slice(1).join('\n'))!.pedido).toBeUndefined();
    // sin permisos negados no trae la lista; con ellos, cada uno una vez (propuesta «Lo que se le negó al director, a la vista»)
    expect(c.negados).toBeUndefined();
    const negado = registro.replace('"usage":{}', '"usage":{},"permission_denials":[{"tool_name":"Bash","tool_input":{"command":"git -C .stl status"}},{"tool_name":"Bash","tool_input":{"command":"git -C .stl status"}}]');
    expect(consumoDe(negado)!.negados).toEqual(['Bash: git -C .stl status']);
  });

  it('dice con qué modelos trabajó cada lanzamiento, lo que gastó cada uno y para qué (nota de voz del titular, 22 de octubre de 2026)', () => {
    const uso = (entrada: number, salida: number, costo: number) => ({ inputTokens: entrada, outputTokens: salida, cacheReadInputTokens: 1000, cacheCreationInputTokens: 100, webSearchRequests: 0, costUSD: costo });
    const usa = (id: string, name: string, input: Record<string, unknown>) => JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', id, name, input }] }, parent_tool_use_id: null });
    // Una respuesta de un ayudante: trae el id del uso de Agent que lo lanzó
    const ayudante = (padre: string, model: string) => JSON.stringify({ type: 'assistant', message: { model, content: [{ type: 'text', text: 'Leo.' }] }, parent_tool_use_id: padre });
    // Los agentes de un flujo no escriben en el registro: lo dice el aviso de su progreso (el alias antes de empezar)
    const flujo = JSON.stringify({ type: 'system', subtype: 'task_progress', task_id: 'w1', workflow_progress: [{ type: 'workflow_phase', index: 1, title: 'Investigar' }, { type: 'workflow_agent', index: 1, label: 'investigar:mapa', phaseTitle: 'Investigar', model: 'sonnet', state: 'start' }, { type: 'workflow_agent', index: 2, label: 'verificar:mapa', phaseTitle: 'Verificar', model: 'claude-sonnet-5-5', state: 'done' }] });
    // Cada turno trae su resultado: `usage` es solo el del turno, `modelUsage` lo de toda la sesión
    const resultado = (modelUsage: Record<string, unknown>, costo: number) => JSON.stringify({ type: 'result', total_cost_usd: costo, duration_ms: 60_000, usage: { input_tokens: 1, cache_creation_input_tokens: 2, cache_read_input_tokens: 3, output_tokens: 4 }, modelUsage });
    const init = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5' });
    const registro = [
      lineaPedido('claude-opus-5-5', 'high').trim(),
      init,
      usa('t1', 'WebFetch', { url: 'https://example.com', prompt: 'Resume la página' }),
      usa('t2', 'Agent', { description: 'Leer el repositorio', prompt: 'Lee todo' }),
      ayudante('t2', 'claude-sonnet-5-5'),
      usa('t3', 'Agent', { description: 'Ordenar las notas', prompt: 'Ordena', model: 'opus' }),
      ayudante('t3', 'claude-opus-5-5'),
      resultado({ 'claude-opus-5-5': uso(10, 100, 1) }, 1),
      flujo,
      resultado({ 'claude-opus-5-5': uso(50, 2000, 10), 'claude-haiku-5-5': uso(9000, 300, 0.01), 'claude-sonnet-5-5': uso(70, 900, 3.2) }, 13.21),
    ].join('\n');
    // El principal primero; los demás, del que más gastó al que menos, con para qué: el ayudante, el flujo o Claude Code
    expect(modelosDe(registro)).toEqual([
      { modelo: 'claude-opus-5-5', principal: true, entrada: 150, cache: 1000, salida: 2000, costo: 10 },
      { modelo: 'claude-sonnet-5-5', principal: false, entrada: 170, cache: 1000, salida: 900, costo: 3.2, para: ['Leer el repositorio', 'Investigar', 'Verificar'] },
      { modelo: 'claude-haiku-5-5', principal: false, entrada: 9100, cache: 1000, salida: 300, costo: 0.01, para: [`${POR_DENTRO}, al leer páginas web`] },
    ]);
    // Sin páginas leídas, solo «por dentro de Claude Code»; sin el inicio, el principal es el de la primera respuesta suya
    const sinInicio = [usa('t1', 'Read', { file_path: 'plan.json' }), resultado({ 'claude-opus-5-5[1m]': uso(1, 1, 0.5), 'claude-haiku-5-5': uso(5, 1, 0.001) }, 0.501)].join('\n');
    expect(modelosDe(sinInicio).map((m) => [m.modelo, m.principal, m.para])).toEqual([['claude-opus-5-5[1m]', true, undefined], ['claude-haiku-5-5', false, [POR_DENTRO]]]);
    // Sin su resultado, o si Claude Code no dijo los modelos, nada
    expect(modelosDe([init, usa('t1', 'Read', {})].join('\n'))).toEqual([]);
    expect(modelosDe([init, JSON.stringify({ type: 'result', total_cost_usd: 1, usage: {} })].join('\n'))).toEqual([]);
    // «Lo que gastó» cuenta los tokens de todos los modelos y de toda la sesión, no solo los del último turno del director
    const c = consumoDe(registro)!;
    expect(c).toMatchObject({ modelo: 'claude-opus-5-5', costo: 13.21, entrada: 150 + 170 + 9100, cache: 3000, salida: 3200 });
    expect(c.modelos).toEqual(modelosDe(registro));
    // y los tokens en vivo, al terminar, dicen lo mismo
    expect(tokensDe(usoDe(registro))).toBe(9420 + 3000 + 3200);
  });

  it('dice si trabajó con el modelo pedido', () => {
    expect(trabajoConElPedido('claude-opus-5-5[1m]', 'claude-opus-5-5[1m]')).toBe(true);
    expect(trabajoConElPedido('claude-opus-5-5[1m]', 'claude-opus-5-5')).toBe(true);
    expect(trabajoConElPedido('opus', 'claude-opus-5-5')).toBe(true);
    expect(trabajoConElPedido('sonnet', 'claude-opus-5-5')).toBe(false);
    expect(trabajoConElPedido('claude-sonnet-5-5', 'claude-opus-5-5[1m]')).toBe(false);
  });

  it('reconoce cuando la cuenta no acepta el modelo elegido, y solo entonces', () => {
    const init = JSON.stringify({ type: 'system', subtype: 'init', model: 'haiku' });
    const error = JSON.stringify({ type: 'result', is_error: true, result: "There's an issue with the selected model (haiku). It may not exist or you may not have access to it." });
    expect(fallaDelModelo(`${init}\n${error}\n`)).toBe(true);
    // otro error antes de trabajar (la sesión, la red) no es del modelo, aunque el inicio lo nombre
    expect(fallaDelModelo(`${init}\n${JSON.stringify({ type: 'result', is_error: true, result: 'Invalid API key' })}\n`)).toBe(false);
    // si llegó a trabajar, el modelo sirvió
    expect(fallaDelModelo(`${init}\n${JSON.stringify({ type: 'assistant', message: { content: [] } })}\n${error}\n`)).toBe(false);
    expect(consumoDe(init)).toBeNull();
  });

  it('reconoce cuando Claude Code no acepta el esfuerzo elegido, y solo entonces', () => {
    expect(fallaDelEsfuerzo("error: unknown option '--effort'\n")).toBe(true);
    expect(fallaDelEsfuerzo(`${JSON.stringify({ type: 'result', is_error: true, result: 'Invalid effort level: xhigh' })}\n`)).toBe(true);
    expect(fallaDelEsfuerzo(`${JSON.stringify({ type: 'result', is_error: true, result: 'Invalid API key' })}\n`)).toBe(false);
    // si llegó a trabajar, el esfuerzo sirvió
    expect(fallaDelEsfuerzo(`${JSON.stringify({ type: 'assistant', message: { content: [] } })}\nerror: unknown option '--effort'\n`)).toBe(false);
  });

  describe('el reporte de una revisión que no se cerró', () => {
    const init = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5' });
    const dice = (t: string) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: t }] } });
    const usa = (id: string, name: string, input: Record<string, unknown>) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
    const resultado = (x: Record<string, unknown> = {}) => JSON.stringify({ type: 'result', subtype: 'success', is_error: false, duration_ms: 120_000, total_cost_usd: 3.5, result: 'Listo por ahora.', ...x });
    const inicio = Date.parse('2026-10-21T18:00:00Z');

    it('el límite de tiempo: cuánto duró y lo último que hacía', () => {
      const registro = [lineaPedido(null, null).trim(), init, dice('Corro la bandeja.'), usa('t1', 'Read', { file_path: 'C:/x/plan.json' }), usa('t2', 'Edit', { file_path: 'C:/x/plan.json' }), usa('t3', 'Edit', { file_path: 'C:/x/plan.json' })].join('\n');
      const f = diagnosticarFalla(registro, { limite: 60, inicio, fin: inicio + 60 * 60_000, ultimaActividad: inicio + 59 * 60_000 });
      expect(f.que).toBe('La revisión se cortó a los 60 minutos');
      expect(f.porque).toContain('Seguía trabajando');
      expect(f.duracion).toBe(60);
      expect(f.accion).toBe('pedir');
      expect(f.ultimos).toEqual([
        { tipo: 'hace', texto: 'Empieza la revisión' },
        { tipo: 'dice', texto: 'Corro la bandeja.' },
        { tipo: 'hace', texto: 'Lee plan.json' },
        { tipo: 'hace', texto: 'Edita plan.json', veces: 2 },
      ]);
      // sin nada nuevo en su registro desde hace rato y sin nada corriendo, se había quedado parado
      const respondido = [registro, ...['t1', 't2', 't3'].map((id) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'ok' }] } }))].join('\n');
      expect(diagnosticarFalla(respondido, { limite: 60, inicio, fin: inicio + 60 * 60_000, ultimaActividad: inicio + 30 * 60_000 }).porque).toContain('30 minutos sin ninguna actividad');
      // con algo corriendo, lo que esperaba (pr_procesos_vista, punto 2)
      expect(diagnosticarFalla(registro, { limite: 60, inicio, fin: inicio + 60 * 60_000, ultimaActividad: inicio + 30 * 60_000 }).porque).toBe('Llevaba 30 minutos esperando a que terminara lo que corría (Edita plan.json) cuando llegó el límite de 60 minutos.');
      // esperando un flujo en segundo plano: conviene pedirla sin ultracode
      const conFlujo = diagnosticarFalla(`${registro}\n${usa('t4', 'Workflow', { description: 'Investigar' })}\n${JSON.stringify({ type: 'system', subtype: 'background_tasks_changed', tasks: [{ task_id: 'w1', description: 'Evalúa los tipos de nota' }] })}`, { limite: 60 });
      expect(conFlujo.porque).toContain('Seguía esperando «Evalúa los tipos de nota»');
      expect(conFlujo).toMatchObject({ accion: 'sin_ultracode', usoFlujos: { flujos: 1, ayudantes: 0 } });
    });

    it('el turno terminado con un flujo en segundo plano, que Claude Code cortó', () => {
      // lo que pasó el 21 de octubre de 2026: el director esperó su flujo, terminó el turno y Claude Code lo cortó
      const registro = [
        init,
        usa('t1', 'Workflow', { description: 'Evalúa la idea' }),
        JSON.stringify({ type: 'system', subtype: 'background_tasks_changed', tasks: [{ task_id: 'w1', task_type: 'local_workflow', description: 'Evalúa la idea del titular' }] }),
        resultado({ result: 'Espero el resultado del análisis para responder la nota.', total_cost_usd: 14.17 }),
        'Background tasks still running 10m after the last turn (workflow "Evalúa la idea del titular"); stopping them.',
        JSON.stringify({ type: 'system', subtype: 'task_updated', task_id: 'w1', patch: { status: 'killed' } }),
        JSON.stringify({ type: 'system', subtype: 'background_tasks_changed', tasks: [] }),
      ].join('\n');
      const f = diagnosticarFalla(registro, { problema: 'La revisión que lanzó el Studio terminó sin cerrarse.' });
      expect(f.que).toBe('Claude Code terminó sin cerrar la revisión');
      expect(f.porque).toContain('esperando «Evalúa la idea del titular» en segundo plano');
      expect(f.porque).toContain('lo cortó');
      expect(f).toMatchObject({ gasto: 14.17, usoFlujos: { flujos: 1, ayudantes: 0 }, accion: 'sin_ultracode' });
      expect(f.sugerencia).toContain('sin ultracode');
    });

    it('un error de la API, y un límite de uso de la cuenta', () => {
      const api = diagnosticarFalla([init, dice('Leo el plan.'), resultado({ subtype: 'error_during_execution', is_error: true, result: 'API Error: 500 Internal server error' })].join('\n'));
      expect(api.que).toBe('Se detuvo a mitad de camino');
      expect(api.porque).toContain('«API Error: 500 Internal server error»');
      expect(api.accion).toBe('pedir');
      const limite = diagnosticarFalla([init, dice('Leo el plan.'), JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1792626600 } }), resultado({ is_error: true, result: 'Claude AI usage limit reached' })].join('\n'));
      expect(limite.porque).toContain('límite de uso');
      expect(limite).toMatchObject({ accion: 'cuenta', renueva: new Date(1792626600_000).toISOString() });
      // sin llegar a trabajar, la sesión de la cuenta
      const sesion = diagnosticarFalla([init, resultado({ is_error: true, result: 'Invalid API key · Please run /login' })].join('\n'));
      expect(sesion).toMatchObject({ que: 'No arrancó', accion: 'cuenta' });
      expect(sesion.sugerencia).toContain('claude auth login');
    });

    it('los permisos negados, con la herramienta y lo que intentó', () => {
      const registro = [
        init,
        usa('t1', 'Bash', { command: 'cd x ; git status', description: 'Ver el estado' }),
        JSON.stringify({ type: 'system', subtype: 'permission_denied', tool_name: 'Bash', tool_use_id: 't1' }),
        resultado({ permission_denials: [{ tool_name: 'Bash', tool_use_id: 't1', tool_input: { command: 'cd x ; git status' } }] }),
      ].join('\n');
      const f = diagnosticarFalla(registro);
      expect(f.negados).toEqual(['Bash: «cd x ; git status»']);
      expect(f.porque).toContain('Se le negó un permiso (Bash: «cd x ; git status»)');
      expect(f.porque).toContain('«Listo por ahora.»');
      expect(f.gasto).toBe(3.5);
    });

    it('un registro vacío: no arrancó, y lo dice', () => {
      expect(diagnosticarFalla('')).toMatchObject({ que: 'No arrancó', duracion: null, gasto: null, ultimos: [], usoFlujos: null, negados: [] });
      expect(diagnosticarFalla(lineaPedido('opus', 'high')).porque).toContain('No escribió nada en su registro');
      expect(diagnosticarFalla('', { problema: 'El Studio no pudo lanzar Claude Code (spawn ENOENT).' }).porque).toMatch(/^El Studio no pudo lanzar Claude Code \(spawn ENOENT\)\./);
      expect(diagnosticarFalla('error: algo se rompió al empezar\n', { codigo: 1 }).porque).toContain('«error: algo se rompió al empezar»');
    });

    it('el proceso que murió sin dar su resultado', () => {
      const f = diagnosticarFalla([init, dice('Leo el plan.')].join('\n'), { muerto: true, fin: inicio + 20 * 60_000, ultimaActividad: inicio + 5 * 60_000 });
      expect(f.que).toBe('Claude Code se detuvo sin terminar');
      expect(f.porque).toContain('ya no existe');
      expect(f.porque).toContain('hace 15 min');
    });

    it('sabe si el director lanzado por otro servidor sigue vivo', () => {
      const dir = mkdtempSync(join(tmpdir(), 'stl-lanzado-'));
      try {
        const turno = join(dir, 'lanzando.json');
        expect(estadoDelLanzado(turno, 'golf').estado).toBe('desconocido');
        writeFileSync(turno, JSON.stringify({ pid: 111, cuando: new Date().toISOString(), hijo: 222, proyecto: 'golf', registro: '.revisiones/golf.log' }));
        expect(estadoDelLanzado(turno, 'golf', (p) => p === 111 || p === 222).estado).toBe('servidor');
        expect(estadoDelLanzado(turno, 'golf', (p) => p === 222)).toEqual({ estado: 'director', hijo: 222 });
        expect(estadoDelLanzado(turno, 'golf', () => false)).toEqual({ estado: 'muerto', hijo: 222 });
        // el turno de otro proyecto, o uno de antes sin el director anotado, no dice nada
        expect(estadoDelLanzado(turno, 'otro', () => false).estado).toBe('desconocido');
        writeFileSync(turno, JSON.stringify({ pid: 111, cuando: new Date().toISOString() }));
        expect(estadoDelLanzado(turno, 'golf', () => false).estado).toBe('desconocido');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('lee el último registro del proyecto: su inicio, su última actividad y su ruta', () => {
      const raiz = mkdtempSync(join(tmpdir(), 'stl-falla-'));
      try {
        mkdirSync(join(raiz, '.revisiones'));
        expect(actividadDeProyecto(raiz, 'golf')).toBeNull();
        writeFileSync(join(raiz, '.revisiones', 'golf-2026-10-21T18-00-00-000Z.log'), `${init}\n${dice('Leo el plan.')}\n`);
        // el de «golf-dos» o el de una aclaración no se confunden con el de la revisión
        writeFileSync(join(raiz, '.revisiones', 'golf-aclaracion-2026-10-21T19-00-00-000Z.log'), `${init}\n`);
        expect(inicioDeRegistro('golf-2026-10-21T18-00-00-000Z.log')).toBe(inicio);
        expect(actividadDeProyecto(raiz, 'golf')).toEqual(expect.any(String));
        const f = fallaDeProyecto(raiz, 'golf', { muerto: true });
        expect(f.registro).toBe(join('.revisiones', 'golf-2026-10-21T18-00-00-000Z.log'));
        expect(f.ultimos.map((p) => p.texto)).toEqual(['Empieza la revisión', 'Leo el plan.']);
        expect(f.que).toBe('Claude Code se detuvo sin terminar');
      } finally {
        rmSync(raiz, { recursive: true, force: true });
      }
    });
  });

  it('elige la versión más nueva de Claude Code', () => {
    expect(['2.1.295', '2.1.299', '2.1.30', '10.0.0'].sort(compararVersion)).toEqual(['2.1.30', '2.1.295', '2.1.299', '10.0.0']);
  });
});
