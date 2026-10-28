import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { esModoPermisos, guardarModoPermisos, leerLocal } from '../../src/director/proyectos';
import { ajustesDelDirector, arranqueLimpio, fuentesDelDirector, SIN_CONECTORES } from './ajustesClaude';
import { conservarTodo } from './ajustesPropios';
import { admiteAutomatico, ajustesDelGancho, GANCHOS_PROPIOS, modosDeLaAyuda, nombreDelModoQuePregunta, permisosDelModo, POR_QUE_SIN_AUTOMATICO, puertoDelStudio, rutaDelGancho, sinGanchosPropios, TOPE_GANCHO_S, urlDelGancho, type EntradaDePermisos } from './modoPermisos';
import { ESPERA_PERMISO_MS } from './permisoAlMomento';

// Cómo pide permisos el director lanzado (pr_permisos_al_momento, pieza 3; pd_permiso_espera): sin elegir nada, el lanzamiento
// es el de siempre; con «Me pregunta en el Studio», el modo que pregunta y el gancho del Studio, sin los hooks de la persona
const HOME = '/home/ana';
const GANCHO = 'C:\\xampp\\STL\\tools\\director\\ganchoPermiso.ts';
const base: EntradaDePermisos = { ultracode: false, permitidoUltracode: false, home: HOME, propios: true, conservados: {}, archivo: 'ajustes-del-director.json', gancho: GANCHO, modoQuePregunta: 'manual' };

// La ayuda real de Claude Code (la instalada el 26 de octubre de 2026), solo en lo que importa aquí
const AYUDA = `Usage: claude [options] [command] [prompt]

Options:
  --output-format <format>              Output format (only works with --print):
                                        "text" (default), "json" (single
                                        result), or "stream-json" (realtime
                                        streaming) (choices: "text", "json",
                                        "stream-json")
  --permission-mode <mode>              Permission mode to use for the session
                                        (choices: "acceptEdits", "auto",
                                        "bypassPermissions", "manual",
                                        "dontAsk", "plan")
  --permission-prompts <target>         Who answers permission prompts with
                                        --print: "host" (the SDK host or
                                        --permission-prompt-tool) or "none"
                                        (nobody: anything that would prompt is
                                        denied automatically; the permission
                                        mode still decides everything else)
                                        (choices: "host", "none", default:
                                        "host")
`;

