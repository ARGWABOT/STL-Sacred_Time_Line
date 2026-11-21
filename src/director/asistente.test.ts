import { describe, expect, it } from 'vitest';
import {
  abreSolo, conPlan, dejarComoViene, estadoAsistenteDe, modeloDePlan, modelosDelPaso, MODELO_DE_LOS_DEMAS, MODELO_MAX20,
  pasoAnterior, pasoSiguiente, PASOS_ASISTENTE, PLANES_ELEGIBLES, revisarInstalacion,
} from './asistente';
import { permitido } from '../../estudio/servidor/revisor';

describe('cuándo se abre solo (t_decide_asistente_tu_copia)', () => {
  it('sin proyecto propio y sin modelo elegido, sí', () => {
    expect(abreSolo({ proyectosPropios: 0, modeloElegido: null })).toBe(true);
  });

  it('a quien ya tiene su Studio configurado, no', () => {
    expect(abreSolo({ proyectosPropios: 1, modeloElegido: null })).toBe(false);
    expect(abreSolo({ proyectosPropios: 0, modeloElegido: 'claude-opus-5-5' })).toBe(false);
    expect(abreSolo({ proyectosPropios: 3, modeloElegido: 'claude-opus-5-5' })).toBe(false);
  });

  it('quien lo cerró a mitad vuelve aunque ya haya elegido el modelo; terminado, nunca más solo', () => {
    expect(abreSolo({ proyectosPropios: 0, modeloElegido: 'claude-sonnet-5-5', estado: { paso: 'lista' } })).toBe(true);
    expect(abreSolo({ proyectosPropios: 0, modeloElegido: null, estado: { paso: 'lista', terminado: '2026-11-01T00:00:00Z' } })).toBe(false);
  });
});

describe('el modelo que deja, según el plan', () => {
  it('con Max 20x, Opus 5.5; con Max 5x, Pro o «No lo sé», Sonnet 5.5', () => {
    expect(modeloDePlan('max20')).toBe(MODELO_MAX20);
    expect(modeloDePlan('max5')).toBe(MODELO_DE_LOS_DEMAS);
    expect(modeloDePlan('pro')).toBe(MODELO_DE_LOS_DEMAS);
    expect(modeloDePlan('nose')).toBe(MODELO_DE_LOS_DEMAS);
    expect(PLANES_ELEGIBLES).toEqual(['pro', 'max5', 'max20', 'nose']);
  });

  it('su pantalla ofrece primero el que conviene, y también el que ya estaba elegido', () => {
    expect(modelosDelPaso('max20', null)[0]).toBe(MODELO_MAX20);
    expect(modelosDelPaso('pro', null)[0]).toBe(MODELO_DE_LOS_DEMAS);
    expect(modelosDelPaso('pro', 'claude-opus-5-5[1m]')).toContain('claude-opus-5-5[1m]');
  });

  it('cambiar de plan cambia el modelo que conviene', () => {
    expect(conPlan({ paso: 'plan', modelo: MODELO_DE_LOS_DEMAS }, 'max20').modelo).toBe(MODELO_MAX20);
  });
});

describe('el lanzador, sin paquete de permisos', () => {
  it('el director ya tiene lo suyo de siempre y no el subir: lo crítico lo pregunta el aviso, y «Siempre» queda en el panel', () => {
    const base = permitido('C:/x');
    expect(base).toContain('Bash(git commit:*)');
    expect(base).not.toContain('Bash(git push:*)');
  });
});

describe('los pasos y lo que se recuerda', () => {
  it('van en su orden, sin salirse', () => {
    expect(pasoSiguiente('inicio')).toBe('plan');
    expect(pasoSiguiente('plan')).toBe('modelo');
    expect(pasoSiguiente('modelo')).toBe('lista');
    expect(pasoSiguiente('lista')).toBe('voz');
    expect(pasoSiguiente('voz')).toBe('final');
    expect(pasoSiguiente('final')).toBe('final');
    expect(pasoAnterior('inicio')).toBe('inicio');
    expect(pasoAnterior('modelo')).toBe('plan');
    // Las pantallas, en ese orden, sin la de los permisos (nmwpbxn0htit): la lista va antes de la voz, para guardar antes de una descarga larga
    expect(PASOS_ASISTENTE).toEqual(['inicio', 'plan', 'modelo', 'lista', 'voz', 'final']);
  });

  it('quien cerró en la pantalla de la voz vuelve ahí, con lo que dijo; lo raro no entra', () => {
    expect(estadoAsistenteDe({ paso: 'voz', prueba: 'sin_mic' })).toEqual({ paso: 'voz', prueba: 'sin_mic' });
    expect(estadoAsistenteDe({ paso: 'voz', prueba: 'quizas' })).toEqual({ paso: 'voz' });
    // Lo que se guardó cuando las voces eran opcionales no vale: ahora son obligatorias (nmvzfmvr2tit)
    expect(estadoAsistenteDe({ paso: 'voz', voces: false, sinVoz: true })).toEqual({ paso: 'voz' });
    expect(abreSolo({ proyectosPropios: 0, modeloElegido: 'claude-opus-5-5', estado: { paso: 'voz' } })).toBe(true);
  });

  it('«Dejar todo como viene» acepta lo marcado y lleva a la lista; respeta lo que ya se eligió', () => {
    expect(dejarComoViene({})).toEqual({ paso: 'lista', plan: 'nose', modelo: MODELO_DE_LOS_DEMAS });
    expect(dejarComoViene({ plan: 'max20' })).toEqual({ paso: 'lista', plan: 'max20', modelo: MODELO_MAX20 });
  });

  it('lo guardado se lee con cuidado: lo que no se entiende, fuera', () => {
    expect(estadoAsistenteDe(null)).toBeUndefined();
    expect(estadoAsistenteDe({ paso: 'otra', plan: 'gratis', paquete: ['leer', 'borrar', 3] })).toEqual({ paso: 'inicio' });
    expect(estadoAsistenteDe({ paso: 'lista', plan: 'nose', modelo: 'claude-opus-5-5', terminado: 'hoy' })).toEqual({ paso: 'lista', plan: 'nose', modelo: 'claude-opus-5-5', terminado: 'hoy' });
    // Quien quedó en la pantalla de los permisos, que ya no existe, sigue en la lista, sin el paquete que guardó
    expect(estadoAsistenteDe({ paso: 'permisos', plan: 'pro', paquete: ['leer'] })).toEqual({ paso: 'lista', plan: 'pro' });
  });

  it('lo que se pide guardar se revisa: ni un modelo raro, ni un paquete de reglas de la página', () => {
    expect(revisarInstalacion({ plan: 'gratis', modelo: 'x' })).toEqual({ ok: false, error: 'plan' });
    expect(revisarInstalacion({ plan: 'pro', modelo: 'a b; rm' })).toEqual({ ok: false, error: 'modelo' });
    expect(revisarInstalacion({ plan: 'pro', modelo: 'claude-sonnet-5-5', modo: 'todo' })).toEqual({ ok: false, error: 'modo' });
    expect(revisarInstalacion({ plan: 'pro', modelo: 'claude-opus-5-5[1m]', paquete: ['leer', 'Bash(rm:*)'] })).toEqual({ ok: true, pedido: { plan: 'pro', modelo: 'claude-opus-5-5[1m]', modo: 'pregunta' } });
  });
});
