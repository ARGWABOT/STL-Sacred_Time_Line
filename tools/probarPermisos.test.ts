import { describe, expect, it } from 'vitest';
import { ajustesDelCaso, argumentosDelCaso, CASOS, CASOS_AUTO, informe, informeAuto, motivoDelError, paraConsola, PEDIDO, REGLA_NEGADA, textoDelGancho, veredicto, type Llamada } from './probarPermisos';

const llamada = (caso: string, espero = 3000): Llamada => ({
  caso, evento: 'PermissionRequest', modo: 'dontAsk', herramienta: 'Bash', entrada: { command: 'node --version' }, sugerencias: [{ type: 'addRules' }], espero,
});
const [hoy, preguntando, limpio] = CASOS;

describe('la prueba real del gancho PermissionRequest (pr_permisos_al_momento, pieza 5)', () => {
  it('mide los tres casos: el modo de hoy, el que pregunta y el arranque limpio', () => {
    expect(CASOS.map((c) => [c.id, c.modo, c.sinGanchos])).toEqual([['dontAsk', 'dontAsk', false], ['default', 'default', false], ['limpio', 'dontAsk', true]]);
  });

  it('el gancho da el permiso y anota lo que recibe; sus ajustes solo apagan los ganchos en el arranque limpio', () => {
    const t = textoDelGancho('C:\\tmp\\registro.jsonl', 10);
    expect(t).toContain("decision: { behavior: 'allow' }");
    expect(t).toContain(JSON.stringify('C:\\tmp\\registro.jsonl'));
    expect(ajustesDelCaso('C:\\tmp\\gancho.mjs', false)).toEqual({ hooks: { PermissionRequest: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node "C:/tmp/gancho.mjs"', timeout: 150 }] }] } });
    expect(ajustesDelCaso('g.mjs', true)).toMatchObject({ disableAllHooks: true });
  });

  it('sin pantalla, con Haiku y sin Bash en la lista, para que la orden necesite el permiso', () => {
    const a = argumentosDelCaso(hoy, 'a.json');
    expect(a).toEqual(expect.arrayContaining(['-p', '--model', 'haiku', '--settings', 'a.json', '--permission-mode', 'dontAsk', '--allowedTools', 'Read']));
    expect(a.join(' ')).not.toContain('Bash(');
  });

  it('el veredicto distingue gancho llamado, orden corrida y orden negada, y cuenta solo las llamadas de su caso', () => {
    const corrio = veredicto(hoy, [llamada('dontAsk'), llamada('default', 9000)], JSON.stringify({ result: 'v22.11.0', permission_denials: [] }));
    expect(corrio).toMatchObject({ gancho: true, corrio: true, negadas: 0, espero: 3000, sugerencias: ['addRules'] });
    const negada = veredicto(limpio, [llamada('dontAsk')], JSON.stringify({ result: 'NO_PUDE', permission_denials: [{ tool_name: 'Bash' }] }));
    expect(negada).toMatchObject({ gancho: false, corrio: false, negadas: 1, espero: null });
  });

  it('el informe dice qué camino sirve: el modo de hoy, el que pregunta o ninguno', () => {
    const si = veredicto(hoy, [llamada('dontAsk')], JSON.stringify({ result: 'v22.0.0' }));
    const no = (c = preguntando) => veredicto(c, [], JSON.stringify({ result: 'NO_PUDE', permission_denials: [{}] }));
    expect(informe('2.1.0', [si, no(), no(limpio)]).join('\n')).toContain('desde el modo de hoy');
    const solo = veredicto(preguntando, [llamada('default')], JSON.stringify({ result: 'v22.0.0' }));
    expect(informe('2.1.0', [no(hoy), solo, no(limpio)]).join('\n')).toContain('en el modo default');
    const texto = informe('2.1.0', [no(hoy), no(), no(limpio)]).join('\n');
    expect(texto).toContain('el gancho no basta');
    expect(texto).toContain('Con el arranque limpio de hoy el gancho no corre');
  });

  it('si Claude Code no arrancó, el informe no concluye nada del gancho (la corrida del 26 de octubre)', () => {
    const fallo = (c: typeof hoy) => veredicto(c, [], '', 'error: too many arguments');
    const nada = informe('2.1.310', [fallo(hoy), fallo(preguntando), fallo(limpio)]).join('\n');
    expect(nada).toContain('no arrancó en ningún caso');
    expect(nada).not.toContain('el gancho no basta');
    expect(nada).not.toContain('arranque limpio de hoy el gancho no corre');
    const no = veredicto(preguntando, [], JSON.stringify({ result: 'NO_PUDE', permission_denials: [{}] }));
    expect(informe('2.1.310', [fallo(hoy), no, fallo(limpio)]).join('\n')).toContain('no alcanza para decidir');
  });

  it('si la orden corrió sin pedir permiso, el informe dice que la prueba no midió el gancho (la segunda corrida del 26 de octubre)', () => {
    // Así salió: node --version corrió en los tres casos, sin gancho y sin negarse, y se leyó como «el gancho no basta»
    const sola = (c: typeof hoy) => veredicto(c, [], JSON.stringify({ result: 'v22.11.0', permission_denials: [] }));
    const texto = informe('2.1.310', [sola(hoy), sola(preguntando), sola(limpio)]).join('\n');
    expect(texto).toContain('la orden corrió sin pedir permiso');
    expect(texto).toContain('la prueba no midió el gancho');
    expect(texto).not.toContain('el gancho no basta');
    expect(texto).not.toContain('arranque limpio de hoy el gancho no corre');
    // La orden de ahora evalúa código, sin comillas que la consola de Windows rompa
    expect(PEDIDO).toContain('node -p process.version');
    expect(PEDIDO).not.toContain('--version');
  });

  it('la prueba del modo automático (pd_permiso_automatico): dos casos en ese modo, y solo el segundo con la orden negada por una regla', () => {
    const [libre, negado] = CASOS_AUTO;
    expect(CASOS_AUTO.map((c) => [c.id, c.modo, !!c.negar])).toEqual([['auto', 'auto', false], ['auto-negado', 'auto', true]]);
    expect(argumentosDelCaso(libre, 'a.json')).not.toContain('--disallowedTools');
    const a = argumentosDelCaso(negado, 'a.json');
    expect(a).toEqual(expect.arrayContaining(['--permission-mode', 'auto', '--disallowedTools', REGLA_NEGADA]));
    // La regla niega justo la orden que se pide, con la forma de las del lanzador
    expect(PEDIDO).toContain(REGLA_NEGADA.slice('Bash('.length, -':*)'.length));
    // Los casos de siempre no cambian
    expect(argumentosDelCaso(hoy, 'a.json')).not.toContain('--disallowedTools');
  });

  it('el informe del modo automático dice qué hace solo y si la guardia lo sigue sujetando', () => {
    const [libre, negado] = CASOS_AUTO;
    const corre = (c: typeof libre) => veredicto(c, [], JSON.stringify({ result: 'v22.11.0', permission_denials: [] }));
    const niega = (c: typeof libre) => veredicto(c, [], JSON.stringify({ result: 'NO_PUDE', permission_denials: [{}] }));
    const bien = informeAuto('2.1.310', [corre(libre), niega(negado)]).join('\n');
    expect(bien).toContain('decidió solo y dejó correr la orden');
    expect(bien).toContain('La regla que niega se respetó');
    expect(bien).not.toContain('Cuidado');
    const mal = informeAuto('2.1.310', [corre(libre), corre(negado)]).join('\n');
    expect(mal).toContain('Cuidado: con la orden negada por una regla');
    const pregunto = informeAuto('2.1.310', [veredicto(libre, [llamada('auto')], JSON.stringify({ result: 'v22.0.0' })), niega(negado)]).join('\n');
    expect(pregunto).toContain('preguntó por el gancho');
    expect(informeAuto('2.1.310', [niega(libre), niega(negado)]).join('\n')).toContain('negó solo la orden');
    const fallo = (c: typeof libre) => veredicto(c, [], '', 'error: invalid permission mode');
    const nada = informeAuto('2.1.310', [fallo(libre), fallo(negado)]).join('\n');
    expect(nada).toContain('no arrancó en el modo automático');
    expect(nada).not.toContain('La regla que niega se respetó');
  });

  it('en la consola de Windows, el encargo y lo que lleva espacios o dos puntos van entre comillas, y el error dice lo que dijo Claude Code', () => {
    const args = argumentosDelCaso(hoy, 'C:\\Temp\\a.json').map(paraConsola);
    expect(args[1]).toBe(`"${PEDIDO}"`);
    expect(args).toContain('"C:\\Temp\\a.json"');
    expect(args).toContain('--model');
    expect(paraConsola('C:\\Program Files\\nodejs\\claude.cmd')).toBe('"C:\\Program Files\\nodejs\\claude.cmd"');
    expect(motivoDelError({ stderr: '\n  error: too many arguments\nmás', message: 'Command failed: claude …' })).toBe('error: too many arguments');
    expect(motivoDelError({ stderr: '', message: 'Command failed: claude -p\nmás' })).toBe('Command failed: claude -p');
  });
});