describe('sin elegir nada, el director se lanza como siempre (solo lo autorizado)', () => {
  it('el modo es opcional: solo «autorizado», «pregunta» y «automatico» valen', () => {
    expect(esModoPermisos('autorizado')).toBe(true);
    expect(esModoPermisos('pregunta')).toBe(true);
    expect(esModoPermisos('automatico')).toBe(true);
    expect(esModoPermisos('auto')).toBe(false);
    expect(esModoPermisos(undefined)).toBe(false);
  });

  it('los argumentos y el archivo de ajustes son byte por byte los de antes, con tus ajustes cargados o no, con ultracode o sin él', () => {
    for (const propios of [true, false])
      for (const ultracode of [true, false])
        for (const permitidoUltracode of [true, false]) {
          const conservados = propios ? {} : { env: { HTTPS_PROXY: 'http://proxy' }, model: 'opus' };
          const antes = ajustesDelDirector(ultracode, permitidoUltracode, HOME, propios);
          const p = permisosDelModo('autorizado', { ...base, ultracode, permitidoUltracode, propios, conservados });
          // Lo que escribía el lanzador: JSON.stringify({ ...conservados, ...director.ajustes }) y, en los argumentos,
          // '--settings', ajustes, ...fuentesDelDirector(propios), '--permission-mode', 'dontAsk'
          expect(p.ajustes).toBe(JSON.stringify({ ...conservados, ...antes.ajustes }));
          expect(p.argumentos).toEqual(['--settings', 'ajustes-del-director.json', ...fuentesDelDirector(propios), '--permission-mode', 'dontAsk']);
          expect(p.flujos).toBe(antes.flujos);
          expect(p.pregunta).toBe(false);
        }
  });

  it('con todo cargado y sin ultracode, el archivo y los argumentos son estos, tal cual (no dependen de las funciones que los arman)', () => {
    const p = permisosDelModo('autorizado', base);
    expect(p.ajustes).toBe('{"disableClaudeAiConnectors":true,"claudeMdExcludes":["/home/ana/.claude/CLAUDE.md","/home/ana/.claude/rules/**"],"disableAllHooks":true,"autoMemoryEnabled":false,"includeGitInstructions":false,"ultracode":false}');
    expect(p.argumentos).toEqual(['--settings', 'ajustes-del-director.json', '--permission-mode', 'dontAsk']);
    // Sin tus ajustes de usuario, las fuentes se acotan, como siempre
    expect(permisosDelModo('autorizado', { ...base, propios: false }).argumentos).toEqual(['--settings', 'ajustes-del-director.json', '--setting-sources', 'project,local', '--permission-mode', 'dontAsk']);
  });

  it('el lanzador no cambia sin la clave: la lee del archivo local y sin ella es «autorizado»', () => {
    const revisor = readFileSync(new URL('./revisor.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(revisor).toContain("const modoElegido = elegido.modoPermisos ?? 'autorizado';");
    expect(revisor).toContain("const modoPermisos = sinAutomatico ? 'autorizado' : modoElegido;");
    expect(revisor).toContain('permisosDelModo(modoPermisos, {');
  });
});

describe('«Automático, vigilado» (pd_permiso_automatico): Claude Code decide solo, y el Studio lo deja a la vista', () => {
  it('es «autorizado» byte por byte, salvo el modo, que es `auto`, y no pregunta', () => {
    for (const propios of [true, false]) {
      const conservados = propios ? {} : { model: 'opus' };
      const a = permisosDelModo('autorizado', { ...base, propios, conservados });
      const p = permisosDelModo('automatico', { ...base, propios, conservados });
      expect(p.ajustes).toBe(a.ajustes);
      expect(p.argumentos).toEqual([...a.argumentos.slice(0, -1), 'auto']);
      expect(p.pregunta).toBe(false);
      expect(p.automatico).toBe(true);
      expect(a.automatico).toBe(false);
    }
    expect(permisosDelModo('pregunta', base).automatico).toBe(false);
  });

  it('se ofrece solo si la ayuda de Claude Code lista `auto`; si no, dice qué le falta', () => {
    expect(admiteAutomatico(modosDeLaAyuda(AYUDA))).toBe(true);
    expect(admiteAutomatico(['acceptEdits', 'default', 'dontAsk'])).toBe(false);
    expect(POR_QUE_SIN_AUTOMATICO).toContain('claude update');
  });

  it('el lanzador vuelve a lo autorizado si el Claude Code de hoy no lo trae, deja en el registro lo que ya tenía y, al terminar, lleva lo aprobado al panel', () => {
    const revisor = readFileSync(new URL('./revisor.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const lanzar = revisor.slice(revisor.indexOf('  private async lanzar('), revisor.indexOf('\n  }\n', revisor.indexOf('  private async lanzar(')));
    expect(lanzar).toContain("const sinAutomatico = modoElegido === 'automatico' && !admiteAutomatico(await modosDeClaude(programa));");
    expect(lanzar).toContain('if (yaPermitido) writeSync(registro, lineaAutomatico(yaPermitido));');
    // La línea va antes de lanzar a Claude Code, y lo aprobado se lee después de cerrar el registro
    expect(lanzar.indexOf('lineaAutomatico(yaPermitido)')).toBeLessThan(lanzar.indexOf('p = lanzarClaude('));
    expect(lanzar.indexOf('aprobadosSolos(readFileSync(archivo')).toBeGreaterThan(lanzar.indexOf('closeSync(registro);'));
    expect(lanzar).toContain('conLoAprobado(antes, aprobados, proyecto,');
    // En vivo, lo que lee «Lo que va haciendo el director» pasa por el estado del modo automático
    expect(revisor).toContain('progresoDe(nuevo, Infinity, leido.auto)');
  });

  it('el servidor solo lo guarda si se puede usar, y la vista lo muestra apagado con su razón', () => {
    const servidor = readFileSync(new URL('./director.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const ruta = servidor.slice(servidor.indexOf("ruta === '/modo-permisos'"));
    expect(ruta.slice(0, 1200)).toContain("if (cuerpo.modo === 'automatico' && !(await automaticoDisponible())) return responder(res, 400, { error: POR_QUE_SIN_AUTOMATICO });");
    const vista = readFileSync(join(__dirname, '..', 'src', 'director.ts'), 'utf-8').replace(/\r\n/g, '\n');
    const seccion = vista.slice(vista.indexOf('function seccionPermisos()'), vista.indexOf('\n}\n', vista.indexOf('function seccionPermisos()')));
    expect(seccion).toContain("const sinAutomatico = d.automatico?.admite === false;");
    expect(seccion).toContain('«Automático, vigilado» está apagado:');
    // Si ya estaba elegido y deja de estar, dice que el director vuelve a lo autorizado, como hace el lanzador
    expect(seccion).toContain('Mientras tanto, el director trabaja con «Solo lo autorizado».');
    // La página no espera a la ayuda de Claude Code: usa lo último que se supo
    expect(servidor).toContain('automatico: automaticoSabido() === false ? { admite: false, porque: POR_QUE_SIN_AUTOMATICO } : { admite: true },');
    expect(vista).toContain("a.origen === 'claude' ? `<b>Lo aprobó Claude Code</b>");
  });
});

describe('«Me pregunta en el Studio»: el modo que pregunta y el gancho del Studio', () => {
  const pregunta = (cambio: Partial<EntradaDePermisos> = {}) => permisosDelModo('pregunta', { ...base, ...cambio });
  const ajustes = (cambio: Partial<EntradaDePermisos> = {}) => JSON.parse(pregunta(cambio).ajustes);

  it('lanza en el modo que pregunta y con las fuentes acotadas, siempre, también si cargabas todos tus ajustes', () => {
    for (const propios of [true, false]) {
      const a = pregunta({ propios, modoQuePregunta: 'manual' }).argumentos;
      expect(a).toEqual(['--settings', 'ajustes-del-director.json', '--setting-sources', 'project,local', '--permission-mode', 'manual']);
    }
    expect(pregunta({ modoQuePregunta: 'default' }).argumentos.at(-1)).toBe('default');
    expect(pregunta().pregunta).toBe(true);
  });

  it('el gancho PermissionRequest es el que midió la prueba real, y disableAllHooks queda en falso para que corra', () => {
    const a = ajustes();
    expect(a.disableAllHooks).toBe(false);
    expect(a.hooks).toEqual({ PermissionRequest: [{ matcher: '*', hooks: [{ type: 'command', command: 'node "C:/xampp/STL/tools/director/ganchoPermiso.ts"', timeout: 150 }] }] });
    // Más que los dos minutos que espera el Studio, para que niegue el Studio y no el reloj de Claude Code
    expect(TOPE_GANCHO_S).toBe(150);
    expect(TOPE_GANCHO_S).toBeGreaterThan(ESPERA_PERMISO_MS / 1000);
    expect(ajustesDelGancho('/a/b.ts').hooks.PermissionRequest[0].hooks[0].command).toBe('node "/a/b.ts"');
  });

  it('el resto del arranque limpio sigue: sin tu CLAUDE.md global, sin memoria automática, sin la foto de git y sin conectores', () => {
    const a = ajustes();
    const limpio = arranqueLimpio(HOME);
    expect(a).toMatchObject({ ...SIN_CONECTORES, claudeMdExcludes: limpio.claudeMdExcludes, autoMemoryEnabled: false, includeGitInstructions: false, ultracode: false });
  });

  it('tus hooks no corren junto al del Studio: ni los de tus ajustes, ni el que los apaga, ni tu línea de estado', () => {
    const tuyos = { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'sincronizar-cuentas' }] }] }, disableAllHooks: true, statusLine: { type: 'command', command: 'mi-linea' }, env: { HTTPS_PROXY: 'http://proxy' } };
    for (const propios of [true, false]) {
      const a = ajustes({ propios, conservados: tuyos });
      // Solo el gancho del Studio, y lo demás de lo tuyo sigue
      expect(Object.keys(a.hooks)).toEqual(['PermissionRequest']);
      expect(JSON.stringify(a)).not.toContain('sincronizar-cuentas');
      expect(a.disableAllHooks).toBe(false);
      expect(a.statusLine).toBeUndefined();
      expect(a.env).toEqual({ HTTPS_PROXY: 'http://proxy' });
    }
    expect(sinGanchosPropios(tuyos)).toEqual({ env: tuyos.env });
    expect([...GANCHOS_PROPIOS]).toEqual(['hooks', 'disableAllHooks', 'statusLine']);
  });

  it('lo del Studio manda sobre lo tuyo, y ultracode va explícito porque ya no llega de tus ajustes', () => {
    expect(ajustes({ conservados: { ultracode: true, includeGitInstructions: true } })).toMatchObject({ ultracode: false, includeGitInstructions: false });
    const con = pregunta({ ultracode: true, permitidoUltracode: true });
    expect(JSON.parse(con.ajustes).ultracode).toBe(true);
    expect(con.flujos).toBe(true);
    expect(pregunta({ ultracode: true, permitidoUltracode: false }).flujos).toBe(false);
  });

  it('si cargabas todos tus ajustes, se llevan todos menos lo que le daría un permiso (conservarTodo)', () => {
    const tus = { env: { HTTPS_PROXY: 'http://proxy' }, apiKeyHelper: 'mi-clave', permissions: { allow: ['Bash(rm:*)'], deny: ['Read(.env)'] }, hooks: { Stop: [] } };
    const llevados = conservarTodo(tus);
    expect(llevados).toEqual({ env: { HTTPS_PROXY: 'http://proxy' }, apiKeyHelper: 'mi-clave', permissions: { deny: ['Read(.env)'] }, hooks: { Stop: [] } });
    const a = ajustes({ conservados: llevados });
    expect(a.permissions).toEqual({ deny: ['Read(.env)'] });
    expect(a.apiKeyHelper).toBe('mi-clave');
    expect(Object.keys(a.hooks)).toEqual(['PermissionRequest']);
  });
});

describe('a dónde pregunta el gancho', () => {
  it('la dirección lleva la clave de la revisión, en la ruta que atiende el servidor', () => {
    const url = urlDelGancho(5180, 'a b/c');
    expect(url).toBe('http://localhost:5180/__estudio/director/permiso-al-momento/pedir?clave=a%20b%2Fc');
    const servidor = readFileSync(new URL('./director.ts', import.meta.url), 'utf8');
    expect(servidor).toContain("ruta === '/permiso-al-momento/pedir'");
    expect(servidor).toContain("url.searchParams.get('clave')");
    expect(servidor).toContain("server.middlewares.use('/__estudio/director'");
  });

  it('el puerto es el que anotó el candado del servidor, o PORT, o el 5180', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'stl-puerto-'));
    try {
      expect(puertoDelStudio(raiz, {})).toBe(5180);
      expect(puertoDelStudio(raiz, { PORT: '5300' })).toBe(5300);
      mkdirSync(join(raiz, '.estudio'));
      writeFileSync(join(raiz, '.estudio', 'servidor.json'), JSON.stringify({ pid: process.pid, puerto: 5181, desde: new Date().toISOString() }));
      expect(puertoDelStudio(raiz, { PORT: '5300' })).toBe(5181);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('el gancho está donde dice la ruta, y lee su dirección de STL_PERMISO_URL', () => {
    const raiz = resolve(__dirname, '..', '..');
    expect(rutaDelGancho(raiz)).toBe(resolve(raiz, 'tools', 'director', 'ganchoPermiso.ts'));
    expect(existsSync(rutaDelGancho(raiz))).toBe(true);
    expect(readFileSync(rutaDelGancho(raiz), 'utf8')).toContain('process.env.STL_PERMISO_URL');
  });
});

describe('el nombre del modo que pregunta, el que acepta el Claude Code instalado', () => {
  it('se lee de su ayuda: la instalada el 26 de octubre de 2026 lista «manual» y ya no «default»', () => {
    expect(modosDeLaAyuda(AYUDA)).toEqual(['acceptEdits', 'auto', 'bypassPermissions', 'manual', 'dontAsk', 'plan']);
    expect(nombreDelModoQuePregunta(modosDeLaAyuda(AYUDA))).toBe('manual');
  });

  it('con una versión que lista «default» (la de la prueba real, 2.1.310), «default»; sin ayuda que leer, también', () => {
    const vieja = AYUDA.replace('"manual"', '"default"');
    expect(modosDeLaAyuda(vieja)).toContain('default');
    expect(nombreDelModoQuePregunta(modosDeLaAyuda(vieja))).toBe('default');
    expect(nombreDelModoQuePregunta([])).toBe('default');
    expect(modosDeLaAyuda('')).toEqual([]);
    expect(modosDeLaAyuda('--permission-mode <mode>   sin opciones')).toEqual([]);
  });

  it('no confunde las opciones de otra línea de la ayuda con las del modo', () => {
    const otra = AYUDA.replace('(choices: "host", "none"', '(choices: "manual", "none"').replace(/"manual",\s*"dontAsk"/, '"dontAsk"');
    expect(modosDeLaAyuda(otra)).toEqual(['acceptEdits', 'auto', 'bypassPermissions', 'dontAsk', 'plan']);
  });
});

describe('el lanzador abre la pregunta antes de lanzar y la cierra al terminar, de la forma que sea', () => {
  const revisor = readFileSync(new URL('./revisor.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const lanzar = revisor.slice(revisor.indexOf('private async lanzar('), revisor.indexOf('function anotarHijo('));

  it('abre la revisión con su clave justo antes de lanzar, con lo que se le niega siempre, y le pasa la dirección por el entorno', () => {
    // Con lo que se le da (lo mismo de --allowedTools): de una cadena de órdenes, lo que ya tiene no se pregunta
    const abre = lanzar.indexOf('permisosEnEspera.abrir(clavePermiso, proyecto, prohibidas, homedir(), permitidas)');
    expect(abre).toBeGreaterThan(0);
    expect(lanzar).toContain("'--allowedTools', ...permitidas]");
    expect(lanzar.indexOf('const clavePermiso = permisos.pregunta ? randomUUID() : null;')).toBeGreaterThan(0);
    expect(lanzar).toContain('{ STL_PERMISO_URL: urlDelGancho(puertoDelStudio(this.raiz), clavePermiso) }');
    expect(lanzar.indexOf('lanzarClaude(programa, args,')).toBeGreaterThan(abre);
    // Lo que nunca se le niega sigue en --disallowedTools: las reglas que niegan ganan antes de cualquier pregunta
    expect(lanzar).toContain("'--disallowedTools', ...prohibidas");
  });

  it('la cierra en fin, por donde pasan el cierre normal, el límite, la detención tras el cierre y el error, antes de cerrar el registro', () => {
    const fin = lanzar.slice(lanzar.indexOf('const fin = async'));
    const cierra = fin.indexOf('permisosEnEspera.cerrar(clavePermiso)');
    expect(cierra).toBeGreaterThan(0);
    expect(fin.indexOf('closeSync(registro)')).toBeGreaterThan(cierra);
    expect(fin).toContain('lineasDeNegadosSinDecidir(');
    // Los tres caminos terminan en fin: el error de lanzar, la salida del proceso, y fin no corre dos veces
    expect(fin).toContain("p.on('error', (e) => void fin(");
    expect(fin).toContain("p.on('exit', (codigo) => void fin(");
    expect(fin).toContain('if (cerrado) return;');
    // Lanzar puede fallar antes de que exista el proceso: la clave tampoco queda abierta
    expect(lanzar).toMatch(/catch \(e\) \{\s*if \(clavePermiso\) permisosEnEspera\.cerrar\(clavePermiso\);\s*throw e;/);
  });

  it('sirve igual a la revisión, a la urgencia y a la aclaración: no distingue por aparte', () => {
    // Una sola ruta para las tres: lo que decide el modo y su clave no mira de qué clase es el lanzamiento
    const decide = lanzar.split('\n').filter((l) => /modoPermisos|clavePermiso|permisosDelModo/.test(l)).join('\n');
    expect(decide).not.toContain('aparte');
    expect(lanzar).toContain('private async lanzar(proyecto: string, programa: string, repositorio: string, aparte?: Aparte)');
  });

  it('el gancho de permisos puede responder siempre desde un diálogo del navegador, y solo desde ahí', () => {
    const servidor = readFileSync(new URL('./director.ts', import.meta.url), 'utf8');
    const responde = servidor.slice(servidor.indexOf("ruta === '/permiso-al-momento' && req.method === 'POST'"));
    expect(responde.slice(0, 700)).toContain("req.headers['sec-fetch-site'] !== 'same-origin'");
  });
});

describe('la elección en «Modelo y consumo» › «Cómo pide permisos el director»', () => {
  it('se guarda en estudio.local.json con el candado de cambiarLocal: sin la clave es «autorizado», y no toca lo demás', async () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'stl-modo-'));
    try {
      writeFileSync(join(carpeta, 'estudio.local.json'), JSON.stringify({ activo: 'x', repositorios: {}, esfuerzoMaximo: true, ajustesPropios: false }));
      expect((await leerLocal(carpeta)).modoPermisos).toBeUndefined();
      await guardarModoPermisos(carpeta, 'pregunta');
      expect(await leerLocal(carpeta)).toMatchObject({ activo: 'x', esfuerzoMaximo: true, ajustesPropios: false, modoPermisos: 'pregunta' });
      // Volver a «autorizado» quita la clave: el archivo queda como estaba antes de elegir
      await guardarModoPermisos(carpeta, 'autorizado');
      const despues = await leerLocal(carpeta);
      expect(despues.modoPermisos).toBeUndefined();
      expect(JSON.parse(readFileSync(join(carpeta, 'estudio.local.json'), 'utf8'))).not.toHaveProperty('modoPermisos');
      expect(despues).toMatchObject({ activo: 'x', esfuerzoMaximo: true, ajustesPropios: false });
      // Un valor que no es de los dos modos, escrito a mano, no cuenta
      writeFileSync(join(carpeta, 'estudio.local.json'), JSON.stringify({ activo: 'x', repositorios: {}, modoPermisos: 'auto' }));
      expect((await leerLocal(carpeta)).modoPermisos).toBeUndefined();
      // El tercero se guarda como los otros
      await guardarModoPermisos(carpeta, 'automatico');
      expect((await leerLocal(carpeta)).modoPermisos).toBe('automatico');
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });

  it('el servidor la guarda por una ruta que solo acepta los dos modos, la anota en la bitácora y la manda con los datos de la página', () => {
    const servidor = readFileSync(new URL('./director.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const ruta = servidor.slice(servidor.indexOf("ruta === '/modo-permisos'"));
    expect(ruta.slice(0, 1200)).toContain('if (!esModoPermisos(cuerpo.modo)) return responder(res, 400,');
    expect(ruta.slice(0, 1200)).toContain('await guardarModoPermisos(raiz, cuerpo.modo);');
    expect(ruta.slice(0, 1200)).toContain('await anotar(raiz, { quien: await quienAqui()');
    expect(servidor).toContain("modoPermisos: (await leerLocal(raiz)).modoPermisos ?? 'autorizado',");
  });

  it('la vista ofrece los dos modos, marca el de hoy, dice que rige desde el próximo lanzamiento y guarda con un clic', () => {
    const vista = readFileSync(join(__dirname, '..', 'src', 'director.ts'), 'utf-8').replace(/\r\n/g, '\n');
    const seccion = vista.slice(vista.indexOf('function seccionPermisos()'), vista.indexOf('\n}\n', vista.indexOf('function seccionPermisos()')));
    expect(seccion).toContain("const modo: ModoPermisos = d.modoPermisos ?? 'autorizado';");
    expect(seccion).toContain('data-ancla="m-permisos"');
    expect(seccion).toContain('rige desde el próximo lanzamiento del director');
    // Lo que cambia al elegir «Me pregunta»: las dos esperas, las tres respuestas y lo de tus hooks, dicho en la pantalla
    const modos = vista.slice(vista.indexOf('const MODOS_DE_PERMISOS'), vista.indexOf('function seccionPermisos()'));
    for (const frase of ['dos minutos', '«Solo esta vez»', '«Permitir siempre»', '«No lo autorizo»', 'tus hooks y tu línea de estado', 'tus skills y comandos de usuario']) expect(modos, frase).toContain(frase);
    expect(vista).toContain("fetch('/__estudio/director/modo-permisos'");
    expect(vista).toContain('await cambiarModoPermisos(modoDe(ds.modoPermisos));');
  });
});
