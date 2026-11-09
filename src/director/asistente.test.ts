import { describe, expect, it } from 'vitest';
import {
  abreSolo, autorizadosConGrupo, autorizadosConPaquete, conPlan, gruposEnElPanel, dejarComoViene, estadoAsistenteDe, marcadoDeEntrada, marcadoHoy, modeloDePlan, modelosDelPaso, MODELO_DE_LOS_DEMAS, MODELO_MAX20,
  PAQUETE_DE_PERMISOS, pasoAnterior, pasoSiguiente, PASOS_ASISTENTE, PLANES_ELEGIBLES, revisarInstalacion,
} from './asistente';
import { negado, permitido, SIN_ESPERAS } from '../../estudio/servidor/revisor';
import { autorizadasPara } from '../../estudio/servidor/permisosNegados';

const PROHIBIDO = [...SIN_ESPERAS, ...negado('C:/proyecto', 'C:/studio')];

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
    expect(abreSolo({ proyectosPropios: 0, modeloElegido: 'claude-sonnet-5-5', estado: { paso: 'permisos' } })).toBe(true);
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

describe('el paquete de permisos recomendados', () => {
  it('los siete grupos vienen marcados: quien instala solo quita lo que no quiera dar (nota del titular nmvypzj9jtit)', () => {
    expect(marcadoDeEntrada()).toEqual(['leer', 'probar', 'commits', 'subir', 'traer', 'publicar', 'instalar']);
    expect(PAQUETE_DE_PERMISOS.filter((g) => !g.marcado)).toEqual([]);
    // «Dejar todo como viene» los acepta todos
    expect(dejarComoViene({}).paquete).toEqual(marcadoDeEntrada());
    // Y al repasar se ve lo que este computador tiene de verdad: lo que no tiene sigue sin marcar, y nada se concede solo
    expect(marcadoHoy([])).toEqual([]);
    expect(dejarComoViene({ paquete: [] }).paquete).toEqual([]);
    expect(dejarComoViene({ paquete: marcadoHoy([{ regla: 'Bash(git add:*)', alcance: 'todos' }, { regla: 'Bash(git commit:*)', alcance: 'todos' }]) }).paquete).toEqual(['commits']);
  });

  it('nada de lo que nunca entra: ni forzar, ni reescribir la historia, ni borrar', () => {
    const todas = PAQUETE_DE_PERMISOS.flatMap((g) => g.reglas).join(' ');
    expect(todas).not.toMatch(/--force|-f\b|rebase|reset|filter-|--amend|git rm|\.env/);
  });

  it('marcado todo, lo que nunca se permite lo sigue filtrando el lanzador', () => {
    const firma = { cuando: 'x', quien: 'Ana' };
    const conTodo = autorizadosConPaquete([{ regla: 'Bash(git push --force:*)', alcance: 'todos', ...firma }, { regla: 'Bash(git reset:*)', alcance: 'todos', ...firma }], marcadoDeEntrada(), firma);
    const reglas = autorizadasPara(conTodo, 'p', PROHIBIDO, 'C:/casa');
    expect(reglas).toEqual(expect.arrayContaining(PAQUETE_DE_PERMISOS.flatMap((g) => g.reglas)));
    expect(reglas).not.toContain('Bash(git push --force:*)');
    expect(reglas).not.toContain('Bash(git reset:*)');
  });

  it('una casilla del panel es la autorización: marcar «publicar» da gh release por el mismo filtro, y lo que nunca sigue fuera (nmvzq8eb4tit)', () => {
    const firma = { cuando: '2026-11-02T00:00:00Z', quien: 'Ana' };
    const pide = (grupo: string, marcado: boolean, alcance: 'proyecto' | 'todos' = 'proyecto') => ({ grupo, marcado, alcance, proyecto: 'p' });
    // Las siete están siempre, sin marcar, antes de hacer falta
    expect(gruposEnElPanel([], 'p').map((g) => [g.id, g.marcado])).toEqual(PAQUETE_DE_PERMISOS.map((g) => [g.id, false]));

    const conPublicar = autorizadosConGrupo([], pide('publicar', true), firma);
    expect(conPublicar).toEqual([
      { regla: 'Bash(npm publish:*)', alcance: 'proyecto', proyecto: 'p', ...firma },
      { regla: 'Bash(gh release:*)', alcance: 'proyecto', proyecto: 'p', ...firma },
    ]);
    expect(gruposEnElPanel(conPublicar, 'p').find((g) => g.id === 'publicar')).toEqual({ id: 'publicar', marcado: true, alcance: 'proyecto' });
    // Para otro proyecto, no vale; por el lanzador pasa, en este
    expect(gruposEnElPanel(conPublicar, 'q').find((g) => g.id === 'publicar')!.marcado).toBe(false);
    expect(autorizadasPara(conPublicar, 'p', PROHIBIDO, 'C:/casa')).toEqual(['Bash(npm publish:*)', 'Bash(gh release:*)']);
    expect(autorizadasPara(conPublicar, 'q', PROHIBIDO, 'C:/casa')).toEqual([]);

    // Lo que nunca se permite, aunque alguien lo guarde al lado, sigue fuera
    const conForzar = autorizadosConGrupo([{ regla: 'Bash(git push --force:*)', alcance: 'todos', ...firma }], pide('subir', true, 'todos'), firma);
    expect(autorizadasPara(conForzar, 'p', PROHIBIDO, 'C:/casa')).toEqual(['Bash(git push:*)']);

    // Para todos reemplaza lo de cada proyecto; y volver a uno, también lo otro
    const paraTodos = autorizadosConGrupo([...conPublicar, { regla: 'Bash(gh release:*)', alcance: 'proyecto', proyecto: 'q', ...firma }], pide('publicar', true, 'todos'), firma);
    expect(paraTodos.map((a) => [a.regla, a.alcance])).toEqual([['Bash(npm publish:*)', 'todos'], ['Bash(gh release:*)', 'todos']]);
    expect(gruposEnElPanel(paraTodos, 'q').find((g) => g.id === 'publicar')).toEqual({ id: 'publicar', marcado: true, alcance: 'todos' });
    expect(autorizadosConGrupo(paraTodos, pide('publicar', true), firma).map((a) => [a.regla, a.alcance, a.proyecto])).toEqual([['Bash(npm publish:*)', 'proyecto', 'p'], ['Bash(gh release:*)', 'proyecto', 'p']]);

    // Desmarcar quita las suyas y nada más; repetir no suma; un grupo que no existe no da nada
    const otra = { regla: 'Bash(curl:*)', alcance: 'todos' as const, ...firma };
    const deOtro = { regla: 'Bash(gh release:*)', alcance: 'proyecto' as const, proyecto: 'q', ...firma };
    expect(autorizadosConGrupo([...conPublicar, otra, deOtro], pide('publicar', false), firma)).toEqual([otra, deOtro]);
    expect(autorizadosConGrupo(conPublicar, pide('publicar', true), { cuando: 'luego', quien: 'Otro' })).toEqual(conPublicar);
    expect(autorizadosConGrupo(conPublicar, pide('rm -rf', true), firma)).toEqual(conPublicar);
  });

  it('marcar y desmarcar: entran y salen solo las reglas del paquete; lo demás autorizado queda', () => {
    const firma = { cuando: '2026-11-01T00:00:00Z', quien: 'Ana' };
    const antes = [
      { regla: 'Bash(curl:*)', alcance: 'todos' as const, cuando: 'x', quien: 'Ana' },
      { regla: 'Bash(git push:*)', alcance: 'todos' as const, cuando: 'x', quien: 'Ana' },
      { regla: 'Bash(git commit:*)', alcance: 'proyecto' as const, proyecto: 'p', cuando: 'x', quien: 'Ana' },
    ];
    const r = autorizadosConPaquete(antes, ['commits'], firma);
    expect(r.map((a) => a.regla).sort()).toEqual(['Bash(curl:*)', 'Bash(git add:*)', 'Bash(git commit:*)']);
    // Lo de todos los proyectos reemplaza lo de uno solo, como en el panel
    expect(r.find((a) => a.regla === 'Bash(git commit:*)')).toMatchObject({ alcance: 'todos', quien: 'Ana' });
    // Repetirlo no suma nada
    expect(autorizadosConPaquete(r, ['commits'], firma)).toEqual(r);
    // Y lo que queda marcado se reconoce al repasar
    expect(marcadoHoy(r)).toEqual(['commits']);
    expect(marcadoHoy([])).toEqual([]);
    // Lo de un solo proyecto no cuenta como del paquete
    expect(marcadoHoy([{ regla: 'Bash(git add:*)', alcance: 'proyecto' }, { regla: 'Bash(git commit:*)', alcance: 'proyecto' }])).toEqual([]);
  });

  it('el mismo lanzador sigue dando lo suyo: el paquete no quita nada de lo que el director ya tiene', () => {
    const base = permitido('C:/x');
    expect(base).toContain('Bash(git commit:*)');
    expect(base).not.toContain('Bash(git push:*)');
  });
});

