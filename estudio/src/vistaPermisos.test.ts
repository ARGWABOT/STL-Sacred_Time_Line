// El panel de permisos, más corto (pedido pd_permisos_compacto, nota nmwcu33dctit, y sus decisiones): un solo modo de
// permisos, sin selector (documento «One permission mode»), cada línea con «Guardado» o «No se guardó», lo autorizado como
// registro, lo más nuevo primero (nmwp8xchutit), y «Filtrar» con «Nada coincide» y «Limpiar».
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ponerIdioma } from './textos';
import { en } from './textos/en';
import { es } from './textos/es';
import { altoMinimoDelPanel, coincideFiltro, mantenerEnSuSitio, queDa, seccionPermisos, seccionSkills, skillsQueNoQuedaron, type DatosPermisos, type SkillEnElPanel } from './vistaPermisos';

describe('las skills, solo las del proyecto activo, y su casilla como quedó guardada (nmwmeetn2tit, pd_skills_por_proyecto)', () => {
  const skill = (proyecto: string, nombre: string, estado: SkillEnElPanel['estado'] = 'nueva'): SkillEnElPanel => ({ proyecto, nombre, ruta: `.claude/commands/${nombre}.md`, huella: 'h', estado, hallazgos: [], ...(estado === 'autorizada' ? { cuando: '2026-11-18T10:00:00.000Z', quien: 'leonc' } : {}) });
  const nombres: Record<string, string> = { app: 'app', stl: 'STL Studio' };
  const base = { marcadas: new Set<string>(), nombre: (id?: string) => nombres[id ?? ''] ?? '' };

  it('lista solo las del proyecto activo: en STL Studio no salen las de «app»', () => {
    const panel = { skills: [skill('app', 'add-field'), skill('app', 'audit'), skill('otro', 'deploy')] };
    const enApp = seccionSkills({ ...base, panel, activo: 'app' });
    expect(enApp).toContain('data-skill-marca="app .claude/commands/add-field.md"');
    expect(enApp).toContain('data-skill-marca="app .claude/commands/audit.md"');
    expect(enApp).not.toContain('deploy');
    ponerIdioma('en');
    const enStl = seccionSkills({ ...base, panel, activo: 'stl' });
    expect(enStl).not.toContain('data-skill-marca');
    expect(enStl).toContain('This project has no skills of its own');
    ponerIdioma('es');
  });

  it('una skill guardada vuelve marcada, en el mismo sitio de la lista, con «Guardado» y «Quitar»', () => {
    const antes = seccionSkills({ ...base, panel: { skills: [skill('app', 'add-field'), skill('app', 'audit')] }, activo: 'app' });
    expect(antes).not.toMatch(/data-skill-marca="app \.claude\/commands\/add-field\.md" checked/);
    // Lo que devuelve el servidor tras guardarla: autorizada
    const despues = seccionSkills({ ...base, panel: { skills: [skill('app', 'add-field', 'autorizada'), skill('app', 'audit')] }, activo: 'app', estados: new Map([['app .claude/commands/add-field.md', 'guardado' as const]]) });
    expect(despues).toMatch(/data-skill-marca="app \.claude\/commands\/add-field\.md" checked disabled/);
    expect(despues).toContain('guardado-casilla');
    expect(despues).toContain('data-quitar-skill=');
    // Sigue primera, donde estaba: no se va a otra lista
    expect(despues.indexOf('add-field')).toBeLessThan(despues.indexOf('audit'));
    expect(despues.match(/<ul class="ajustes-d">/g)).toHaveLength(1);
  });

  it('«Guardado» solo si la respuesta la trae autorizada: un servidor con el código de antes no engaña (nmwmniitjtit)', () => {
    const pedido = { autorizar: [{ proyecto: 'app', ruta: '.claude/commands/add-field.md' }] };
    // Lo que respondía el servidor que todavía corría el código de antes: 200, con la skill «nueva»
    expect(skillsQueNoQuedaron(pedido, [skill('app', 'add-field'), skill('app', 'audit')])).toEqual(['app .claude/commands/add-field.md']);
    expect(skillsQueNoQuedaron(pedido, [skill('app', 'add-field', 'autorizada')])).toEqual([]);
    // Quitarla: sigue autorizada es que no quedó
    const quitar = { quitar: [{ proyecto: 'app', ruta: '.claude/commands/add-field.md' }] };
    expect(skillsQueNoQuedaron(quitar, [skill('app', 'add-field', 'autorizada')])).toHaveLength(1);
    expect(skillsQueNoQuedaron(quitar, [skill('app', 'add-field')])).toEqual([]);
  });
});

