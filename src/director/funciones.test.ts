// Las funciones del Studio que cada proyecto adopta (nota del titular nmwjn980ctit): la lista, cómo se comprueba cada una
// y el aviso de un paso que manda a localhost a mano.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validarPlan, type Plan } from './director.ts';
import { atajosSinPestanaQa, avisosDePasosALocal, FUNCIONES_DEL_STUDIO, funcionesSinAdoptar, LINEA_PESTANA_QA, lineasDeFuncionesSinAdoptar, pasoALocalSinAtajo, pestanaQaDelProyecto } from './funciones.ts';
import { procedimientosDeLaRevision } from './procedimientos.ts';
import { aplicarParche } from './parche.ts';

const raiz = join(__dirname, '..', '..');
const sinNada = { existeEnElRepositorio: () => false };
const plan = (extra: Partial<Plan> = {}): Plan => ({ fases: [], frentes: [], misiones: [], propuestas: [], ...extra }) as unknown as Plan;
const mision = (pasos: unknown[], id = 't_x') => ({ id, para: 'titular', fase: 'f', frente: 'x', titulo: 'T', porQue: 'p', pasos, entrega: 'e', xp: 10 });

describe('las funciones del Studio que cada proyecto adopta (nmwjn980ctit)', () => {
  it('la puerta local está en la lista, con su procedimiento y su parte, que existen', () => {
    const puerta = FUNCIONES_DEL_STUDIO.find((f) => f.id === 'puerta_local');
    expect(puerta).toBeDefined();
    const doc = readFileSync(join(raiz, puerta!.procedimiento), 'utf8');
    expect(doc).toContain(`## ${puerta!.seccion}`);
  });

  it('un proyecto en marcha sin la puerta la tiene por adoptar; con el interruptor, un atajo o lo anotado, ya no', () => {
    expect(funcionesSinAdoptar(plan(), sinNada).map((f) => f.id)).toEqual(['puerta_local']);
    expect(lineasDeFuncionesSinAdoptar(funcionesSinAdoptar(plan(), sinNada))[0]).toMatch(/Not adopted: the local door[^]*diagnosis\.md › «The local door»/);
    // Construida: el interruptor en la raíz del repositorio
    expect(funcionesSinAdoptar(plan(), { existeEnElRepositorio: (r) => r === '.stl-puerta' })).toEqual([]);
    // Un paso ya con su atajo
    expect(funcionesSinAdoptar(plan({ misiones: [mision([{ texto: 'Mira', atajo: { url: 'http://localhost:3000/', rol: 'admin', como: 'the admin' } }])] } as never), sinNada)).toEqual([]);
    // No le sirve (no es web), con su porqué
    expect(funcionesSinAdoptar(plan({ funciones: { puerta_local: { cuando: '2026-11-16', estado: 'no_aplica', nota: 'Sin inicio de sesión.' } } }), sinNada)).toEqual([]);
    // Sin nota no vale; una decisión, solo con su misión
    expect(funcionesSinAdoptar(plan({ funciones: { puerta_local: { cuando: '2026-11-16', estado: 'no_aplica', nota: ' ' } } }), sinNada)).toHaveLength(1);
    expect(funcionesSinAdoptar(plan({ funciones: { puerta_local: { cuando: '2026-11-16', estado: 'decision', nota: 'Se pregunta.', decision: 't_no' } } }), sinNada)).toHaveLength(1);
    expect(funcionesSinAdoptar(plan({ misiones: [mision(['a'], 't_si')], funciones: { puerta_local: { cuando: '2026-11-16', estado: 'decision', nota: 'Se pregunta.', decision: 't_si' } } } as never), sinNada)).toEqual([]);
  });

  it('avisa del paso que manda a localhost a mano sin atajo, no del que lo lleva, ni de una misión aprobada', () => {
    expect(pasoALocalSinAtajo({ texto: 'Abre http://localhost:8000/login y entra.' })).toBe(true);
    expect(pasoALocalSinAtajo({ texto: 'Mira', ir: { url: 'http://127.0.0.1:3000/x' } })).toBe(true);
    expect(pasoALocalSinAtajo({ texto: 'Mira', atajo: { url: 'http://localhost:3000/', rol: 'a', como: 'b' } })).toBe(false);
    expect(pasoALocalSinAtajo({ texto: 'Abre https://ejemplo.com' })).toBe(false);
    const p = plan({ misiones: [mision([{ texto: 'Abre http://localhost:8000/ y entra con tu cuenta.' }]), mision([{ texto: 'Abre http://localhost:8000/' }], 't_vieja')], revisiones: { t_vieja: { cuando: 'x', veredicto: 'aprobada', comentario: '' } } } as never);
    const avisos = avisosDePasosALocal(p, (id) => id === 't_vieja');
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(/Step 1 of mission «t_x»[^]*atajo/);
    // validarPlan lo deja en sus avisos, no en sus errores: un proyecto que aún no adopta la puerta conserva su plan
    const fuera: string[] = [];
    const errores = validarPlan(p, undefined, undefined, fuera);
    expect(fuera).toEqual(avisos);
    expect(errores.join('\n')).not.toContain('localhost address by hand');
    // Con la puerta anotada como no_aplica, no hay aviso
    expect(avisosDePasosALocal({ ...p, funciones: { puerta_local: { cuando: 'x', estado: 'no_aplica', nota: 'No es web.' } } } as Plan, () => false)).toEqual([]);
  });

  it('la pestaña de QA sale del proyecto mismo (nmwpou0wptit): sí con la puerta, no con no_aplica, sin saber antes', () => {
    const atajo = { url: 'http://localhost:3000/', rol: 'admin', como: 'the admin' };
    const noAplica = { puerta_local: { cuando: 'x', estado: 'no_aplica' as const, nota: 'No es web.' } };
    expect(pestanaQaDelProyecto(plan())).toBe('sin_saber');
    expect(pestanaQaDelProyecto(plan({ funciones: { puerta_local: { cuando: 'x', estado: 'adoptada', nota: 'Construida.' } } }))).toBe('si');
    expect(pestanaQaDelProyecto(plan({ misiones: [mision([{ texto: 'Mira', atajo }])] } as never))).toBe('si');
    expect(pestanaQaDelProyecto(plan({ funciones: noAplica }))).toBe('no');
    // Un atajo no la da si el director anotó que no tiene: ese paso es el error
    expect(pestanaQaDelProyecto(plan({ funciones: noAplica, misiones: [mision([{ texto: 'Mira', atajo }])] } as never))).toBe('no');
    // El Studio mismo la tiene, para su página pública, aunque no tenga puerta
    expect(pestanaQaDelProyecto(plan({ funciones: noAplica }), true)).toBe('si');
    // La bandeja se lo dice al director, en una línea por estado
    expect(Object.keys(LINEA_PESTANA_QA).sort()).toEqual(['no', 'si', 'sin_saber']);
    expect(LINEA_PESTANA_QA.no).toMatch(/Never write a step with an `atajo`/);
    expect(readFileSync(join(raiz, 'tools', 'director', 'bandeja.ts'), 'utf8')).toContain('LINEA_PESTANA_QA[pestanaQaDelProyecto(plan,');
  });

  it('el director no puede escribir un atajo a la pestaña de QA en un proyecto sin ella (nmwpouy68tit)', () => {
    const atajo = { url: 'http://localhost:3000/', rol: 'admin', como: 'the admin' };
    const noAplica = { puerta_local: { cuando: 'x', estado: 'no_aplica' as const, nota: 'Es una tesis.' } };
    const p = plan({ funciones: noAplica, misiones: [mision(['Lee el capítulo.', { texto: 'Mira', atajo }]), mision([{ texto: 'Mira', atajo }], 't_vieja')], revisiones: { t_vieja: { cuando: 'x', veredicto: 'aprobada', comentario: '' } } } as never);
    const errores = atajosSinPestanaQa(p, (id) => id === 't_vieja');
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/Step 2 of mission «t_x» carries an `atajo`[^]*has none/);
    // Es un error de validarPlan: ni --aplicar ni --listo lo dejan pasar
    expect(validarPlan(p).join('\n')).toContain('Step 2 of mission «t_x» carries an `atajo`');
    // Con la puerta, o sin decidir todavía, el atajo vale
    expect(atajosSinPestanaQa({ ...p, funciones: { puerta_local: { cuando: 'x', estado: 'adoptada', nota: 'Construida.' } } } as Plan, () => false)).toEqual([]);
    expect(atajosSinPestanaQa({ ...p, funciones: undefined } as Plan, () => false)).toEqual([]);
  });

  it('el parche escribe `funciones` entera', () => {
    const r = aplicarParche(plan(), { funciones: { puerta_local: { cuando: 'x', estado: 'no_aplica', nota: 'No es web.' } } });
    expect(r.errores).toEqual([]);
    expect(r.plan.funciones?.puerta_local?.estado).toBe('no_aplica');
  });

  it('validarPlan no deja pasar una función que no existe, ni una decisión sin su misión', () => {
    const e = validarPlan(plan({ funciones: { otra: { cuando: 'x', estado: 'adoptada', nota: 'n' }, puerta_local: { cuando: 'x', estado: 'decision', nota: 'n', decision: 't_nada' } } }));
    expect(e.join('\n')).toContain('«otra», que no es una función del Studio');
    expect(e.join('\n')).toContain('«t_nada» no existe');
  });

  it('la bandeja lo muestra, --listo no cierra sin ello, y con algo por adoptar se lee el diagnóstico', () => {
    const bandeja = readFileSync(join(raiz, 'tools', 'director', 'bandeja.ts'), 'utf8');
    expect(bandeja).toContain("linea('\\n## The Studio\\'s features this project has not adopted')");
    expect(bandeja).toMatch(/Review not closed: this project has not adopted/);
    expect(procedimientosDeLaRevision({ etapa: 'en_marcha', funcionesPorAdoptar: true })).toContain('diagnostico');
    expect(procedimientosDeLaRevision({ etapa: 'en_marcha' })).not.toContain('diagnostico');
    // Y la regla está en el ciclo de revisión, en sus dos versiones, y en CLAUDE.md
    expect(readFileSync(join(raiz, 'docs', 'metodo', 'director', 'review-cycle.md'), 'utf8')).toContain("The Studio's features, adopted by every project");
    expect(readFileSync(join(raiz, 'docs', 'metodo', 'director', 'review-cycle.es.md'), 'utf8')).toContain('Las funciones del Studio, adoptadas por cada proyecto');
    expect(readFileSync(join(raiz, 'CLAUDE.md'), 'utf8')).toContain('**Every project adopts every Studio feature** (`funciones.ts`)');
  });
});