describe('los pasos y lo que se recuerda', () => {
  it('van en su orden, sin salirse', () => {
    expect(pasoSiguiente('inicio')).toBe('plan');
    expect(pasoSiguiente('plan')).toBe('modelo');
    expect(pasoSiguiente('modelo')).toBe('permisos');
    expect(pasoSiguiente('permisos')).toBe('lista');
    expect(pasoSiguiente('lista')).toBe('voz');
    expect(pasoSiguiente('voz')).toBe('final');
    expect(pasoSiguiente('final')).toBe('final');
    expect(pasoAnterior('inicio')).toBe('inicio');
    expect(pasoAnterior('modelo')).toBe('plan');
    // Las pantallas elegidas el 30 de octubre, en ese orden: la lista va antes de la voz, para guardar antes de una descarga larga
    expect(PASOS_ASISTENTE).toEqual(['inicio', 'plan', 'modelo', 'permisos', 'lista', 'voz', 'final']);
  });

  it('quien cerró en la pantalla de la voz vuelve ahí, con lo que dijo; lo raro no entra', () => {
    expect(estadoAsistenteDe({ paso: 'voz', prueba: 'sin_mic' })).toEqual({ paso: 'voz', prueba: 'sin_mic' });
    expect(estadoAsistenteDe({ paso: 'voz', prueba: 'quizas' })).toEqual({ paso: 'voz' });
    // Lo que se guardó cuando las voces eran opcionales no vale: ahora son obligatorias (nmvzfmvr2tit)
    expect(estadoAsistenteDe({ paso: 'voz', voces: false, sinVoz: true })).toEqual({ paso: 'voz' });
    expect(abreSolo({ proyectosPropios: 0, modeloElegido: 'claude-opus-5-5', estado: { paso: 'voz' } })).toBe(true);
  });

  it('«Dejar todo como viene» acepta lo marcado y lleva a la lista; respeta lo que ya se eligió', () => {
    expect(dejarComoViene({})).toEqual({ paso: 'lista', plan: 'nose', modelo: MODELO_DE_LOS_DEMAS, paquete: ['leer', 'probar', 'commits', 'subir', 'traer', 'publicar', 'instalar'] });
    expect(dejarComoViene({ plan: 'max20', paquete: ['leer'] })).toEqual({ paso: 'lista', plan: 'max20', modelo: MODELO_MAX20, paquete: ['leer'] });
  });

  it('lo guardado se lee con cuidado: lo que no se entiende, fuera', () => {
    expect(estadoAsistenteDe(null)).toBeUndefined();
    expect(estadoAsistenteDe({ paso: 'otra', plan: 'gratis', paquete: ['leer', 'borrar', 3] })).toEqual({ paso: 'inicio', paquete: ['leer'] });
    expect(estadoAsistenteDe({ paso: 'permisos', plan: 'nose', modelo: 'claude-opus-5-5', terminado: 'hoy' })).toEqual({ paso: 'permisos', plan: 'nose', modelo: 'claude-opus-5-5', terminado: 'hoy' });
  });

  it('lo que se pide guardar se revisa: ni un modelo raro, ni reglas de la página', () => {
    expect(revisarInstalacion({ plan: 'gratis', modelo: 'x' })).toEqual({ ok: false, error: 'plan' });
    expect(revisarInstalacion({ plan: 'pro', modelo: 'a b; rm' })).toEqual({ ok: false, error: 'modelo' });
    expect(revisarInstalacion({ plan: 'pro', modelo: 'claude-sonnet-5-5', modo: 'todo' })).toEqual({ ok: false, error: 'modo' });
    expect(revisarInstalacion({ plan: 'pro', modelo: 'claude-opus-5-5[1m]', paquete: ['leer', 'Bash(rm:*)'] })).toEqual({ ok: true, pedido: { plan: 'pro', modelo: 'claude-opus-5-5[1m]', modo: 'pregunta', paquete: ['leer'] } });
  });
});