describe('«Filtrar» se queda en su sitio mientras la lista cambia de alto (nmwmehf6ntit, pd_filtro_fijo)', () => {
  it('el scroll compensa lo que se movió el campo, y el panel no se encoge mientras se filtra', () => {
    const scroller = { scrollTop: 800 };
    // Una sección de arriba se plegó: el campo subió 240 px en la pantalla; el scroll lo devuelve a su sitio
    mantenerEnSuSitio(300, 60, scroller);
    expect(scroller.scrollTop).toBe(560);
    mantenerEnSuSitio(60, 60, scroller);
    expect(scroller.scrollTop).toBe(560);
    mantenerEnSuSitio(null, 60, scroller);
    expect(scroller.scrollTop).toBe(560);
    expect(altoMinimoDelPanel('git', 1200)).toBe('1200px');
    expect(altoMinimoDelPanel('git p', 400, '1200px')).toBe('1200px');
    expect(altoMinimoDelPanel('', 400, '1200px')).toBe('');
  });
});

const datos = (x: Partial<DatosPermisos> = {}, filtro = '', estados = new Map<string, 'guardado' | 'fallo'>()): DatosPermisos => ({
  autorizados: {
    panel: {
      autorizados: [
        { regla: 'Bash(viejo:*)', alcance: 'todos', cuando: '2026-11-01T10:00:00.000Z', quien: 'ana' },
        { regla: 'Bash(nuevo:*)', alcance: 'todos', cuando: '2026-11-16T10:00:00.000Z', quien: 'ana' },
        { regla: 'Bash(claude:*)', alcance: 'proyecto', proyecto: 'p', cuando: '2026-11-10T10:00:00.000Z', quien: 'x', origen: 'claude' },
        { regla: 'Bash(git push:*)', alcance: 'proyecto', proyecto: 'p', cuando: '2026-11-12T10:00:00.000Z', quien: 'ana', revision: '2026-11-12T09:58:00.000Z' },
      ],
    },
    nombre: () => 'golf', estados, filtro,
  },
  skills: { panel: { skills: [] }, marcadas: new Set(), nombre: () => 'golf', estados, filtro },
  ...x,
});

