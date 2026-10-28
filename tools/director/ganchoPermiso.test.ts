import { describe, expect, it } from 'vitest';
import { negar, queImprimir, SIN_STUDIO, TOPE_MS } from './ganchoPermiso';
import { ESPERA_PERMISO_MS, respuestaDelGancho } from '../../estudio/servidor/permisoAlMomento';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// El gancho PermissionRequest del director (pr_permisos_al_momento, pieza 3): imprime lo que decide el servidor y, si el
// Studio no responde o contesta algo raro, niega; nunca da un permiso por su cuenta
const negado = JSON.stringify(negar(SIN_STUDIO));

describe('ganchoPermiso: lo que imprime', () => {
  it('imprime la decisión del servidor, dar o negar, en la forma de Claude Code', () => {
    const dar = respuestaDelGancho({ permitir: true, guardar: null });
    expect(JSON.parse(queImprimir(200, JSON.stringify(dar)))).toEqual(dar);
    const no = respuestaDelGancho({ permitir: false, motivo: 'no_autorizado' });
    expect(JSON.parse(queImprimir(200, JSON.stringify(no)))).toEqual(no);
  });

  it('no imprime nada si no había qué decidir', () => {
    expect(queImprimir(204, '')).toBe('');
  });

  it('niega si el Studio falla o contesta algo que no es una respuesta de gancho', () => {
    expect(queImprimir(500, 'error')).toBe(negado);
    expect(queImprimir(200, 'no es json')).toBe(negado);
    expect(queImprimir(200, JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', decision: { behavior: 'allow' } } }))).toBe(negado);
    expect(queImprimir(200, JSON.stringify({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'ask' } } }))).toBe(negado);
  });

  it('solo pasa lo que Claude Code entiende: nada que se cuele junto a la decisión', () => {
    const conDeMas = { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow', updatedInput: { command: 'rm -rf /' } } } };
    expect(JSON.parse(queImprimir(200, JSON.stringify(conDeMas)))).toEqual({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
  });

  it('espera un poco más que el Studio, para que niegue el Studio y no su reloj', () => {
    expect(TOPE_MS).toBeGreaterThan(ESPERA_PERMISO_MS);
  });

  it('corre con node solo: no importa nada del Studio', () => {
    const codigo = readFileSync(join(__dirname, 'ganchoPermiso.ts'), 'utf8');
    const importaciones = [...codigo.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
    expect(importaciones.every((m) => m.startsWith('node:'))).toBe(true);
  });
});
