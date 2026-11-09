import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cederALaNueva, EVENTO_CEDER, EVENTO_CEDIO } from './recarga';

// El 3 de noviembre de 2026, tres doble clic con el Studio encendido no abrieron pestaña: el servidor contaba «2 páginas
// abiertas» que no se veían, y el lanzador solo abría una si contaba cero
type Escucha = (datos: unknown, pagina: Pagina) => void;
interface Pagina { socket: object; recibio: string[]; send(evento: string): void }
const pagina = (): Pagina => {
  const p: Pagina = { socket: {}, recibio: [], send: (e) => void p.recibio.push(e) };
  return p;
};
const canal = (abiertas: Pagina[]) => {
  const escuchas = new Set<Escucha>();
  return {
    // Como Vite: cada vez un conjunto nuevo, con las mismas páginas
    get clients() { return new Set(abiertas); },
    on: (_: string, f: Escucha) => void escuchas.add(f),
    off: (_: string, f: Escucha) => void escuchas.delete(f),
    conectar(p: Pagina) {
      abiertas.push(p);
      for (const f of [...escuchas]) f(undefined, p);
    },
    escuchas,
  };
};

describe('abrir el Studio otra vez deja una pestaña nueva al frente, y las que había le ceden el lugar', () => {
  it('las que ya estaban ceden solo cuando la nueva se conecta, y una sola vez', () => {
    const [a, b] = [pagina(), pagina()];
    const c = canal([a, b]);
    expect(cederALaNueva(c)).toBe(2);
    // La misma página que se reconecta (por ejemplo, se recargó) no es la nueva: nada se toca todavía
    c.conectar({ ...a, recibio: [] });
    expect([a.recibio, b.recibio]).toEqual([[], []]);
    const nueva = pagina();
    c.conectar(nueva);
    expect([a.recibio, b.recibio, nueva.recibio]).toEqual([[EVENTO_CEDER], [EVENTO_CEDER], []]);
    expect(c.escuchas.size).toBe(0);
    c.conectar(pagina());
    expect(a.recibio).toEqual([EVENTO_CEDER]);
  });

  it('una que se cerró mientras tanto no recibe nada; sin páginas abiertas, nada que esperar', () => {
    const [a, b] = [pagina(), pagina()];
    const abiertas = [a, b];
    const c = canal(abiertas);
    cederALaNueva(c);
    abiertas.splice(abiertas.indexOf(b), 1);
    c.conectar(pagina());
    expect([a.recibio, b.recibio]).toEqual([[EVENTO_CEDER], []]);
    const vacio = canal([]);
    expect(cederALaNueva(vacio)).toBe(0);
    expect(vacio.escuchas.size).toBe(0);
  });

  it('si la nueva no llega (el navegador no se abrió), ninguna cede', async () => {
    const a = pagina();
    const c = canal([a]);
    cederALaNueva(c, 20);
    await new Promise((r) => setTimeout(r, 50));
    expect(c.escuchas.size).toBe(0);
    c.conectar(pagina());
    expect(a.recibio).toEqual([]);
  });

  it('el lanzador siempre abre la pestaña con el Studio encendido, salvo con --sin-abrir, y la página sabe ceder', () => {
    const encender = readFileSync(join(__dirname, '..', '..', 'tools', 'encender.ts'), 'utf-8');
    const yaEncendido = encender.slice(encender.indexOf("if (ya && queHacer === 'recargar')"), encender.indexOf("if (!existsSync(join(raiz, 'node_modules', 'vite'))"));
    expect(yaEncendido).toContain("const abrir = !arg('--sin-abrir');");
    expect(yaEncendido).toContain('if (abrir) abrirNavegador();');
    expect(yaEncendido).not.toContain('!abiertas) abrirNavegador');
    const app = readFileSync(join(__dirname, '..', 'src', 'app.ts'), 'utf-8');
    expect(app).toContain(`import.meta.hot?.on('${EVENTO_CEDER}'`);
    // Y cuenta lo que hizo (se cierra, queda cubierta o espera), para la bitácora
    expect(app).toContain(`import.meta.hot?.send('${EVENTO_CEDIO}'`);
  });
});
