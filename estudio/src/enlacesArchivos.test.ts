import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { destinoDeArchivo, direccionVer } from './enlacesArchivos';
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

  it('todo Markdown que se muestra pasa por limpio, y limpio enlaza los archivos después de limpiar', () => {
    const limpiar = leer('limpiar.ts');
    expect(limpiar).toContain("import { enlazarArchivos } from './enlacesArchivos';");
    expect(limpiar.indexOf('if (enlaces) enlazarArchivos(t.content)')).toBeGreaterThan(limpiar.indexOf('atributoPeligroso(el.localName'));
    const director = leer('director.ts');
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
    const servidor = readFileSync(join(__dirname, '..', 'servidor', 'director.ts'), 'utf-8');
    expect(servidor).toContain("res.setHeader('Content-Security-Policy', POLITICA_VER)");
    expect(servidor).toContain('if (!rutaPermitida(pedido))');
  });
});
