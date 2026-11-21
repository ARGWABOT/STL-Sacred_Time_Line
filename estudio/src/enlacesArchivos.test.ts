import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { destinoDeArchivo, destinoDeEnlace, direccionVer } from './enlacesArchivos';
import { cuerpoDe, esRegistro, formatoDe, lenguajeDe, paginaDeArchivo, POLITICA, resaltar, rutaPermitida } from '../servidor/verArchivo';

const leer = (ruta: string) => readFileSync(join(__dirname, ruta), 'utf-8').replace(/\r\n/g, '\n');

describe('cada archivo que nombra el director es un enlace que lo abre (pd_enlaces_archivos)', () => {
  it('el Markdown va a la columna de documentos, como decidió el titular; lo demás, a la pestaña aparte', () => {
    expect(destinoDeArchivo('docs/director/ruta.md')).toEqual({ doc: 'docs/director/ruta.md' });
    expect(destinoDeArchivo('docs/metodo/metodologia.md')).toEqual({ doc: 'repo:docs/metodo/metodologia.md' });
    expect(destinoDeArchivo('CLAUDE.md')).toEqual({ doc: 'repo:CLAUDE.md' });
    expect(destinoDeArchivo('estudio/servidor/revisor.ts')).toEqual({ ver: 'estudio/servidor/revisor.ts' });
    expect(destinoDeArchivo('director/plan.json')).toEqual({ ver: 'director/plan.json' });
    expect(destinoDeArchivo('.revisiones/stl-studio-2026-10-26T07-00-00-000Z.log')).toEqual({ ver: '.revisiones/stl-studio-2026-10-26T07-00-00-000Z.log' });
    expect(destinoDeArchivo('package.json')).toEqual({ ver: 'package.json' });
    // Con su línea al final, abre el archivo
    expect(destinoDeArchivo('estudio/servidor/revisor.ts:1563')).toEqual({ ver: 'estudio/servidor/revisor.ts' });
  });

  it('no enlaza lo que no es un archivo, ni un .env, ni lo que sale de su carpeta', () => {
    for (const t of ['npm test', 'git log --oneline', 'plan.json', 'stl', 'docs/', '../fuera/x.ts', 'docs/.env', '.env', '.env.local', 'a/.git/config', 'https://x.com/a.js', 'tools/*.ts', 'C:/x/y.ts'])
      expect(destinoDeArchivo(t), t).toBeNull();
    expect(direccionVer('a b/c.ts')).toBe('/__estudio/director/ver?ruta=a%20b%2Fc.ts');
  });

  it('ningún enlace de un documento reemplaza la pestaña del Studio (nmw7ur9h9tit, nmw7uri9jtit)', () => {
    // Un Markdown relativo, como «Leer en español» del README, se lee en el lector, resuelto contra su carpeta
    expect(destinoDeEnlace('README.es.md', 'repo:README.md')).toEqual({ doc: 'repo:README.es.md' });
    expect(destinoDeEnlace('./README.md', 'repo:README.es.md')).toEqual({ doc: 'repo:README.md' });
    expect(destinoDeEnlace('metodologia.es.md#el-metodo', 'repo:docs/metodo/metodologia.md')).toEqual({ doc: 'repo:docs/metodo/metodologia.es.md' });
    expect(destinoDeEnlace('../../CONTRIBUTING.md', 'repo:docs/metodo/x.md')).toEqual({ doc: 'repo:CONTRIBUTING.md' });
    expect(destinoDeEnlace('/INSTALL.md', 'repo:docs/metodo/x.md')).toEqual({ doc: 'repo:INSTALL.md' });
    expect(destinoDeEnlace('mi%20guia.md', 'repo:docs/a.md')).toEqual({ doc: 'repo:docs/mi guia.md' });
    // un documento del director enlaza otro de su memoria; un texto sin documento, desde la raíz
    expect(destinoDeEnlace('licencia.md', 'docs/director/licencia-uso.md')).toEqual({ doc: 'docs/director/licencia.md' });
    expect(destinoDeEnlace('docs/director/ruta.md')).toEqual({ doc: 'docs/director/ruta.md' });
    expect(destinoDeEnlace('CLAUDE.md')).toEqual({ doc: 'repo:CLAUDE.md' });
    // Otro archivo relativo, a la pestaña aparte con su formato
    expect(destinoDeEnlace('LICENSE', 'repo:README.md')).toEqual({ ver: 'LICENSE' });
    expect(destinoDeEnlace('docs/difusion/compartir.png', 'repo:README.md')).toEqual({ ver: 'docs/difusion/compartir.png' });
    expect(destinoDeEnlace('../tools/x.ts?v=1', 'repo:docs/a.md')).toEqual({ ver: 'tools/x.ts' });
    // Lo de afuera, a una pestaña nueva; «#algo», dentro del mismo documento
    expect(destinoDeEnlace('https://github.com/x', 'repo:README.md')).toEqual({ fuera: 'https://github.com/x' });
    expect(destinoDeEnlace('mailto:a@b.c')).toEqual({ fuera: 'mailto:a@b.c' });
    expect(destinoDeEnlace('#instalar', 'repo:README.md')).toEqual({ ancla: 'instalar' });
    // Lo que no se puede abrir queda como texto: sale del repositorio, un .env, .git, otro esquema
    for (const h of ['', '../fuera.md', '../../x.md', '.env', 'a/.env.local', '.git/config', 'javascript:alert(1)', 'file:///c:/x', '//otro.com/x', 'a%E0%A4%A.md'])
      expect(destinoDeEnlace(h, 'repo:README.md'), h).toBeNull();
    // y quien lo pinta: cada enlace con su destino, nunca uno que cambie la pestaña
    const codigo = leer('enlacesArchivos.ts');
    expect(codigo).toContain("a.setAttribute('data-abrir-doc', destino.doc);");
    expect(codigo).toContain("a.setAttribute('target', '_blank');");
    expect(codigo).toContain("a.removeAttribute('href');");
    expect(leer('app.ts')).toMatch(/closest<HTMLElement>\('\[data-abrir-doc\]'\);\n\s+if \(!b\?\.dataset\.abrirDoc\) return;\n\s+e\.preventDefault\(\);/);
  });

  it('todo Markdown que se muestra pasa por limpio, y limpio enlaza los archivos después de limpiar', () => {
    const limpiar = leer('limpiar.ts');
    expect(limpiar).toContain("import { enlazarArchivos, enlazarEnlaces } from './enlacesArchivos';");
    expect(limpiar.indexOf('if (enlaces) enlazarArchivos(t.content)')).toBeGreaterThan(limpiar.indexOf('atributoPeligroso(el.localName'));
    const director = leer('app.ts');
    // y un Markdown nombrado dentro de un diálogo se abre en la columna, con el diálogo cerrado
    expect(director).toContain("closest<HTMLElement>('[data-abrir-doc]')");
    // las líneas de «¿Dónde quedamos?» ya son botones: ahí no van enlaces, que no caben dentro de otro
    expect(director).toContain('limpio(marked.parseInline(l.t, { async: false }) as string, false)');
  });
});

