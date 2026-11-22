import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PASOS_ASISTENTE } from '../../src/director/asistente';
import { abrirConReintentos, botonesDe, bloqueSesion, cuerpoDe } from './asistente';
import { ponerIdioma, t } from './textos';

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
    for (const p of ['inicio', 'plan', 'modelo'] as const) expect(botonesDe(p, { ok: true }, false)).toContain('Dejar todo como viene');
    for (const p of ['inicio', 'plan', 'modelo', 'lista'] as const) expect(botonesDe(p, { ok: true }, false)).not.toContain('data-asistente-cerrar');
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

  it('no hay pantalla de permisos (nmwpbxn0htit): la lista dice el plan y el modelo, sin paquete de permisos, con cómo cambiar cada cosa', () => {
    expect(PASOS_ASISTENTE).not.toContain('permisos');
    const html = cuerpoDe({ paso: 'lista', plan: 'max20', modelo: 'claude-opus-5-5', modo: 'pregunta' }, null, null);
    const texto = sinMarcas(html);
    for (const x of ['Max 20x', 'Opus 5.5']) expect(texto).toContain(x);
    expect(texto).not.toContain('Le permites');
    expect(html).not.toContain('data-asistente-grupo');
    expect(html.match(/data-asistente-ir=/g)?.length).toBe(2);
    const fuente = readFileSync(new URL('./asistente.ts', import.meta.url), 'utf8');
    expect(fuente).not.toContain('paquete');
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
    const pantallas = (['inicio', 'plan', 'modelo', 'lista', 'voz', 'final'] as const).map((paso) => cuerpoDe({ paso, plan: 'pro', modelo: 'claude-sonnet-5-5' }, FALTA, null) + botonesDe(paso, { ok: true }, false));
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

describe('abrir la terminal con reintentos y, si no, «copia la orden»', () => {
  it('si abre a la primera, no reintenta', async () => {
    const pedir = vi.fn(async () => ({ ok: true }));
    const r = await abrirConReintentos(pedir, () => {}, 3, 0);
    expect(r).toMatchObject({ ok: true, intentos: 1 });
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('si no abre, lo vuelve a pedir y avisa qué intento viene; si el segundo abre, para ahí', async () => {
    const respuestas = [{ ok: false, error: 'x' }, { ok: true }];
    const pedir = vi.fn(async () => respuestas.shift()!);
    const avisos: [number, number][] = [];
    const r = await abrirConReintentos(pedir, (n, total) => avisos.push([n, total]), 3, 0);
    expect(r).toMatchObject({ ok: true, intentos: 2 });
    expect(avisos).toEqual([[2, 3]]);
  });

  it('si no abre en ninguno de los 3 intentos, lo dice para mostrar «copia la orden»', async () => {
    const pedir = vi.fn(async () => ({ ok: false, error: 'sin terminal' }));
    const r = await abrirConReintentos(pedir, () => {}, 3, 0);
    expect(r).toMatchObject({ ok: false, error: 'sin terminal', intentos: 3 });
    expect(pedir).toHaveBeenCalledTimes(3);
  });

  it('el mensaje de «copia la orden» está en los dos idiomas, el aviso está en la pantalla y la bandera se suelta', () => {
    expect(t('asistente.copiaLaOrden')).toContain('Copiar');
    ponerIdioma('en');
    expect(t('asistente.copiaLaOrden')).toContain('Copy');
    ponerIdioma('es');
    expect(bloqueSesion({ ok: false, falta: 'sesion', orden: 'claude auth login' })).toContain('data-asistente-terminal-aviso');
    const fuente = readFileSync(new URL('./asistente.ts', import.meta.url), 'utf8');
    expect(fuente).toContain('abriendoTerminal = false;');
    expect(fuente).toContain("t('asistente.copiaLaOrden')");
  });
});
