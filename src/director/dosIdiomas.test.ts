// Los nombres en el idioma de la interfaz (pd_nombres_dos_idiomas): un idioma mientras no cambia, el otro tras un cambio,
// todo lo corto de una vez, y la edición de la persona deja su otro idioma por reescribir.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Plan } from './director.ts';
import { correccionDeParte, enSuIdioma, erroresDeTraducciones, inicioEnSuIdioma, lineasDeOtroIdioma, objetivoEnSuIdioma, planEnSuIdioma, proyectoEnSuIdioma, textosCortos, textosSinSuIdioma } from './dosIdiomas.ts';

const plan = (extra: Partial<Plan> = {}) =>
  ({
    frentes: [{ id: 'interfaz', nombre: 'La interfaz', que: 'La página del Studio: Hoy, la ruta y los documentos.', rutas: [] }],
    fases: [],
    linea: { desde: '2026-11-01', fasesAntes: [], meta: { criterios: [{ id: 'c1', texto: 'Una persona que no lo conoce entrega un proyecto sin ayuda.' }] } },
    archivosClave: [{ ruta: 'README.md', para: { es: 'Qué es y cómo se instala' } }],
    ...extra,
  }) as unknown as Plan;
const meta = { texto: 'STL Studio publicado en GitHub, gratuito y fácil de instalar', exito: 'Un repositorio con historia limpia y la integración continua en verde.' };

