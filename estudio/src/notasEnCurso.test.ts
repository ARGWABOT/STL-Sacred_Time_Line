import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { NotasEnCurso } from './notasEnCurso.ts';

describe('las notas en curso de cada proyecto (nmwdwg5yvtit)', () => {
  it('cuenta las de cada proyecto por separado y se suelta una sola vez', () => {
    const n = new NotasEnCurso();
    const a = n.empieza('app');
    n.empieza('app');
    n.empieza('stl');
    expect(n.en('app')).toBe(2);
    a();
    a();
    expect(n.en('app')).toBe(1);
    expect(n.en('stl')).toBe(1);
    expect(n.en('otro')).toBe(0);
  });

  it('avisa cuando un proyecto queda libre, y no antes', () => {
    const n = new NotasEnCurso();
    const libres: string[] = [];
    n.alQuedarLibre = (p) => libres.push(p);
    const a = n.empieza('app');
    const b = n.empieza('app');
    a();
    expect(libres).toEqual([]);
    b();
    expect(libres).toEqual(['app']);
  });

  it('esperar resuelve al terminar la última, o false al pasar su tope', async () => {
    vi.useFakeTimers();
    try {
      const n = new NotasEnCurso();
      expect(await n.esperar('app', 1000)).toBe(true);
      const soltar = n.empieza('app');
      const espera = n.esperar('app', 5000);
      soltar();
      expect(await espera).toBe(true);
      n.empieza('stl');
      const tarde = n.esperar('stl', 1000);
      vi.advanceTimersByTime(1001);
      expect(await tarde).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('la página y el servidor las esperan antes de pedir la revisión y de cambiar de proyecto', () => {
    const app = readFileSync(join(process.cwd(), 'estudio/src/app.ts'), 'utf8');
    const api = readFileSync(join(process.cwd(), 'estudio/servidor/api.ts'), 'utf8');
    const cuerpo = (texto: string, desde: string) => texto.slice(texto.indexOf(desde), texto.indexOf(desde) + 2500);
    // La página: la revisión pedida y el cambio de proyecto esperan las de su proyecto; dictar y guardar la corrección cuentan
    expect(cuerpo(app, 'async function pedirLaRevision(')).toMatch(/notasEnCurso\.en\(d\.activo\)[\s\S]*notasEnCurso\.esperar\(de, /);
    expect(cuerpo(app, 'async function activar(')).toMatch(/notasEnCurso\.esperar\(d\.activo, [\s\S]*director\/activo/);
    expect(cuerpo(app, 'async function dictar(')).toContain('notasEnCurso.durante(d.activo');
    expect(app).toContain('guardar: (r, senal) => notasEnCurso.durante(deEste, async () => {');
    // El servidor: la cola y «/dictar» cuentan, el revisor las mira y «/activo» espera las del proyecto de antes
    expect(api).toContain('soltarAudio.set(audio, notasEnCurso.empieza(id));');
    expect(cuerpo(api, "ruta === '/dictar'")).toContain('notasEnCurso.empieza(id)');
    expect(api).toContain('revisor.notasEnCurso = (p) => notasEnCurso.en(p);');
    expect(cuerpo(api, "ruta === '/activo'")).toContain('await notasEnCurso.esperar(antes, ');
  });

  it('durante cuenta mientras corre y suelta aunque falle', async () => {
    const n = new NotasEnCurso();
    let dentro = -1;
    await n.durante('app', async () => { dentro = n.en('app'); });
    expect(dentro).toBe(1);
    await expect(n.durante('app', async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(n.en('app')).toBe(0);
  });

  it('un guardado que sigue por detrás tras «Dejar de esperar» cuenta hasta que termina, y la revisión o el cambio de proyecto lo esperan (nmwehuc6jtit)', async () => {
    const n = new NotasEnCurso();
    let terminarGuardado = () => {};
    // La ventana se cerró, pero la promesa del guardado sigue viva: nadie la espera, y aun así cuenta
    const guardado = n.durante('app', () => new Promise<boolean>((ok) => (terminarGuardado = () => ok(true))));
    expect(n.en('app')).toBe(1);
    expect(n.en('stl')).toBe(0);
    let libre: boolean | null = null;
    const espera = n.esperar('app', 5_000).then((x) => (libre = x));
    await Promise.resolve();
    expect(libre).toBeNull();
    terminarGuardado();
    await expect(guardado).resolves.toBe(true);
    await espera;
    expect(libre).toBe(true);
    expect(n.en('app')).toBe(0);
  });
});
