// La vista «Proyecto», en su módulo (propuesta aceptada pr_partir_modulos): recibe lo que pinta y la página le da lo que
// depende de ella, así que se prueba con datos hechos a mano, sin la página.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { proyectoVacio } from '../../src/director/director';
import { esOrigenRevision, ORIGENES_REVISION, type LoQueSeBorra } from '../../src/director/proyectos';
import { abrirLaMetaAlCargar, bloqueQuitar, eligiendoMeta, listaQuitar, lineaCuentaGuardada, panelSesionesGh, pestanaProyectoDeAncla, pestanasProyecto, vistaProyecto, type DatosProyecto } from './vistaProyecto';
import { momentoDeEspera } from './esperaRevision';
import { ponerIdioma } from './textos';

const datos = (x: Partial<DatosProyecto> = {}): DatosProyecto => ({
  proyecto: { ...proyectoVacio(), nombre: 'Talleres' },
  repositorio: { ruta: null, info: null, error: null },
  plan: { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: null } } as unknown as DatosProyecto['plan'],
  titular: true, nuevo: false, borrador: null,
  diagnostico: { ancla: 'p-diagnostico', titulo: 'El diagnóstico', cuerpo: '<p>diagnóstico</p>' },
  plegable: (clave) => ` data-recuerda="${clave}"`,
  ...x,
});

describe('«Guardar la cuenta» dice qué guardó (nota nmwahv8a5tit)', () => {
  const info = { ruta: 'C:/x', rama: 'main', commits: 1, archivos: 1, sinCommit: 0, ultimo: null, remoto: null } as unknown as DatosProyecto['repositorio']['info'];
  const conRepo = (x: Partial<DatosProyecto>) => datos({ repositorio: { ruta: 'C:/x', info, error: null, cuentaGit: 'laura-gh' }, ...x });
  it('si sale bien, solo el cambio (nmwjl7fuktit); si la sesión no es la guardada, lo dice bajo el campo; solo para el titular', () => {
    expect(lineaCuentaGuardada(null)).toBe('');
    expect(lineaCuentaGuardada({ estado: 'guardada', cuando: '2026-11-10T10:00:00Z', mensaje: 'Guardada: laura-gh.', bien: true })).toBe('');
    expect(lineaCuentaGuardada({ estado: 'guardada', cuando: '2026-11-10T10:00:00Z', mensaje: 'Guardada: x. Pero <b>', bien: false })).toContain('aviso remoto');
    expect(lineaCuentaGuardada({ estado: 'guardada', cuando: '2026-11-10T10:00:00Z', mensaje: 'x <b>', bien: false })).toContain('x &lt;b&gt;');
    const otra = { estado: 'guardada', cuando: '2026-11-10T10:00:00Z', mensaje: 'otra sesión', bien: false } as const;
    const html = vistaProyecto(conRepo({ cuentaGuardada: otra }));
    expect(html.indexOf('resultado-cuenta')).toBeGreaterThan(html.indexOf('id="form-cuenta-git"'));
    expect(vistaProyecto(conRepo({ titular: false, cuentaGuardada: otra }))).not.toContain('resultado-cuenta');
  });

  it('el botón «Guardar la cuenta» lleva su cargador: apagado mientras guarda, y la línea roja al lado si falla (pd_cargadores)', () => {
    const girando = vistaProyecto(conRepo({ cargadorCuenta: { fase: 'girando', guarda: true } }));
    expect(girando).toMatch(/data-cargador="cuenta-git" disabled aria-busy="true" data-cargando="girando"><span class="circulo-carga"/);
    const largo = vistaProyecto(conRepo({ cargadorCuenta: { fase: 'largo', guarda: true } }));
    expect(largo).toContain('linea-cargador');
    expect(largo).not.toContain('data-dejar-de-esperar');
    const falla = vistaProyecto(conRepo({ cargadorCuenta: { fase: 'error', guarda: true, error: 'sin red' } }));
    expect(falla).toMatch(/data-cargador="cuenta-git">[^<]+<\/button><span class="linea-cargador falla" role="alert">sin red<\/span>/);
    expect(vistaProyecto(conRepo({ titular: false, cargadorCuenta: { fase: 'error', guarda: true, error: 'sin red' } }))).not.toContain('linea-cargador');
  });
});

