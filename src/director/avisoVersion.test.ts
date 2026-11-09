import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CADA_CONSULTA_MS, REPO_PUBLICO, URL_ULTIMA, avisoNormal, conConsulta, consultarVersion, esMasNueva, lineaDeVersion, tocaConsultar, versionDeGitHub } from './avisoVersion';

const AHORA = Date.parse('2026-11-02T12:00:00.000Z');
const leer = (...r: string[]) => readFileSync(join(import.meta.dirname, '..', '..', ...r), 'utf8');

describe('cuál versión dice GitHub', () => {
  it('la publicada, con su enlace a las notas de esa versión en «Releases»', () => {
    expect(versionDeGitHub({ tag_name: 'v1.0.0', prerelease: false, draft: false })).toEqual({ version: '1.0.0', enlace: `https://github.com/${REPO_PUBLICO}/releases/tag/v1.0.0` });
  });

  it('nunca una «Pre-release» ni un borrador, ni una etiqueta que no se entiende', () => {
    expect(versionDeGitHub({ tag_name: 'v0.2.0', prerelease: true })).toBeNull();
    expect(versionDeGitHub({ tag_name: 'v0.2.0', draft: true })).toBeNull();
    expect(versionDeGitHub({ tag_name: 'nightly' })).toBeNull();
    expect(versionDeGitHub(null)).toBeNull();
  });

  it('el enlace no sale de lo que responda: no puede llevar a otro sitio', () => {
    const v = versionDeGitHub({ tag_name: '1.2.3', html_url: 'https://otro.sitio/malo' });
    expect(v?.enlace.startsWith(`https://github.com/${REPO_PUBLICO}/releases/tag/`)).toBe(true);
  });
});

describe('qué es más nuevo', () => {
  it('compara número a número, no como texto', () => {
    expect(esMasNueva('1.10.0', '1.9.0')).toBe(true);
    expect(esMasNueva('1.0.0', '1.0.0')).toBe(false);
    expect(esMasNueva('0.9.9', '1.0.0')).toBe(false);
    expect(esMasNueva('raro', '1.0.0')).toBe(false);
  });
});

describe('una vez al día', () => {
  it('sin haber preguntado, o pasadas 24 horas', () => {
    expect(tocaConsultar(undefined, AHORA)).toBe(true);
    expect(tocaConsultar({ consultada: new Date(AHORA - CADA_CONSULTA_MS + 1000).toISOString() }, AHORA)).toBe(false);
    expect(tocaConsultar({ consultada: new Date(AHORA - CADA_CONSULTA_MS).toISOString() }, AHORA)).toBe(true);
  });

  it('con la casilla apagada, no pregunta', () => {
    expect(tocaConsultar({ apagado: true }, AHORA)).toBe(false);
  });
});

describe('cuándo sale la línea', () => {
  const aviso = { version: '1.1.0', enlace: 'https://github.com/x' };

  it('con una versión más nueva que la instalada', () => {
    expect(lineaDeVersion(aviso, '1.0.0')).toEqual(aviso);
    expect(lineaDeVersion(aviso, '1.1.0')).toBeNull();
    expect(lineaDeVersion(undefined, '1.0.0')).toBeNull();
  });

  it('la ✕ la cierra hasta la versión siguiente', () => {
    expect(lineaDeVersion({ ...aviso, cerrada: '1.1.0' }, '1.0.0')).toBeNull();
    expect(lineaDeVersion({ ...aviso, version: '1.2.0', cerrada: '1.1.0' }, '1.0.0')?.version).toBe('1.2.0');
  });

  it('la casilla la apaga del todo', () => {
    expect(lineaDeVersion({ ...aviso, apagado: true }, '1.0.0')).toBeNull();
  });

  it('una consulta nueva recuerda lo cerrado y la casilla, y sin versión publicada deja de avisar', () => {
    const antes = { ...aviso, cerrada: '1.1.0', apagado: true as const, consultada: 'x' };
    expect(conConsulta(antes, { version: '1.2.0', enlace: 'e' }, 'ahora')).toEqual({ cerrada: '1.1.0', apagado: true, consultada: 'ahora', version: '1.2.0', enlace: 'e' });
    expect(conConsulta(aviso, null, 'ahora')).toEqual({ consultada: 'ahora' });
  });

  it('lo guardado se revisa', () => {
    expect(avisoNormal(null)).toBeUndefined();
    expect(avisoNormal({ version: 'raro', enlace: 'e' })).toBeUndefined();
    expect(avisoNormal({ apagado: true, cerrada: '1.0.0', otra: 3 })).toEqual({ apagado: true, cerrada: '1.0.0' });
  });
});

describe('la pregunta a GitHub', () => {
  const responde = (status: number, cuerpo: unknown = {}) => (async () => new Response(JSON.stringify(cuerpo), { status })) as unknown as typeof fetch;

  it('no envía nada de la persona: solo la dirección, y qué formato espera', async () => {
    const pedidos: [unknown, RequestInit | undefined][] = [];
    await consultarVersion((async (u: unknown, o?: RequestInit) => {
      pedidos.push([u, o]);
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch);
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0][0]).toBe(URL_ULTIMA);
    expect(pedidos[0][1]?.method).toBeUndefined();
    expect(pedidos[0][1]?.body).toBeUndefined();
    expect(Object.keys(pedidos[0][1]?.headers ?? {})).toEqual(['Accept']);
  });

  it('sin internet o con un límite de GitHub, calla y lo intenta después; sin versión publicada, null', async () => {
    expect(await consultarVersion((async () => { throw new Error('sin red'); }) as unknown as typeof fetch)).toBe('sin_red');
    expect(await consultarVersion(responde(403))).toBe('sin_red');
    expect(await consultarVersion(responde(404))).toBeNull();
    expect(await consultarVersion(responde(200, { tag_name: 'v2.0.0' }))).toMatchObject({ version: '2.0.0' });
  });
});

describe('en el Studio', () => {
  it('la línea va al pie de la barra, junto a tu nombre, y la casilla en «Modelo y consumo»', () => {
    expect(leer('index.html')).toMatch(/id="selector-idioma"[^\n]*\n\s*<\/div>\s*<div class="linea-version" id="linea-version" hidden>/);
    expect(leer('estudio', 'src', 'modeloDelDirector.ts')).toContain('data-aviso-version');
    const api = leer('estudio', 'servidor', 'api.ts');
    expect(api).toContain("ruta === '/aviso-version'");
    expect(api).toContain('refrescarAvisoVersion(raiz)');
  });
});
