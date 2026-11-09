import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { estadoVacio, etapaArranque, RESERVA_MINIMA, reservaDeMisiones, validarPlan, type Plan, type Proyecto } from './director.ts';
import { guardarRutaRepositorio, marcarCopiaDeDesarrollo, olvidarProyecto, proyectosLocales } from './proyectos.ts';
import { alinearSemilla, dejarRespaldo, ID_SEMILLA, idiomaInicial, instalarSemilla, leerSemilla, RAMA_RESPALDO, tocaRespaldo } from './semilla.ts';
import { firmaDeEstaCopia, FIRMA, subePagina } from '../../tools/firma.ts';

const AQUI = join(__dirname, '..', '..');
const carpetas: string[] = [];
const carpetaVacia = () => {
  const c = mkdtempSync(join(tmpdir(), 'semilla-'));
  carpetas.push(c);
  return c;
};
/** Una copia del Studio recién bajada, sin git: lo único que usa la instalación es su plantilla. */
const copiaSinGit = () => {
  const raiz = carpetaVacia();
  cpSync(join(AQUI, 'plantilla'), join(raiz, 'plantilla'), { recursive: true });
  writeFileSync(join(raiz, '.gitignore'), 'estudio.local.json\nestudio.local.json.candado\n');
  // La identidad de quien instala, como la deja su git
  return raiz;
};
const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
process.env.GIT_CONFIG_GLOBAL = join(tmpdir(), 'semilla-sin-config-global');
writeFileSync(process.env.GIT_CONFIG_GLOBAL, '[user]\n\tname = Quien Instala\n\temail = quien@instala.test\n[init]\n\tdefaultBranch = main\n');

afterAll(() => {
  for (const c of carpetas) rmSync(c, { recursive: true, force: true, maxRetries: 3 });
  rmSync(process.env.GIT_CONFIG_GLOBAL!, { force: true });
  delete process.env.GIT_CONFIG_GLOBAL;
});

