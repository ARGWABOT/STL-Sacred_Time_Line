import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { abiertaEnLista, desplazamientoParaVer, desplazamientosEnCadena, enSuIdioma, IDIOMA_DE_QUIEN_LEE, instruccionDeAgente, scrollAlRepintar, seQuedaEnSuRuta } from './listas';

const director = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
// La columna de los documentos se pinta en su módulo (pr_partir_modulos); la página guarda lo que recuerda entre repintados
const vistaDocumentos = readFileSync(join(__dirname, 'vistaDocumentos.ts'), 'utf-8');
const columnaDeDocumentos = () => vistaDocumentos.slice(vistaDocumentos.indexOf('export function vistaDocumentos'), vistaDocumentos.indexOf('if (!doc) return `<div class="docs">'));

describe('cada procedimiento, en el idioma de quien lo lee (pr_reglas_por_encargo, punto 6)', () => {
  const hay = ['docs/metodo/director/review-cycle.md', 'docs/metodo/director/review-cycle.es.md', 'docs/metodo/metodologia.md', 'repo:README.md', 'repo:README.en.md'];
  it('abre la versión de quien lee si está a su lado; si no, o si ya es una versión, el mismo', () => {
    expect(IDIOMA_DE_QUIEN_LEE).toBe('es');
    expect(enSuIdioma('docs/metodo/director/review-cycle.md', hay)).toBe('docs/metodo/director/review-cycle.es.md');
    expect(enSuIdioma('docs/metodo/metodologia.md', hay)).toBe('docs/metodo/metodologia.md');
    expect(enSuIdioma('docs/metodo/director/review-cycle.es.md', hay)).toBe('docs/metodo/director/review-cycle.es.md');
    // Quien lee en inglés abre la principal; la de otro idioma se respeta si la piden por su ruta
    expect(enSuIdioma('repo:README.md', hay, 'en')).toBe('repo:README.en.md');
    expect(enSuIdioma('repo:README.en.md', hay)).toBe('repo:README.en.md');
    expect(enSuIdioma('docs/director/ruta.md', hay)).toBe('docs/director/ruta.md');
  });

  it('el Studio lo usa al abrir un documento, salvo el que pide leer una misión o el plan, cuyas partes leídas se cuentan por su ruta', () => {
    expect(director).toContain('if (seQuedaEnSuRuta(ruta, enCola, d.plan.documentos.map((x) => x.ruta))) return ruta;');
    expect(director).toContain('return enSuIdioma(ruta, (documentos ?? []).map((x) => x.ruta), idiomaActual());');
    expect(director).toContain('  ruta = rutaEnSuIdioma(ruta, enCola);');
  });

  it('con la interfaz en inglés, «plan-formats.es.md» del repositorio abre «plan-formats.md», y de vuelta (nmw5o660stit)', () => {
    const repo = ['repo:docs/metodo/director/plan-formats.md', 'repo:docs/metodo/director/plan-formats.es.md'];
    expect(enSuIdioma('repo:docs/metodo/director/plan-formats.es.md', repo, 'en')).toBe('repo:docs/metodo/director/plan-formats.md');
    expect(enSuIdioma('repo:docs/metodo/director/plan-formats.md', repo, 'en')).toBe('repo:docs/metodo/director/plan-formats.md');
    expect(enSuIdioma('repo:docs/metodo/director/plan-formats.md', repo, 'es')).toBe('repo:docs/metodo/director/plan-formats.es.md');
    expect(enSuIdioma('repo:docs/metodo/director/plan-formats.es.md', repo, 'es')).toBe('repo:docs/metodo/director/plan-formats.es.md');
    // Una versión sin su principal al lado se queda como está
    expect(enSuIdioma('repo:docs/solo.es.md', ['repo:docs/solo.es.md'], 'en')).toBe('repo:docs/solo.es.md');
    // Con el propio Studio como proyecto, la lista trae los del método sin «repo:» (están entre los del Studio): la
    // versión del otro idioma es esa (nmw6u5386tit)
    const delStudio = ['docs/metodo/director/plan-formats.md', 'docs/metodo/director/plan-formats.es.md'];
    expect(enSuIdioma('repo:docs/metodo/director/plan-formats.es.md', delStudio, 'en')).toBe('docs/metodo/director/plan-formats.md');
    expect(enSuIdioma('repo:docs/metodo/director/plan-formats.md', delStudio, 'es')).toBe('docs/metodo/director/plan-formats.es.md');
    expect(enSuIdioma('repo:docs/metodo/director/plan-formats.es.md', delStudio, 'es')).toBe('repo:docs/metodo/director/plan-formats.es.md');
    expect(enSuIdioma('repo:docs/metodo/director/plan-formats.md', delStudio, 'en')).toBe('repo:docs/metodo/director/plan-formats.md');
    // Al cambiar de idioma, el documento abierto se abre en su versión del idioma nuevo
    const cambiar = director.slice(director.indexOf('async function cambiarIdioma('), director.indexOf('/** Lo último que llegó de cada parte de la consulta'));
    // Con la lista de documentos sin cargar, se carga antes de buscar la versión
    expect(cambiar).toContain('if (doc && !documentos) await cargarDocumentos();');
    // Un documento del método abierto cambia de idioma aunque esté en la cola de lectura o en el plan; los demás de la cola, no
    const metodo = 'repo:docs/metodo/director/plan-formats.es.md';
    expect(seQuedaEnSuRuta(metodo, [{ ruta: metodo }], [metodo])).toBe(false);
    expect(seQuedaEnSuRuta('docs/metodo/metodologia.md', [{ ruta: 'docs/metodo/metodologia.md' }], [])).toBe(false);
    expect(seQuedaEnSuRuta('docs/director/ruta.md', [{ ruta: 'docs/director/ruta.md' }], [])).toBe(true);
    expect(seQuedaEnSuRuta('docs/director/plan.md', [], ['docs/director/plan.md'])).toBe(true);
    expect(seQuedaEnSuRuta('docs/otro.md', [], [])).toBe(false);
    expect(cambiar).toContain('const otra = doc ? rutaEnSuIdioma(doc.ruta, yo ? lecturaDe(yo) : []) : null;');
    expect(cambiar).toContain('if (doc && otra && otra !== doc.ruta) void abrirDocumento(otra, null, copiaEnClave);');
  });

  it('la metodología, que la plantilla pone en el plan de cada proyecto, se abre en el idioma de quien lee', () => {
    expect(enSuIdioma('docs/metodo/metodologia.md', ['docs/metodo/metodologia.md', 'docs/metodo/metodologia.es.md'])).toBe('docs/metodo/metodologia.es.md');
    for (const p of ['plan.json', 'plan-nuevo.json']) {
      const plantilla = JSON.parse(readFileSync(join(__dirname, '..', '..', 'plantilla', p), 'utf-8'));
      expect(plantilla.documentos).toContainEqual(expect.objectContaining({ ruta: 'docs/metodo/metodologia.md', titulo: 'El método STL' }));
    }
  });
});