describe('sin pestaña de QA, una línea bajo su repositorio, una vez (pd_pestana_qa, cuarto tramo; nmwpmegh3tit, nmwpov2zetit)', () => {
  const info = { ruta: 'C:/x', rama: 'main', commits: 1, archivos: 1, sinCommit: 0, ultimo: null, remoto: null } as unknown as DatosProyecto['repositorio']['info'];
  const conRepo = (x: Partial<DatosProyecto>) => datos({ repositorio: { ruta: 'C:/x', info, error: null }, ...x });
  it('solo cuando el proyecto no tiene pestaña de QA, con las palabras aprobadas, justo bajo su carpeta', () => {
    ponerIdioma('en');
    const html = vistaProyecto(conRepo({ pestanaQa: 'no' }));
    expect(html.match(/data-sin-pestana-qa/g)).toHaveLength(1);
    expect(html).toContain('This project does not open in a browser, so it has no QA tab: its missions are checked in its own files and commands.');
    expect(html.indexOf('data-sin-pestana-qa')).toBeGreaterThan(html.indexOf('bien-repo'));
    expect(vistaProyecto(conRepo({ pestanaQa: 'si' }))).not.toContain('data-sin-pestana-qa');
    expect(vistaProyecto(conRepo({ pestanaQa: 'sin_saber' }))).not.toContain('data-sin-pestana-qa');
    expect(vistaProyecto(conRepo({}))).not.toContain('data-sin-pestana-qa');
    ponerIdioma('es');
  });
});

describe('«Quitarlo de este Studio», al final de «Dónde está» (pd_quitar_en_pantalla)', () => {
  const info = { ruta: 'C:/x', rama: 'main', commits: 1, archivos: 1, sinCommit: 0, ultimo: null, remoto: null } as unknown as DatosProyecto['repositorio']['info'];
  const conRepo = (x: Partial<DatosProyecto>) => datos({ repositorio: { ruta: 'C:/x', info, error: null }, ...x });
  const borra: LoQueSeBorra = {
    id: 'idg', repo: 'C:/x', memoria: true, rama: true, exclusion: true,
    lineas: [{ archivo: 'CLAUDE.md', lineas: ['node C:/STL/tools/director/estado.ts --proyecto idg <b>'] }],
    remota: { remoto: 'https://github.com/a/b.git', seBorra: false, orden: 'git push origin --delete stl' },
    local: ['repositorio', 'cuentaGit', 'huella'], registros: ['.revisiones/idg-2026-11-10T10-00-00-000Z.log'], lineasDelStudio: 4,
  };

  it('al final de la sección, solo para el titular, y nunca en STL Studio mismo (nmwb48vmitit)', () => {
    const html = vistaProyecto(conRepo({}));
    expect(html).toContain('data-quitar-proyecto');
    expect(html.indexOf('data-quitar-proyecto')).toBeGreaterThan(html.indexOf('id="form-repositorio"'));
    expect(vistaProyecto(conRepo({ esElStudio: true }))).not.toContain('data-quitar-proyecto');
    expect(vistaProyecto(conRepo({ titular: false }))).not.toContain('data-quitar-proyecto');
    // Sin su carpeta, también: limpia lo que quedó en este Studio (nmwaweb2vtit)
    expect(vistaProyecto(datos())).toContain('data-quitar-proyecto');
  });

  it('el segundo paso: el aviso, la lista entera de lo que se borra, «Confirmo» y «Cancelar»', () => {
    const lista = listaQuitar(borra);
    expect(lista.proyecto).toHaveLength(5);
    expect(lista.proyecto.join(' ')).toContain('&lt;b&gt;');
    expect(lista.proyecto.join(' ')).toContain('git push origin --delete stl');
    expect(lista.studio).toHaveLength(5);
    const html = bloqueQuitar({ estado: 'lista', borra });
    expect(html).toContain('role="alert"');
    expect((html.match(/<li>/g) ?? []).length).toBe(10);
    expect(html).toContain('data-quitar-confirmo');
    expect(html).toContain('data-quitar-cancelar');
    expect(html).not.toContain('data-quitar-proyecto');
    // Mientras borra, sus botones no se oprimen otra vez; un error se dice, con el botón para volver a empezar
    expect(bloqueQuitar({ estado: 'quitando', borra })).toContain('data-quitar-confirmo disabled');
    expect(bloqueQuitar({ estado: 'error', error: 'no <b>' })).toContain('no &lt;b&gt;');
    expect(bloqueQuitar({ estado: 'error', error: 'x' })).toContain('data-quitar-proyecto');
    // Sin su carpeta, solo lo de este Studio
    const sinCarpeta = bloqueQuitar({ estado: 'lista', borra: { ...borra, repo: null } });
    expect((sinCarpeta.match(/<li>/g) ?? []).length).toBe(5);
  });

  it('«Quitarlo de este Studio» no borra mientras su director trabaja o su revisión espera empezar (auditoría de la entrega, nmwcebe0otit)', () => {
    const api = readFileSync(join(__dirname, '../servidor/api.ts'), 'utf-8').replace(/\r\n/g, '\n');
    const quitar = api.slice(api.indexOf("if (ruta === '/quitar-proyecto'"), api.indexOf('const r = await quitarProyecto(raiz, quitar'));
    expect(quitar).toContain("if (!!revisor?.estado().revisandoEn.includes(quitar) || corre(revisionDe(l, quitar)) || corre(l.aclaracion) || corre(l.urgencia))");
    expect(quitar).toContain("return responder(res, 409, { error: t('servidor.api.quitarRevisando') });");
    // La guarda va antes de borrar nada
    expect(quitar.indexOf('quitarRevisando')).toBeGreaterThan(0);
  });
});

