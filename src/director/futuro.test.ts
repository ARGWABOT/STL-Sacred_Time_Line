import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { misionesDeFuturo, type Mision, type Plan } from './director';

// Nunca se pregunta por lo que aún no pasó (nota de voz del titular nmvptrd58tit, 26 de octubre de 2026: «no puedes
// asignar misiones […] en la cual le preguntes al usuario si ya sucedió dentro de un entorno que él no va a poder
// verificar»)
const mision = (id: string, pasos: Mision['pasos'], titulo = 'Mira algo'): Mision =>
  ({ id, para: 'titular', fase: 'f', frente: 'x', titulo, porQue: 'p', pasos, entrega: 'e', xp: 10 }) as Mision;

describe('las misiones no preguntan por lo que aún no pasó', () => {
  it('--listo no cierra con una pregunta nueva sobre la próxima revisión o la próxima vez', () => {
    const plan = {
      misiones: [
        mision('a', [{ texto: 'En tu próxima revisión, usa «Permitir siempre». ¿Qué pasó?', opciones: ['Lo usé', 'No'] }]),
        mision('b', [{ texto: 'La próxima vez que me dejes una nota de voz larga, mira cómo termina. ¿Cómo terminó?' }]),
        mision('c', [{ texto: 'En la revisión siguiente, el diálogo vuelve.', opciones: ['Fue así'] }]),
        mision('d', [], 'Prueba algo en tu próxima revisión'),
      ],
    } as unknown as Plan;
    expect(misionesDeFuturo(plan, null).map((f) => f.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('lo que se ve ahora, lo que solo informa del futuro sin preguntar, lo ya guardado y lo entregado no cuentan', () => {
    const vieja = mision('v', [{ texto: 'En tu próxima revisión, mira. ¿Qué pasó?', opciones: ['Bien'] }]);
    const plan = {
      misiones: [
        mision('ahora', [{ texto: 'Abre la ventana del modo enfoque y achícala. ¿Se desplaza de lado?', opciones: ['No', 'Sí'] }]),
        mision('informa', [{ texto: 'Con tu «Autorizo», lo hago en la revisión siguiente.' }]),
        vieja,
        mision('entregada', [{ texto: 'La próxima vez, mira. ¿Pasó?', opciones: ['Sí'] }]),
      ],
    } as unknown as Plan;
    expect(misionesDeFuturo(plan, { misiones: [vieja] } as Plan, new Set(['entregada']))).toEqual([]);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('misionesDeFuturo(plan, guardado)');
  });

  // Una revisión nunca es el escenario de un paso (notas de voz del titular nmvy37ipstit y nmvy3a9txtit, 1 de noviembre)
  const lineaArranque = 'Oprime «Pedir revisión», en la cabecera, y mira la línea de la barra de la izquierda. Puede quedarse quieta un momento mientras llega lo nuevo. Después el director debe aparecer y recoger tus ramas. Elige cómo fue.';
  const globosVivos = 'Mientras el director revisa, oprime su cara en la línea para abrir «Lo que va haciendo». Mira tres cosas. Elige cómo vamos.';
  const windows = 'Cuando el Studio abra en ese computador, entrega un proyecto cualquiera y oprime «Pedir revisión», en la cabecera: la revisión la pide siempre la persona, nunca sale sola. ¿Cómo terminó?';

  it('un paso no manda a pedir una revisión ni a mirar algo durante una, aunque no pregunte', () => {
    const plan = {
      misiones: [
        mision('linea', [{ texto: lineaArranque, opciones: ['Enteras', 'Se la saltó'] }]),
        mision('globos', [{ texto: globosVivos, opciones: ['Bien', 'Más'] }]),
        mision('titulo', ['Mira'], 'Mira los globos mientras el director revisa'),
        mision('detalle', [{ texto: 'Mira la línea.', detalle: ['Mientras el director revisa, puedes seguir.'] }]),
        mision('seguidas', ['Usa «Pedir revisiones seguidas» y deja que corran.']),
        mision('palabras', ['Haz lo anterior y luego pide la revisión.']),
        mision('cuando', ['Fíjate en el reloj cuando pidas la revisión.']),
        mision('durante', ['Mira las cifras durante la revisión.']),
        mision('ingles', ['Press «Request review», above, and watch the line.']),
        mision('ingles2', ['Look at the balloons while the director reviews.']),
      ],
    } as unknown as Plan;
    expect([...new Set(misionesDeFuturo(plan, null).map((f) => f.id))]).toEqual(['linea', 'globos', 'titulo', 'detalle', 'seguidas', 'palabras', 'cuando', 'durante', 'ingles', 'ingles2']);
  });

  it('lo que pasa en otro Studio, lo que ya pasó y lo que solo nombra el botón sí pasan', () => {
    const enOtro = { texto: 'En ese computador, baja el paquete.', soloTu: 'Pasa en otro computador.' };
    const plan = {
      misiones: [
        { ...mision('t_instalar_windows', [enOtro, { texto: windows, opciones: ['Llegó', 'No llegó'] }]), alCierre: true },
        mision('ultima_vez', [{ texto: 'En la revisión que pediste con «Pedir revisión», ¿cómo se vio la entrada del director la última vez?', opciones: ['Entera', 'Se la saltó'] }]),
        mision('pasada', ['Cuando oprimiste «Pedir revisión», mira qué recuerdas: mientras el director revisaba, ¿se movió la línea?']),
        mision('durante_pasada', [{ texto: '¿Cómo se vieron las cifras durante la revisión pasada?', opciones: ['Bien', 'Mal'] }]),
        mision('boton', [{ texto: 'La otra forma es en la cabecera, junto a «Pedir revisión»: se nota más. Elige.', opciones: ['Barra', 'Cabecera'] }]),
      ],
    } as unknown as Plan;
    expect(misionesDeFuturo(plan, null)).toEqual([]);
    // Sin ser del cierre, o sin pasar en otro computador, la misma frase no pasa
    plan.misiones[0] = { ...mision('sin_cierre', [enOtro, { texto: windows, opciones: ['Llegó', 'No llegó'] }]) };
    plan.misiones[1] = { ...mision('sin_otro', [{ texto: windows, opciones: ['Llegó', 'No llegó'] }]), alCierre: true };
    expect(misionesDeFuturo(plan, null).map((f) => f.id)).toEqual(['sin_cierre', 'sin_otro']);
  });
});