describe('las listas no se pliegan solas al abrir algo (nota del titular, 22 de octubre de 2026)', () => {
  it('una parte abierta sigue abierta: ni abrir un elemento de otra parte ni un repintado la pliegan', () => {
    for (const porDefecto of [true, false]) expect(abiertaEnLista(true, porDefecto, false)).toBe(true);
  });

  it('la parte que recibe lo abierto se abre, aunque estuviera plegada', () => {
    expect(abiertaEnLista(false, false, true)).toBe(true);
    expect(abiertaEnLista(undefined, false, true)).toBe(true);
  });

  it('lo que quien mira plegó queda plegado mientras no le llegue lo abierto; la primera vez, como nace', () => {
    expect(abiertaEnLista(false, true, false)).toBe(false);
    expect(abiertaEnLista(undefined, true, false)).toBe(true);
    expect(abiertaEnLista(undefined, false, false)).toBe(false);
  });

  it('la columna se mueve solo lo justo para ver lo marcado, y nada si ya se ve', () => {
    const lista = { top: 100, bottom: 500 };
    expect(desplazamientoParaVer(lista, { top: 200, bottom: 240 })).toBe(0);
    // Debajo o encima de lo que se ve: queda en el medio de la columna
    const abajo = desplazamientoParaVer(lista, { top: 700, bottom: 740 });
    expect(700 - abajo + 20).toBe(300);
    const arriba = desplazamientoParaVer(lista, { top: 20, bottom: 60 });
    expect(20 - arriba + 20).toBe(300);
    // Más alto que la columna: queda arriba
    expect(desplazamientoParaVer(lista, { top: 600, bottom: 1200 })).toBe(500);
  });

  it('lo resaltado se lleva a la vista en cada contenedor con su propio scroll, del más cercano al más lejano (nota nmw15wqz9tit)', () => {
    // Un panel (100 a 500) dentro de otro (0 a 800): el elemento, en 1000, queda en el medio del panel de adentro, y
    // con eso ya se ve en el de afuera
    const [dentro, fuera] = desplazamientosEnCadena([{ top: 100, bottom: 500 }, { top: 0, bottom: 800 }], { top: 1000, bottom: 1040 });
    expect(dentro).toBe(720);
    expect(fuera).toBe(0);
    // Si ya se ve en los dos, nada se mueve
    expect(desplazamientosEnCadena([{ top: 0, bottom: 400 }, { top: 0, bottom: 800 }], { top: 100, bottom: 140 })).toEqual([0, 0]);
    // El de afuera se mueve lo que falte cuando el de adentro está fuera de la vista
    const [, afuera] = desplazamientosEnCadena([{ top: 900, bottom: 1300 }, { top: 0, bottom: 800 }], { top: 1000, bottom: 1040 });
    expect(afuera).toBeGreaterThan(0);
    // Sin contenedores, nada
    expect(desplazamientosEnCadena([], { top: 0, bottom: 10 })).toEqual([]);
  });

  it('el resalte mueve cada contenedor con scroll, vuelve a buscar lo señalado tras un repintado y espera el ancla que aún no se pintó', () => {
    const app = readFileSync(join(import.meta.dirname, 'app.ts'), 'utf-8');
    const mostrar = app.slice(app.indexOf('function mostrarEntero('), app.indexOf('function abrirPlegados('));
    expect(mostrar).toContain('desplazamientosEnCadena(');
    expect(mostrar).toContain('if (!el.isConnected && ancla) el = document.querySelector');
    const seguir = app.slice(app.indexOf('function seguirResalte('), app.indexOf('// ───────────────────────────────────────────── diálogo'));
    expect(seguir).toContain('if (pasado < MS_SEGUIR_A_LA_VISTA) { abrirPlegados(el); mostrarEntero(el); }');
    expect(app).toContain('else if (!anclaEsperandoDesde) anclaEsperandoDesde = Date.now();');
  });

  it('cada parte plegable de la columna de los documentos nace con su memoria, y la columna no vuelve arriba al repintarse', () => {
    const columna = columnaDeDocumentos();
    const plegables = columna.match(/<details/g) ?? [];
    expect(plegables.length).toBeGreaterThanOrEqual(2);
    // Con su ancla, para que un paso lleve directo a ella
    expect(columna.match(/<details class="[\w-]+" data-ancla="[^"]+"\$\{plegableEnColumna\(/g)?.length).toBe(plegables.length);
    // La memoria de cada parte (si la abriste, qué documento tenía dentro) es de la página, que se la da al módulo
    expect(director).toContain('alEmpezarColumna, plegableEnColumna, plegable,');
    expect(director).toContain('const abierta = abiertaEnLista(plegadosAMano.get(clave), tiene || abiertaAlNacer, recibe);');
    expect(director).toMatch(/columna\.scrollTop = scrollColumna;/);
  });

  it('un clic en un documento de la columna marca solo esa copia, y el documento abre arriba (nota de voz nmw2db9dptit)', () => {
    // La página dice si el clic fue en «Archivos clave»: el README está ahí y en «Del repositorio del proyecto», y con las
    // dos copias marcadas la columna saltaba a la primera
    expect(director).toContain(`await abrirDocumento(ds.doc, ds.seccion || null, !!b.closest('[data-ancla="d-clave"]'));`);
    expect(director).toContain('doc, copiaEnClave, notas: d.estado.notas');
    // Lo que se acaba de abrir no hereda el scroll del documento anterior (en el modo enfoque, el lector tiene el suyo)
    expect(scrollAlRepintar(840, true)).toBe(0);
    expect(scrollAlRepintar(840, false)).toBe(840);
    expect(director).toContain('enfocada.scrollTop = scrollAlRepintar(enfocadoEn, abreOtro);');
  });

  it('al cambiar de proyecto, la columna vuelve arriba: no hereda hasta dónde bajaste en el otro', () => {
    const cambio = director.slice(director.indexOf('// Otro proyecto: lo abierto del anterior no sirve'), director.indexOf('// Si no llegó nada nuevo'));
    expect(cambio).toMatch(/scrollColumna = 0;/);
    // El repintado toma el scroll de la columna que está en pantalla, la del anterior: también esa vuelve arriba
    expect(cambio).toMatch(/querySelector<HTMLElement>\('\.lista-docs'\)\?\.scrollTo\(0, 0\)/);
  });
});

describe('la columna de los documentos, con sus partes plegables a mano y las instrucciones aparte (22 de octubre de 2026)', () => {
  const columna = columnaDeDocumentos();

  it('«Documentación del proyecto», «Después» y «Ya leídos» se pliegan a mano siempre, no solo mientras hay algo por leer', () => {
    expect(columna).not.toContain("${leyendo ? `<details class=\"otros-docs\"");
    expect(columna).toContain('<details class="otros-docs" data-ancla="d-otros"${plegableEnColumna(\'columna|otros\'');
    expect(columna).toMatch(/: propia \? `\$\{enRuta\.filter\(\(x\) => x\.lectura === 'siguiente'\)/);
  });

  it('las instrucciones para los agentes van aparte, con un nombre que se entienda', () => {
    expect(instruccionDeAgente('repo:CLAUDE.md', 'STL Studio: reglas del director asistente · CLAUDE.md')).toBe('CLAUDE.md: instrucciones para Claude Code');
    expect(instruccionDeAgente('repo:web/AGENTS.md', 'AGENTS.md · web/AGENTS.md')).toBe('AGENTS.md: instrucciones para Codex y otros agentes · web');
    expect(instruccionDeAgente('repo:.claude/commands/revisa.md', 'revisa.md · .claude/commands/revisa.md')).toBe('/revisa (Claude Code)');
    expect(instruccionDeAgente('repo:.agents/skills/revisa/SKILL.md', 'SKILL.md · .agents/skills/revisa/SKILL.md')).toBe('/revisa (Codex)');
    expect(instruccionDeAgente('repo:.codex/prompts/vigila.md', 'Vigila la revisión · .codex/prompts/vigila.md')).toBe('/vigila: Vigila la revisión (Codex)');
    // La documentación, y lo que no es del repositorio, no
    for (const r of ['repo:README.md', 'repo:docs/claude.md.txt', 'docs/director/ruta.md']) expect(instruccionDeAgente(r, 'x')).toBeNull();
    expect(columna).toContain("t('docs.instrucciones')");
  });

  it('los atajos «revisa» y «vigila» dicen lo mismo en Claude Code y en Codex, en inglés, cada uno con su encabezado (pedido pd_nucleo_ingles)', () => {
    const raiz = join(__dirname, '..', '..');
    const partes = (ruta: string) => {
      const [, cabeza, cuerpo] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(readFileSync(join(raiz, ruta), 'utf-8').replace(/\r\n/g, '\n')) ?? [];
      return { cabeza: cabeza ?? '', cuerpo: cuerpo ?? '' };
    };
    for (const atajo of ['revisa', 'vigila']) {
      const comando = partes(`.claude/commands/${atajo}.md`);
      const habilidad = partes(`.agents/skills/${atajo}/SKILL.md`);
      // Un solo texto: el del comando de Claude Code es el de la habilidad de Codex
      expect(comando.cuerpo).toBe(habilidad.cuerpo);
      expect(comando.cuerpo).toContain('You are the assistant director of STL Studio.');
      expect(comando.cuerpo).toContain('--listo');
      expect(comando.cuerpo).toContain('The Studio is the only channel with the owner');
      // Cada uno con lo que su herramienta lee: el comando, su descripción; la habilidad, su nombre y su descripción
      expect(comando.cabeza).toMatch(/^description: \S/m);
      expect(habilidad.cabeza).toMatch(new RegExp(`^name: ${atajo}$`, 'm'));
      expect(habilidad.cabeza).toMatch(/^description: \S/m);
    }
    expect(partes('.claude/commands/revisa.md').cuerpo).toContain('Attend only that project');
  });

  it('cada archivo dice qué es al pasar el ratón', () => {
    expect(columna).toMatch(/const boton = \(x: Documento\) => `<button[^`]*title="\$\{esc\(queEs\(x\)\)\}"/);
  });
});