describe('el panel de permisos, como registro (nmwp8xchutit)', () => {
  it('un solo modo, dicho en una línea, con «Probar el diálogo», y nada que marcar por adelantado', () => {
    ponerIdioma('en');
    const html = seccionPermisos(datos());
    expect(html).toContain('<p class="modo-permisos">');
    expect(html).toContain(en['modelo.unModo']);
    expect(html).not.toContain('data-modo-permisos');
    expect(html).toContain('data-probar-permiso="1"');
    expect(html).toContain('Try the dialog');
    expect(html).toContain('<h4>What you granted</h4>');
    expect(html).toContain('There is nothing to mark in advance here');
    // Ni casillas fijas, ni lo negado con casillas, ni selector de alcance, ni bloque de detalle
    for (const viejo of ['data-permiso-grupo', 'data-permiso-negado', 'data-alcance-grupo', 'data-alcance-permiso', 'data-permisos-detallados', 'What the director was denied']) expect(html, viejo).not.toContain(viejo);
    ponerIdioma('es');
    const enEs = seccionPermisos(datos());
    expect(enEs).toContain(es['modelo.unModo']);
    expect(enEs).toContain('<h4>Lo que autorizaste</h4>');
    expect(enEs).toContain('Revocar');
  });

  it('una línea por permiso, lo más nuevo primero, con lo que permite en palabras, dónde, cuándo y de qué revisión', () => {
    ponerIdioma('en');
    const html = seccionPermisos(datos());
    const orden = [...html.matchAll(/<code>Bash\((nuevo|claude|viejo|git push):\*\)<\/code>/g)].map((m) => m[1]);
    expect(orden).toEqual(['nuevo', 'git push', 'claude', 'viejo']);
    expect(html.match(/<li class="ajuste-d"/g)).toHaveLength(4);
    // Para todos o para el proyecto, nombrado
    expect(html).toContain('All projects on this computer');
    expect(html).toContain('Only “golf”');
    // De una revisión: la hora de la pregunta; si no, quién lo autorizó o que lo aprobó Claude
    expect(html).toMatch(/during a review \(the question of [^)]+\)\.[^]*?<code>Bash\(git push:\*\)<\/code>/);
    expect(html).toContain('Authorized by ana on');
    expect(html).toContain('Approved by Claude Code');
    // Cada una con «Revocar», con el mismo pedido de siempre
    expect(html.match(/data-quitar-permiso=/g)).toHaveLength(4);
    expect(html).toContain('data-quitar-permiso="{&quot;regla&quot;:&quot;Bash(git push:*)&quot;,&quot;alcance&quot;:&quot;proyecto&quot;,&quot;proyecto&quot;:&quot;p&quot;}"');
    expect(html).toContain('>Revoke</button>');
  });

  it('lo que cada regla permite, en palabras: una orden, leer o editar una carpeta, la herramienta entera', () => {
    ponerIdioma('en');
    expect(queDa('Bash(git push:*)')).toBe('Run “git push” commands');
    expect(queDa('Bash(npm test)')).toBe('Run “npm test” commands');
    expect(queDa('Read(//c/x/**)')).toBe('Read the folder “//c/x”');
    expect(queDa('Edit(//c/x/**)')).toBe('Edit in the folder “//c/x”');
    expect(queDa('Read(//c/x/a.ts)')).toBe('Read the file “//c/x/a.ts”');
    expect(queDa('WebFetch')).toBe('The whole WebFetch tool');
    expect(queDa('WebFetch(domain:example.com)')).toBe('Use the WebFetch tool with “domain:example.com”');
    expect(queDa('algo raro (')).toBe('The algo raro ( permission');
    ponerIdioma('es');
    expect(queDa('Bash(git push:*)')).toBe('Ejecutar órdenes «git push»');
    expect(queDa('Read(//c/x/**)')).toBe('Leer la carpeta «//c/x»');
    expect(queDa('Edit(//c/x/**)')).toBe('Editar en la carpeta «//c/x»');
    expect(queDa('WebFetch')).toBe('Toda la herramienta WebFetch');
  });

  it('sin nada autorizado, lo dice; buscando y con error, también', () => {
    ponerIdioma('en');
    const sin = seccionPermisos(datos({ autorizados: { ...datos().autorizados, panel: { autorizados: [] } } }));
    expect(sin).toContain('You have not granted anything with “Always” yet.');
    expect(sin).not.toContain('data-filtro-permisos');
    expect(seccionPermisos(datos({ autorizados: { ...datos().autorizados, panel: null } }))).toContain('Looking for what you granted');
    expect(seccionPermisos(datos({ autorizados: { ...datos().autorizados, panel: { autorizados: [], error: 'x' } } }))).toContain('I could not read what you granted (x)');
    ponerIdioma('es');
  });

  it('«Guardado» o «No se guardó» junto a la línea (nmwdib735tit, nmwjog1k5tit), y el CSS de lo que ya no existe se fue', () => {
    ponerIdioma('en');
    const html = seccionPermisos(datos({}, '', new Map([['Bash(nuevo:*)', 'guardado'], ['Bash(viejo:*)', 'fallo']])));
    expect(html).toContain('<span class="guardado-casilla" role="status">Saved</span>');
    expect(html).toContain('<span class="guardado-casilla fallo" role="alert">Not saved: try again</span>');
    const css = readFileSync(new URL('./director.css', import.meta.url), 'utf8');
    expect(css).toContain('animation: guardado-se-va 2s forwards;');
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(app).toContain("if (estado === 'guardado') setTimeout(");
    for (const viejo of ['autorizados-col', 'permisos-detallados', 'herramientas-d']) expect(css, viejo).not.toContain(viejo);
    ponerIdioma('es');
  });

  it('«Filtrar» busca en la regla, en lo que permite y en dónde vale; sin nada, «Nada coincide» con «Limpiar» (nmwjk3ttwtit, nmwjl7xnrtit)', () => {
    ponerIdioma('en');
    expect(coincideFiltro('PUBLICAR', 'Publicar')).toBe(true);
    expect(coincideFiltro('publico', 'Ya se publicó')).toBe(true);
    expect(coincideFiltro('', 'x')).toBe(true);
    const nuevo = seccionPermisos(datos({}, 'nuevo'));
    expect(nuevo).toContain('value="nuevo"');
    expect(nuevo).toMatch(/<li class="ajuste-d" data-filtrable><span class="casilla-d"><span class="permiso-d">Run “nuevo” commands/);
    expect(nuevo).toMatch(/<li class="ajuste-d" data-filtrable hidden><span class="casilla-d"><span class="permiso-d">Run “viejo” commands/);
    // Nada coincide
    const nada = seccionPermisos(datos({}, 'zzz'));
    expect(nada).toContain('Nothing matches “zzz”. <button type="button" class="enlace" data-limpiar-filtro-permisos>Clear</button>');
    expect(nada).toContain('class="ajustes-d registro-d" hidden');
    expect(seccionPermisos(datos())).not.toContain('Nothing matches');
    // Se vacía al salir de «Modelo y consumo» (nmwk5n39ntit)
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(app).toContain("if (otra && vista === 'modelo') filtroPermisos = '';");
    ponerIdioma('es');
    expect(seccionPermisos(datos({}, 'zzz'))).toContain('Nada coincide con «zzz».');
  });
});