describe('los nombres en el idioma de la interfaz (pd_nombres_dos_idiomas)', () => {
  it('mientras el idioma no cambia no se pide nada: todo está escrito en el de la interfaz (nmwpswgnhtit)', () => {
    expect(lineasDeOtroIdioma(plan(), meta, 'es')).toEqual([]);
  });

  it('tras cambiar el idioma, la bandeja pide todo lo corto de una vez: partes, meta, lista y archivos clave (nmwptxjdntit, nmwptwwoetit)', () => {
    const lineas = lineasDeOtroIdioma(plan(), meta, 'en');
    const todo = lineas.join('\n');
    expect(lineas[0]).toBe('## Short texts not in English yet (6)');
    for (const clave of ['frente:interfaz:nombre', 'frente:interfaz:que', 'meta:texto', 'meta:exito', 'criterio:c1']) expect(todo).toContain(`[${clave}]`);
    expect(todo).toContain('Key files whose line has no English: README.md');
    expect(todo).toContain('all in one go');
    expect(todo).toContain('Old missions and answers stay as they are');
  });

  it('con la traducción escrita, se muestra en el idioma de la interfaz y ya no se pide', () => {
    const traducciones = {
      'frente:interfaz:nombre': { es: 'La interfaz', en: 'The interface' },
      'frente:interfaz:que': { es: 'La página del Studio: Hoy, la ruta y los documentos.', en: "The Studio's page: Today, the route and the documents." },
      'meta:texto': { es: meta.texto, en: 'STL Studio published on GitHub, free and easy to install' },
      'meta:exito': { es: meta.exito, en: 'A repository with a clean history and green continuous integration.' },
      'criterio:c1': { es: 'Una persona que no lo conoce entrega un proyecto sin ayuda.', en: 'Someone who does not know it hands over a project without help.' },
    };
    const p = plan({ traducciones, archivosClave: [{ ruta: 'README.md', para: { es: 'Qué es', en: 'What it is' } }] });
    expect(lineasDeOtroIdioma(p, meta, 'en')).toEqual([]);
    const visto = planEnSuIdioma(p, 'en');
    expect(visto.frentes[0]).toMatchObject({ nombre: 'The interface', que: "The Studio's page: Today, the route and the documents." });
    expect((visto.linea as unknown as { meta: { criterios: { texto: string }[] } }).meta.criterios[0].texto).toBe('Someone who does not know it hands over a project without help.');
    expect(objetivoEnSuIdioma(meta, traducciones, 'en').texto).toBe('STL Studio published on GitHub, free and easy to install');
    // En español, el escrito; y lo guardado no cambia
    expect(planEnSuIdioma(p, 'es').frentes[0].nombre).toBe('La interfaz');
    expect(p.frentes[0].nombre).toBe('La interfaz');
  });

  it('sin su idioma, un texto se muestra como se escribió, sin marca (nmwpsunt6tit)', () => {
    expect(enSuIdioma('La interfaz', undefined, 'en')).toBe('La interfaz');
    expect(enSuIdioma('La interfaz', { es: 'La interfaz' }, 'en')).toBe('La interfaz');
    expect(planEnSuIdioma(plan(), 'en').frentes[0].nombre).toBe('La interfaz');
  });

  it('si la persona edita el texto, su otro idioma deja de valer y se pide reescribirlo (nmwpsv4jytit)', () => {
    const traducciones = { 'meta:texto': { es: meta.texto, en: 'STL Studio published on GitHub' } };
    // Editó la meta en inglés, en «Proyecto»: ya no es ninguno de los dos
    const editada = { ...meta, texto: 'STL Studio published on GitHub, free, for one person' };
    const faltan = textosSinSuIdioma(textosCortos(plan(), editada), traducciones, 'en');
    expect(faltan.find((x) => x.clave === 'meta:texto')).toMatchObject({ motivo: 'rehacer' });
    expect(lineasDeOtroIdioma(plan({ traducciones }), editada, 'en').join('\n')).toContain('[meta:texto] the goal (the person edited it: rewrite the other language)');
    // Un nombre propio, sin idioma que se pueda saber, se presume el de la interfaz: no se pide
    expect(textosSinSuIdioma([{ clave: 'frente:k:nombre', donde: 'x', texto: 'Kokoro' }], undefined, 'en')).toEqual([]);
    // Mientras tanto, lo editado se muestra tal cual
    expect(objetivoEnSuIdioma(editada, traducciones, 'es').texto).toBe(editada.texto);
  });

  it('la persona corrige una parte en «Proyecto»: se muestra lo suyo y el director lleva al plan su otro idioma (nmwpmfyv5tit, nmwpsv4jytit)', () => {
    const traducciones = { 'frente:interfaz:nombre': { es: 'La interfaz', en: 'The interface' } };
    const correcciones = correccionDeParte(undefined, 'interfaz', 'en', "The Studio's screen", '');
    expect(correcciones).toEqual({ 'frente:interfaz:nombre': { en: "The Studio's screen" } });
    // Se muestra lo que escribió, en su idioma; en el otro, lo del director
    expect(planEnSuIdioma(plan({ traducciones }), 'en', correcciones).frentes[0].nombre).toBe("The Studio's screen");
    expect(planEnSuIdioma(plan({ traducciones }), 'es', correcciones).frentes[0].nombre).toBe('La interfaz');
    // La bandeja lo pide hasta que la traducción lo trae tal cual
    const linea = lineasDeOtroIdioma(plan({ traducciones }), null, 'en', correcciones).join('\n');
    expect(linea).toContain("[frente:interfaz:nombre] part «interfaz», its name (the person corrected it in «Project» to what follows");
    expect(linea).toContain("«The Studio's screen»");
    const hecha = { ...traducciones, 'frente:interfaz:nombre': { es: 'La pantalla del Studio', en: "The Studio's screen" } };
    const p = plan({ traducciones: hecha, frentes: [{ id: 'interfaz', nombre: 'La pantalla del Studio', que: 'La página del Studio: Hoy, la ruta y los documentos.', rutas: [] }] });
    expect(textosSinSuIdioma(textosCortos(p, null), hecha, 'en', correcciones).map((x) => x.clave)).not.toContain('frente:interfaz:nombre');
    // El servidor la guarda en el proyecto, solo del titular, y «Proyecto» trae el lápiz
    const leer = (r: string) => readFileSync(new URL(r, import.meta.url), 'utf8');
    const api = leer('../../estudio/servidor/api.ts');
    expect(api).toContain("case 'corregir_parte': {");
    expect(api).toContain("proyecto.correcciones = correccionDeParte(proyecto.correcciones, f.id, idiomaActual() === 'es' ? 'es' : 'en', nombre, queHace);");
    expect(leer('../../estudio/src/vistaProyecto.ts')).toContain('<form class="form-proyecto" data-parte="${esc(f.id)}">');
    expect(leer('../../estudio/src/app.ts')).toContain("accion({ tipo: 'corregir_parte', frente: form.dataset.parte, ...datos }, tx('proyecto.parteGuardada'))");
  });

  it('la validación del plan exige sus dos idiomas y una clave conocida', () => {
    expect(erroresDeTraducciones(undefined)).toEqual([]);
    expect(erroresDeTraducciones({ 'frente:x:nombre': { es: 'X', en: 'X' } })).toEqual([]);
    expect(erroresDeTraducciones({ 'frente:x:nombre': { en: 'X' } }).join(' ')).toContain('sus dos idiomas');
    expect(erroresDeTraducciones({ 'otra:cosa': { es: 'a', en: 'b' } }).join(' ')).toContain('clave conocida');
    expect(erroresDeTraducciones([])).toHaveLength(1);
  });

  it('la bandeja lo pide, el plan lo valida y la interfaz lo muestra', () => {
    const leer = (r: string) => readFileSync(new URL(r, import.meta.url), 'utf8');
    expect(leer('../../tools/director/bandeja.ts')).toContain('lineasDeOtroIdioma(plan, proyecto.objetivo, local.idioma, proyecto.correcciones, proyecto)');
    expect(leer('./director.ts')).toContain('errores.push(...erroresDeTraducciones(plan.traducciones));');
    const app = leer('../../estudio/src/app.ts');
    expect(app).toContain('Object.assign(nuevo, proyectoEnSuIdioma(nuevo.plan, nuevo.proyecto, idiomaActual()));');
    // Y el selector lo pasa al idioma nuevo antes de repintar, en cada cambio (nmwpx3ru1tit)
    const cambiar = app.slice(app.indexOf('async function cambiarIdioma('), app.indexOf('sonidosAlCambiarIdioma();'));
    expect(cambiar).toContain('Object.assign(d, proyectoEnSuIdioma(d.plan, d.proyecto, idioma));');
    expect(cambiar.indexOf('proyectoEnSuIdioma(')).toBeLessThan(cambiar.indexOf('pintar();'));
  });

  it('cada cambio de idioma cambia «Qué es», la meta que contó la persona y la meta, no solo el primero (nmwpx3ru1tit)', () => {
    const traducciones = {
      'inicio:contexto': { es: 'Una app web local.', en: 'A local web app.' },
      'inicio:meta': { es: 'Publicarlo gratis.', en: 'Publish it for free.' },
      'meta:texto': { es: 'STL publicado', en: 'STL published' },
      'meta:exito': { es: 'Alguien lo instala solo', en: 'Someone installs it alone' },
    };
    const guardado = { contexto: 'Una app web local.', metaInicial: 'Publicarlo gratis.', objetivo: { texto: 'STL publicado', exito: 'Alguien lo instala solo' } };
    // Como el selector: cada vez, sobre lo que ya se mostraba en el idioma anterior
    let ahora = proyectoEnSuIdioma(plan({ traducciones }), guardado, 'es');
    for (const idioma of ['en', 'es', 'en', 'es', 'en'] as const) {
      ahora = proyectoEnSuIdioma(ahora.plan, ahora.proyecto, idioma);
      expect(ahora.proyecto?.contexto, idioma).toBe(traducciones['inicio:contexto'][idioma]);
      expect(ahora.proyecto?.metaInicial, idioma).toBe(traducciones['inicio:meta'][idioma]);
      expect(ahora.proyecto?.objetivo?.texto, idioma).toBe(traducciones['meta:texto'][idioma]);
      expect(ahora.proyecto?.objetivo?.exito, idioma).toBe(traducciones['meta:exito'][idioma]);
    }
    // Sin proyecto, solo el plan
    expect(proyectoEnSuIdioma(plan(), null, 'en').proyecto).toBeNull();
  });

  it('«Qué es» y la meta que contó la persona siguen el idioma de la interfaz (nmwpvljattit)', () => {
    const inicio = { contexto: 'A small local web app that sits between you and the model.', metaInicial: 'STL Studio publicado y replicable: alguien que no lo conoce lo instala solo.' };
    // Sin su traducción, la meta en español se pide con la interfaz en inglés; «Qué es», ya en inglés, no
    const linea = lineasDeOtroIdioma(plan(), null, 'en', undefined, inicio).join('\n');
    expect(linea).toContain('[inicio:meta] «Your goal» in «Project»');
    expect(linea).not.toContain('[inicio:contexto]');
    const traducciones = {
      'inicio:meta': { es: inicio.metaInicial, en: 'STL Studio published and replicable: someone who does not know it installs it alone.' },
      'inicio:contexto': { es: 'Una pequeña app web local que va entre tú y el modelo.', en: inicio.contexto },
    };
    expect(lineasDeOtroIdioma(plan({ traducciones }), null, 'en', undefined, inicio).join('\n')).not.toContain('[inicio:');
    expect(inicioEnSuIdioma(inicio, traducciones, 'en').metaInicial).toBe('STL Studio published and replicable: someone who does not know it installs it alone.');
    expect(inicioEnSuIdioma(inicio, traducciones, 'es').contexto).toBe('Una pequeña app web local que va entre tú y el modelo.');
    // Guardado en el otro idioma, la traducción sigue valiendo: uno de sus dos textos es el escrito
    expect(inicioEnSuIdioma({ ...inicio, metaInicial: traducciones['inicio:meta'].en }, traducciones, 'es').metaInicial).toBe(inicio.metaInicial);
    expect(erroresDeTraducciones(traducciones)).toEqual([]);
  });
});