describe('STL Studio llega como su propio proyecto (pedido pd_stl_semilla)', () => {
  it('en una carpeta vacía: nace su repositorio con su primer commit, su rama stl y el proyecto, con su diagnóstico y su ruta', async () => {
    const raiz = copiaSinGit();
    expect(await instalarSemilla(raiz)).toBe('instalada');
    expect(git(raiz, 'rev-list', '--count', 'HEAD')).toBe('1');
    expect(git(raiz, 'branch', '--list', 'stl')).toContain('stl');
    expect(existsSync(join(raiz, '.stl', 'proyecto.json'))).toBe(true);
    // Lo de la memoria queda en su commit, en su rama, y nada de la memoria en la del código
    expect(git(join(raiz, '.stl'), 'log', '-1', '--format=%s')).toBe('Estudio: STL Studio, de su semilla');
    expect(git(raiz, 'show', '--stat', '--format=', 'HEAD')).not.toContain('.stl');
    expect(await proyectosLocales(raiz)).toEqual([ID_SEMILLA]);
    const proyecto = JSON.parse(readFileSync(join(raiz, '.stl', 'proyecto.json'), 'utf8')) as Proyecto;
    const plan = JSON.parse(readFileSync(join(raiz, '.stl', 'director', 'plan.json'), 'utf8')) as Plan;
    // Quien instala es su titular: no queda un dato de nadie más
    expect(proyecto.equipo[0]).toMatchObject({ id: 'titular', nombre: 'Quien Instala', correo: 'quien@instala.test' });
    expect(plan.diagnostico.fecha).toBeTruthy();
    expect(plan.fases).toHaveLength(1);
    expect(etapaArranque(plan, proyecto, true)).toBe('en_marcha');
    // Volver a correrla no toca nada
    expect(await instalarSemilla(raiz)).toBe('ya_hay_proyectos');
  });

  it('un clon que ya trae git no se vuelve a iniciar, y una rama stl que ya existe no se pisa', async () => {
    const raiz = copiaSinGit();
    git(raiz, 'init', '-b', 'main');
    git(raiz, 'add', '-A');
    git(raiz, 'commit', '-m', 'lo que venía');
    const antes = git(raiz, 'rev-parse', 'HEAD');
    expect(await instalarSemilla(raiz)).toBe('instalada');
    expect(git(raiz, 'rev-parse', 'HEAD')).toBe(antes);
    // Otro computador, con la misma memoria: se conecta, sin escribir encima
    const local = join(raiz, 'estudio.local.json');
    rmSync(local);
    writeFileSync(join(raiz, '.stl', 'proyecto.json'), '{"nombre":"Lo mío"}');
    expect(await instalarSemilla(raiz)).toBe('ya_tenia_memoria');
    expect(readFileSync(join(raiz, '.stl', 'proyecto.json'), 'utf8')).toBe('{"nombre":"Lo mío"}');
  });

  it('fijo al final de la lista, aunque su id ordene antes, y no se puede quitar', async () => {
    const raiz = copiaSinGit();
    await instalarSemilla(raiz);
    const otro = carpetaVacia();
    mkdirSync(join(otro, '.stl'), { recursive: true });
    writeFileSync(join(otro, '.stl', 'proyecto.json'), '{}');
    const ultimo = carpetaVacia();
    mkdirSync(join(ultimo, '.stl'), { recursive: true });
    writeFileSync(join(ultimo, '.stl', 'proyecto.json'), '{}');
    await guardarRutaRepositorio(raiz, 'abc', otro);
    await guardarRutaRepositorio(raiz, 'zeta', ultimo);
    expect(await proyectosLocales(raiz)).toEqual(['abc', 'zeta', ID_SEMILLA]);
    await expect(olvidarProyecto(raiz, ID_SEMILLA)).rejects.toThrow('no se puede quitar');
    await olvidarProyecto(raiz, 'zeta');
    expect(await proyectosLocales(raiz)).toEqual(['abc', ID_SEMILLA]);
  });

  it('la semilla, en los dos idiomas, con el mismo armazón y un plan válido; su primera misión dice lo que dictó el titular', async () => {
    const [es, en] = await Promise.all([leerSemilla(AQUI, 'es'), leerSemilla(AQUI, 'en')]);
    for (const { plan, proyecto } of [es, en]) {
      expect(validarPlan(plan, ['titular'])).toEqual([]);
      expect(plan.fases.map((f) => f.sinCierre)).toEqual([true]);
      expect(plan.misiones).toHaveLength(1);
      expect(proyecto.objetivo?.firmado?.quien).toBe('STL Studio');
      // Solo sus números, y nada de dinero
      expect(plan.diagnostico.resumen.join(' ')).toMatch(/\d+ .*\d+ .*\d+ /);
      expect(JSON.stringify(plan)).not.toMatch(/US\$|d[oó]lar|precio|price/i);
    }
    expect(es.plan.misiones[0].id).toBe(en.plan.misiones[0].id);
    expect(JSON.stringify(es.plan.misiones[0].pasos)).toContain('Este proyecto es tu Studio, y no tienes que cambiar nada para empezar');
    expect(en.proyecto.objetivo?.texto).toBe('The Studio, adjusted to the way you work');
    expect(es.proyecto.objetivo?.texto).toBe('El Studio, ajustado a tu forma de trabajar');
    expect(en.proyecto.contexto).toContain('This project is your Studio: to adjust it to the way you work, select it and ask the director in the Inbox.');
    expect(es.proyecto.contexto).toContain('Este proyecto es tu Studio:');
    // Sin ninguno de los documentos del director: solo la metodología, que viene con el Studio
    expect(es.plan.documentos.map((d) => d.ruta)).toEqual(['docs/metodo/metodologia.md']);
    expect(en.plan.documentos.map((d) => d.ruta)).toEqual(['docs/metodo/metodologia.md']);
  });

  it('en la semilla no hay ninguna nota, ningún nombre ni dato del titular', () => {
    const textos = readdirSync(join(AQUI, 'plantilla', 'semilla')).map((f) => {
      const ruta = join(AQUI, 'plantilla', 'semilla', f);
      expect(statSync(ruta).isFile()).toBe(true);
      return readFileSync(ruta, 'utf8');
    }).join('\n');
    expect(textos).not.toMatch(/leonc|ARGWABOT|incocrea|@[a-z]+\.[a-z]/i);
    // Ni un id de nota, de pedido ni de mis misiones de este proyecto
    expect(textos).not.toMatch(/nmv[a-z0-9]{6,}|pd_[a-z]|pr_[a-z]|t_decide|docs\/director/);
    expect(JSON.parse(textos.split('\n}\n')[0] + '\n}').plan.respuestas).toEqual({});
  });

  it('nace en el idioma de este computador, y mientras nadie la revise cambia con el idioma', async () => {
    expect(idiomaInicial('en', 'es-CO')).toBe('en');
    expect(idiomaInicial(undefined, 'es-CO')).toBe('es');
    expect(idiomaInicial(undefined, 'fr-FR')).toBe('en');
    const raiz = copiaSinGit();
    await instalarSemilla(raiz);
    const planEn = join(raiz, '.stl', 'director', 'plan.json');
    const proyectoEn = join(raiz, '.stl', 'proyecto.json');
    for (const idioma of ['en', 'es'] as const) {
      await alinearSemilla(raiz, idioma);
      expect(JSON.parse(readFileSync(planEn, 'utf8')).diagnostico.resumen[0]).toBe((await leerSemilla(raiz, idioma)).plan.diagnostico.resumen[0]);
      expect(JSON.parse(readFileSync(proyectoEn, 'utf8')).equipo[0].correo).toBe('quien@instala.test');
    }
    // Revisada una vez, lo escrito queda como está
    const revisado = { ...JSON.parse(readFileSync(planEn, 'utf8')), revisado: '2026-11-02T00:00:00.000Z' };
    writeFileSync(planEn, JSON.stringify(revisado));
    expect(await alinearSemilla(raiz, 'en')).toBe(false);
    expect(JSON.parse(readFileSync(planEn, 'utf8')).revisado).toBe(revisado.revisado);
  });

  it('libre de la reserva, como un proyecto en mantenimiento: le basta su misión, en los dos idiomas', async () => {
    const estado = estadoVacio();
    for (const idioma of ['es', 'en'] as const) {
      const { plan } = await leerSemilla(AQUI, idioma);
      const reserva = reservaDeMisiones(plan, estado, 'titular');
      expect(reserva.abiertas).toHaveLength(1);
      expect(reserva.alcanza).toBeLessThan(RESERVA_MINIMA);
      expect(reserva.faltan).toBe(0);
      // Y con otra etapa, con más de una fase, sí la exigiría: la exención es por ser de mantenimiento
      const conRuta = { ...plan, fases: [{ ...plan.fases[0], etapa: 'Construcción' }, { ...plan.fases[0], id: 'otra' }] };
      expect(reservaDeMisiones(conRuta, estado, 'titular').faltan).toBeGreaterThan(0);
    }
  });

  it('lo que solo vale para la copia de quien lo desarrolla lo enciende su marca: la firma y subir la página', () => {
    expect(firmaDeEstaCopia(undefined, true, true)).toEqual(FIRMA);
    expect(firmaDeEstaCopia(undefined, true, false)).toBeNull();
    expect(firmaDeEstaCopia(undefined, true, undefined)).toBeNull();
    // La firma propia de un proyecto no depende de la marca
    expect(firmaDeEstaCopia({ nombre: 'Ana', correo: 'ana@ejemplo.org' }, false, false)).toEqual({ nombre: 'Ana', correo: 'ana@ejemplo.org' });
    expect(subePagina(true)).toBe(true);
    expect(subePagina(undefined)).toBe(false);
    const publicar = readFileSync(join(AQUI, 'tools', 'publicar-stl.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(publicar).toContain('if (subir && !subePagina((await leerLocal(raiz)).copiaDeDesarrollo)) {');
    expect(readFileSync(join(AQUI, 'tools', 'director', 'firmar.ts'), 'utf8')).toContain('firmaDeEstaCopia((proyecto as { firma?: Partial<Firma> }).firma, mismo, (await leerLocal(raiz)).copiaDeDesarrollo)');
    expect(readFileSync(join(AQUI, 'tools', 'director', 'ayudante.ts'), 'utf8')).toContain('firmaDeEstaCopia(');
    expect(readFileSync(join(AQUI, 'tools', 'director', 'bandeja.ts'), 'utf8')).toContain('firmaDeEstaCopia(');
  });

  it('la rama de respaldo queda una vez por cierre, solo en el proyecto del Studio y fuera de la copia de desarrollo', async () => {
    const base = { esElStudio: true, copiaDeDesarrollo: false, revisado: 'r1' };
    expect(tocaRespaldo(base)).toBe(true);
    expect(tocaRespaldo({ ...base, ultimo: 'r1' })).toBe(false);
    expect(tocaRespaldo({ ...base, ultimo: 'r0' })).toBe(true);
    expect(tocaRespaldo({ ...base, esElStudio: false })).toBe(false);
    expect(tocaRespaldo({ ...base, copiaDeDesarrollo: true })).toBe(false);

    const raiz = copiaSinGit();
    await instalarSemilla(raiz);
    const inicio = git(raiz, 'rev-parse', 'HEAD');
    expect(await dejarRespaldo(raiz, raiz, '')).toEqual({ dejada: true });
    expect(git(raiz, 'rev-parse', RAMA_RESPALDO)).toBe(inicio);
    // Lo que el director hace en esa revisión no la mueve, aunque mire la bandeja otra vez
    writeFileSync(join(raiz, 'nuevo.txt'), 'x');
    git(raiz, 'add', 'nuevo.txt');
    git(raiz, 'commit', '-m', 'un ajuste');
    expect(await dejarRespaldo(raiz, raiz, '')).toEqual({ dejada: false });
    expect(git(raiz, 'rev-parse', RAMA_RESPALDO)).toBe(inicio);
    // En la revisión siguiente, sí; y la orden del README vuelve a ella
    const despues = git(raiz, 'rev-parse', 'HEAD');
    expect(await dejarRespaldo(raiz, raiz, 'r1')).toEqual({ dejada: true });
    expect(git(raiz, 'rev-parse', RAMA_RESPALDO)).toBe(despues);
    await marcarCopiaDeDesarrollo(raiz, true);
    expect(await dejarRespaldo(raiz, raiz, 'r2')).toEqual({ dejada: false });
    for (const f of ['README.md', 'README.es.md']) expect(readFileSync(join(AQUI, f), 'utf8')).toContain(`git reset --hard ${RAMA_RESPALDO}`);
  });

  it('iniciar.ts no presenta la transcripción como opcional ni se detiene por ella: la instala el asistente, y la instalación la nombra obligatoria', () => {
    const iniciar = readFileSync(join(AQUI, 'tools', 'iniciar.ts'), 'utf8');
    expect(iniciar).not.toMatch(/opcional\('Notas de voz/);
    expect(iniciar).not.toContain("falta('Falta la transcripción");
    expect(iniciar).toContain('que es obligatoria');
    expect(iniciar).toContain('La instala el asistente, en el Studio');
    expect(iniciar).toContain('await instalarSemilla(raiz)');
    expect(readFileSync(join(AQUI, 'INSTALL.md'), 'utf8')).toContain('Voice notes (required: they are part of the method)');
    expect(readFileSync(join(AQUI, 'INSTALAR.md'), 'utf8')).toContain('Notas de voz (obligatorias: son parte del método)');
    // Antes de bajar nada mira el disco, en las dos versiones, y ninguna nombra el hardware (nmvzlxklitit, nmvzli6ojtit)
    expect(readFileSync(join(AQUI, 'INSTALL.md'), 'utf8')).toContain('**Before downloading anything**');
    expect(readFileSync(join(AQUI, 'INSTALAR.md'), 'utf8')).toContain('**Antes de bajar nada**');
    for (const f of ['INSTALL.md', 'INSTALAR.md']) {
      const t = readFileSync(join(AQUI, f), 'utf8');
      expect(t).not.toMatch(/nvidia|cuda|tarjeta gr[aá]fica|graphics card/i);
    }
  });
});
