// La prueba antes de cerrar (pd_salud_a; nmw9gqf1ptit): abre el Studio encendido sin pantalla, con el Edge o el Chrome
// del computador, y dice si la página cargó (src/director/mirada.ts › veredictoDeCarga). La usan bandeja.ts --listo, que
// no cierra si no carga, y mirar.ts --carga, para verla sola. Sin tokens y sin tocar nada: un perfil aparte que se borra.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { argumentosPruebaDeCarga, candidatosNavegador, ESPERA_PRUEBA_CARGA, SIN_PRUEBA_DE_CARGA, URL_PRUEBA_CARGA, veredictoDeCarga, type ResultadoCarga } from '../../src/director/mirada.ts';

export interface OpcionesPrueba {
  url?: string;
  /** El navegador; sin darlo, el primero que exista de candidatosNavegador. null: no hay ninguno. */
  navegador?: string | null;
  servidorVivo?: (url: string) => Promise<boolean>;
  ejecutar?: (navegador: string, argumentos: string[], timeoutMs: number) => Promise<{ stdout: string; stderr: string }>;
}

const vivo = (url: string) => fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).then(() => true, () => false);

const correr = (navegador: string, argumentos: string[], timeoutMs: number) =>
  new Promise<{ stdout: string; stderr: string }>((ok) =>
    execFile(navegador, argumentos, { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (_e, out, err) => ok({ stdout: String(out ?? ''), stderr: String(err ?? '') })),
  );

export async function probarCarga(o: OpcionesPrueba = {}): Promise<ResultadoCarga> {
  if (process.env[SIN_PRUEBA_DE_CARGA]) return { estado: 'omitida' };
  const url = o.url ?? URL_PRUEBA_CARGA;
  const navegador = o.navegador !== undefined ? o.navegador : candidatosNavegador(process.platform, process.env).find((r) => existsSync(r)) ?? null;
  if (!navegador) return { estado: 'sin_navegador' };
  if (!(await (o.servidorVivo ?? vivo)(url))) return { estado: 'sin_servidor' };
  const perfil = await mkdtemp(join(tmpdir(), 'stl-carga-'));
  try {
    const { stdout, stderr } = await (o.ejecutar ?? correr)(navegador, argumentosPruebaDeCarga(url, perfil), ESPERA_PRUEBA_CARGA + 60_000);
    return veredictoDeCarga(stdout, stderr);
  } finally {
    await rm(perfil, { recursive: true, force: true }).catch(() => {});
  }
}
