// Tus ajustes de Claude Code en el director, clave por clave (notas de voz del titular nmvolgrmctit y nmvoljwl9tit, 25 de
// octubre de 2026): cada clave con su explicación y su consejo, elegida con su casilla, y nunca lo que le daría un permiso.
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { conNuevas, conservadosDeTusAjustes, conservarDe, opcionesDeAjustes, opcionesDeTusAjustes, recomendadas } from './ajustesPropios';
import { anotarAjustesVistos, guardarAjustesPropios, leerLocal } from '../../src/director/proyectos';
import { negado } from './revisor';

const AJUSTES = {
  model: 'opus',
  env: { HTTPS_PROXY: 'http://proxy:8080', DISABLE_TELEMETRY: '1', MI_CLAVE: 'secreto' },
  permissions: { allow: ['Bash(*)'], deny: ['Read(~/.ssh/**)'], additionalDirectories: ['C:/otra'] },
  hooks: { Stop: [] },
  theme: 'dark',
  algoNuevo: true,
};

describe('tus ajustes, clave por clave', () => {
  let carpeta: string;
  beforeEach(async () => {
    carpeta = await mkdtemp(join(tmpdir(), 'ajustes-propios-'));
  });
  afterEach(async () => {
    await rm(carpeta, { recursive: true, force: true });
  });

  it('cada clave dice qué es, qué cambia en el director y qué recomienda, sin ningún valor', () => {
    const o = opcionesDeAjustes(AJUSTES);
    expect(o.map((x) => x.id)).toEqual(['model', 'env.HTTPS_PROXY', 'env.DISABLE_TELEMETRY', 'env.MI_CLAVE', 'permissions.allow', 'permissions.deny', 'permissions.additionalDirectories', 'hooks', 'theme', 'algoNuevo']);
    const consejo = Object.fromEntries(o.map((x) => [x.id, x.consejo]));
    // Lo que conecta y lo que cuida la privacidad, sí; lo que el Studio ya le da, no; lo que no cambia nada, da igual
    // Lo que no se sabe explicar no se ofrece quitar a ciegas: viene marcado para conservar (nota de voz nmvon1s9itit)
    expect(consejo).toMatchObject({ 'env.HTTPS_PROXY': 'si', 'env.DISABLE_TELEMETRY': 'si', 'permissions.deny': 'si', model: 'no', 'env.MI_CLAVE': 'no', hooks: 'no', theme: 'igual', algoNuevo: 'si' });
    // Lo que le daría un permiso que el Studio no le dio no se elige (CLAUDE.md, «Quién manda»)
    expect(consejo['permissions.allow']).toBe('nunca');
    expect(consejo['permissions.additionalDirectories']).toBe('nunca');
    for (const x of o) {
      expect(x.que.length).toBeGreaterThan(10);
      expect(x.enElDirector.length).toBeGreaterThan(10);
      // Ningún valor llega a la vista
      expect(JSON.stringify(x)).not.toMatch(/proxy:8080|secreto|Bash\(\*\)|ssh|C:\/otra|dark/);
    }
    // Lo que tiene adentro, por sus nombres o cuántos son
    expect(o.find((x) => x.id === 'permissions.deny')?.dentro).toBe('una lista de 1');
    expect(o.find((x) => x.id === 'hooks')?.dentro).toBe('Stop');
    expect(recomendadas(o)).toEqual(['env.HTTPS_PROXY', 'env.DISABLE_TELEMETRY', 'permissions.deny', 'algoNuevo']);
    expect(opcionesDeAjustes('no es un objeto')).toEqual([]);
  });

  it('las claves de un usuario real, cada una explicada con su fuente y sin «no sé qué es» (nota de voz del titular nmvon1s9itit)', () => {
    // Las que el titular vio sin explicar el 25 de octubre de 2026, y las que ya estaban
    const reales = {
      env: { DISABLE_FEEDBACK_COMMAND: '1' }, model: 'x', hooks: { SessionStart: [], Stop: [] }, disableRemoteControl: true, enableArtifact: false, effortLevel: 'high',
      modelSettings: {}, tui: 'fullscreen', skipWorkflowUsageWarning: true, theme: 'x', autoUploadSessions: false, agentPushNotifEnabled: false, autoMode: { soft_deny: [], environment: [] },
    };
    const o = opcionesDeAjustes(reales);
    for (const x of o) {
      expect(x.que).not.toMatch(/no sabe explicar/);
      expect(x.sinElla?.length).toBeGreaterThan(3);
      expect(x.fuente).toMatch(/^https:\/\/(code\.claude\.com\/docs|github\.com\/anthropics\/claude-code\/issues)\//);
    }
    const de = (id: string) => o.find((x) => x.id === id)!;
    // Los hooks no deciden cuándo arranca ni cuándo termina una revisión, y el Studio los apaga en el director
    expect(de('hooks').enElDirector).toContain('una sesión empieza, trabaja y termina sola, sin ningún hook');
    expect(de('hooks').enElDirector).toContain('disableAllHooks');
    expect(de('hooks').fuente).toBe('https://code.claude.com/docs/en/hooks');
    expect(de('env.DISABLE_FEEDBACK_COMMAND').consejo).toBe('si');
    expect(de('autoMode').enElDirector).toContain('no trabaja en modo automático');
    expect(de('skipWorkflowUsageWarning').que).toContain('No está en su referencia oficial');
    expect(de('disableRemoteControl').fuente).toBe('https://code.claude.com/docs/en/settings-reference#disableremotecontrol');
    // La vista dice qué pasa sin ella y de dónde lo sabe
    const vista = readFileSync(join(__dirname, '..', 'src', 'director.ts'), 'utf-8');
    expect(vista).toContain('<b>Sin ella:</b>');
    expect(vista).toContain('De dónde lo sé ↗');
    expect(vista).toContain('Desmarcar una clave no la quita de tus sesiones ni de tu archivo');
  });

  it('el director conserva solo lo elegido que existe, con su valor, y nunca lo que le daría un permiso aunque se pida', () => {
    expect(conservarDe(AJUSTES, ['env.HTTPS_PROXY', 'permissions.deny', 'theme', 'permissions.allow', 'permissions.additionalDirectories', 'permissions', 'no.esta'])).toEqual({
      env: { HTTPS_PROXY: 'http://proxy:8080' },
      permissions: { deny: ['Read(~/.ssh/**)'] },
      theme: 'dark',
    });
    expect(conservarDe(AJUSTES, [])).toEqual({});
    expect(conservarDe(null, ['model'])).toEqual({});
  });

  it('lee tu archivo en el servidor: [] sin archivo, null si no es JSON, y lo conservado con sus valores', async () => {
    const archivo = join(carpeta, 'settings.json');
    expect(await opcionesDeTusAjustes(join(carpeta, 'no-esta.json'))).toEqual([]);
    await writeFile(archivo, '{ roto');
    expect(await opcionesDeTusAjustes(archivo)).toBeNull();
    expect(await conservadosDeTusAjustes(['model'], archivo)).toEqual({});
    await writeFile(archivo, JSON.stringify(AJUSTES));
    expect((await opcionesDeTusAjustes(archivo))?.length).toBe(10);
    expect(await conservadosDeTusAjustes(['model', 'env.MI_CLAVE'], archivo)).toEqual({ model: 'opus', env: { MI_CLAVE: 'secreto' } });
    expect(await conservadosDeTusAjustes([], archivo)).toEqual({});
  });

  it('la selección se guarda en estudio.local.json, y cargarlos todos la quita', async () => {
    await writeFile(join(carpeta, 'estudio.local.json'), JSON.stringify({ activo: 'x', repositorios: {} }));
    await guardarAjustesPropios(carpeta, false, ['env.HTTPS_PROXY', 'permissions.deny', 'env.HTTPS_PROXY']);
    expect(await leerLocal(carpeta)).toMatchObject({ ajustesPropios: false, ajustesConservados: ['env.HTTPS_PROXY', 'permissions.deny'] });
    await guardarAjustesPropios(carpeta, false);
    expect((await leerLocal(carpeta)).ajustesConservados).toBeUndefined();
    await guardarAjustesPropios(carpeta, false, ['model']);
    await guardarAjustesPropios(carpeta, true, ['model']);
    const local = await leerLocal(carpeta);
    expect(local.ajustesPropios).toBeUndefined();
    expect(local.ajustesConservados).toBeUndefined();
  });

  it('una clave que aparece después de guardar la selección no se deja fuera en silencio: va lo recomendado y se pide confirmarla (nota de voz del titular nmvoottaitit)', async () => {
    const opciones = opcionesDeAjustes(AJUSTES);
    const todas = opciones.map((o) => o.id);
    // Sin lo visto (una selección de antes), nada es nuevo y vale lo elegido
    expect(conNuevas(opciones, ['model'], undefined)).toEqual({ ids: ['model'], nuevas: [] });
    // Con todo visto, igual
    expect(conNuevas(opciones, ['model'], todas)).toEqual({ ids: ['model'], nuevas: [] });
    // Lo que no estaba al elegir es nuevo; de lo nuevo, lo que conviene conservar se suma, y lo demás no
    const sinProxyNiTema = todas.filter((id) => id !== 'env.HTTPS_PROXY' && id !== 'theme');
    const r = conNuevas(opciones, ['model'], sinProxyNiTema);
    expect(r.nuevas.sort()).toEqual(['env.HTTPS_PROXY', 'theme']);
    expect(r.ids).toEqual(['model', ...recomendadas(opciones.filter((o) => o.id === 'env.HTTPS_PROXY' || o.id === 'theme'))]);
    expect(r.ids).not.toContain('theme');
    // El lanzador las usa igual, leídas de tu archivo
    const archivo = join(carpeta, 'settings.json');
    await writeFile(archivo, JSON.stringify(AJUSTES));
    expect(await conservadosDeTusAjustes(['model'], archivo, sinProxyNiTema)).toEqual(conservarDe(AJUSTES, r.ids));
    // Al guardar, se anotan las claves de ese momento; cargarlos todos las quita, y una selección de antes las anota sin cambiarla
    await writeFile(join(carpeta, 'estudio.local.json'), JSON.stringify({ activo: 'x', repositorios: {} }));
    await guardarAjustesPropios(carpeta, false, ['model'], todas);
    expect(await leerLocal(carpeta)).toMatchObject({ ajustesConservados: ['model'], ajustesVistos: todas });
    await guardarAjustesPropios(carpeta, true);
    expect((await leerLocal(carpeta)).ajustesVistos).toBeUndefined();
    await guardarAjustesPropios(carpeta, false, ['model']);
    await anotarAjustesVistos(carpeta, ['model', 'theme']);
    expect(await leerLocal(carpeta)).toMatchObject({ ajustesConservados: ['model'], ajustesVistos: ['model', 'theme'] });
    await anotarAjustesVistos(carpeta, ['otra']);
    expect((await leerLocal(carpeta)).ajustesVistos).toEqual(['model', 'theme']);
    // «Modelo y consumo» marca cada nueva y dice qué hace el director con ellas hasta que guardes
    const vista = (await readFile(join(__dirname, '..', 'src', 'director.ts'), 'utf-8')).replace(/\r\n/g, '\n');
    expect(vista).toContain('<span class="ajuste-nueva">Nueva: confírmala</span>');
    expect(vista).toContain('el director usa lo que te recomiendo para');
    const servidor = (await readFile(join(__dirname, 'director.ts'), 'utf-8')).replace(/\r\n/g, '\n');
    expect(servidor).toContain('await guardarAjustesPropios(raiz, cuerpo.cargar, conservar, (await opcionesDeTusAjustes())?.map((o) => o.id));');
    expect(servidor).toContain("const { ids, nuevas } = conNuevas(opciones ?? [], local.ajustesConservados ?? [], cargar ? undefined : local.ajustesVistos);");
  });

  it('el lanzador suma lo conservado debajo de lo del Studio, y el director no puede leer ese archivo', async () => {
    const revisor = (await readFile(join(__dirname, 'revisor.ts'), 'utf-8')).replace(/\r\n/g, '\n');
    expect(revisor).toContain('const conservados = propios && modoPermisos !== \'pregunta\' ? {} : await (propios ? todosDeTusAjustes(this.ajustes) : conservadosDeTusAjustes(elegido.ajustesConservados ?? [], this.ajustes, elegido.ajustesVistos))');
    // Lo del Studio va después: manda sobre lo tuyo (modoPermisos.ts › permisosDelModo, que arma el archivo), y el núcleo
    // explícito solo le suma lo que no carga solo (ajustesClaude.ts › conNucleoExplicito)
    expect(revisor).toContain('writeFileSync(ajustes, conNucleoExplicito(permisos.ajustes, this.raiz));');
    const modo = (await readFile(join(__dirname, 'modoPermisos.ts'), 'utf-8')).replace(/\r\n/g, '\n');
    expect(modo).toContain('ajustes: JSON.stringify({ ...e.conservados, ...director.ajustes }),');
    expect(negado(String.raw`C:\repos\golf`, String.raw`C:\xampp\STL`)).toContain('Read(//c/xampp/STL/.revisiones/ajustes-del-director.json)');
    // En «Modelo y consumo», una casilla por clave, el consejo a la vista y la selección que se guarda
    const vista = (await readFile(join(__dirname, '..', 'src', 'director.ts'), 'utf-8')).replace(/\r\n/g, '\n');
    const seccion = vista.slice(vista.indexOf('function seccionAjustesPropios()'), vista.indexOf('\n}\n', vista.indexOf('function seccionAjustesPropios()')));
    expect(seccion).toContain('data-ajuste="${esc(o.id)}"');
    expect(seccion).toContain('<b>Qué es:</b>');
    expect(seccion).toContain('<b>En el director:</b>');
    expect(seccion).toContain('data-guardar-ajustes');
    expect(seccion).toContain("o.consejo === 'nunca' ? icono('candado')");
  });
});
