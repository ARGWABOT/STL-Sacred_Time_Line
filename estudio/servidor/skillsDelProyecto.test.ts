// La casilla de una skill autorizada, de punta a punta (pd_skills_activar, nota nmwmniitjtit: la tercera vez que volvía
// vacía tras «Guardado»). Recorre lo mismo que POST y GET /skills de api.ts, sobre un estudio.local.json de verdad en una
// carpeta temporal: autorizar una skill de otro proyecto, otra escritura del archivo en medio (como la de una revisión
// que se anota), y releerla marcada; luego quitarla.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { guardarEsfuerzoMaximo } from '../../src/director/proyectos.ts';
import { guardarSkills, lineasDeSkillsCambiadas, panelDeSkills, skillsCambiadas, skillsCambiadasSinPaso } from './skillsDelProyecto.ts';

describe('autorizar una skill de otro proyecto y encontrarla marcada al volver (nmwmniitjtit)', () => {
  let raiz: string;
  const addField = { proyecto: 'app', nombre: 'add-field', ruta: '.claude/commands/add-field.md' };
  const firma = { quien: 'leonc', cuando: '2026-11-18T22:00:00.000Z' };

  beforeEach(() => {
    raiz = mkdtempSync(join(tmpdir(), 'stl-skills-'));
    const app = join(raiz, 'app');
    mkdirSync(join(app, '.claude', 'commands'), { recursive: true });
    writeFileSync(join(app, '.claude', 'commands', 'add-field.md'), '---\ndescription: Adds a field\n---\nAdd a field.\n');
    writeFileSync(join(app, '.claude', 'commands', 'audit.md'), 'Audit.\n');
    const local = {
      activo: 'app',
      repositorios: { 'stl-studio': raiz, app: app.replace(/\\/g, '/') },
      permisos: { autorizados: [{ regla: 'Bash(curl:*)', alcance: 'proyecto', proyecto: 'stl-studio', cuando: '2026-10-26T06:50:04.419Z', quien: 'leonc' }] },
    };
    writeFileSync(join(raiz, 'estudio.local.json'), JSON.stringify(local, null, 2));
  });
  afterEach(() => rmSync(raiz, { recursive: true, force: true }));

  it('POST la autoriza, otra escritura del archivo no la borra, y GET la trae autorizada; quitarla la deja nueva', async () => {
    // GET antes: nueva
    expect((await panelDeSkills(raiz)).find((s) => s.nombre === 'add-field')?.estado).toBe('nueva');
    // POST: autorizar, y lo releído ya la trae autorizada, sin nada que no quedó
    const hecho = await guardarSkills(raiz, { autorizar: [addField], quitar: [] }, firma);
    if (hecho.yaNoEsta) throw new Error('la skill debía estar');
    expect(hecho.noQuedaron).toEqual([]);
    expect(hecho.skills.find((s) => s.nombre === 'add-field')).toMatchObject({ estado: 'autorizada', quien: 'leonc' });
    // En el archivo, con su huella, y lo que había sigue
    const archivo = JSON.parse(readFileSync(join(raiz, 'estudio.local.json'), 'utf8'));
    expect(archivo.permisos.skills).toEqual([expect.objectContaining({ ...addField, huella: hecho.halladas[0].huella })]);
    expect(archivo.permisos.autorizados).toHaveLength(1);
    // Otra escritura del archivo en medio (otro ajuste, o una revisión que se anota): no se la lleva
    await guardarEsfuerzoMaximo(raiz, true);
    // GET al volver (recargar la página): sigue autorizada, y la otra sigue nueva
    const despues = await panelDeSkills(raiz);
    expect(despues.find((s) => s.nombre === 'add-field')?.estado).toBe('autorizada');
    expect(despues.find((s) => s.nombre === 'audit')?.estado).toBe('nueva');
    // Una segunda autorización no borra la primera
    const otra = await guardarSkills(raiz, { autorizar: [{ proyecto: 'app', nombre: 'audit', ruta: '.claude/commands/audit.md' }], quitar: [] }, firma);
    if (otra.yaNoEsta) throw new Error('la skill debía estar');
    expect(otra.skills.filter((s) => s.estado === 'autorizada').map((s) => s.nombre)).toEqual(['add-field', 'audit']);
    // Quitarla: vuelve nueva, y la otra queda
    const quitada = await guardarSkills(raiz, { autorizar: [], quitar: [addField] }, firma);
    if (quitada.yaNoEsta) throw new Error('no debía faltar nada');
    expect(quitada.noQuedaron).toEqual([]);
    expect((await panelDeSkills(raiz)).map((s) => [s.nombre, s.estado])).toEqual([['add-field', 'nueva'], ['audit', 'autorizada']]);
  });

  it('una skill que cambió en el disco desde que se autorizó vuelve como «cambio», no marcada', async () => {
    await guardarSkills(raiz, { autorizar: [addField], quitar: [] }, firma);
    writeFileSync(join(raiz, 'app', '.claude', 'commands', 'add-field.md'), 'Otra cosa.\n');
    expect((await panelDeSkills(raiz)).find((s) => s.nombre === 'add-field')?.estado).toBe('cambio');
  });

  it('una skill que ya no está en el proyecto no se guarda', async () => {
    expect(await guardarSkills(raiz, { autorizar: [{ ...addField, nombre: 'otra', ruta: '.claude/commands/otra.md' }], quitar: [] }, firma)).toEqual({ yaNoEsta: true });
  });
});

