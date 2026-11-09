// Las dos descargas de la pantalla de la voz (pedido pd_valores_instalar; lo que decide, en src/director/instalacionVoz.ts):
// corre los guiones de tools/entorno, los mismos que se pueden correr a mano, de a uno, y dice cómo van. Una descarga no
// depende de la página: recargarla no la corta, y lo que ya bajó no se vuelve a bajar. Lo instalado se sabe por su marca en
// el disco (src/director/transcripcion.ts › pythonDelDirector). Quien lanza el guion se puede cambiar: las pruebas no bajan nada.
import { spawn } from 'node:child_process';
import { statfsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { avanceDeInstalacion, causaDeFalla, ultimaLineaDe, type EstadoVoz, type Instalacion, type QueInstala } from '../../src/director/instalacionVoz.ts';
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

export class InstaladorDeVoz {
  private en: QueInstala | null = null;
  private salida = '';
  private fallas: Partial<Record<QueInstala, Instalacion>> = {};

  constructor(
    private readonly raiz: string,
    private readonly lanzar: LanzarGuion = lanzarDeVerdad,
    private readonly instalado: (que: QueInstala) => boolean = (que) => pythonDelDirector(USOS[que]).instalado,
    private readonly carpetaVoces: string = join(homedir(), 'director', 'voces'),
    private readonly libre: () => number | null = libreEnCasa,
  ) {}

  private instalacion(que: QueInstala): Instalacion {
    if (this.en === que) return { estado: 'instalando', pct: avanceDeInstalacion(this.salida, que) };
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
    delete this.fallas[que];
    void this.correr(que);
    return true;
  }

  private async correr(que: QueInstala) {
    const fin = (codigo: number | null) => {
      if (this.en !== que) return;
      this.en = null;
      if (codigo === 0 && this.instalado(que)) return;
      this.fallas[que] = { estado: 'fallo', causa: causaDeFalla(this.salida, que, this.libre()), detalle: ultimaLineaDe(this.salida) };
    };
    try {
      const p = await this.lanzar(join(this.raiz, 'tools', 'entorno', GUIONES[que]));
      p.alEscribir((texto) => (this.salida = (this.salida + texto).slice(-TOPE_SALIDA)));
      p.alSalir(fin);
    } catch {
      fin(-1);
    }
  }
}
