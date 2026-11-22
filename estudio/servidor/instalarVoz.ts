// Las dos descargas de la pantalla de la voz (pedido pd_valores_instalar; lo que decide, en src/director/instalacionVoz.ts):
// corre los guiones de tools/entorno, los mismos que se pueden correr a mano, de a uno, y dice cómo van. Una descarga no
// depende de la página: recargarla no la corta, y lo que ya bajó no se vuelve a bajar. Lo instalado se sabe por su marca en
// el disco (src/director/transcripcion.ts › pythonDelDirector). Quien lanza el guion se puede cambiar: las pruebas no bajan nada.
import { spawn } from 'node:child_process';
import { statfsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { avanceDeInstalacion, avanceReal, BYTES_ESPERADOS, causaDeFalla, ultimaLineaDe, type EstadoVoz, type Instalacion, type QueInstala } from '../../src/director/instalacionVoz.ts';
import { pythonDelDirector, type UsoDePython } from '../../src/director/transcripcion.ts';
import { bashDelSistema } from './terminal.ts';

/** El proceso de un guion, lo poco que hace falta de él. */
export interface ProcesoDeGuion {
  alSalir(fn: (codigo: number | null) => void): void;
  alEscribir(fn: (texto: string) => void): void;
}
export type LanzarGuion = (guion: string) => Promise<ProcesoDeGuion>;

const GUIONES: Record<QueInstala, string> = { transcripcion: 'instalar_transcripcion.sh', voces: 'instalar_voces.sh' };
const USOS: Record<QueInstala, UsoDePython> = { transcripcion: 'transcripcion', voces: 'voz' };
/** Lo que se guarda de lo que dijo cada guion: su final, que es donde dice qué falló y cuánto va. */
const TOPE_SALIDA = 64 * 1024;

/** El guion en Git Bash (en Windows; `bash` en lo demás), con su salida sin esperar a que se llene un búfer, sin ventana. */
const lanzarDeVerdad: LanzarGuion = async (guion) => {
  const bash = await bashDelSistema();
  if (!bash) throw new Error('bash');
  const hijo = spawn(bash, ['--login', guion.replace(/\\/g, '/')], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PYTHONUNBUFFERED: '1' } });
  return {
    alSalir: (fn) => {
      hijo.once('error', () => fn(-1));
      hijo.once('close', (codigo) => fn(codigo));
    },
    alEscribir: (fn) => {
      hijo.stdout?.on('data', (d) => fn(String(d)));
      hijo.stderr?.on('data', (d) => fn(String(d)));
    },
  };
};

const libreEnCasa = (): number | null => {
  try {
    const s = statfsSync(homedir());
    return s.bavail * s.bsize;
  } catch {
    return null;
  }
};

/** Lo que ocupa una carpeta con todo lo que tiene dentro, en bytes (lo que se está bajando incluido); 0 si no está. */
async function pesoDeCarpeta(carpeta: string): Promise<number> {
  let total = 0;
  const entradas = await readdir(carpeta, { withFileTypes: true }).catch(() => []);
  for (const e of entradas) {
    const ruta = join(carpeta, e.name);
    if (e.isDirectory()) total += await pesoDeCarpeta(ruta);
    else total += (await stat(ruta).catch(() => null))?.size ?? 0;
  }
  return total;
}

/** Lo que ya hay en el disco de cada instalación: el entorno de Python y el modelo de Hugging Face (con lo que va bajando); las voces. */
async function medirDeVerdad(que: QueInstala, carpetaVoces: string): Promise<number> {
  if (que === 'voces') return pesoDeCarpeta(carpetaVoces);
  const hub = join(process.env.HF_HOME ?? join(homedir(), '.cache', 'huggingface'), 'hub');
  const modelos = (await readdir(hub).catch(() => [] as string[])).filter((n) => /^models--.*large-v3-turbo/i.test(n));
  let total = await pesoDeCarpeta(join(homedir(), 'director', '.venv'));
  for (const m of modelos) total += await pesoDeCarpeta(join(hub, m));
  return total;
}

