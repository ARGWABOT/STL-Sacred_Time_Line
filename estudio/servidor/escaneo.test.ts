// El escaneo del equipo sobre un computador falso: un historial de Claude Code que apunta a un repositorio (y a un
// worktree suyo), y una «unidad» con un repositorio con CLAUDE.md, otro sin señales de IA y una carpeta sin git.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { escanear, lugaresDeCodigo, MAX_PROFUNDIDAD } from './escaneo';

const base = mkdtempSync(join(tmpdir(), 'estudio-escaneo-'));
const casa = join(base, 'casa');
const unidad = join(base, 'unidad');
const repo = (ruta: string, archivos: Record<string, string> = {}) => {
  mkdirSync(ruta, { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: ruta });
  for (const [n, t] of Object.entries(archivos)) {
    mkdirSync(join(ruta, n, '..'), { recursive: true });
    writeFileSync(join(ruta, n), t);
  }
};
const entorno: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const k of ['USERPROFILE', 'HOME']) { entorno[k] = process.env[k]; process.env[k] = casa; }
  repo(join(unidad, 'trabajo', 'tienda'), { 'CLAUDE.md': '# reglas' });
  repo(join(unidad, 'trabajo', 'sin-ia'), { 'README.md': '# nada' });
  mkdirSync(join(unidad, 'notas', 'node_modules', 'escondido'), { recursive: true });
  repo(join(unidad, 'notas', 'node_modules', 'escondido'), { 'AGENTS.md': '#' });
  repo(join(base, 'api'));
  const sesiones = join(casa, '.claude', 'projects', 'api');
  mkdirSync(sesiones, { recursive: true });
  writeFileSync(join(sesiones, 'a.jsonl'), JSON.stringify({ type: 'user', cwd: join(base, 'api') }) + '\n');
  writeFileSync(join(sesiones, 'b.jsonl'), JSON.stringify({ type: 'user', cwd: join(base, 'api', '.claude', 'worktrees', 'rama-x') }) + '\n');
  mkdirSync(join(casa, '.claude', 'projects', 'borrado'), { recursive: true });
  writeFileSync(join(casa, '.claude', 'projects', 'borrado', 'c.jsonl'), JSON.stringify({ cwd: join(base, 'ya-no-existe') }) + '\n');
});
afterAll(() => {
  for (const [k, v] of Object.entries(entorno)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(base, { recursive: true, force: true });
});

describe('escanear el equipo', () => {
  it('encuentra los repositorios de los historiales de los agentes, llevando los worktrees a su repositorio', async () => {
    const r = await escanear(join(base, 'estudio'), { agentes: ['claude'], lugares: [] }, []);
    expect(r.candidatos.map((c) => c.nombre)).toEqual(['api']);
    expect(r.candidatos[0].senales).toEqual([expect.objectContaining({ agente: 'Claude Code', sesiones: 2 })]);
    expect(r.omitidas).toBe(1); // la carpeta que ya no existe
  });

  it('en los lugares solo cuenta repositorios git con señales de IA, sin entrar a dependencias', async () => {
    const r = await escanear(join(base, 'estudio'), { agentes: [], lugares: [unidad] }, []);
    expect(r.candidatos.map((c) => c.nombre)).toEqual(['tienda']);
    expect(r.candidatos[0].senales[0]).toMatchObject({ agente: 'Archivos de IA', donde: 'CLAUDE.md' });
  });

  it('marca lo que ya está en el Studio y lo deja al final', async () => {
    const r = await escanear(join(base, 'estudio'), { agentes: ['claude'], lugares: [unidad] }, [join(base, 'api')]);
    expect(r.candidatos.map((c) => `${c.nombre}:${c.yaEsta}`)).toEqual(['tienda:false', 'api:true']);
  });

  it('busca hasta cuatro carpetas de hondo desde cada lugar, y un lugar dentro de otro no se recorre dos veces (nmwdupnbttit)', async () => {
    const lugar = join(base, 'hondo');
    repo(join(lugar, 'a', 'b', 'c', 'cuatro'), { 'CLAUDE.md': '#' });
    repo(join(lugar, 'a', 'b', 'c', 'd', 'cinco'), { 'CLAUDE.md': '#' });
    expect(MAX_PROFUNDIDAD).toBe(4);
    const r = await escanear(join(base, 'estudio'), { agentes: [], lugares: [lugar, join(lugar, 'a')] }, []);
    // Desde «a», «cinco» queda a cuatro: el lugar de dentro también es raíz
    expect(r.candidatos.map((c) => c.nombre).sort()).toEqual(['cinco', 'cuatro']);
    const solo = await escanear(join(base, 'estudio'), { agentes: [], lugares: [lugar] }, []);
    expect(solo.candidatos.map((c) => c.nombre)).toEqual(['cuatro']);
  });
});

describe('dónde busca «Escanear este computador»: la carpeta personal y los lugares habituales de código (nmwdupnbttit)', () => {
  it('en Windows, la carpeta personal primero y, en cada unidad, htdocs de cada XAMPP y las carpetas de código que existen; nunca la unidad entera', () => {
    const hay = new Set([join('C:\\', 'xampp2024', 'htdocs'), join('C:\\', 'proyectos'), join('D:\\', 'repos'), join('D:\\', 'wamp64', 'www')]);
    const lugares = lugaresDeCodigo({
      casa: join('C:\\', 'Users', 'yo'), windows: true, unidades: ['C:\\', 'D:\\'],
      existe: (r) => hay.has(r),
      carpetasDe: (u) => (u === 'C:\\' ? ['Windows', 'xampp2024', 'xampp-viejo'] : ['repos', 'wamp64']),
    });
    expect(lugares[0]).toBe(join('C:\\', 'Users', 'yo'));
    expect(lugares[1]).toBe(join('C:\\', 'xampp2024', 'htdocs'));
    expect(new Set(lugares)).toEqual(new Set([join('C:\\', 'Users', 'yo'), ...hay]));
    expect(lugares).not.toContain('C:\\');
    expect(lugares).not.toContain('D:\\');
  });

  it('en Linux y macOS, la carpeta personal y los lugares de servidor web que existen, sin repetir', () => {
    const lugares = lugaresDeCodigo({ casa: '/home/yo', windows: false, unidades: [], existe: (r) => r === '/var/www', carpetasDe: () => [] });
    expect(lugares).toEqual(['/home/yo', '/var/www']);
    expect(lugaresDeCodigo({ casa: '/var/www', windows: false, unidades: [], existe: () => true, carpetasDe: () => [] }).filter((l) => l === '/var/www')).toHaveLength(1);
  });
});
