import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { armarZip, carpetaDelZip, comprobarZip, leerZip, nombreDelZip, notasDeLaVersion, OBLIGATORIOS, ordenDePublicar, revisarContenido, rutaProhibida } from './empaquetar-studio.ts';

// El paquete de instalación (pedido pd_paquete)
const RAIZ = join(import.meta.dirname, '..');
const VERSION = String(JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')).version);
const temporales: string[] = [];
const temporal = () => {
  const c = mkdtempSync(join(tmpdir(), 'paquete-'));
  temporales.push(c);
  return c;
};
afterAll(() => {
  for (const c of temporales) rmSync(c, { recursive: true, force: true });
});
const conPrefijo = (rutas: string[]) => rutas.map((r) => `${carpetaDelZip('0.1.0')}/${r}`);

describe('lo que nunca va en el paquete', () => {
  it('dependencias, datos o memoria de un proyecto, ni lo de este computador; cada una con su motivo', () => {
    for (const r of [
      'node_modules/vite/package.json', 'proyectos/golf/proyecto.json', '.stl/director/plan.json', 'estudio.local.json', 'estudio.local.json.bak', '.estudio/revisiones.jsonl',
      '.revisiones/x.log', 'publico/index.html', '.env', 'tools/.env.local', 'director/plan.json', 'director/equipo/ana.json', 'director/notas/n.txt', 'otra/director/archivo/2026-10.json',
    ]) expect(rutaProhibida(r), r).not.toBeNull();
    // Lo del producto sí va, aunque se llame parecido: las herramientas del director, la plantilla, la semilla, el método
    for (const r of ['tools/director/bandeja.ts', 'plantilla/plan.json', 'plantilla/semilla/es.json', 'docs/metodo/director/review-cycle.md', 'src/director/plan.ts', 'src/director/proyectos.ts']) expect(rutaProhibida(r), r).toBeNull();
  });

  it('las reglas de autor nunca van en el paquete ni en el repositorio público: su carpeta está fuera de git (nmw5gt698tit)', () => {
    for (const r of ['autor/CLAUDE.md', 'autor/notas/redes.md']) expect(rutaProhibida(r), r).toBe('las reglas y lo personal del autor');
    // Un archivo del producto que se llama parecido sí va
    for (const r of ['docs/autor.md', 'src/director/autor.ts']) expect(rutaProhibida(r), r).toBeNull();
    expect(revisarContenido([...OBLIGATORIOS, 'autor/CLAUDE.md'].map((r) => `${carpetaDelZip('1.0.0')}/${r}`), '1.0.0')).toEqual(['autor/CLAUDE.md: las reglas y lo personal del autor']);
    // Fuera de git: el paquete sale del último commit y el repositorio público es este, así que tampoco llega por ahí
    expect(readFileSync(join(RAIZ, '.gitignore'), 'utf8')).toMatch(/^\/autor\/$/m);
    // Y la página pública solo copia sus archivos de docs/difusion: nada de la carpeta del autor
    expect(readFileSync(join(RAIZ, 'tools', 'publicar-stl.ts'), 'utf8')).not.toMatch(/['"`]autor\//);
  });

  it('la revisión del contenido falla con lo prohibido, con lo que falta y con lo que queda fuera de su carpeta', () => {
    const bien = conPrefijo(OBLIGATORIOS);
    expect(revisarContenido(bien, '0.1.0')).toEqual([]);
    for (const malo of ['proyectos/x/plan.json', '.stl/director/plan.json', 'estudio.local.json', 'node_modules/a/b.js', 'director/equipo/ana.json']) {
      expect(revisarContenido([...bien, ...conPrefijo([malo])], '0.1.0'), malo).toEqual([expect.stringContaining(malo)]);
    }
    expect(revisarContenido(bien.filter((r) => !r.endsWith('semilla/en.json')), '0.1.0')).toEqual(['falta plantilla/semilla/en.json']);
    expect(revisarContenido([...bien, 'suelto.txt'], '0.1.0')).toEqual([expect.stringContaining('suelto.txt')]);
  });
});

describe('el zip', () => {
  const repoDePrueba = (extra: string[]) => {
    const raiz = temporal();
    const git = (...a: string[]) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8' });
    git('init', '-q');
    git('config', 'user.name', 'Prueba');
    git('config', 'user.email', 'prueba@ejemplo.org');
    git('config', 'core.autocrlf', 'true');
    for (const r of [...OBLIGATORIOS, ...extra]) {
      mkdirSync(dirname(join(raiz, r)), { recursive: true });
      writeFileSync(join(raiz, r), r === 'package.json' ? JSON.stringify({ version: '0.1.0' }) : 'una línea\notra\n');
    }
    // Lo que git ignora no cabe en el zip aunque esté en la carpeta
    writeFileSync(join(raiz, '.gitignore'), 'estudio.local.json\nnode_modules/\n');
    writeFileSync(join(raiz, 'estudio.local.json'), '{}');
    mkdirSync(join(raiz, 'node_modules', 'a'), { recursive: true });
    writeFileSync(join(raiz, 'node_modules', 'a', 'b.js'), 'x');
    git('add', '-A');
    git('commit', '-q', '-m', 'Uno');
    return raiz;
  };

  it('sale de un commit, sin lo ignorado, se descomprime entero y con finales de línea LF en cualquier sistema', () => {
    const raiz = repoDePrueba(['tools/x.sh']);
    const salida = join(temporal(), nombreDelZip('0.1.0'));
    armarZip(raiz, 'HEAD', salida, '0.1.0');
    const zip = readFileSync(salida);
    expect(comprobarZip(zip, '0.1.0')).toEqual([]);
    const entradas = leerZip(zip);
    expect(entradas.map((e) => e.ruta)).not.toContain(`${carpetaDelZip('0.1.0')}/estudio.local.json`);
    expect(entradas.some((e) => e.ruta.includes('node_modules'))).toBe(false);
    expect(entradas.find((e) => e.ruta.endsWith('tools/x.sh'))!.datos.toString('utf8')).toBe('una línea\notra\n');
  });

  it('falla si el commit lleva datos de un proyecto, o si su versión no es la que dice', () => {
    const raiz = repoDePrueba(['proyectos/golf/proyecto.json']);
    const salida = join(temporal(), 'x.zip');
    armarZip(raiz, 'HEAD', salida, '0.1.0');
    expect(comprobarZip(readFileSync(salida), '0.1.0')).toEqual([expect.stringMatching(/proyectos\/golf\/proyecto\.json: los datos de un proyecto/)]);

    const limpio = repoDePrueba([]);
    armarZip(limpio, 'HEAD', salida, '0.2.0');
    expect(comprobarZip(readFileSync(salida), '0.2.0')).toEqual(['su package.json no dice la versión 0.2.0']);
  });

  it('un zip dañado no pasa', () => {
    const raiz = repoDePrueba([]);
    const salida = join(temporal(), 'x.zip');
    armarZip(raiz, 'HEAD', salida, '0.1.0');
    const zip = readFileSync(salida);
    const dañado = Buffer.from(zip);
    // La suma de un archivo, en su entrada del índice (la primera que no es una carpeta): ya no coincide con lo que trae
    const firma = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
    let p = zip.indexOf(firma);
    while (zip.toString('utf8', p + 46, p + 46 + zip.readUInt16LE(p + 28)).endsWith('/')) p = zip.indexOf(firma, p + 4);
    dañado[p + 16] ^= 0xff;
    expect(() => leerZip(dañado)).toThrow(/dañado/);
    expect(() => leerZip(Buffer.from('no soy un zip, pero tengo más de veintidós letras'))).toThrow(/No es un zip/);
  });

  it('el del Studio, de verdad: sale del último commit limpio, liviano, con su semilla y su versión', () => {
    const salida = join(temporal(), nombreDelZip(VERSION));
    armarZip(RAIZ, 'HEAD', salida, VERSION);
    const zip = readFileSync(salida);
    expect(comprobarZip(zip, VERSION)).toEqual([]);
    expect(zip.length).toBeLessThan(30 * 1024 * 1024);
    const semilla = leerZip(zip).find((e) => e.ruta.endsWith('plantilla/semilla/es.json'))!;
    expect(JSON.parse(semilla.datos.toString('utf8'))).toBeTruthy();
  });
});

describe('las notas y la orden para publicar', () => {
  const notas = notasDeLaVersion('0.1.0');

  it('cortas, en inglés con su español debajo: qué es, cómo se instala con el README y lo que aún no se probó', () => {
    const [ingles, espanol] = notas.split('\n---\n');
    expect(espanol).toBeTruthy();
    expect(ingles).toContain('Not tested yet');
    expect(espanol).toContain('Aún sin probar');
    for (const nombre of ['macOS', 'Codex', 'Cursor', 'Ubuntu']) {
      expect(ingles, nombre).toContain(nombre);
      expect(espanol, nombre).toContain(nombre);
    }
    expect(ingles).toContain('https://github.com/ARGWABOT/STL-Sacred_Time_Line#install');
    expect(espanol).toContain('README.es.md#instalar');
    expect(notas).toContain('stl-studio-0.1.0.zip');
    expect(ingles).toContain('initialize STL Studio');
    expect(ingles).not.toContain('inicializa');
    expect(espanol).toContain('inicializa STL Studio');
    expect(notas.split(/\s+/).length).toBeLessThan(300);
  });

  it('la orden va marcada «Pre-release», de ese commit, y armar no publica nada', () => {
    const orden = ordenDePublicar('0.1.0', 'abc123', 'z.zip', 'n.md');
    expect(orden.slice(0, 4)).toEqual(['release', 'create', 'v0.1.0', 'z.zip']);
    expect(orden).toContain('--prerelease');
    expect(orden).toEqual(expect.arrayContaining(['--target', 'abc123', '--notes-file', 'n.md', '--repo', 'ARGWABOT/STL-Sacred_Time_Line']));
    const codigo = readFileSync(join(RAIZ, 'tools/empaquetar-studio.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(codigo).toMatch(/const publicar = process\.argv\.includes\('--publicar'\);/);
    expect(codigo.indexOf("spawnSync('gh', orden")).toBeGreaterThan(codigo.indexOf('if (!publicar) {'));
    // Sin la firma, o con cambios sin guardar, no empaqueta; y la cuenta es la aprobada para el proyecto, según GitHub
    expect(codigo).toContain('El último commit no lleva la firma pública');
    expect(codigo).toContain('Hay cambios sin guardar en el Studio');
    expect(codigo).toContain('sesionAprobada(cuentaGitDeCarpeta(leerLocalYa(raiz), raiz))');
    expect(codigo).not.toContain('EN_GH');
    expect(codigo).toContain('GitHub aún no tiene este commit');
  });
});