/** Cada cuánto se mide el disco mientras se instala. */
const CADA_MS = 1000;

export class InstaladorDeVoz {
  private en: QueInstala | null = null;
  private salida = '';
  private fallas: Partial<Record<QueInstala, Instalacion>> = {};
  /** Lo medido en el disco, el mayor avance dicho (no baja nunca) y cuándo se movió algo por última vez. */
  private bytes: number | null = null;
  private mayor = 0;
  private movio = 0;
  private reloj: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly raiz: string,
    private readonly lanzar: LanzarGuion = lanzarDeVerdad,
    private readonly instalado: (que: QueInstala) => boolean = (que) => pythonDelDirector(USOS[que]).instalado,
    private readonly carpetaVoces: string = join(homedir(), 'director', 'voces'),
    private readonly libre: () => number | null = libreEnCasa,
    private readonly medir: (que: QueInstala) => Promise<number> = (que) => medirDeVerdad(que, carpetaVoces),
    private readonly ahora: () => number = Date.now,
  ) {}

  /** Mide el disco una vez: si lo que hay creció, es señal de vida. Lo llama su propio reloj; las pruebas, a mano. */
  async sondear(): Promise<void> {
    const que = this.en;
    if (!que) return;
    const b = await this.medir(que).catch(() => null);
    if (this.en !== que || b === null) return;
    if (this.bytes === null || b > this.bytes) this.movio = this.ahora();
    this.bytes = b;
  }

  private instalacion(que: QueInstala): Instalacion {
    if (this.en === que) {
      const esperados = BYTES_ESPERADOS[que];
      this.mayor = avanceReal(this.bytes, esperados, avanceDeInstalacion(this.salida, que), this.mayor);
      return { estado: 'instalando', pct: this.mayor, ...(this.bytes ? { bytes: this.bytes } : {}), esperados, quietoSeg: Math.max(0, Math.round((this.ahora() - this.movio) / 1000)) };
    }
    if (this.instalado(que)) return { estado: 'lista' };
    return this.fallas[que] ?? { estado: 'sin_instalar' };
  }

  estado(): EstadoVoz {
    return { transcripcion: this.instalacion('transcripcion'), voces: this.instalacion('voces'), carpetaVoces: this.carpetaVoces };
  }

  /**
   * Empieza a instalar, si no está ya y si nada más se instala (comparten su entorno de Python: una a la vez). false si no
   * empezó: la página lo vuelve a pedir cuando le toca. Nunca falla: lo que no sale queda en su estado, con su causa.
   */
  instalar(que: QueInstala): boolean {
    if (this.en || this.instalado(que)) return false;
    this.en = que;
    this.salida = '';
    this.bytes = null;
    this.mayor = 0;
    this.movio = this.ahora();
    delete this.fallas[que];
    void this.correr(que);
    return true;
  }

  private async correr(que: QueInstala) {
    this.reloj = setInterval(() => void this.sondear(), CADA_MS);
    this.reloj.unref();
    void this.sondear();
    const fin = (codigo: number | null) => {
      if (this.en !== que) return;
      this.en = null;
      if (this.reloj) clearInterval(this.reloj);
      this.reloj = null;
      if (codigo === 0 && this.instalado(que)) return;
      this.fallas[que] = { estado: 'fallo', causa: causaDeFalla(this.salida, que, this.libre()), detalle: ultimaLineaDe(this.salida) };
    };
    try {
      const p = await this.lanzar(join(this.raiz, 'tools', 'entorno', GUIONES[que]));
      p.alEscribir((texto) => {
        this.salida = (this.salida + texto).slice(-TOPE_SALIDA);
        this.movio = this.ahora();
      });
      p.alSalir(fin);
    } catch {
      fin(-1);
    }
  }
}
