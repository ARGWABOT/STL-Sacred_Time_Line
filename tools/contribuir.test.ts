// STL Studio lo cambia solo su autor (pedido pd_sin_contribuciones, nota de voz del titular del 26 de octubre de 2026):
// no acepta cambios de código de otros, pero sí avisos de fallas, con un formulario corto de cuatro preguntas
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = join(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8');

describe('lo que dice el repositorio a quien quiere contribuir', () => {
  it('CONTRIBUTING.md (inglés) y CONTRIBUTING.es.md (español) y el README dicen que no acepta cambios de código de otros, pero sí avisos de fallas', () => {
    const en = leer('CONTRIBUTING.md');
    const es = leer('CONTRIBUTING.es.md');
    expect(en).toContain('does not accept code changes from others (pull requests)');
    expect(en).toContain('**Bug reports are welcome.**');
    expect(es).toContain('no acepta cambios de código de otros (pull requests)');
    expect(es).toContain('**Los avisos de fallas, sí.**');
    // Cada archivo en un solo idioma: el inglés sin el español, y el español sin el inglés
    expect(en).not.toContain('**Los avisos de fallas, sí.**');
    expect(es).not.toContain('**Bug reports are welcome.**');
    // Cada uno enlaza al otro, arriba del todo
    expect(en.startsWith('[Leer en español](CONTRIBUTING.es.md)')).toBe(true);
    expect(es.startsWith('[Read in English](CONTRIBUTING.md)')).toBe(true);
    // Sin la invitación de antes a mandar pull requests
    for (const t of [en, es]) expect(t).not.toMatch(/pueden ir directo en un pull request|Abre un issue primero/);
    // Cada README enlaza a su CONTRIBUTING
    expect(leer('README.md')).toContain('[CONTRIBUTING.md](CONTRIBUTING.md)');
    expect(leer('README.es.md')).toContain('[CONTRIBUTING.es.md](CONTRIBUTING.es.md)');
    expect(leer('README.md')).toContain('it does not accept code changes from others (pull requests). Bug reports, yes');
    expect(leer('README.es.md')).toContain('no acepta cambios de código de otros (pull requests). Los avisos de fallas, sí');
  });

  it('los dos README dicen lo que se pidió (pd_readme): su enlace de idioma primero, y nunca el tamaño de la instalación, la captura ni la medición del núcleo', () => {
    const en = leer('README.md');
    const es = leer('README.es.md');
    // Debajo del enlace de idioma, la imagen para compartir, con su texto en cada idioma (nmw7tf90rtit), y después el título
    const imagen = (alt: string) => `![${alt}](docs/difusion/recorrido-compartir.png)`;
    const arriba = (t: string, partes: string[]) => t.replace(/\r\n/g, '\n').startsWith(partes.join('\n\n') + '\n');
    expect(arriba(en, ['[Leer en español](README.es.md)', imagen('STL Studio: the developer on the golden timeline of the project, and the director, inside the Studio, talking to the model'), '# STL Studio, the interface between you and the model'])).toBe(true);
    expect(arriba(es, ['[Read in English](README.md)', imagen('STL Studio: el desarrollador sobre la línea dorada del proyecto, y el director, dentro del Studio, hablando con el modelo'), '# STL Studio, la interfaz entre tú y el modelo'])).toBe(true);
    expect(existsSync(join(raiz, 'docs', 'difusion', 'recorrido-compartir.png'))).toBe(true);
    // Los tres párrafos del contexto, tal como se escribieron
    for (const parrafo of ['STL Studio is a small local web app that sits between you and an AI model', 'The STL method fixes that with a single channel.', "the model can forget, the project can't. Fewer tabs, more finished things."]) expect(en).toContain(parrafo);
    for (const [t, frases] of [
      [en, ['0.1.0', 'Codex and Cursor are still to be tested', 'Windows 11 Pro, 64 GB of memory, AMD Ryzen 7 5800X', 'macOS and Linux are still to be tested', 'Max 20x', 'Opus 5.5', 'Sonnet 5.5', 'about 1 % of the weekly limit', 'allows the director to push and publish', 'The installation is the same on any computer', 'at least 1350 pixels wide', 'Internet, to install', 'about as long as it lasts', 'From 0.2.0 on', 'npm install', 'ARGWABOT/STL-Sacred_Time_Line', 'it does not offer the claude.ai sign-in']],
      [es, ['0.1.0', 'Codex y Cursor están por probar', 'Windows 11 Pro, 64 GB de memoria, AMD Ryzen 7 5800X', 'macOS y Linux están por probar', 'Max 20x', 'Opus 5.5', 'Sonnet 5.5', 'cerca de 1 % del límite semanal', 'le permite al director subir y publicar', 'La instalación es la misma en cualquier computador', 'al menos 1350 píxeles de ancho', 'Internet, para instalar', 'más o menos lo que dura', 'Desde la 0.2.0', 'npm install', 'ARGWABOT/STL-Sacred_Time_Line', 'no ofrece el inicio de sesión de claude.ai']],
    ] as const) {
      for (const f of frases) expect(t, f).toContain(f);
      // Sin lo que la persona pidió dejar fuera: el tamaño, la captura, la medición, un mínimo de memoria o de procesador, ni WSL como requisito
      // (la única imagen es la de compartir, elegida aparte: nmw7tf90rtit)
      expect(t.replace('docs/difusion/recorrido-compartir.png', '')).not.toMatch(/\d+(,\d+|\.\d+)? ?(GB|MB) (de disco|on disk)|\.(png|jpg|gif)\b|Medir el núcleo|El director, medido|the core measurement/i);
      expect(t).not.toMatch(/350 MB|2[,.]4 GB/);
    }
  });

  it('cada aviso trae su formulario, con las cuatro preguntas, y sin issues en blanco', () => {
    const forma = leer('.github/ISSUE_TEMPLATE/falla.yml');
    for (const id of ['sistema', 'version', 'que-paso', 'revision']) expect(forma).toContain(`id: ${id}`);
    for (const sistema of ['Windows', 'Mac', 'Linux']) expect(forma).toContain(`- ${sistema}`);
    expect(forma).toContain('«Qué pasó con la revisión»');
    // La etiqueta del formulario es «bug»
    expect(forma).toContain('labels: ["bug"]');
    expect(forma).not.toContain('labels: ["falla"]');
    // One form in both languages, English first, each part with the Studio's names in its own language (nmw74zx9ktit)
    expect(forma).toContain('If a review failed: what «What happened with the review» says · Si falló una revisión: lo que dice «Qué pasó con la revisión»');
    expect(forma).toContain('In the Studio header, «Why?» opens it · En la cabecera del Studio, «¿Por qué?» lo abre');
    expect(forma).toContain('name: "Something fails · Algo falla"');
    expect(leer('.github/ISSUE_TEMPLATE/config.yml')).toContain('blank_issues_enabled: false');
  });

  it('el formulario «Lo logré / Me trabé en…» mide quién llega al diagnóstico, sin rastrear a nadie (pr_difusion)', () => {
    const forma = leer('.github/ISSUE_TEMPLATE/logre.yml');
    expect(forma).toContain('name: "I made it / I got stuck on… · Lo logré / Me trabé en…"');
    for (const id of ['resultado', 'sistema', 'donde']) expect(forma).toContain(`id: ${id}`);
    expect(forma).toContain('I made it: my project got its diagnosis · Lo logré: mi proyecto recibió su diagnóstico');
    expect(forma).toContain('without tracking anyone');
    for (const t of ['README.md', 'README.es.md']) expect(leer(t)).toMatch(/I made it \/ I got stuck on…|Lo logré \/ Me trabé en…/);
  });
});