describe('la pestaña aparte: con formato según su tipo, y solo lo que el Studio puede leer', () => {
  it('nunca un .env, una llave, lo de .git ni una ruta que sale de su carpeta', () => {
    for (const r of ['README.md', 'estudio/servidor/revisor.ts', 'director/plan.json', '.revisiones/x.log', '.stl/director/plan.json'])
      expect(rutaPermitida(r), r).toBe(true);
    for (const r of ['', '.env', 'docs/.env.local', 'a/id_rsa', 'certs/clave.pem', '.git/config', 'a/../b.ts', '/etc/passwd', 'C:/Windows/x.ini', 'a\\b.ts', 'a//b.ts', './a.ts', '.npmrc'])
      expect(rutaPermitida(r), r).toBe(false);
    expect(esRegistro('.revisiones/stl-studio-2026.log')).toBe(true);
    expect(esRegistro('.estudio/bitacora.jsonl')).toBe(true);
    expect(esRegistro('.estudio/servidor.json')).toBe(false);
  });

  it('el JSON, plegable; un registro, una línea por evento; el código, con sus números de línea; todo escapado', () => {
    expect(formatoDe('director/plan.json')).toBe('json');
    expect(formatoDe('.revisiones/x.log')).toBe('eventos');
    expect(formatoDe('a.jsonl')).toBe('eventos');
    expect(formatoDe('x.ts')).toBe('texto');
    const json = cuerpoDe('a.json', '{"misiones":[{"id":"<b>"}]}');
    expect(json).toContain('<details open><summary>{ 1 }</summary>');
    expect(json).toContain('&quot;&lt;b&gt;&quot;');
    const eventos = cuerpoDe('.revisiones/x.log', '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash"}]}}\nno es json');
    expect(eventos).toContain('<summary>assistant · Bash</summary>');
    expect(eventos).toContain('<li><code>no es json</code></li>');
    const codigo = cuerpoDe('a.txt', 'const a = "<x>";\nb');
    expect(codigo).toContain('<td class="n">1</td><td><pre>const a = &quot;&lt;x&gt;&quot;;</pre></td>');
    expect(codigo).toContain('<td class="n">2</td>');
    expect(paginaDeArchivo('a.ts', 'x', true)).toContain('se muestra solo el comienzo');
  });

  it('el código, con sus colores: comentarios, textos, números y palabras reservadas, escapados', () => {
    expect(lenguajeDe('a.ts')).toBe('js');
    expect(lenguajeDe('voz.py')).toBe('py');
    expect(lenguajeDe('a.css')).toBeNull();
    expect(resaltar('const a = "<b>"; // nota <i>', 'js')).toBe('<span class="r">const</span> a = <span class="s">&quot;&lt;b&gt;&quot;</span>; <span class="c">// nota &lt;i&gt;</span>');
    expect(resaltar("x = 12 # uno 'dos'", 'py')).toBe(`x = <span class="nu">12</span> <span class="c"># uno 'dos'</span>`);
    expect(resaltar('return constante', 'js')).toBe('<span class="r">return</span> constante');
    expect(cuerpoDe('a.ts', 'let x')).toContain('<span class="r">let</span> x');
    expect(cuerpoDe('a.css', 'let x')).toContain('<pre>let x</pre>');
  });

  it('la página va aislada: sin scripts ni formularios, y sin poder hablarle al servidor del Studio', () => {
    expect(POLITICA.startsWith('sandbox;')).toBe(true);
    expect(POLITICA).toContain("default-src 'none'");
    expect(POLITICA).toContain("form-action 'none'");
    const servidor = readFileSync(join(__dirname, '..', 'servidor', 'api.ts'), 'utf-8');
    expect(servidor).toContain("res.setHeader('Content-Security-Policy', POLITICA_VER)");
    expect(servidor).toContain('if (!rutaPermitida(pedido))');
  });
});
