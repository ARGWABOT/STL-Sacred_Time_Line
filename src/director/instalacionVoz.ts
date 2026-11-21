// La pantalla de la voz del asistente de instalación (pedido pd_valores_instalar): lo que decide sin pantalla ni disco.
// La transcripción es obligatoria (nota de voz del titular nmvy0cdw1tit, 1 de noviembre de 2026): se instala, se prueba con
// una frase escrita (t_decide_frase_mic) y sin ella no se sigue. Las voces que leen en voz alta también lo son (notas de voz
// del titular nmvzfmvr2tit y nmvzfsccjtit, 2 de noviembre de 2026): se bajan solas y la única forma de quitarlas es desinstalar
// el Studio. Quien corre las descargas es estudio/servidor/instalarVoz.ts. Puro.

export type QueInstala = 'transcripcion' | 'voces';
export type CausaDeFalla = 'internet' | 'espacio' | 'otra';

/** Cómo va lo que se instala. `pct`, de 0 a 100, mientras se instala; `causa` y `detalle`, si falló. */
export interface Instalacion {
  estado: 'sin_instalar' | 'instalando' | 'lista' | 'fallo';
  pct?: number;
  causa?: CausaDeFalla;
  detalle?: string;
}

/** Lo que dice el servidor de las dos descargas, y dónde quedan las voces. */
export interface EstadoVoz {
  transcripcion: Instalacion;
  voces: Instalacion;
  carpetaVoces: string;
}

/** Lo que dijo la persona de la prueba del micrófono: se entendió, sigue así y lo corrige después, o no tiene micrófono ahora. */
export type ResultadoPrueba = 'bien' | 'sigo' | 'sin_mic';
export const esResultadoPrueba = (x: unknown): x is ResultadoPrueba => x === 'bien' || x === 'sigo' || x === 'sin_mic';

/** Cuánto ocupa lo que se baja, en bytes, por si la falla no lo dice: con menos libre que esto, fue el espacio. */
export const ESPACIO_NECESARIO: Record<QueInstala, number> = { transcripcion: 2.5e9, voces: 0.5e9 };
/** Cuántas etapas (`== …`) anuncia cada guion de tools/entorno. */
const ETAPAS: Record<QueInstala, number> = { transcripcion: 2, voces: 2 };

const SIN_ESPACIO = /no space left|enospc|not enough space|disk quota|disk full|there is not enough space|insufficient (disk )?space|espacio insuficiente/i;
const SIN_INTERNET = /could not resolve|couldn't resolve|name or service not known|getaddrinfo|temporary failure in name|network is unreachable|connection (timed out|refused|reset|aborted|error)|failed to connect|timed? ?out|ssl|tls|curl: \(\d+\)|connecterror|connectionerror|maxretryerror|localentrynotfound|httpsconnection|offline|no such host|dns/i;

/**
 * Por qué falló una descarga, por lo que dijo (t_decide_transcripcion_sin_internet: dice si fue internet o espacio y cómo
 * arreglarlo). Lo que nombra el disco va primero, porque una descarga sin espacio también se corta. Si no lo dice, `libre`
 * (los bytes libres del disco, si se saben) decide si fue el espacio. Pura.
 */
export function causaDeFalla(salida: string, que: QueInstala, libre?: number | null): CausaDeFalla {
  if (SIN_ESPACIO.test(salida)) return 'espacio';
  if (SIN_INTERNET.test(salida)) return 'internet';
  return typeof libre === 'number' && libre < ESPACIO_NECESARIO[que] ? 'espacio' : 'otra';
}

/** La última línea con algo que decir de lo que salió: lo que se muestra cuando no se sabe por qué falló. Pura. */
export function ultimaLineaDe(salida: string): string {
  const lineas = salida.split(/[\r\n]+/).map((l) => l.trim()).filter((l) => l && !/^\d+(\.\d+)?%|^#+\s*\d/.test(l));
  return (lineas.at(-1) ?? '').slice(0, 300);
}

/**
 * Cuánto va, de 0 a 100, por lo que imprimió el guion: cada etapa (`== …`) es una parte, y dentro de ella cuenta el último
 * porcentaje que dijo su descarga (el de curl con --progress-bar o el de la barra de faster-whisper). Nunca llega a 100
 * antes de terminar: la marca de que quedó lista la pone el final. Pura.
 */
export function avanceDeInstalacion(salida: string, que: QueInstala): number {
  const partes = salida.split(/^== /m);
  const hechas = partes.length - 1;
  if (!hechas) return 0;
  const total = Math.max(ETAPAS[que], hechas);
  const porcentajes = [...partes[hechas].matchAll(/(\d{1,3}(?:[.,]\d+)?)\s?%/g)].map((m) => Number(m[1].replace(',', '.'))).filter((n) => n <= 100);
  const dentro = (porcentajes.at(-1) ?? 0) / 100;
  return Math.min(99, Math.round(((hechas - 1 + dentro) / total) * 100));
}

/**
 * Si quien está en su primera instalación puede seguir: la transcripción instalada y probada, y las voces listas. Si una
 * descarga falla, se queda en «Reintentar». Al repasar, la prueba y lo que falte no detienen a nadie. Pura.
 */
export function vozPuedeSeguir(e: { prueba?: ResultadoPrueba }, v: EstadoVoz | null, repaso: boolean): boolean {
  if (repaso) return true;
  return !!v && v.transcripcion.estado === 'lista' && !!e.prueba && v.voces.estado === 'lista';
}

/** Con qué se responde a lo que entendió la prueba: desde el segundo intento también se puede seguir así (t_decide_mic_reintentos). Pura. */
export const respuestasDePrueba = (intentos: number): ('bien' | 'otra' | 'sigo')[] => (intentos >= 2 ? ['bien', 'otra', 'sigo'] : ['bien', 'otra']);
