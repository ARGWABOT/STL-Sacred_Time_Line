import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { abiertaEnLista, desplazamientoParaVer, instruccionDeAgente } from './listas';

const director = readFileSync(join(__dirname, 'director.ts'), 'utf-8');

describe('las listas no se pliegan solas al abrir algo (nota del titular, 22 de octubre de 2026)', () => {
  it('una parte abierta sigue abierta: ni abrir un elemento de otra parte ni un repintado la pliegan', () => {
    for (const porDefecto of [true, false]) expect(abiertaEnLista(true, porDefecto, false)).toBe(true);
  });

  it('la parte que recibe lo abierto se abre, aunque estuviera plegada', () => {
    expect(abiertaEnLista(false, false, true)).toBe(true);
    expect(abiertaEnLista(undefined, false, true)).toBe(true);
  });

  it('lo que quien mira plegó queda plegado mientras no le llegue lo abierto; la primera vez, como nace', () => {
    expect(abiertaEnLista(false, true, false)).toBe(false);
    expect(abiertaEnLista(undefined, true, false)).toBe(true);
    expect(abiertaEnLista(undefined, false, false)).toBe(false);
  });

  it('la columna se mueve solo lo justo para ver lo marcado, y nada si ya se ve', () => {
    const lista = { top: 100, bottom: 500 };
    expect(desplazamientoParaVer(lista, { top: 200, bottom: 240 })).toBe(0);
    // Debajo o encima de lo que se ve: queda en el medio de la columna
    const abajo = desplazamientoParaVer(lista, { top: 700, bottom: 740 });
    expect(700 - abajo + 20).toBe(300);
    const arriba = desplazamientoParaVer(lista, { top: 20, bottom: 60 });
    expect(20 - arriba + 20).toBe(300);
    // Más alto que la columna: queda arriba
    expect(desplazamientoParaVer(lista, { top: 600, bottom: 1200 })).toBe(500);
  });

  it('cada parte plegable de la columna de los documentos nace con su memoria, y la columna no vuelve arriba al repintarse', () => {
    const columna = director.slice(director.indexOf('function vistaDocumentos'), director.indexOf('if (!doc) return `<div class="docs">'));
    const plegables = columna.match(/<details/g) ?? [];
    expect(plegables.length).toBeGreaterThanOrEqual(2);
    // Con su ancla, para que un paso lleve directo a ella
    expect(columna.match(/<details class="[\w-]+" data-ancla="[^"]+"\$\{plegableEnColumna\(/g)?.length).toBe(plegables.length);
    expect(director).toMatch(/columna\.scrollTop = scrollColumna;/);
  });

  it('al cambiar de proyecto, la columna vuelve arriba: no hereda hasta dónde bajaste en el otro', () => {
    const cambio = director.slice(director.indexOf('// Otro proyecto: lo abierto del anterior no sirve'), director.indexOf('// Si no llegó nada nuevo'));
    expect(cambio).toMatch(/scrollColumna = 0;/);
    // El repintado toma el scroll de la columna que está en pantalla, la del anterior: también esa vuelve arriba
    expect(cambio).toMatch(/querySelector<HTMLElement>\('\.lista-docs'\)\?\.scrollTo\(0, 0\)/);
  });
});

describe('la columna de los documentos, con sus partes plegables a mano y las instrucciones aparte (22 de octubre de 2026)', () => {
  const columna = director.slice(director.indexOf('function vistaDocumentos'), director.indexOf('if (!doc) return `<div class="docs">'));

  it('«Otros documentos», «Después» y «Ya leídos» se pliegan a mano siempre, no solo mientras hay algo por leer', () => {
    expect(columna).not.toContain("${leyendo ? `<details class=\"otros-docs\"");
    expect(columna).toContain('<details class="otros-docs" data-ancla="d-otros"${plegableEnColumna(\'columna|otros\'');
    expect(columna).toMatch(/: propia \? `\$\{enRuta\.filter\(\(x\) => x\.lectura === 'siguiente'\)/);
  });

  it('las instrucciones para los agentes van aparte, con un nombre que se entienda', () => {
    expect(instruccionDeAgente('repo:CLAUDE.md', 'STL Studio: reglas del director asistente · CLAUDE.md')).toBe('CLAUDE.md: instrucciones para Claude Code');
    expect(instruccionDeAgente('repo:web/AGENTS.md', 'AGENTS.md · web/AGENTS.md')).toBe('AGENTS.md: instrucciones para Codex y otros agentes · web');
    expect(instruccionDeAgente('repo:.claude/commands/revisa.md', 'revisa.md · .claude/commands/revisa.md')).toBe('/revisa (Claude Code)');
    expect(instruccionDeAgente('repo:.agents/skills/revisa/SKILL.md', 'SKILL.md · .agents/skills/revisa/SKILL.md')).toBe('/revisa (Codex)');
    expect(instruccionDeAgente('repo:.codex/prompts/vigila.md', 'Vigila la revisión · .codex/prompts/vigila.md')).toBe('/vigila: Vigila la revisión (Codex)');
    // La documentación, y lo que no es del repositorio, no
    for (const r of ['repo:README.md', 'repo:docs/claude.md.txt', 'docs/director/ruta.md']) expect(instruccionDeAgente(r, 'x')).toBeNull();
    expect(columna).toContain('Instrucciones para los agentes');
  });

  it('cada archivo dice qué es al pasar el ratón', () => {
    expect(columna).toMatch(/const boton = \(x: Documento\) => `<button[^`]*title="\$\{esc\(queEs\(x\)\)\}"/);
  });
});
