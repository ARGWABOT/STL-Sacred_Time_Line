// Los nombres de las claves de tus ajustes de Claude Code, sin sus valores (decisión del titular del 24 de octubre de
// 2026, «Decide si el director deja de cargar tus skills y tus comandos»: «Quítalos, después de mostrarme las claves»;
// pd_arranque_limpio). El director que lanza el Studio sigue cargando esos ajustes, y con ellos tus skills y tus
// comandos; antes de dejar de cargarlos, la persona ve qué claves tiene, para no perder ninguna que cuide su privacidad.
// El director no puede leer ese archivo (sus permisos lo niegan): lo corre la persona, con tools/claves-ajustes.ts.
// Sin imports, para que la herramienta lo use tal cual con node.

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/**
 * Una línea por clave, nunca con su valor: la clave de primer nivel y, si es un objeto (env, permissions, hooks…), cada
 * clave suya, también sin valor; una lista dice cuántos tiene. Pura.
 */
export function clavesDeAjustes(ajustes: unknown): string[] {
  if (!esObjeto(ajustes)) return [];
  const lineas: string[] = [];
  for (const [clave, valor] of Object.entries(ajustes)) {
    if (Array.isArray(valor)) lineas.push(`${clave} (una lista de ${valor.length})`);
    else if (esObjeto(valor)) {
      const dentro = Object.entries(valor);
      if (!dentro.length) lineas.push(`${clave} (vacío)`);
      for (const [sub, v] of dentro) lineas.push(Array.isArray(v) ? `${clave} › ${sub} (una lista de ${v.length})` : `${clave} › ${sub}`);
    } else lineas.push(clave);
  }
  return lineas;
}