describe('una skill autorizada que cambió en el disco: la revisión la lee y deja su paso (nmwmntkoztit, nmwmrr6yitit)', () => {
  let raiz: string;
  const addField = { proyecto: 'app', nombre: 'add-field', ruta: '.claude/commands/add-field.md' };

  beforeEach(() => {
    raiz = mkdtempSync(join(tmpdir(), 'stl-skills-'));
    mkdirSync(join(raiz, 'app', '.claude', 'commands'), { recursive: true });
    writeFileSync(join(raiz, 'app', '.claude', 'commands', 'add-field.md'), 'Add a field.\n');
    writeFileSync(join(raiz, 'app', '.claude', 'commands', 'audit.md'), 'Audit.\n');
    writeFileSync(join(raiz, 'estudio.local.json'), JSON.stringify({ activo: 'app', repositorios: { 'stl-studio': raiz, app: join(raiz, 'app') } }));
  });
  afterEach(() => rmSync(raiz, { recursive: true, force: true }));

  it('la bandeja la nombra, con lo que vio el código y el ancla de su casilla; sin cambio, nada', async () => {
    await guardarSkills(raiz, { autorizar: [addField], quitar: [] }, { quien: 'leonc', cuando: '2026-11-18T22:00:00.000Z' });
    const autorizadas = () => JSON.parse(readFileSync(join(raiz, 'estudio.local.json'), 'utf8')).permisos.skills;
    expect(skillsCambiadas(join(raiz, 'app'), raiz, 'app', autorizadas())).toEqual([]);
    expect(lineasDeSkillsCambiadas([])).toEqual([]);
    // Cambia en el disco: ahora trae una orden que sube
    writeFileSync(join(raiz, 'app', '.claude', 'commands', 'add-field.md'), 'Add a field, then git push.\n');
    const cambiadas = skillsCambiadas(join(raiz, 'app'), raiz, 'app', autorizadas());
    expect(cambiadas.map((s) => [s.nombre, s.estado])).toEqual([['add-field', 'cambio']]);
    const lineas = lineasDeSkillsCambiadas(cambiadas).join('\n');
    expect(lineas).toContain('## Authorized skills that changed on disk (1)');
    expect(lineas).toContain('- «add-field», in .claude/commands/add-field.md (authorized by leonc, 2026-11-18T22:00:00.000Z)');
    expect(lineas).toContain('Nombra órdenes que suben, publican o borran.');
    expect(lineas).toContain('"ancla": "m-permisos"');
    // La de otro proyecto, o la del mismo Studio, no cuenta
    expect(skillsCambiadas(join(raiz, 'app'), raiz, 'otro', autorizadas())).toEqual([]);
    expect(skillsCambiadas(raiz, raiz, 'app', autorizadas())).toEqual([]);
  });

  it('--listo no cierra hasta que una misión abierta tenga un paso que la nombra y lleva a su casilla', () => {
    const cambiada = [{ nombre: 'add-field' }];
    const permisos = { vista: 'modelo', ancla: 'm-permisos' };
    expect(skillsCambiadasSinPaso(cambiada, [])).toEqual(['add-field']);
    // Nombrarla sin el botón a su casilla, o el botón sin nombrarla, no basta
    expect(skillsCambiadasSinPaso(cambiada, [{ pasos: ['I read «add-field» and it now pushes.'] }])).toEqual(['add-field']);
    expect(skillsCambiadasSinPaso(cambiada, [{ pasos: [{ texto: 'Tick the skill again.', ir: permisos }] }])).toEqual(['add-field']);
    expect(skillsCambiadasSinPaso(cambiada, [{ pasos: [{ texto: 'I read «add-field»: it now runs git push.', ir: { vista: 'modelo', ancla: 'm-consumo' } }] }])).toEqual(['add-field']);
    expect(skillsCambiadasSinPaso(cambiada, [{ pasos: [{ texto: 'I read «add-field» whole: it now runs git push. Tick it again only if that fits.', ir: permisos }] }])).toEqual([]);
    const bandeja = readFileSync(join(__dirname, '..', '..', 'tools', 'director', 'bandeja.ts'), 'utf-8');
    expect(bandeja).toContain('for (const l of repo ? lineasDeSkillsCambiadas(skillsCambiadas(repo.ruta, raiz, id, local.permisos?.skills)) : []) linea(l);');
    expect(bandeja).toContain("const sinPaso = skillsCambiadasSinPaso(cambiadas, plan.misiones.filter((m) => !estado.entregas[m.id]));");
  });
});
