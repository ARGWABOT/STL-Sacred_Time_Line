/**
 * Las notas de voz de cada proyecto que se están transcribiendo (o guardando después de transcribirse) ahora mismo (nota
 * nmwdwg5yvtit, 12 de noviembre de 2026): mientras un proyecto tiene alguna, su revisión no empieza y la página no cambia
 * de proyecto, para que la nota llegue entera al Buzón de su proyecto y entre en la revisión que se pidió. Lo usan el
 * servidor (la transcripción en segundo plano y «/dictar») y la página (lo que se graba en un diálogo hasta guardarlo).
 */
export class NotasEnCurso {
  private cuenta = new Map<string, number>();
  private esperando = new Map<string, (() => void)[]>();
  /** Se llama cada vez que un proyecto queda sin ninguna nota en curso (el servidor mira entonces lo pedido). */
  alQuedarLibre: (proyecto: string) => void = () => {};

  /** Empieza una en ese proyecto; lo que devuelve la termina, una sola vez aunque se llame más. */
  empieza(proyecto: string): () => void {
    this.cuenta.set(proyecto, this.en(proyecto) + 1);
    let soltada = false;
    return () => {
      if (soltada) return;
      soltada = true;
      const quedan = this.en(proyecto) - 1;
      if (quedan > 0) return void this.cuenta.set(proyecto, quedan);
      this.cuenta.delete(proyecto);
      const quienes = this.esperando.get(proyecto) ?? [];
      this.esperando.delete(proyecto);
      for (const q of quienes) q();
      this.alQuedarLibre(proyecto);
    };
  }

  /** Lo mismo alrededor de una promesa: cuenta mientras corre, y termina pase lo que pase. */
  async durante<T>(proyecto: string, hacer: () => Promise<T>): Promise<T> {
    const soltar = this.empieza(proyecto);
    try {
      return await hacer();
    } finally {
      soltar();
    }
  }

  /** Cuántas tiene en curso ese proyecto. */
  en(proyecto: string): number {
    return this.cuenta.get(proyecto) ?? 0;
  }

  /** Espera a que ese proyecto no tenga ninguna: true si quedó libre, false si pasó el tope (nunca espera para siempre). */
  esperar(proyecto: string, topeMs: number): Promise<boolean> {
    if (!this.en(proyecto)) return Promise.resolve(true);
    return new Promise((ok) => {
      const reloj = setTimeout(() => {
        const lista = this.esperando.get(proyecto);
        if (lista) this.esperando.set(proyecto, lista.filter((x) => x !== listo));
        ok(false);
      }, topeMs);
      const listo = () => {
        clearTimeout(reloj);
        ok(true);
      };
      this.esperando.set(proyecto, [...(this.esperando.get(proyecto) ?? []), listo]);
    });
  }
}