describe('tras recargar la página con el diagnóstico hecho y sin meta elegida, las dos metas vuelven a la vista (nota nmwbk689ttit)', () => {
  const candidatos = [
    { id: 'o1', texto: 'La meta corta', exito: 'Se sabe así', porQue: 'Deja algo valioso', horizonte: 'Un mes' },
    { id: 'o2', texto: 'La que mejor encaja', exito: 'Se sabe asá', porQue: 'Es lo que pediste' },
  ];
  const diagnosticado = (x: Partial<DatosProyecto> = {}) => datos({
    plan: { objetivos: candidatos, boletin: [], detectado: undefined, diagnostico: { fecha: '2026-11-11' } } as unknown as DatosProyecto['plan'],
    ...x,
  });

  it('una página recién cargada (sin pestaña elegida) abre «La meta», con las dos metas y su «Confirmar»', () => {
    // La recarga no recuerda la pestaña: antes se abría «Dónde está», la primera del arranque, y las metas no se veían
    const html = vistaProyecto(diagnosticado({ pestana: undefined }));
    expect([...html.matchAll(/data-pestana-proyecto="([^"]+)"/g)].map((m) => m[1])).toEqual(['objetivo', 'repositorio', 'contexto', 'diagnostico']);
    expect(html).toMatch(/class="pestana-stl sel" data-pestana-proyecto="objetivo" aria-selected="true"/);
    expect(html).toContain('data-meta-candidato="o1"');
    expect(html).toContain('data-meta-candidato="o2"');
    expect((html.match(/data-origen="confirmar_meta"/g) ?? []).length).toBe(2);
    expect(html).not.toContain('data-ancla="p-repositorio"');
    // Sin candidatos todavía, el orden del arranque de siempre; con la meta fijada, la meta primero
    expect(eligiendoMeta(proyectoVacio(), { objetivos: [] })).toBe(false);
    expect(eligiendoMeta(proyectoVacio(), { objetivos: candidatos } as never)).toBe(true);
    expect(pestanasProyecto(false, true)[0]).toBe('objetivo');
    expect(pestanasProyecto(false, false)[0]).toBe('repositorio');
  });

  it('al cargar, quien fija la meta va directo a ella, salvo que lea en «Documentos», la dirección pida otra vista o mire el director', () => {
    const base = { eligiendo: true, titular: true, vista: 'misiones', pedida: false, mirar: false };
    expect(abrirLaMetaAlCargar(base)).toBe(true);
    expect(abrirLaMetaAlCargar({ ...base, vista: 'proyecto' })).toBe(true);
    expect(abrirLaMetaAlCargar({ ...base, eligiendo: false })).toBe(false);
    expect(abrirLaMetaAlCargar({ ...base, titular: false })).toBe(false);
    expect(abrirLaMetaAlCargar({ ...base, vista: 'documentos' })).toBe(false);
    expect(abrirLaMetaAlCargar({ ...base, pedida: true })).toBe(false);
    expect(abrirLaMetaAlCargar({ ...base, mirar: true })).toBe(false);
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(app).toContain("abrirLaMetaAlCargar({ eligiendo: eligiendoMeta(d.proyecto, d.plan), titular: titular(), vista, pedida: false, mirar: pedido.has('mirar') })");
    expect(app).toContain('pestanasProyecto(!!d?.proyecto.objetivo, !!d && eligiendoMeta(d.proyecto, d.plan))');
  });

  it('la espera del diagnóstico no ofrece «elegir la meta» mientras la página aún tiene el plan de antes, sin las metas', () => {
    const r = { pedida: '2026-11-11T03:08:52.696Z', hecha: '2026-11-11T03:16:00.000Z' };
    expect(momentoDeEspera(r, '2026-11-11T03:08:00.000Z', true)).toBe('cerrando');
    expect(momentoDeEspera(r, '2026-11-11T03:08:00.000Z')).toBe('lista');
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(app).toContain('momentoDeEspera(d.revision, espera.desde, !!esperaTrasRevision)');
  });
});

describe('«Proyecto», aparte de app.ts (pr_partir_modulos)', () => {
  it('sin meta, las pestañas en el orden del arranque: dónde está, qué es, el diagnóstico, y la meta, sin «Equipo» (nmwdpda8ttit); se ve la primera', () => {
    const html = vistaProyecto(datos());
    const pestanas = [...html.matchAll(/data-pestana-proyecto="([^"]+)"/g)].map((m) => m[1]);
    expect(pestanas).toEqual(['repositorio', 'contexto', 'diagnostico', 'objetivo']);
    expect(html).toMatch(/class="pestana-stl sel" data-pestana-proyecto="repositorio" aria-selected="true"/);
    // Solo la sección de la pestaña a la vista, a todo lo ancho
    expect(html).toContain('data-ancla="p-repositorio"');
    for (const a of ['p-contexto', 'p-diagnostico', 'p-objetivo', 'p-equipo', 'p-sincronizar']) expect(html).not.toContain(`data-ancla="${a}"`);
    expect(html).toContain('>Conectar</button>');
    expect(html).not.toContain('dos-columnas');
    expect(vistaProyecto(datos({ pestana: 'objetivo' }))).toContain('id="form-objetivo"');
    // Sus nombres; la del diagnóstico de un proyecto nuevo es la del planteamiento
    expect(html).toContain('>Dónde está</button>');
    expect(html).toContain('>Qué es</button>');
    expect(html).toContain('>Diagnóstico</button>');
    expect(html).toContain('>La meta</button>');
    expect(vistaProyecto(datos({ nuevo: true }))).toContain('>Planteamiento</button>');
  });

  it('sin «Equipo» (nmwdpda8ttit) ni «Quién lo dirige» (pd_restos_equipo): «Qué es» no trae personas ni idiomas; sin sumar personas ni varios computadores', () => {
    const html = vistaProyecto(datos({ pestana: 'contexto' }));
    expect(html).toContain('data-ancla="p-contexto"');
    for (const x of ['data-ancla="p-equipo"', 'Quién lo dirige', 'data-lee=', 'data-ancla="p-sincronizar"', 'id="form-integrante"', 'data-sincronizar', 'data-quitar-integrante', 'data-pestana-proyecto="equipo"']) expect(html).not.toContain(x);
  });

  it('cada sección, una pestaña (nota nmwaw70jjtit, que reemplaza el acordeón): sin plegables, y un ancla abre su pestaña', () => {
    const html = vistaProyecto(datos({ pestana: 'diagnostico' }));
    expect(html).not.toContain('<details name="proyecto-secciones"');
    expect(html).toMatch(/<section class="panel-d seccion-proyecto" data-ancla="p-diagnostico">\s*<div class="cabeza-seccion"><h3>El diagnóstico<\/h3><\/div>\s*<div class="cuerpo-seccion"><p>diagnóstico<\/p><\/div>/);
    // Con la meta fijada, la meta va primero y es la que se ve al llegar
    const objetivo = { texto: 'x', exito: 'y', horizonte: '', firmado: { quien: 'Ana', fecha: '2026-10-20T10:00:00.000Z' } };
    const conMeta = vistaProyecto(datos({ proyecto: { ...proyectoVacio(), nombre: 'Talleres', objetivo } as DatosProyecto['proyecto'] }));
    expect([...conMeta.matchAll(/data-pestana-proyecto="([^"]+)"/g)].map((m) => m[1])).toEqual(['objetivo', 'contexto', 'diagnostico', 'repositorio']);
    expect(conMeta).toContain('data-replantear-objetivo');
    expect(pestanasProyecto(true)[0]).toBe('objetivo');
    expect(pestanasProyecto(false)[0]).toBe('repositorio');
    // Cada ancla, su pestaña; un candidato a meta vive en «La meta»
    expect(['p-repositorio', 'p-contexto', 'p-objetivo', 'p-diagnostico', 'objetivo-o1', 'p-equipo', 'p-sincronizar'].map(pestanaProyectoDeAncla))
      .toEqual(['repositorio', 'contexto', 'objetivo', 'diagnostico', 'objetivo', null, 'contexto']);
    expect(pestanaProyectoDeAncla(null)).toBeNull();
    expect(pestanaProyectoDeAncla('m-permisos')).toBeNull();
    // La página: el ancla elige la pestaña antes de pintar, la pestaña se cambia con su botón, y ya no hay acordeón
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(app).toContain('pestanaProyecto = pestanaProyectoDeAncla(anclaPendiente) ?? pestanaProyecto;');
    expect(app).toContain('cambiarPestanaProyecto(ds.pestanaProyecto);');
    expect(app).toContain('pestana: pestanaProyecto,');
    expect(app).not.toContain('ACORDEON_PROYECTO');
    expect(app).not.toContain('seccionProyectoAbierta');
  });

  it('sin «Más datos del repositorio» (nota nmwavfpubtit): ni la dirección en la web ni la rama en el formulario, y el servidor conserva las guardadas', () => {
    const html = vistaProyecto(datos({ pestana: 'contexto', proyecto: { ...proyectoVacio(), nombre: 'Talleres', repositorio: { url: 'https://github.com/a/b', rama: 'main' } } }));
    expect(html).toContain('id="form-proyecto"');
    expect(html).not.toContain('mas-datos');
    expect(html).not.toContain('name="url"');
    expect(html).not.toContain('name="rama"');
    const api = readFileSync(join(__dirname, '..', 'servidor', 'api.ts'), 'utf-8');
    expect(api).toContain("url: cuerpo.url === undefined ? proyecto.repositorio?.url ?? '' :");
    expect(api).toContain("rama: cuerpo.rama === undefined ? proyecto.repositorio?.rama ?? '' :");
  });

  it('sin meta, dos metas editables como mucho, sin campo para una propia, y «Confirmar la meta y trazar la ruta» con su origen (nmwakupiftit, nmwajgncftit)', () => {
    const objetivos = [1, 2, 3].map((i) => ({ id: `o${i}`, texto: `Meta ${i}`, exito: `Éxito ${i}`, porQue: `Porque ${i}`, riesgo: `Riesgo ${i}`, horizonte: i === 1 ? 'Hito' : undefined }));
    const plan = { objetivos, boletin: [], diagnostico: { fecha: '2026-11-10' } } as unknown as DatosProyecto['plan'];
    const html = vistaProyecto(datos({ plan, pestana: 'objetivo' }));
    expect(html.match(/data-meta-candidato="/g)).toHaveLength(2);
    expect(html).not.toContain('Meta 3');
    // Editables: lo que se logra, cómo se sabe y el horizonte, ya escritos
    expect(html).toContain('<textarea name="texto" rows="5" required>Meta 1</textarea>');
    expect(html).toContain('<textarea name="exito" rows="5" required>Éxito 2</textarea>');
    expect(html).toContain('name="horizonte" value="Hito"');
    // Sin el formulario de una meta propia, ni «Usar este»
    expect(html).not.toContain('id="form-objetivo"');
    expect(html).not.toContain('data-usar-candidato');
    // El botón dice que pide la revisión y que usa el plan, con su origen, que el servidor acepta
    expect(html.match(/<button type="submit" class="primario" data-origen="confirmar_meta" title="Fija esta meta y pide la revisión del director, que traza la ruta y usa tu plan de Claude">Confirmar la meta y trazar la ruta<\/button>/g)).toHaveLength(2);
    expect(esOrigenRevision('confirmar_meta')).toBe(true);
    expect(ORIGENES_REVISION.confirmar_meta).toContain('Confirmar la meta y trazar la ruta');
    // Lo cambiado en una sigue tras un repintado
    expect(vistaProyecto(datos({ plan, pestana: 'objetivo', borrador: { texto: 'Mía', exito: 'E', horizonte: '', candidato: 'o2' } }))).toContain('<textarea name="texto" rows="5" required>Mía</textarea>');
    // Quien no es titular las lee, sin campos ni botón
    const otro = vistaProyecto(datos({ plan, titular: false, pestana: 'objetivo' }));
    expect(otro).not.toContain('data-meta-candidato');
    expect(otro).toContain('<b>Meta 1</b>');
    // La página: la fija y pide la ruta con ese origen, y abre la espera de la ruta
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(app).toContain("if (form.id === 'form-objetivo' || form.dataset.metaCandidato !== undefined) {");
    expect(app).toContain("if (await pedirLaRevision(true, 'confirmar_meta', true)) mostrarEsperaRevision('ruta');");
  });

  it('con dos metas candidatas, cada una ocupa la mitad del ancho y sus cuadros de texto son altos (nota nmwcll63ctit)', () => {
    const objetivos = [1, 2].map((i) => ({ id: `o${i}`, texto: `Meta ${i}`, exito: `Éxito ${i}`, porQue: `Porque ${i}` }));
    const plan = { objetivos, boletin: [], diagnostico: { fecha: '2026-11-10' } } as unknown as DatosProyecto['plan'];
    const dos = vistaProyecto(datos({ plan, pestana: 'objetivo' }));
    expect(dos).toContain('<div class="candidatos dos">');
    expect(dos.match(/<textarea name="(texto|exito)" rows="5"/g)).toHaveLength(4);
    // Con una sola, ocupa todo el ancho: sin la clase de dos columnas
    const una = vistaProyecto(datos({ plan: { ...plan, objetivos: objetivos.slice(0, 1) } as DatosProyecto['plan'], pestana: 'objetivo' }));
    expect(una).toContain('<div class="candidatos">');
    // El CSS: dos columnas iguales y cuadros de texto más altos
    const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');
    expect(css).toMatch(/\.candidatos\.dos \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
    expect(css).toMatch(/\.candidato\.editable textarea \{ min-height: 128px; \}/);
  });

  it('sin candidatos, el formulario para escribirla, que confirma igual', () => {
    const html = vistaProyecto(datos({ pestana: 'objetivo' }));
    expect(html).toContain('id="form-objetivo"');
    expect(html).toContain('data-origen="confirmar_meta"');
  });

  it('con la meta fijada, va arriba y se puede replantear', () => {
    const objetivo = { texto: '20 talleres pagando', exito: '20 cobros', horizonte: '', firmado: { quien: 'Ana', fecha: '2026-10-20T10:00:00.000Z' } };
    const html = vistaProyecto(datos({ proyecto: { ...proyectoVacio(), nombre: 'Talleres', objetivo } as DatosProyecto['proyecto'] }));
    expect(html).toMatch(/class="pestana-stl sel" data-pestana-proyecto="objetivo"/);
    expect(html).toContain('data-replantear-objetivo');
    expect(html).not.toContain('id="form-objetivo"');
  });

  it('las sesiones de gh (nmw0vw3detit): el login real, el nombre en gh, la activa, la aprobada aunque no lo sea, y el código', () => {
    const html = panelSesionesGh({
      cargando: false, hayGh: true, aprobada: 'ARGWABOT',
      sesiones: [
        { nombre: 'empresa_admin', login: 'empresa_admin', activa: true, aprobada: false },
        { nombre: 'incocrea', login: 'ARGWABOT', activa: false, aprobada: true },
      ],
      entrada: { estado: 'esperando', codigo: 'AB12-CD34', url: 'https://github.com/login/device' },
    });
    expect(html).toContain('<b>ARGWABOT</b>');
    expect(html).toContain('gh la guardó como incocrea');
    expect(html).toContain('La aprobada para este proyecto');
    // «Usar esta» solo en la que no está activa, con su nombre en gh
    expect(html).toContain('data-usar-sesion-gh="incocrea"');
    expect(html).not.toContain('data-usar-sesion-gh="empresa_admin"');
    expect(html).toContain('AB12-CD34');
    expect(html).toContain('href="https://github.com/login/device"');
    expect(html).toContain('data-entrar-gh');
    // Sin la aprobada entre las guardadas, lo dice
    expect(panelSesionesGh({ cargando: false, hayGh: true, aprobada: 'ARGWABOT', sesiones: [{ nombre: 'x', login: 'x', activa: true, aprobada: false }], entrada: null })).toContain('Ninguna sesión guardada es ARGWABOT');
    // Sin gh, ni lista ni entrar; y solo el titular ve el panel
    expect(panelSesionesGh({ cargando: false, hayGh: false, aprobada: null, sesiones: [], entrada: null })).not.toContain('data-entrar-gh');
    expect(vistaProyecto(datos({ titular: false, repositorio: { ruta: 'C:/x', info: { ruta: 'C:/x', rama: 'main', commits: 1, archivos: 1, sinCommit: 0, ultimo: null, remoto: null } as unknown as DatosProyecto['repositorio']['info'], error: null } }))).not.toContain('sesiones-gh');
  });

  it('quien no es titular lo ve sin poder escribirlo, y sin equipo registrado sale el titular', () => {
    const html = vistaProyecto(datos({ titular: false, pestana: 'contexto' })) + vistaProyecto(datos({ titular: false, pestana: 'objetivo' }));
    expect(html).toContain('name="nombre" value="Talleres" required readonly');
    expect(html).toContain('La meta la fija el titular.');
    expect(html).not.toContain('id="form-integrante"');
  });

  it('los archivos clave también van debajo de «Qué es»: una tabla de nombre y para qué sirve, y un clic abre cada uno (pd_about)', () => {
    const plan = { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: null }, archivosClave: [{ ruta: 'README.md', para: 'La puerta de entrada' }, { ruta: 'src/a.ts', para: 'Lo principal' }] } as unknown as DatosProyecto['plan'];
    const html = vistaProyecto(datos({ plan, titular: false, pestana: 'contexto' }));
    const contexto = html.slice(html.indexOf('data-ancla="p-contexto"'), html.indexOf('</section>', html.indexOf('data-ancla="p-contexto"')));
    expect(contexto).toContain('<table class="tabla-clave">');
    expect(contexto).toContain('<th>Archivo</th><th>Para qué sirve</th>');
    expect(contexto).toContain('<tr><td><button type="button" class="enlace-clave" data-doc="repo:README.md">README.md</button></td><td>La puerta de entrada</td></tr>');
    expect(contexto.indexOf('</form>')).toBeLessThan(contexto.indexOf('tabla-clave'));
    // Sin archivos clave, nada
    expect(vistaProyecto(datos())).not.toContain('tabla-clave');
  });

  it('«Archivos clave» se lee entero en el idioma elegido: su «para» bilingüe sale en ese idioma (nmwo4h83utit)', () => {
    const plan = { objetivos: [], boletin: [], detectado: undefined, diagnostico: { fecha: null }, archivosClave: [{ ruta: 'README.md', para: { es: 'La puerta de entrada', en: 'The front door' } }] } as unknown as DatosProyecto['plan'];
    const en = (() => { ponerIdioma('en'); try { return vistaProyecto(datos({ plan, titular: false, pestana: 'contexto' })); } finally { ponerIdioma('es'); } })();
    expect(en).toContain('<th>File</th>');
    expect(en).toContain('<td>The front door</td>');
    expect(en).not.toContain('La puerta de entrada');
    const es = vistaProyecto(datos({ plan, titular: false, pestana: 'contexto' }));
    expect(es).toContain('<td>La puerta de entrada</td>');
  });

  it('lo que detectó el director llena el contexto vacío, dicho como suyo', () => {
    const html = vistaProyecto(datos({ plan: { objetivos: [], boletin: [], detectado: { contexto: 'Una app de citas', meta: 'Veinte talleres' }, diagnostico: { fecha: null } } as unknown as DatosProyecto['plan'], pestana: 'contexto' }));
    expect(html).toContain('>Una app de citas</textarea>');
    expect(html).toContain('Lo detectó el director al leer el repositorio');
    expect(html).toContain('Meta sugerida por el director');
  });
  it('lo detectado llena solo el campo vacío, marcado «Detectado»; tus palabras se quedan y nada ofrece reemplazarlas (pd_diagnostico_llena, nmwpvoj9mtit)', () => {
    const plan = { objetivos: [], boletin: [], detectado: { contexto: 'Una app de citas', meta: 'Veinte talleres' }, diagnostico: { fecha: null } } as unknown as DatosProyecto['plan'];
    // Sin palabras tuyas, lo detectado llena el campo, marcado
    const vacio = vistaProyecto(datos({ plan, pestana: 'contexto' }));
    expect(vacio).toContain('<small class="detectado"><b>✦ Detectado</b> · Lo detectó el director');
    // Con las tuyas, se quedan en el campo, sin marca y sin recuadro al lado ni botón para cambiarlas
    const proyecto = { ...proyectoVacio(), nombre: 'Talleres', contexto: 'Mi taller de motos', metaInicial: 'Vender más' };
    const html = vistaProyecto(datos({ plan, proyecto, pestana: 'contexto' }));
    expect(html).toContain('>Mi taller de motos</textarea>');
    expect(html).toContain('>Vender más</textarea>');
    expect(html).not.toContain('Una app de citas');
    expect(html).not.toContain('Veinte talleres');
    expect(html).not.toMatch(/detectado-al-lado|data-usar-detectado|Usar esto/);
    expect(readFileSync(join(__dirname, 'app.ts'), 'utf-8')).not.toContain('ds.usarDetectado');
  });

  it('la cuenta sugerida, sin cuenta aprobada, es el dueño del repositorio aunque la sesión activa sea otra (nmwawb3grtit)', () => {
    const info = { ruta: 'C:/x', rama: 'main', commits: 1, archivos: 1, sinCommit: 0, ultimo: null, remoto: 'https://github.com/laura-gh/talleres.git' } as unknown as DatosProyecto['repositorio']['info'];
    const sesionesGh = { cargando: false, hayGh: true, aprobada: null, entrada: null, sesiones: [{ nombre: 'otra', login: 'otra', activa: true, aprobada: false }] };
    const html = vistaProyecto(datos({ repositorio: { ruta: 'C:/x', info, error: null, cuentaGit: null }, sesionesGh }));
    expect(html).toMatch(/name="cuenta"[^>]*value="laura-gh"[^>]*data-detectada/);
    expect(html).toContain('Detectada, sin guardar: laura-gh es el dueño de este repositorio en GitHub.');
    // La activa sigue a un clic
    expect(html).toContain('data-usar-cuenta-activa="otra"');
    // Con cuenta aprobada, nada detectado
    expect(vistaProyecto(datos({ repositorio: { ruta: 'C:/x', info, error: null, cuentaGit: 'laura-gh' }, sesionesGh }))).not.toContain('data-detectada');
  });
});
