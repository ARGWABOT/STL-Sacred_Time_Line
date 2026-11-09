import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { botonesDe, bloqueSesion, cuerpoDe } from './asistente';
import { ponerIdioma } from './textos';
import { es } from './textos/es';

afterEach(() => ponerIdioma('es'));

const sinMarcas = (x: string) => x.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const FALTA = { ok: false, falta: 'sesion', orden: 'claude auth login' } as const;

describe('la ventana del asistente de instalación (pd_valores_instalar)', () => {
  it('sin la sesión de Claude Code, guía paso a paso y no deja seguir', () => {
    const bloque = bloqueSesion(FALTA);
    expect(bloque).toContain('claude auth login');
    expect(bloque).toContain('data-asistente-terminal');
    expect(bloque).toContain('data-asistente-comprobar');
    // Mientras falte, y mientras se comprueba, no hay con qué seguir
    for (const s of [FALTA, null]) {
      expect(botonesDe('inicio', s, false)).toBe('');
      expect(botonesDe('inicio', s, true)).not.toContain('data-asistente-siguiente');
    }
    expect(botonesDe('inicio', { ok: true }, false)).toContain('data-asistente-como-viene');
    expect(botonesDe('inicio', { ok: true }, false)).toContain('data-asistente-siguiente');
    // Y el idioma se elige ahí mismo
    expect(cuerpoDe({ paso: 'inicio' }, null, null)).toContain('data-idioma="en"');
  });

  it('«Dejar todo como viene» está desde el primero; cerrar, solo al repasar', () => {
    for (const p of ['inicio', 'plan', 'modelo', 'permisos'] as const) expect(botonesDe(p, { ok: true }, false)).toContain('Dejar todo como viene');
    for (const p of ['inicio', 'plan', 'modelo', 'permisos', 'lista'] as const) expect(botonesDe(p, { ok: true }, false)).not.toContain('data-asistente-cerrar');
    expect(botonesDe('lista', { ok: true }, true)).toContain('data-asistente-cerrar');
  });

  it('el plan trae «No lo sé», con su enlace a la cuenta de Claude, y marca lo elegido', () => {
    const html = cuerpoDe({ paso: 'plan', plan: 'max5' }, null, null);
    for (const x of ['Pro', 'Max 5x', 'Max 20x', 'No lo sé']) expect(sinMarcas(html)).toContain(x);
    expect(html).toContain('href="https://claude.ai/settings/usage"');
    expect(html).toMatch(/value="max5" checked/);
    expect(html).not.toMatch(/value="pro" checked/);
  });

  it('el modelo sale del plan, con lo que ya se eligió marcado', () => {
    const conMax = cuerpoDe({ paso: 'modelo', plan: 'max20' }, null, null);
    expect(conMax).toMatch(/value="claude-opus-5-5" checked/);
    expect(sinMarcas(conMax)).toContain('alto');
    expect(cuerpoDe({ paso: 'modelo', plan: 'nose' }, null, null)).toMatch(/value="claude-sonnet-5-5" checked/);
    expect(cuerpoDe({ paso: 'modelo', plan: 'pro', modelo: 'claude-opus-5-5' }, null, null)).toMatch(/value="claude-opus-5-5" checked/);
  });

  it('los permisos: los siete marcados de entrada, cada uno con por qué y en qué casos hace falta (nmvypzj9jtit)', () => {
    const html = cuerpoDe({ paso: 'permisos' }, null, null);
    for (const g of ['leer', 'probar', 'commits', 'subir', 'traer', 'publicar', 'instalar']) expect(html).toMatch(new RegExp(`value="${g}" checked`));
    for (const texto of [es['asistente.grupo.subirCuando'], es['asistente.grupo.publicarCuando'], es['asistente.grupo.instalarCuando']]) expect(html).toContain(texto);
    expect(sinMarcas(html)).toContain('desmarca');
    expect(html).toMatch(/value="pregunta" checked/);
    // Retoma con lo que ya eligió
    const retoma = cuerpoDe({ paso: 'permisos', paquete: ['subir'], modo: 'autorizado' }, null, null);
    expect(retoma).toMatch(/value="subir" checked/);
    expect(retoma).not.toMatch(/value="leer" checked/);
    expect(retoma).toMatch(/value="autorizado" checked/);
  });

  it('la lista dice lo que quedó, con cómo cambiar cada cosa', () => {
    const html = cuerpoDe({ paso: 'lista', plan: 'max20', modelo: 'claude-opus-5-5', modo: 'pregunta', paquete: ['leer', 'commits'] }, null, null);
    const texto = sinMarcas(html);
    for (const x of ['Max 20x', 'Opus 5.5', 'Me pregunta en el Studio', 'Leer el repositorio', 'Hacer commits locales']) expect(texto).toContain(x);
    expect(html.match(/data-asistente-ir=/g)?.length).toBe(4);
  });

  it('la pantalla de la voz: no se sigue hasta poder, y al repasar o en la muestra nada se guarda solo', () => {
    expect(cuerpoDe({ paso: 'voz' }, null, null)).toContain('data-voz-transcripcion');
    // Sin poder seguir, no hay con qué; pudiendo, sí; y la primera vez no se cierra
    expect(botonesDe('voz', { ok: true }, false, false)).toBe('');
    expect(botonesDe('voz', { ok: true }, false, true)).toContain('data-asistente-siguiente');
    expect(botonesDe('voz', { ok: true }, false, true)).not.toContain('data-asistente-cerrar');
    expect(botonesDe('voz', { ok: true }, true, true)).toContain('data-asistente-cerrar');
    // Al repasar, la lista deja seguir sin guardar; en la muestra, ni se ofrece guardar
    expect(botonesDe('lista', { ok: true }, true)).toContain('Seguir sin guardar');
    expect(botonesDe('lista', { ok: true }, true)).toContain('data-asistente-guardar');
    expect(botonesDe('lista', { ok: true }, true, false, true)).not.toContain('data-asistente-guardar');
    expect(botonesDe('lista', { ok: true }, false)).not.toContain('Seguir sin guardar');
    // Guardar no termina: lleva a la voz, y solo «/asistente/terminar» la cierra del todo
    const fuente = readFileSync(new URL('./asistente.ts', import.meta.url), 'utf8');
    expect(fuente).toContain("ir('voz');");
    expect(fuente).toContain('`${RUTA}/terminar`');
    const api = readFileSync(new URL('../servidor/api.ts', import.meta.url), 'utf8');
    expect(api.slice(api.indexOf("ruta === '/asistente/aplicar'"), api.indexOf("ruta === '/asistente/voz'"))).not.toContain('terminado: cuando');
    // La grabadora no aparta la ventana: la frase sigue a la vista
    expect(fuente).toContain('new Grabadora(caja, true)');
  });

  it('la pantalla final: STL Studio activo y entregar el primer proyecto; lo que termina es esta, y al repasar solo se cierra', () => {
    const texto = sinMarcas(cuerpoDe({ paso: 'final' }, null, null));
    expect(texto).toContain('STL Studio');
    const botones = botonesDe('final', { ok: true }, false);
    expect(botones).toContain('data-asistente-terminar="entregar"');
    expect(botones).toContain('data-asistente-terminar="seguir"');
    expect(botones).toContain('Entregar mi primer proyecto');
    // No se cierra sin terminar, ni se vuelve atrás
    expect(botones).not.toContain('data-asistente-cerrar');
    expect(botones).not.toContain('data-asistente-volver');
    expect(botonesDe('final', { ok: true }, true)).toContain('data-asistente-cerrar');
    expect(botonesDe('final', { ok: true }, true)).not.toContain('data-asistente-terminar');
    // En la muestra se ven, y no terminan nada
    const muestra = botonesDe('final', { ok: true }, true, false, true);
    expect(muestra).toContain('Entregar mi primer proyecto');
    expect(muestra).not.toContain('data-asistente-terminar');
    expect(muestra).toContain('data-asistente-cerrar');
    // «Entregar» abre el diálogo de entregar un proyecto, ya con la página al día
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
    expect(app).toContain("sessionStorage.setItem(CLAVE_ENTREGAR_AL_CARGAR, '1');");
    expect(app).toContain('void nuevoProyecto();');
  });

  it('en inglés, en todas sus pantallas', () => {
    ponerIdioma('en');
    const pantallas = (['inicio', 'plan', 'modelo', 'permisos', 'lista', 'voz', 'final'] as const).map((paso) => cuerpoDe({ paso, plan: 'pro', modelo: 'claude-sonnet-5-5', paquete: ['leer'] }, FALTA, null) + botonesDe(paso, { ok: true }, false));
    const todo = sinMarcas(pantallas.join(' '));
    expect(todo).toContain('Leave everything as it comes');
    expect(todo).not.toMatch(/\b(el|la|los|las|tu|para|con|Dejar|Seguir|Volver|Comprobando)\b/);
  });

  it('no se cierra sin elegir: Esc no hace nada la primera vez, y la página lo arranca al cargar', () => {
    const fuente = readFileSync(new URL('./asistente.ts', import.meta.url), 'utf8');
    expect(fuente).toContain("if (!repaso) e.preventDefault();");
    expect(fuente).toContain('if (datos?.abre) abrir(datos, false, alTerminar);');
    expect(readFileSync(new URL('./app.ts', import.meta.url), 'utf8')).toContain('void iniciarAsistente(');
    expect(readFileSync(new URL('./modeloDelDirector.ts', import.meta.url), 'utf8')).toContain('data-repasar-instalacion');
  });
});
